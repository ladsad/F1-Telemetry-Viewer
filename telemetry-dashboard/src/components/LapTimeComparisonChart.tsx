"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1LapTime, OpenF1DriverInfo } from "@/lib/api/types"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useTheme } from "@/components/ThemeProvider"
import { Clock } from "lucide-react"

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
  const { colors } = useTheme()
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Lap Time Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-xs text-muted-foreground font-formula1">Loading lap times...</div>}
        {error && <div className="text-xs text-destructive font-formula1">{error}</div>}
        {!loading && !error && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis 
                dataKey="lap" 
                label={{ value: "LAP", position: "insideBottomRight", offset: -5 }}
                tick={{ fontFamily: "Formula1" }}
              />
              <YAxis
                label={{ value: "LAP TIME (s)", angle: -90, position: "insideLeft", fontFamily: "Formula1" }}
                domain={["auto", "auto"]}
                allowDecimals={true}
                tick={{ fontFamily: "Formula1" }}
              />
              <Tooltip contentStyle={{ fontFamily: "Formula1" }} />
              <Legend wrapperStyle={{ fontFamily: "Formula1", textTransform: "uppercase" }} />
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