"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1LapTime, OpenF1DeltaTime, OpenF1DriverInfo } from "@/lib/api/types"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

type DeltaTimeChartProps = {
  sessionKey: string
  driverNumbers: number[]
  referenceDriver?: number // If not provided, use the first driver as reference
}

export default function DeltaTimeChart({
  sessionKey,
  driverNumbers,
  referenceDriver,
}: DeltaTimeChartProps) {
  const [series, setSeries] = useState<{ name: string; color: string; data: { lap: number; delta: number }[] }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || driverNumbers.length < 2) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    Promise.all(
      driverNumbers.map(async (driverNumber) => {
        const [laps, info] = await Promise.all([
          openf1.getLapTimes(sessionKey, driverNumber),
          openf1.getDriverInfo(sessionKey, driverNumber),
        ])
        const driverName =
          (Array.isArray(info) ? info[0]?.broadcast_name : info?.broadcast_name) ||
          `#${driverNumber}`
        const color =
          (Array.isArray(info) ? info[0]?.color : info?.color) ||
          "#8884d8"
        return {
          driverNumber,
          name: driverName,
          color,
          laps: laps || [],
        }
      })
    )
      .then((driverData) => {
        // Reference is first driver unless specified
        const refIdx = referenceDriver
          ? driverData.findIndex(d => d.driverNumber === referenceDriver)
          : 0
        const refLaps = driverData[refIdx]?.laps || []
        const refName = driverData[refIdx]?.name || "Reference"
        // Build delta series for each driver (except reference)
        const allSeries = driverData
          .filter((_, i) => i !== refIdx)
          .map((d) => {
            const data = d.laps.map((lap, idx) => {
              const refLap = refLaps.find(l => l.lap_number === lap.lap_number)
              const delta = refLap ? lap.lap_time - refLap.lap_time : null
              return { lap: lap.lap_number, delta }
            }).filter(d => d.delta !== null)
            return {
              name: `${d.name} vs ${refName}`,
              color: d.color,
              data,
            }
          })
        setSeries(allSeries)
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [sessionKey, driverNumbers, referenceDriver])

  // Build chart data: one object per lap, with each delta as a key
  const chartData: Record<string, any>[] = []
  if (series.length) {
    const maxLap = Math.max(...series.flatMap((s) => s.data.map((d) => d.lap)))
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry: Record<string, any> = { lap }
      series.forEach((s) => {
        const found = s.data.find((d) => d.lap === lap)
        entry[s.name] = found ? found.delta : null
      })
      chartData.push(entry)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Delta Time Chart</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-xs text-muted-foreground">Loading delta times...</div>}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="lap" label={{ value: "Lap", position: "insideBottomRight", offset: -5 }} />
              <YAxis
                label={{ value: "Delta (s)", angle: -90, position: "insideLeft" }}
                domain={["auto", "auto"]}
                allowDecimals={true}
              />
              <Tooltip />
              <Legend />
              {series.map((s) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}