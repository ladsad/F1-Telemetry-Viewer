export type WebSocketStatus = "connecting" | "open" | "closed" | "error"

type MessageHandler<T = any> = (data: T) => void

export class OpenF1WebSocket {
  private url: string
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private handlers: MessageHandler[] = []
  private isClosed = false
  public status: WebSocketStatus = "closed"
  public onStatusChange: ((status: WebSocketStatus) => void) | null = null

  constructor(url: string) {
    this.url = url
    this.connect()
  }

  private connect() {
    this.status = "connecting"
    this.onStatusChange?.(this.status)
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.status = "open"
      this.reconnectAttempts = 0
      this.onStatusChange?.(this.status)
    }
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handlers.forEach(h => h(data))
      } catch {
        // Ignore parse errors
      }
    }
    this.ws.onclose = () => {
      this.status = "closed"
      this.onStatusChange?.(this.status)
      if (!this.isClosed) this.scheduleReconnect()
    }
    this.ws.onerror = () => {
      this.status = "error"
      this.onStatusChange?.(this.status)
      if (!this.isClosed) this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectAttempts++
    const delay = Math.min(1000 * this.reconnectAttempts, 10000)
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, delay)
  }

  onMessage<T = any>(handler: MessageHandler<T>) {
    this.handlers.push(handler)
  }

  close() {
    this.isClosed = true
    if (this.ws) this.ws.close()
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
  }
}