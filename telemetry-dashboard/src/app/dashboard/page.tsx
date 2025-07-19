"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import Dashboard from "@/components/Dashboard" 
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"

export default function LiveDashboardPage() {
  const [weather, setWeather] = useState<OpenF1WeatherData | null>(null)
  const sessionKey = "latest"
  const driverNumber = 1 // Default driver
  const driverNumbers = [1, 16, 44] // Default selection of drivers

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
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-hidden">
          <h1 className="sr-only">F1 Telemetry Dashboard</h1>
          <Dashboard
            sessionKey={sessionKey}
            driverNumber={driverNumber}
            driverNumbers={driverNumbers}
          />
        </main>
      </div>
    </>
  )
}