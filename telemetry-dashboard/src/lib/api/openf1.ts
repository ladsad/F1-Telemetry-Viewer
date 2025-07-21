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

    async getCarTelemetry(sessionKey: string, lapNumber?: number) {
        let endpoint = `/car_data?session_key=${sessionKey}`
        if (lapNumber !== undefined) endpoint += `&lap_number=${lapNumber}`
        return this.request(endpoint)
    }

    // Fetch lap info (current lap, total laps, sector times)
    async getLapInfo(sessionKey: string) {
        return this.request(`/lap_info?session_key=${sessionKey}`)
    }

    async getWeather(sessionKey: string) {
        return this.request(`/weather_data?session_key=${sessionKey}`)
    }

    async getDriverPositions(sessionKey: string, lapNumber?: number) {
        let endpoint = `/position_data?session_key=${sessionKey}`
        if (lapNumber !== undefined) endpoint += `&lap_number=${lapNumber}`
        return this.request(endpoint)
    }

    async getSessions(season?: number, round?: number) {
        let endpoint = `/sessions`
        const params = []
        if (season !== undefined) params.push(`season=${season}`)
        if (round !== undefined) params.push(`round=${round}`)
        if (params.length) endpoint += `?${params.join("&")}`
        return this.request(endpoint)
    }
    
    async getSessionDetails(sessionKey: string) {
        return this.request(`/sessions/${sessionKey}`)
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

    async getTrackLayout(sessionKey: string) {
        return this.request(`/track_layout?session_key=${sessionKey}`)
    }

    // Fetch sector timing data for a session (optionally for a driver)
    async getSectorTimings(sessionKey: string, driverNumber?: number) {
        let endpoint = `/sector_times?session_key=${sessionKey}`
        if (driverNumber !== undefined) endpoint += `&driver_number=${driverNumber}`
        return this.request(endpoint)
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
        return this.request(`/driver_status?session_key=${sessionKey}&driver_number=${driverNumber}`)
    }

    // Fetch lap times for a driver in a session
    async getLapTimes(
        sessionKey: string,
        driverNumber: number
    ) {
        return this.request(`/lap_times?session_key=${sessionKey}&driver_number=${driverNumber}`)
    }

    // Fetch tire stints for a driver in a session
    async getTireStints(
        sessionKey: string,
        driverNumber: number
    ) {
        return this.request(`/tire_stints?session_key=${sessionKey}&driver_number=${driverNumber}`)
    }

    // Fetch radio messages for a driver in a session
    async getRadioMessages(
        sessionKey: string,
        driverNumber: number
    ) {
        return this.request(`/radio_messages?session_key=${sessionKey}&driver_number=${driverNumber}`)
    }

    // Fetch driver info for a session (optionally for a specific driver)
    async getDriverInfo(
        sessionKey: string,
        driverNumber?: number
    ) {
        let endpoint = `/drivers?session_key=${sessionKey}`
        if (driverNumber !== undefined) endpoint += `&driver_number=${driverNumber}`
        return this.request(endpoint)
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
    async getEvents(sessionKey: string){
        try {
            const response = await fetch(`${this.baseUrl}/events?session_key=${sessionKey}`);
            if (!response.ok) {
                throw new Error(`Error fetching events: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch events:", error);
            return [];
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