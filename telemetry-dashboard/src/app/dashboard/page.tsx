"use client"

import { useEffect, useState } from "react"
import { WeatherOverlay } from "@/components/WeatherOverlay"
import { DriverPanel } from "@/components/DriverPanel"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"
import LapTimeComparisonChart from "@/components/LapTimeComparisonChart"

export default function LiveDashboardPage() {
  const [weather, setWeather] = useState<OpenF1WeatherData | null>(null)
  const sessionKey = "latest"
  const driverNumber = 1 // Replace with selected driver or context
  const driverNumbers = [1, 16, 44] // Replace with selected drivers

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
      <DriverPanel sessionKey={sessionKey} driverNumber={driverNumber} />
      <LapTimeComparisonChart sessionKey={sessionKey} driverNumbers={driverNumbers} />
      {/* ...other dashboard components... */}
    </main>
  )
}