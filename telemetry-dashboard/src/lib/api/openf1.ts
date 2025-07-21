type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

interface OpenF1RequestOptions {
    method?: HttpMethod
    headers?: Record<string, string>
    body?: any
    cacheKey?: string
    cacheTtlMs?: number
    auth?: boolean
}

export class OpenF1Service {
    private baseUrl: string
    private token: string | null = null
    private cache: Map<string, { data: any; expires: number }> = new Map()
    private rateLimit: { max: number; intervalMs: number }
    private requestTimestamps: number[] = []

    constructor(baseUrl: string, rateLimit = { max: 10, intervalMs: 1000 }) {
        this.baseUrl = baseUrl
        this.rateLimit = rateLimit
    }

    setToken(token: string) {
        this.token = token
    }

    clearToken() {
        this.token = null
    }

    private getAuthHeaders(): Record<string, string> {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {}
    }

    private getCache(key: string) {
        const entry = this.cache.get(key)
        if (entry && entry.expires > Date.now()) {
            return entry.data
        }
        if (entry) this.cache.delete(key)
        return null
    }

    private setCache(key: string, data: any, ttlMs: number) {
        this.cache.set(key, { data, expires: Date.now() + ttlMs })
    }

    private async enforceRateLimit() {
        const now = Date.now()
        // Remove timestamps outside the interval
        this.requestTimestamps = this.requestTimestamps.filter(
            ts => now - ts < this.rateLimit.intervalMs
        )
        if (this.requestTimestamps.length >= this.rateLimit.max) {
            const waitTime =
                this.rateLimit.intervalMs - (now - this.requestTimestamps[0])
            await new Promise(res => setTimeout(res, waitTime))
        }
        this.requestTimestamps.push(Date.now())
    }

    async request<T = any>(
        endpoint: string,
        options: OpenF1RequestOptions = {}
    ): Promise<T> {
        const {
            method = "GET",
            headers = {},
            body,
            cacheKey,
            cacheTtlMs = 10000,
            auth = true,
        } = options

        const url = `${this.baseUrl}${endpoint}`

        // Caching
        const key = cacheKey || `${method}:${url}:${body ? JSON.stringify(body) : ""}`
        if (method === "GET") {
            const cached = this.getCache(key)
            if (cached) return cached
        }

        // Rate limiting
        await this.enforceRateLimit()

        // Auth
        const reqHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            ...headers,
            ...(auth ? this.getAuthHeaders() : {}),
        }

        let res: Response
        try {
            res = await fetch(url, {
                method,
                headers: reqHeaders,
                body: body ? JSON.stringify(body) : undefined,
            })
        } catch (err) {
            throw new Error(`Network error: ${(err as Error).message}`)
        }

        if (!res.ok) {
            let errorMsg = `OpenF1 API error: ${res.status} ${res.statusText}`
            try {
                const errorData = await res.json()
                errorMsg += ` - ${JSON.stringify(errorData)}`
            } catch {
                // ignore JSON parse errors
            }
            throw new Error(errorMsg)
        }

        let data: T
        try {
            data = await res.json()
        } catch (err) {
            throw new Error("Failed to parse API response as JSON")
        }

