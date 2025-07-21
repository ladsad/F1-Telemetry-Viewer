"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { OpenF1WeatherData, OpenF1WeatherTimeSeries } from "@/lib/api/types"
import { WeatherTrendChartProps } from "@/types"

type LineChartProps = {
  data: any[]
  label: string
  color: string
  valueKey: string
  unit: string
}

// Simple SVG line chart for weather trends
function CustomLineChart({
  data,
  label,
  color = "#3b82f6",
  valueKey,
  unit,
}: LineChartProps) {
  if (!data.length) return null
  const values = data.map(d => d[valueKey])
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[min, max]} />
          <Tooltip
            contentStyle={{ backgroundColor: "white", borderRadius: "4px", border: "1px solid #ddd" }}
            labelStyle={{ display: "none" }}
            itemStyle={{ color: "#333", fontSize: "12px" }}
          />
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
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
            <CustomLineChart
              data={hourly}
              label="Hourly Air Temp (°C)"
              color="#f59e42"
              valueKey="air_temperature"
              unit="°C"
            />
            <CustomLineChart
              data={hourly}
              label="Hourly Rainfall (mm)"
              color="#3b82f6"
              valueKey="rainfall"
              unit="mm"
            />
            <CustomLineChart
              data={historic}
              label="Historic Track Temp (°C)"
              color="#fbbf24"
              valueKey="track_temperature"
              unit="°C"
            />
            <CustomLineChart
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