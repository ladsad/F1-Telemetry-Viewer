"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, CloudRain, Wind, Thermometer } from "lucide-react"
import type { OpenF1WeatherAlert, OpenF1WeatherData } from "@/lib/api/types"

type WeatherAlertProps = {
  sessionKey: string
  latestWeather: OpenF1WeatherData | null
}

const DEFAULT_THRESHOLDS = {
  rainfall: 0.1, // mm
  airTempSpike: 3, // °C
  windGust: 10, // km/h
}

export default function WeatherAlert({ sessionKey, latestWeather }: WeatherAlertProps) {
  const [alert, setAlert] = useState<OpenF1WeatherAlert | null>(null)
  const prevWeather = useRef<OpenF1WeatherData | null>(null)

  useEffect(() => {
    if (!latestWeather) return
    const prev = prevWeather.current
    let newAlert: OpenF1WeatherAlert | null = null

    if (prev) {
      // Rain start
      if (prev.rainfall < DEFAULT_THRESHOLDS.rainfall && latestWeather.rainfall >= DEFAULT_THRESHOLDS.rainfall) {
        newAlert = {
          type: "rain_start",
          message: "Rain has started on track!",
          icon: <CloudRain className="text-blue-500 inline mr-1" />,
        }
      }
      // Air temp spike
      else if (latestWeather.air_temperature - prev.air_temperature >= DEFAULT_THRESHOLDS.airTempSpike) {
        newAlert = {
          type: "temp_spike",
          message: `Air temperature spiked to ${latestWeather.air_temperature}°C!`,
          icon: <Thermometer className="text-orange-500 inline mr-1" />,
        }
      }
      // Wind gust
      else if (latestWeather.wind_speed - prev.wind_speed >= DEFAULT_THRESHOLDS.windGust) {
        newAlert = {
          type: "wind_gust",
          message: `Wind gust: ${latestWeather.wind_speed} km/h (${latestWeather.wind_direction})`,
          icon: <Wind className="text-cyan-500 inline mr-1" />,
        }
      }
    }
    prevWeather.current = latestWeather
    setAlert(newAlert)
    // Auto-clear alert after 10s
    if (newAlert) {
      const timeout = setTimeout(() => setAlert(null), 10000)
      return () => clearTimeout(timeout)
    }
  }, [latestWeather])

  if (!alert) return null

  return (
    <div className="mb-2 px-4 py-2 rounded bg-yellow-100 dark:bg-yellow-900 flex items-center gap-2 shadow">
      <AlertTriangle className="text-yellow-500" />
      {alert.icon}
      <span className="font-semibold">{alert.message}</span>
    </div>
  )
}