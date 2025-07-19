"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge, Zap, Activity, Settings, TrendingUp, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { SpeedometerIcon, ERSIcon } from "@/components/Icons"

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
  const { colors } = useTheme()
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className="w-full max-w-xl mx-auto card-transition card-hover"
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div whileHover={{ rotate: 20 }} transition={{ type: "spring", stiffness: 300 }}>
              <SpeedometerIcon className="w-5 h-5" />
            </motion.div>
            Live Telemetry
            {showRefreshControl && (
              <span className="flex items-center gap-1 ml-2 text-xs text-muted-foreground font-formula1">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {intervalMs}ms
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-6">
          <AnimatePresence>
            {Object.entries(display).map(([key, value]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Your metrics display components */}
              </motion.div>
            ))}
          </AnimatePresence>
          
          <MetricDisplay
            icon={<SpeedometerIcon color={colors.primary} />}
            value={`${display.speed}`}
            unit="km/h"
            label="Speed"
            prevValue={prevData?.speed}
          />
          <MetricDisplay
            icon={<Zap className="mb-1" color={colors.primary} />}
            value={`${display.throttle}`}
            unit="%"
            label="Throttle"
          />
          <MetricDisplay
            icon={<Activity className="mb-1" />}
            value={`${display.brake}`}
            unit="%"
            label="Brake"
          />
          <MetricDisplay
            icon={<Settings className="mb-1" />}
            value={`${display.gear}`}
            unit=""
            label="Gear"
          />
          <MetricDisplay
            icon={<TrendingUp className="mb-1" />}
            value={`${display.rpm}`}
            unit="RPM"
            label="RPM"
          />
          <div className="flex flex-col items-center">
            <div className={`mb-1 ${display.drs ? "text-green-500" : "text-gray-400"}`}>
              <ERSIcon />
            </div>
            <div className="metric-value">
              {display.drs ? "ON" : "OFF"}
            </div>
            <div className="metric-label">DRS</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MetricDisplay({ icon, value, unit, label, prevValue }) {
  // Add animation when values change
  const hasChanged = prevValue !== undefined && prevValue !== value;
  
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1">{icon}</div>
      <motion.div 
        className="metric-value"
        animate={hasChanged ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
        <span className="text-sm ml-1">{unit}</span>
      </motion.div>
      <div className="metric-label">{label}</div>
    </div>
  )
}