        if (method === "GET") {
            this.setCache(key, data, cacheTtlMs)
        }
        return data
    }

    // --- OpenF1 API Endpoints ---

    async getCarTelemetry(sessionKey: string, lapNumber?: number, driverNumber?: number) {
        let endpoint = `/v1/car_data?session_key=${sessionKey}`
        if (lapNumber !== undefined) endpoint += `&lap_number=${lapNumber}`
        if (driverNumber !== undefined) endpoint += `&driver_number=${driverNumber}`
        
        try {
            const data = await this.request(endpoint)
            // Transform OpenF1 response to match our TelemetryData interface
            return Array.isArray(data) ? data.map(item => ({
                speed: item.speed || 0,
                throttle: item.throttle || 0,
                brake: item.brake || 0,
                gear: item.n_gear || 0,
                rpm: item.rpm || 0,
                drs: item.drs === 1 || item.drs === true,
                timestamp: new Date(item.date).getTime(),
                session_key: item.session_key,
                driver_number: item.driver_number,
                lap_number: item.lap_number
            })) : []
        } catch (error) {
            console.error('Error fetching car telemetry:', error)
            return []
        }
    }

    // Fetch lap info (current lap, total laps, sector times)
    async getLapInfo(sessionKey: string) {
        try {
            // OpenF1 doesn't have a direct lap_info endpoint, so we construct it from laps
            const laps = await this.request(`/v1/laps?session_key=${sessionKey}`)
            if (!Array.isArray(laps) || laps.length === 0) {
                return { currentLap: 1, totalLaps: 0, sectorTimes: [] }
            }
            
            const maxLap = Math.max(...laps.map(lap => lap.lap_number || 0))
            const currentLap = maxLap || 1
            
            // Get sector times from intervals
            const intervals = await this.request(`/v1/intervals?session_key=${sessionKey}`)
            const sectorTimes = Array.isArray(intervals) ? intervals.map(interval => ({
                sector: 1, // OpenF1 intervals don't specify sectors
                time: interval.gap_to_leader || 0,
                driver_number: interval.driver_number
            })) : []
            
            return {
                currentLap,
                totalLaps: maxLap,
                sectorTimes
            }
        } catch (error) {
            console.error('Error fetching lap info:', error)
            return { currentLap: 1, totalLaps: 0, sectorTimes: [] }
        }
    }

    async getWeather(sessionKey: string) {
        try {
            const data = await this.request(`/v1/weather?session_key=${sessionKey}`)
            return Array.isArray(data) ? data.map(item => ({
                session_key: item.session_key,
                date: item.date,
                air_temperature: item.air_temperature || 20,
                track_temperature: item.track_temperature || 25,
                humidity: item.humidity || 50,
                pressure: item.pressure || 1013,
                wind_speed: item.wind_speed || 0,
                wind_direction: item.wind_direction || 'N',
                rainfall: item.rainfall || 0
            })) : []
        } catch (error) {
            console.error('Error fetching weather:', error)
            return []
        }
    }

    async getDriverPositions(sessionKey: string, lapNumber?: number) {
        try {
            let endpoint = `/v1/position?session_key=${sessionKey}`
            if (lapNumber !== undefined) endpoint += `&lap_number=${lapNumber}`
            
            const data = await this.request(endpoint)
            return Array.isArray(data) ? data.map(pos => ({
                driver_number: pos.driver_number,
                name: pos.driver_name || `#${pos.driver_number}`,
                x: pos.x || 0,
                y: pos.y || 0,
                color: pos.team_colour || '#8884d8',
                position: pos.position || 0
            })) : []
        } catch (error) {
            console.error('Error fetching driver positions:', error)
            return []
        }
    }

    async getSessions(season?: number, round?: number) {
        let endpoint = `/v1/sessions`
        const params = []
        if (season !== undefined) params.push(`year=${season}`)
        if (round !== undefined) params.push(`round=${round}`)
        if (params.length) endpoint += `?${params.join("&")}`
        
        try {
            return await this.request(endpoint)
        } catch (error) {
            console.error('Error fetching sessions:', error)
            return []
        }
    }
    
    async getSessionDetails(sessionKey: string) {
        try {
            const sessions = await this.request(`/v1/sessions?session_key=${sessionKey}`)
            return Array.isArray(sessions) ? sessions[0] : sessions
        } catch (error) {
            console.error('Error fetching session details:', error)
            return null
        }
    }

    async getMultipleSessionsTelemetry(sessionKeys: string[]): Promise<Record<string, any[]>> {
        const results: Record<string, any[]> = {}
        await Promise.all(
            sessionKeys.map(async (key) => {
                try {
                    results[key] = await this.getCarTelemetry(key)
                } catch {
                    results[key] = []
                }
            })
        )
        return results
    }
    
    async getCalendar(season: number) {
        return this.request(`/sessions?season=${season}`)
    }
    
    // Fetch sector timing data for a session (optionally for a driver)
    async getSectorTimings(sessionKey: string, driverNumber?: number) {
        try {
            let endpoint = `/v1/intervals?session_key=${sessionKey}`
            if (driverNumber !== undefined) endpoint += `&driver_number=${driverNumber}`
            
            const data = await this.request(endpoint)
            // Transform intervals to sector timings (OpenF1 doesn't have direct sector endpoints)
            return Array.isArray(data) ? data.map(interval => ({
                driver_number: interval.driver_number,
                sector: 1,
                sector_time: interval.gap_to_leader || 0,
                performance: 'normal'
            })) : []
        } catch (error) {
            console.error('Error fetching sector timings:', error)
            return []
        }
    }

    // Fetch hourly weather data (if available)
    async getHourlyWeather(sessionKey: string) {
        return this.request(`/weather_data/hourly?session_key=${sessionKey}`)
    }

    // Fetch historic weather data (if available)
    async getHistoricWeather(sessionKey: string) {
        return this.request(`/weather_data/historic?session_key=${sessionKey}`)
    }

    // Fetch real-time driver status (tire, ERS, pit, etc.)
    async getDriverStatus(
        sessionKey: string,
        driverNumber: number
    ) {
        try {
            // Combine data from multiple endpoints for driver status
            const [carData, stints] = await Promise.all([
                this.request(`/v1/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`),
                this.request(`/v1/stints?session_key=${sessionKey}&driver_number=${driverNumber}`)
            ])
            
            const latestCar = Array.isArray(carData) && carData.length > 0 
                ? carData[carData.length - 1] 
                : null
                
            const latestStint = Array.isArray(stints) && stints.length > 0 
                ? stints[stints.length - 1] 
                : null
            
            return {
                driver_number: driverNumber,
                driver_name: `Driver #${driverNumber}`,
                tire_compound: latestStint?.compound || 'Unknown',
                tire_age: latestStint?.tyre_age_at_start || 0,
                ers: latestCar?.drs ? 100 : 0, // Approximation
                pit_status: 'None' // Would need pit data
            }
        } catch (error) {
            console.error('Error fetching driver status:', error)
            return null
        }
    }

    // Fetch lap times for a driver in a session
    async getLapTimes(
        sessionKey: string,
        driverNumber: number
    ) {
        try {
            const data = await this.request(`/v1/laps?session_key=${sessionKey}&driver_number=${driverNumber}`)
            return Array.isArray(data) ? data.map(lap => ({
                driver_number: lap.driver_number,
                lap_number: lap.lap_number,
                lap_time: lap.lap_duration || 0
            })) : []
        } catch (error) {
            console.error('Error fetching lap times:', error)
            return []
        }
    }

    // Fetch tire stints for a driver in a session
    async getTireStints(
        sessionKey: string,
        driverNumber: number
    ) {
        try {
            const data = await this.request(`/v1/stints?session_key=${sessionKey}&driver_number=${driverNumber}`)
            return Array.isArray(data) ? data.map(stint => ({
                driver_number: stint.driver_number,
                start_lap: stint.lap_start,
                end_lap: stint.lap_end,
                compound: stint.compound || 'Unknown'
            })) : []
        } catch (error) {
            console.error('Error fetching tire stints:', error)
            return []
        }
    }

    // Fetch radio messages for a driver in a session
    async getRadioMessages(
        sessionKey: string,
        driverNumber: number
    ) {
        try {
            const data = await this.request(`/v1/team_radio?session_key=${sessionKey}&driver_number=${driverNumber}`)
            return Array.isArray(data) ? data.map(msg => ({
                driver_number: msg.driver_number,
                session_key: msg.session_key,
                timestamp: msg.date,
                message: msg.recording_url ? 'Audio message available' : 'Message',
                source: 'driver'
            })) : []
        } catch (error) {
            console.error('Error fetching radio messages:', error)
            return []
        }
    }

    // Fetch driver info for a session (optionally for a specific driver)
    async getDriverInfo(
        sessionKey: string,
        driverNumber?: number
    ) {
        try {
            let endpoint = `/v1/drivers?session_key=${sessionKey}`
            if (driverNumber !== undefined) endpoint += `&driver_number=${driverNumber}`
            
            const data = await this.request(endpoint)
            return Array.isArray(data) ? data.map(driver => ({
                driver_number: driver.driver_number,
                broadcast_name: driver.broadcast_name || driver.full_name,
                full_name: driver.full_name,
                team_name: driver.team_name,
                country_code: driver.country_code,
                color: driver.team_colour,
                headshot_url: driver.headshot_url
            })) : (data ? [{
                driver_number: data.driver_number,
                broadcast_name: data.broadcast_name || data.full_name,
                full_name: data.full_name,
                team_name: data.team_name,
                country_code: data.country_code,
                color: data.team_colour,
                headshot_url: data.headshot_url
            }] : [])
        } catch (error) {
            console.error('Error fetching driver info:', error)
            return []
        }
    }

    // Fetch session events (pit stops, safety cars, crashes, etc.)
    async getSessionEvents(
        sessionKey: string
    ) {
        return this.request(`/session_events?session_key=${sessionKey}`)
    }

    // Fetch delta times for a session (optional: for specific drivers)
    async getDeltaTimes(
        sessionKey: string,
        driverNumbers?: number[],
        referenceDriver?: number
    ) {
        let endpoint = `/delta_times?session_key=${sessionKey}`
        if (driverNumbers && driverNumbers.length)
            endpoint += `&driver_numbers=${driverNumbers.join(",")}`
        if (referenceDriver !== undefined)
            endpoint += `&reference_driver=${referenceDriver}`
        return this.request(endpoint)
    }

    // Fetch lap times, delta, or events with filters for analytics dashboard
    async getAnalyticsData(
        sessionKey: string,
        filters: import("@/lib/api/types").AnalyticsFilter
    ) {
        // Example: fetch lap times for selected drivers
        if (filters.metric === "lapTime") {
            return Promise.all(
                filters.drivers.map(driverNumber =>
                    this.getLapTimes(sessionKey, driverNumber)
                )
            )
        }
        // Example: fetch delta times
        if (filters.metric === "deltaTime") {
            return this.getDeltaTimes(sessionKey, filters.drivers, filters.referenceDriver)
        }
        // Example: fetch session events for race progress
        if (filters.metric === "raceProgress") {
            return this.getSessionEvents(sessionKey)
        }
        // Add more as needed
        return null
    }

    // Add this method to fetch session events
    async getEvents(sessionKey: string) {
        try {
            // OpenF1 doesn't have a direct events endpoint, use race control messages
            const data = await this.request(`/v1/race_control?session_key=${sessionKey}`)
            return Array.isArray(data) ? data.map(event => ({
                type: event.category || 'flag',
                lap_number: event.lap_number || 1,
                description: event.message,
                timestamp: new Date(event.date).getTime(),
                session_key: event.session_key
            })) : []
        } catch (error) {
            console.error('Error fetching events:', error)
            return []
        }
    }

    // Add new method for getting track layout (OpenF1 doesn't provide SVG paths):
    async getTrackLayout(sessionKey: string) {
        try {
            // OpenF1 doesn't provide track layout SVG, return fallback
            const session = await this.getSessionDetails(sessionKey)
            const circuitName = session?.circuit_short_name || 'Unknown'
            
            // Return a basic track layout structure
            return {
                svgPath: "M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z", // Fallback oval
                width: 300,
                height: 200,
                circuit_name: circuitName
            }
        } catch (error) {
            console.error('Error fetching track layout:', error)
            return {
                svgPath: "M40,160 Q60,40 150,40 Q240,40 260,160 Q150,180 40,160 Z",
                width: 300,
                height: 200
            }
        }
    }
}

