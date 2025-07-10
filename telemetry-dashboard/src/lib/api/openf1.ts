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
}