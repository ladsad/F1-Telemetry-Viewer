"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { OpenF1TireStint } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import { useTheme } from "@/components/ThemeProvider"

const compoundColors: Record<string, string> = {
  Soft: "#ef4444",
  Medium: "#fde047",
  Hard: "#d1d5db",
  Inter: "#22c55e",
  Wet: "#3b82f6",
}

type TireStrategyChartProps = {
  sessionKey: string
  driverNumber: number
}

export default function TireStrategyChart({ sessionKey, driverNumber }: TireStrategyChartProps) {
  const { colors } = useTheme()
  const [stints, setStints] = useState<OpenF1TireStint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || !driverNumber) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    openf1.getTireStints(sessionKey, driverNumber)
      .then((data) => {
        setStints(data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setLoading(false)
      })
  }, [sessionKey, driverNumber])

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading tire strategy...</div>
  }
  if (error) {
    return <div className="text-xs text-destructive">{error}</div>
  }
  if (!stints.length) {
    return <div className="text-xs text-muted-foreground">No tire stint data available.</div>
  }

  // Calculate total laps for scaling
  const totalLaps = Math.max(...stints.map(s => s.end_lap))

  return (
    <Card
      className="mt-2"
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader>
        <CardTitle>Tire Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs mb-2">
            {Object.entries(compoundColors).map(([compound, color]) => (
              <span key={compound} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
                {compound}
              </span>
            ))}
          </div>
          <svg width={320} height={32}>
            {stints.map((stint, i) => {
              const x = (stint.start_lap - 1) / totalLaps * 300 + 10
              const width = ((stint.end_lap - stint.start_lap + 1) / totalLaps) * 300
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={8}
                    width={width}
                    height={16}
                    fill={compoundColors[stint.compound] || "#888"}
                    rx={4}
                  />
                  <text
                    x={x + width / 2}
                    y={20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#222"
                  >
                    {stint.compound}
                  </text>
                </g>
              )
            })}
            {/* Lap markers */}
            <text x={10} y={30} fontSize={9} fill="#888">Lap 1</text>
            <text x={310} y={30} fontSize={9} fill="#888">Lap {totalLaps}</text>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}