"use client"

import { useEffect, useState } from "react"
import { WeatherOverlay } from "@/components/WeatherOverlay"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"

export default function LiveDashboardPage() {
  const [weather, setWeather] = useState<OpenF1WeatherData | null>(null)
  const sessionKey = "latest" // Or get from context/props

  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    let mounted = true
    async function fetchWeather() {
      try {
        const data = await openf1.getWeather(sessionKey)
        if (mounted && Array.isArray(data) && data.length > 0) {
          setWeather(data[data.length - 1])
        }
      } catch {
        setWeather(null)
      }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 10000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [sessionKey])

  return (
    <main>
      <WeatherOverlay weather={weather} />
      {/* ...other dashboard components... */}
    </main>
  )
}