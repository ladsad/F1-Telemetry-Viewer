"use client"

import { useState } from "react"
import LapTimeComparisonChart from "@/components/LapTimeComparisonChart"
import DeltaTimeChart from "@/components/DeltaTimeChart"
import RaceProgressScrubBar from "@/components/RaceProgressScrubBar"
import type { AnalyticsMetric, AnalyticsFilter } from "@/lib/api/types"

const METRICS: AnalyticsMetric[] = [
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
  initialDrivers?: number[]
  initialMetric?: string
}

export default function PerformanceAnalyticsDashboard({
  sessionKey,
  initialDrivers = [1, 16, 44],
  initialMetric = "lapTime",
}: Props) {
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>(initialDrivers)
  const [referenceDriver, setReferenceDriver] = useState<number>(initialDrivers[0])
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric)
  const [lap, setLap] = useState(1)

  // Example filter UI (expand as needed)
  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Drivers</label>
          <select
            multiple
            className="rounded px-2 py-1 text-sm border min-w-[120px]"
            value={selectedDrivers.map(String)}
            onChange={e =>
              setSelectedDrivers(
                Array.from(e.target.selectedOptions, opt => Number(opt.value))
              )
            }
          >
            {DRIVER_OPTIONS.map(d => (
              <option key={d.number} value={d.number}>
                #{d.number} {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reference Driver</label>
          <select
            className="rounded px-2 py-1 text-sm border"
            value={referenceDriver}
            onChange={e => setReferenceDriver(Number(e.target.value))}
          >
            {selectedDrivers.map(num => (
              <option key={num} value={num}>
                #{num}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Metric</label>
          <select
            className="rounded px-2 py-1 text-sm border"
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            {METRICS.map(m => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Analytics tools composition */}
      <div>
        {(selectedMetric === "lapTime" || selectedMetric === "all") && (
          <LapTimeComparisonChart
            sessionKey={sessionKey}
            driverNumbers={selectedDrivers}
          />
        )}
        {(selectedMetric === "deltaTime" || selectedMetric === "all") && (
          <DeltaTimeChart
            sessionKey={sessionKey}
            driverNumbers={selectedDrivers}
            referenceDriver={referenceDriver}
          />
        )}
        {(selectedMetric === "raceProgress" || selectedMetric === "all") && (
          <RaceProgressScrubBar
            sessionKey={sessionKey}
            value={lap}
            onChange={setLap}
          />
        )}
      </div>
    </div>
  )
}