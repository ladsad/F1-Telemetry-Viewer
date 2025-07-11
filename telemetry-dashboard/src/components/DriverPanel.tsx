"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Circle, Zap, Wrench } from "lucide-react"
import type { OpenF1DriverStatus } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import DriverPerformanceMetrics from "@/components/DriverPerformanceMetrics"
import TireStrategyChart from "@/components/TireStrategyChart"
import DriverRadio from "@/components/DriverRadio"

const compoundColors: Record<string, string> = {
  Soft: "bg-red-500",
  Medium: "bg-yellow-400",
  Hard: "bg-gray-300",
  Inter: "bg-green-500",
  Wet: "bg-blue-500",
}

type DriverPanelProps = {
  sessionKey: string
  driverNumber: number
}

export function DriverPanel({ sessionKey, driverNumber }: DriverPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<OpenF1DriverStatus | null>(null)

  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    let mounted = true
    async function fetchStatus() {
      try {
        const data = await openf1.getDriverStatus(sessionKey, driverNumber)
        if (mounted) setStatus(data)
      } catch {
        if (mounted) setStatus(null)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [sessionKey, driverNumber])

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Driver Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No driver data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">{status.driver_name}</span>
          <span className="text-xs text-muted-foreground">#{status.driver_number}</span>
        </div>
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Circle className={`w-5 h-5 ${compoundColors[status.tire_compound] || "bg-gray-200"}`} />
          <span className="font-semibold">{status.tire_compound} Tire</span>
          <span className="text-xs text-muted-foreground">({status.tire_age} laps)</span>
        </div>
        {expanded && (
          <>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">{status.ers}%</span>
              <span className="text-xs text-muted-foreground">ERS</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              <span className="font-semibold">{status.pit_status}</span>
              <span className="text-xs text-muted-foreground">{status.last_pit ? `Last: Lap ${status.last_pit}` : ""}</span>
            </div>
            {/* Performance metrics */}
            <DriverPerformanceMetrics sessionKey={sessionKey} driverNumber={driverNumber} />
            {/* Tire strategy visualization */}
            <TireStrategyChart sessionKey={sessionKey} driverNumber={driverNumber} />
            {/* Driver radio messages */}
            <DriverRadio sessionKey={sessionKey} driverNumber={driverNumber} />
          </>
        )}
      </CardContent>
    </Card>
  )
}