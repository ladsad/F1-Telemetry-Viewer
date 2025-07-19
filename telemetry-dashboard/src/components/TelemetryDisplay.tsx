"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gauge, Zap, Activity, Settings, TrendingUp, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { SpeedometerIcon, ERSIcon } from "@/components/Icons"
import AnimatedButton from "@/components/AnimatedButton"

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

export default function TelemetryDisplay(props: TelemetryDisplayProps) {
  const { colors } = useTheme()
  const [data, setData] = useState<TelemetryData | null>(null)
  const [intervalMs, setIntervalMs] = useState(props.refreshIntervalMs)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // Load cached telemetry on mount
  useEffect(() => {
    const cached = loadTelemetryFromCache()
    if (cached) setData(cached)
  }, [])

  // WebSocket connection for real-time telemetry
  useEffect(() => {
    if (!props.wsUrl || !props.sessionKey) return

    const ws = new WebSocket(`${props.wsUrl}?session_key=${props.sessionKey}`)
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
  }, [props.wsUrl, props.sessionKey])

  // Fallback: Poll REST API if no WebSocket or on error
  useEffect(() => {
    if (data || props.wsUrl) return // Prefer WebSocket if available
    if (!props.fallbackApiUrl) return

    let mounted = true
    let interval: NodeJS.Timeout

    const poll = async () => {
      try {
        const res = await fetch(props.fallbackApiUrl)
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
  }, [props.fallbackApiUrl, props.wsUrl, data, intervalMs])

  const display = data || {
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 0,
    drs: false,
    rpm: 0,
  }

  const showRefreshControl = !props.wsUrl && !!props.fallbackApiUrl

  // Touch-friendly refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    // Implement refresh logic here
    setTimeout(() => setIsRefreshing(false), 1000)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card 
        className="w-full card-transition card-hover fade-in" 
        style={{ borderColor: colors.primary, background: colors.primary + "10" }}
      >
        <CardHeader className="p-responsive-md">
          <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
            <CardTitle className="flex items-center gap-2 text-responsive-lg">
              <motion.div 
                whileHover={{ rotate: 20 }} 
                whileTap={{ scale: 0.9, rotate: 40 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <SpeedometerIcon className="w-6 h-6" />
              </motion.div>
              <span>Live Telemetry</span>
            </CardTitle>
            
            <AnimatedButton 
              variant="ghost" 
              size="sm" 
              className="tap-target"
              onClick={handleRefresh} 
              disabled={isRefreshing}
              aria-label="Refresh telemetry data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="ml-1 text-responsive-sm">Refresh</span>
            </AnimatedButton>
          </div>
        </CardHeader>
        
        <CardContent className="p-responsive-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-responsive-md">
            <MetricDisplay
              icon={<SpeedometerIcon color={colors.primary} className="w-7 h-7" />}
              value={`${display.speed}`}
              unit="km/h"
              label="Speed"
              prevValue={prevData?.speed}
            />
            <MetricDisplay
              icon={<Zap className="mb-1 w-6 h-6" color={colors.primary} />}
              value={`${display.throttle}`}
              unit="%"
              label="Throttle"
            />
            <MetricDisplay
              icon={<Activity className="mb-1 w-6 h-6" />}
              value={`${display.brake}`}
              unit="%"
              label="Brake"
            />
            <MetricDisplay
              icon={<Settings className="mb-1 w-6 h-6" />}
              value={`${display.gear}`}
              unit=""
              label="Gear"
            />
            <MetricDisplay
              icon={<TrendingUp className="mb-1 w-6 h-6" />}
              value={`${display.rpm}`}
              unit="RPM"
              label="RPM"
            />
            <div className="flex flex-col items-center justify-center tap-target p-responsive-sm">
              <div 
                className={`mb-1 ${display.drs ? "text-green-500" : "text-gray-400"}`}
                style={{ minHeight: '24px' }}
              >
                <ERSIcon className="w-6 h-6" />
              </div>
              <div className="metric-value">
                {display.drs ? "ON" : "OFF"}
              </div>
              <div className="metric-label">DRS</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MetricDisplay({ icon, value, unit, label, prevValue }) {
  const hasChanged = prevValue !== undefined && prevValue !== value;
  
  return (
    <div className="flex flex-col items-center justify-center tap-target p-responsive-sm">
      <div className="mb-1" style={{ minHeight: '24px' }}>{icon}</div>
      <motion.div 
        className="metric-value"
        animate={hasChanged ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
        <span className="ml-1 text-responsive-xs">{unit}</span>
      </motion.div>
      <div className="metric-label">{label}</div>
    </div>
  )
}