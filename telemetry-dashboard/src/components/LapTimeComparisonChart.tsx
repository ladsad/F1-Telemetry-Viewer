"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1LapTime, OpenF1DriverInfo } from "@/lib/api/types"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

type LapTimeComparisonChartProps = {
  sessionKey: string
  driverNumbers: number[]
}

type Series = {
  name: string
  color: string
  data: { lap: number; time: number }[]
}

export default function LapTimeComparisonChart({
  sessionKey,
  driverNumbers,
}: LapTimeComparisonChartProps) {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || !driverNumbers.length) return
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
          name: driverName,
          color,
          data: (laps || []).map((l: OpenF1LapTime) => ({
            lap: l.lap_number,
            time: l.lap_time,
          })),
        }
      })
    )
      .then(setSeries)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [sessionKey, driverNumbers])

  // Build chart data: one object per lap, with each driver's time as a key
  const chartData: Record<string, any>[] = []
  if (series.length) {
    const maxLap = Math.max(...series.flatMap((s) => s.data.map((d) => d.lap)))
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry: Record<string, any> = { lap }
      series.forEach((s) => {
        const found = s.data.find((d) => d.lap === lap)
        entry[s.name] = found ? found.time : null
      })
      chartData.push(entry)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Lap Time Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-xs text-muted-foreground">Loading lap times...</div>}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="lap" label={{ value: "Lap", position: "insideBottomRight", offset: -5 }} />
              <YAxis
                label={{ value: "Lap Time (s)", angle: -90, position: "insideLeft" }}
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