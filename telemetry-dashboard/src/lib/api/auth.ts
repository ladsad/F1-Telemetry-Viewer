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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
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

    // Auth
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
      ...(auth ? this.getAuthHeaders() : {}),
    }

    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(`OpenF1 API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    if (method === "GET") {
      this.setCache(key, data, cacheTtlMs)
    }
    return data
  }

  // Example: fetch live telemetry
  async getLiveTelemetry(sessionId: string) {
    return this.request(`/telemetry/live?session=${sessionId}`)
  }

  // Example: fetch historical telemetry
  async getHistoricalTelemetry(sessionId: string, lap: number) {
    return this.request(`/telemetry/history?session=${sessionId}&lap=${lap}`)
  }