"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { useTelemetry } from "@/context/TelemetryDataContext"

// Dynamically import heavy chart components
const LapTimeComparisonChart = dynamic(
  () => import("@/components/LapTimeComparisonChart"),
  {
    loading: () => <ChartSkeleton height="300px" label="Loading lap time comparison..." />,
    ssr: false
  }
)

const DeltaTimeChart = dynamic(
  () => import("@/components/DeltaTimeChart"),
  {
    loading: () => <ChartSkeleton height="300px" label="Loading delta times..." />,
    ssr: false
  }
)

const RaceProgressScrubBar = dynamic(
  () => import("@/components/RaceProgressScrubBar"),
  {
    loading: () => <ChartSkeleton height="150px" label="Loading race progress..." />,
    ssr: false
  }
)

// Simple loading skeleton for chart components
function ChartSkeleton({ height = "300px", label = "Loading..." }) {
  return (
    <div className="rounded-md border p-4 my-4">
      <div className="flex flex-col items-center justify-center" style={{ height }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-primary animate-spin mb-2"></div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

const METRICS = [
  { key: "lapTime", label: "Lap Time Comparison" },
  { key: "deltaTime", label: "Delta Time Chart" },
  { key: "raceProgress", label: "Race Progress Scrub Bar" },
]

const DRIVER_OPTIONS = [
  { number: 1, name: "Verstappen" },
  { number: 16, name: "Leclerc" },
  { number: 44, name: "Hamilton" },
  // Add more as needed or fetch dynamically
]

type Props = {
  sessionKey: string
  initialMetric?: string
}

export default function PerformanceAnalyticsDashboard({
  sessionKey,
  initialMetric = "lapTime",
}: Props) {
  const { telemetryState } = useTelemetry()
  const { raceProgress } = telemetryState
  
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([1, 16, 44])
  const [referenceDriver, setReferenceDriver] = useState<number>(1)
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric)
  const [lap, setLap] = useState(raceProgress.currentLap || 1)
  
  // Update lap when race progress changes
  useEffect(() => {
    setLap(raceProgress.currentLap || 1)
  }, [raceProgress.currentLap])

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6 items-start md:items-end">
        <div className="w-full md:w-auto">
          <label className="block text-sm font-formula1 font-medium mb-1 uppercase tracking-wider">Drivers</label>
          <select
            multiple
            className="rounded px-2 py-1 text-sm border w-full md:min-w-[120px] font-formula1"
            value={selectedDrivers.map(String)}
            onChange={e =>
              setSelectedDrivers(
                Array.from(e.target.selectedOptions, opt => Number(opt.value))
              )
            }
          >
            {DRIVER_OPTIONS.map(d => (
              <option key={d.number} value={d.number} className="font-formula1">
                #{d.number} {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-sm font-formula1 font-medium mb-1 uppercase tracking-wider">Reference Driver</label>
          <select
            className="rounded px-2 py-1 text-sm border w-full font-formula1"
            value={referenceDriver}
            onChange={e => setReferenceDriver(Number(e.target.value))}
          >
            {selectedDrivers.map(num => (
              <option key={num} value={num} className="font-formula1">
                #{num}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-sm font-formula1 font-medium mb-1 uppercase tracking-wider">Metric</label>
          <select
            className="rounded px-2 py-1 text-sm border w-full font-formula1"
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            {METRICS.map(m => (
              <option key={m.key} value={m.key} className="font-formula1">
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Analytics tools composition */}
      <div className="space-y-6">
        {(selectedMetric === "lapTime" || selectedMetric === "all") && (
          <Suspense fallback={<ChartSkeleton height="300px" label="Loading lap time comparison..." />}>
            <LapTimeComparisonChart
              sessionKey={sessionKey}
              driverNumbers={selectedDrivers}
            />
          </Suspense>
        )}
        
        {(selectedMetric === "deltaTime" || selectedMetric === "all") && (
          <Suspense fallback={<ChartSkeleton height="300px" label="Loading delta times..." />}>
            <DeltaTimeChart
              sessionKey={sessionKey}
              driverNumbers={selectedDrivers}
              referenceDriver={referenceDriver}
            />
          </Suspense>
        )}
        
        {(selectedMetric === "raceProgress" || selectedMetric === "all") && (
          <Suspense fallback={<ChartSkeleton height="150px" label="Loading race progress..." />}>
            <RaceProgressScrubBar
              sessionKey={sessionKey}
              value={lap}
              onChange={setLap}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}