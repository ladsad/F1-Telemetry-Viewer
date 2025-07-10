"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge, Zap, Activity, Settings, TrendingUp, Circle, RefreshCw } from "lucide-react"

type TelemetryData = {
  speed: number
  throttle: number
  brake: number
  gear: number
  drs: boolean
  rpm: number
}

type TelemetryDisplayProps = {
  sessionKey?: string
  wsUrl?: string
  fallbackApiUrl?: string
  refreshIntervalMs?: number
}

const TELEMETRY_CACHE_KEY = "telemetry_last_data"

function saveTelemetryToCache(data: TelemetryData) {
  try {
    localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(data))
  } catch {}
}

function loadTelemetryFromCache(): TelemetryData | null {
  try {
    const raw = localStorage.getItem(TELEMETRY_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function TelemetryDisplay({
  sessionKey,
  wsUrl,
  fallbackApiUrl,
  refreshIntervalMs = 1000,
}: TelemetryDisplayProps) {
  const [data, setData] = useState<TelemetryData | null>(null)
  const [intervalMs, setIntervalMs] = useState(refreshIntervalMs)
  const wsRef = useRef<WebSocket | null>(null)

  // Load cached telemetry on mount
  useEffect(() => {
    const cached = loadTelemetryFromCache()
    if (cached) setData(cached)
  }, [])

  // WebSocket connection for real-time telemetry
  useEffect(() => {
    if (!wsUrl || !sessionKey) return

    const ws = new WebSocket(`${wsUrl}?session_key=${sessionKey}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const newData: TelemetryData = {
          speed: msg.speed,
          throttle: msg.throttle,
          brake: msg.brake,
          gear: msg.gear,
          drs: msg.drs,
          rpm: msg.rpm,
        }
        setData(newData)
        saveTelemetryToCache(newData)
      } catch {
        // Ignore parse errors
      }
    }

    ws.onerror = () => {
      // Optionally handle error
    }

    ws.onclose = () => {
      // Optionally handle close
    }

    return () => {
      ws.close()
    }
  }, [wsUrl, sessionKey])

  // Fallback: Poll REST API if no WebSocket or on error
  useEffect(() => {
    if (data || wsUrl) return // Prefer WebSocket if available
    if (!fallbackApiUrl) return

    let mounted = true
    let interval: NodeJS.Timeout

    const poll = async () => {
      try {
        const res = await fetch(fallbackApiUrl)
        if (!res.ok) return
        const latest = await res.json()
        const newData: TelemetryData = latest[0] || latest
        if (mounted) {
          setData(newData)
          saveTelemetryToCache(newData)
        }
      } catch {
        // Ignore
      }
    }
    poll()
    interval = setInterval(poll, intervalMs)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [fallbackApiUrl, wsUrl, data, intervalMs])

  const display = data || {
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 0,
    drs: false,
    rpm: 0,
  }

  const showRefreshControl = !wsUrl && !!fallbackApiUrl

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Telemetry
          {showRefreshControl && (
            <span className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {intervalMs}ms
              <select
                className="ml-2 rounded px-1 py-0.5 text-xs bg-muted text-foreground"
                value={intervalMs}
                onChange={e => setIntervalMs(Number(e.target.value))}
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
              </select>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <Gauge className="mb-1" />
          <span className="text-lg font-bold">{display.speed} km/h</span>
          <span className="text-xs text-muted-foreground">Speed</span>
        </div>
        <div className="flex flex-col items-center">
          <Zap className="mb-1" />
          <span className="text-lg font-bold">{display.throttle}%</span>
          <span className="text-xs text-muted-foreground">Throttle</span>
        </div>
        <div className="flex flex-col items-center">
          <Activity className="mb-1" />
          <span className="text-lg font-bold">{display.brake}%</span>
          <span className="text-xs text-muted-foreground">Brake</span>
        </div>
        <div className="flex flex-col items-center">
          <Settings className="mb-1" />
          <span className="text-lg font-bold">{display.gear}</span>
          <span className="text-xs text-muted-foreground">Gear</span>
        </div>
        <div className="flex flex-col items-center">
          <TrendingUp className="mb-1" />
          <span className="text-lg font-bold">{display.rpm}</span>
          <span className="text-xs text-muted-foreground">RPM</span>
        </div>
        <div className="flex flex-col items-center">
          <Circle className={`mb-1 ${display.drs ? "text-green-500" : "text-gray-400"}`} />
          <span className="text-lg font-bold">{display.drs ? "ON" : "OFF"}</span>
          <span className="text-xs text-muted-foreground">DRS</span>
        </div>
      </CardContent>
    </Card>
  )
}