// Utility to poll for weather and detect alerts (for use in WeatherAlert)
export async function pollWeatherForAlerts(
  sessionKey: string,
  onAlert: (alert: import("@/lib/api/types").OpenF1WeatherAlert) => void,
  intervalMs = 10000
) {
  let prev: import("@/lib/api/types").OpenF1WeatherData | null = null
  const openf1 = new OpenF1Service("https://api.openf1.org/v1")
  async function poll() {
    try {
      const data = await openf1.getWeather(sessionKey)
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1]
        if (prev) {
          // (alert logic as in WeatherAlert.tsx)
        }
        prev = latest
      }
    } catch {}
  }
  poll()
  const interval = setInterval(poll, intervalMs)
  return () => clearInterval(interval)
}

// Estimate weather impact on lap times (simple heuristic)
export async function estimateWeatherImpact(sessionKey: string): Promise<import("@/lib/api/types").WeatherImpactEstimate | null> {
  const openf1 = new OpenF1Service("https://api.openf1.org/v1")
  try {
    const [weatherArr, laps] = await Promise.all([
      openf1.getWeather(sessionKey),
      openf1.getLapInfo(sessionKey),
    ])
    if (!Array.isArray(weatherArr) || weatherArr.length === 0 || !laps || !laps.sectorTimes) return null
    const weather = weatherArr[weatherArr.length - 1]
    // Simple: compare average lap time in dry vs. wet, hot vs. cool, windy vs. calm
    const lapTimes = laps.sectorTimes.map((s: { time: number }) => s.time)
    const avgLap = lapTimes.length ? lapTimes.reduce((a: number, b: number) => a + b, 0) / lapTimes.length : 0

    // Heuristic: +0.2s/lap per mm rain, +0.03s/lap per °C above 30, +0.01s/lap per km/h wind above 15
    const rainLoss = (weather.rainfall ?? 0) * 0.2
    const tempLoss = weather.air_temperature > 30 ? (weather.air_temperature - 30) * 0.03 : 0
    const windLoss = weather.wind_speed > 15 ? (weather.wind_speed - 15) * 0.01 : 0
    const total = rainLoss + tempLoss + windLoss

    return {
      rain: { timeLoss: rainLoss },
      temp: { timeLoss: tempLoss },
      wind: { timeLoss: windLoss },
      total,
      avgLap,
    }
  } catch {
    return null
  }
}