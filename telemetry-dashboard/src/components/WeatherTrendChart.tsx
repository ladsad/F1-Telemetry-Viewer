"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { OpenF1WeatherData, OpenF1WeatherTimeSeries } from "@/lib/api/types"

// Simple SVG line chart for weather trends
function LineChart({
  data,
  label,
  color = "#3b82f6",
  valueKey,
  unit,
}: {
  data: { date: string; [key: string]: number }[]
  label: string
  color?: string
  valueKey: string
  unit?: string
}) {
  if (!data.length) return null
  const values = data.map(d => d[valueKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 280 + 10
    const y = 60 - ((d[valueKey] - min) / (max - min || 1)) * 40 + 10
    return `${x},${y}`
  })
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <svg width={300} height={80}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={points.join(" ")}
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 280 + 10
          const y = 60 - ((d[valueKey] - min) / (max - min || 1)) * 40 + 10
          return (
            <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
          )
        })}
      </svg>
      <div className="flex justify-between w-full text-xs text-muted-foreground mt-1">
        <span>{new Date(data[0].date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Min: {min}{unit} &nbsp; Max: {max}{unit}
      </div>
    </div>
  )
}

type WeatherTrendChartProps = {
  sessionKey: string
}

export default function WeatherTrendChart({ sessionKey }: WeatherTrendChartProps) {
  const [hourly, setHourly] = useState<OpenF1WeatherTimeSeries[]>([])
  const [historic, setHistoric] = useState<OpenF1WeatherTimeSeries[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchWeatherTrends() {
      setLoading(true)
      try {
        // Fetch hourly and historic weather data from OpenF1 or a secondary API
        const resHourly = await fetch(`/api/weather/hourly?session_key=${sessionKey}`)
        const resHistoric = await fetch(`/api/weather/historic?session_key=${sessionKey}`)
        const hourlyData = resHourly.ok ? await resHourly.json() : []
        const historicData = resHistoric.ok ? await resHistoric.json() : []
        setHourly(hourlyData)
        setHistoric(historicData)
      } finally {
        setLoading(false)
      }
    }
    fetchWeatherTrends()
  }, [sessionKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-xs text-muted-foreground">Loading weather trends...</div>}
        {!loading && (
          <div className="flex flex-col gap-4">
            <LineChart
              data={hourly}
              label="Hourly Air Temp (°C)"
              color="#f59e42"
              valueKey="air_temperature"
              unit="°C"
            />
            <LineChart
              data={hourly}
              label="Hourly Rainfall (mm)"
              color="#3b82f6"
              valueKey="rainfall"
              unit="mm"
            />
            <LineChart
              data={historic}
              label="Historic Track Temp (°C)"
              color="#fbbf24"
              valueKey="track_temperature"
              unit="°C"
            />
            <LineChart
              data={historic}
              label="Historic Wind Speed (km/h)"
              color="#06b6d4"
              valueKey="wind_speed"
              unit="km/h"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}