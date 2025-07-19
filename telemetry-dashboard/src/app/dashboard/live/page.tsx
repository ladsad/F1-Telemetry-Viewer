"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import TelemetryDisplay from "@/components/TelemetryDisplay"
import TrackMap from "@/components/TrackMap"
import { DriverPanel } from "@/components/DriverPanel"
import { WeatherOverlay } from "@/components/WeatherOverlay"
import { OpenF1Service } from "@/lib/api/openf1"

export default function LiveTelemetryPage() {
  const sessionKey = "latest"
  const [activeDriverNumber, setActiveDriverNumber] = useState<number>(1)
  const [driverOptions, setDriverOptions] = useState<{ number: number, name: string }[]>([])
  
  // Fetch available drivers for the session
  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    openf1.getDriverInfo(sessionKey).then(drivers => {
      if (Array.isArray(drivers) && drivers.length) {
        setDriverOptions(
          drivers.map(d => ({
            number: d.driver_number,
            name: d.broadcast_name || `Driver #${d.driver_number}`
          }))
        )
      }
    }).catch(console.error)
  }, [sessionKey])
  
  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <div className="flex flex-col gap-4">
            {/* Driver selection and heading */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-start sm:items-center mb-4">
              <h1 className="text-xl font-bold font-formula1">Live Telemetry</h1>
              <div className="w-full sm:w-auto">
                <label htmlFor="driver-select" className="text-sm mr-2 font-formula1">Driver:</label>
                <select 
                  id="driver-select"
                  className="rounded bg-background border px-2 py-1 text-sm w-full sm:w-auto"
                  value={activeDriverNumber}
                  onChange={e => setActiveDriverNumber(Number(e.target.value))}
                >
                  {driverOptions.map(d => (
                    <option key={d.number} value={d.number}>
                      #{d.number} {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Main live content */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
              <div className="col-span-1">
                <TelemetryDisplay 
                  sessionKey={sessionKey} 
                  wsUrl="wss://api.example.com/telemetry"
                  fallbackApiUrl="/api/telemetry/latest"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <TrackMap sessionKey={sessionKey} />
                <DriverPanel sessionKey={sessionKey} driverNumber={activeDriverNumber} />
              </div>
              <div className="col-span-1">
                <WeatherOverlay weather={null} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}