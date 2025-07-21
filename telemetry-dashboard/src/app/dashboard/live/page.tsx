"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { OpenF1Service } from "@/lib/api/openf1"
import { TelemetryProvider, useTelemetry } from "@/context/TelemetryDataContext"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

// Dynamically import heavy components
const TelemetryDisplay = dynamic(() => import("@/components/TelemetryDisplay"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const TrackMap = dynamic(() => import("@/components/TrackMap"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const DriverPanel = dynamic(() => import("@/components/DriverPanel"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  loading: () => <div className="h-48 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

// Wrap components that need telemetry data
function LiveTelemetryContent() {
  const { setSelectedDriverNumber } = useTelemetry()
  const [driverOptions, setDriverOptions] = useState<{ number: number, name: string }[]>([])
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const sessionKey = "latest"
  
  // Fetch available drivers for the session
  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    openf1.getDriverInfo("latest").then(drivers => {
      if (Array.isArray(drivers) && drivers.length) {
        const driverOpts = drivers.map(d => ({
          number: d.driver_number,
          name: d.broadcast_name || d.full_name || `Driver #${d.driver_number}`
        }))
        setDriverOptions(driverOpts)
        
        // Set default driver if none selected
        if (!selectedDriver && driverOpts.length > 0) {
          const defaultDriver = driverOpts[0].number
          setSelectedDriver(defaultDriver)
          setSelectedDriverNumber(defaultDriver)
        }
      }
    }).catch(console.error)
  }, [selectedDriver, setSelectedDriverNumber])
  
  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const driverNumber = Number(e.target.value)
    setSelectedDriver(driverNumber)
    setSelectedDriverNumber(driverNumber)
  }
  
  return (
    <div className="flex flex-col gap-4">
      {/* Driver selection and heading */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-start sm:items-center mb-4">
        <h1 className="text-xl font-bold font-formula1">Live Telemetry</h1>
        <div className="w-full sm:w-auto">
          <label htmlFor="driver-select" className="text-sm mr-2 font-formula1">Driver:</label>
          <select 
            id="driver-select"
            className="rounded bg-background border px-2 py-1 text-sm w-full sm:w-auto"
            value={selectedDriver || ""}
            onChange={handleDriverChange}
          >
            {driverOptions.length === 0 ? (
              <option value="">Loading drivers...</option>
            ) : (
              driverOptions.map(d => (
                <option key={d.number} value={d.number}>
                  #{d.number} {d.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      
      {/* Main live content */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
        <div className="col-span-1">
          <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
            <TelemetryDisplay fallbackApiUrl="/api/telemetry/latest" />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
            <TrackMap />
          </Suspense>
          <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
            <DriverPanel />
          </Suspense>
        </div>
        <div className="col-span-1">
          <Suspense fallback={<div className="h-48 bg-muted/30 rounded-md animate-pulse"></div>}>
            <WeatherOverlay />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default function LiveTelemetryPage() {
  const sessionKey = "latest"
  
  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <TelemetryProvider initialSessionKey={sessionKey}>
            <Suspense fallback={<LiveDashboardSkeleton />}>
              <LiveTelemetryContent />
            </Suspense>
          </TelemetryProvider>
        </main>
      </div>
    </>
  )
}

function LiveDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 w-48 bg-muted/30 rounded-md animate-pulse"></div>
        <div className="h-8 w-32 bg-muted/30 rounded-md animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>
          <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>
        </div>
        <div className="h-48 bg-muted/30 rounded-md animate-pulse"></div>
      </div>
    </div>
  )
}