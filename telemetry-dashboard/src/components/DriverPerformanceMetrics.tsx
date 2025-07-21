"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"
import { useTheme } from "@/components/ThemeProvider"
import { DriverPerformanceMetricsProps, OpenF1LapTime, OpenF1SectorTiming } from "@/types"

export default function DriverPerformanceMetrics({ sessionKey, driverNumber }: DriverPerformanceMetricsProps) {
  const { colors } = useTheme()
  const [lapTimes, setLapTimes] = useState<OpenF1LapTime[]>([])
  const [sectorTimes, setSectorTimes] = useState<OpenF1SectorTiming[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || !driverNumber) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    Promise.all([
      openf1.getLapTimes(sessionKey, driverNumber),
      openf1.getSectorTimings(sessionKey, driverNumber),
    ])
      .then(([laps, sectors]) => {
        setLapTimes(laps || [])
        setSectorTimes(sectors || [])
        setLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setLoading(false)
      })
  }, [sessionKey, driverNumber])

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading performance metrics...</div>
  }
  if (error) {
    return <div className="text-xs text-destructive">{error}</div>
  }
  if (!lapTimes.length) {
    return <div className="text-xs text-muted-foreground">No lap data available.</div>
  }

  // Lap time summary
  const bestLap = Math.min(...lapTimes.map(l => l.lap_time))
  const avgLap = lapTimes.reduce((a, b) => a + b.lap_time, 0) / lapTimes.length

  // Sector analysis
  const sectorStats = [1, 2, 3].map(sectorNum => {
    const sectorLaps = sectorTimes.filter(s => s.sector === sectorNum)
    if (!sectorLaps.length) return null
    const best = Math.min(...sectorLaps.map(s => s.sector_time))
    const avg = sectorLaps.reduce((a, b) => a + b.sector_time, 0) / sectorLaps.length
    return { sector: sectorNum, best, avg }
  })

  return (
    <Card
      className="mt-2 w-full h-full"
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <span className="font-semibold">Best Lap:</span>{" "}
          <span className="font-mono">{bestLap.toFixed(3)}s</span>
          <span className="ml-4 font-semibold">Avg Lap:</span>{" "}
          <span className="font-mono">{avgLap.toFixed(3)}s</span>
        </div>
        <div className="flex gap-4">
          {sectorStats.map(
            (s, i) =>
              s && (
                <div key={i} className="flex flex-col items-center">
                  <span className="font-semibold">Sector {s.sector}</span>
                  <span className="text-xs text-muted-foreground">Best</span>
                  <span className="font-mono">{s.best.toFixed(3)}s</span>
                  <span className="text-xs text-muted-foreground">Avg</span>
                  <span className="font-mono">{s.avg.toFixed(3)}s</span>
                </div>
              )
          )}
        </div>
      </CardContent>
    </Card>
  )
}