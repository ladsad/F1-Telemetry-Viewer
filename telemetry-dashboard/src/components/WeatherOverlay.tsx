"use client"

import { CloudRain, Wind, Thermometer } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { OpenF1WeatherData } from "@/lib/api/types"
import WeatherTrendChart from "@/components/WeatherTrendChart"
import WeatherAlert from "@/components/WeatherAlert"
import WeatherImpactIndicator from "@/components/WeatherImpactIndicator"
import { useEffect, useState } from "react"
import { estimateWeatherImpact } from "@/lib/api/openf1"
import { useTheme } from "@/components/ThemeProvider"

type WeatherOverlayProps = {
  weather: OpenF1WeatherData | null
}

export function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const { colors } = useTheme()
  const [impact, setImpact] = useState<import("@/lib/api/types").WeatherImpactEstimate | null>(null)

  useEffect(() => {
    if (!weather?.session_key) return
    estimateWeatherImpact(weather.session_key).then(setImpact)
  }, [weather?.session_key])

  if (!weather) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm font-formula1">No weather data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="mb-4"
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="w-5 h-5" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WeatherAlert sessionKey={weather?.session_key || "latest"} latestWeather={weather} />
        <div className="flex flex-wrap items-center gap-6 timing-display">
          <div className="flex items-center gap-2">
            <CloudRain className="text-blue-500" />
            <span className="font-semibold">{weather.rainfall ?? 0} mm</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Rainfall</span>
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="text-orange-500" />
            <span className="font-semibold">{weather.air_temperature}°C</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Air</span>
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="text-yellow-500" />
            <span className="font-semibold">{weather.track_temperature}°C</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Track</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="text-cyan-500" />
            <span className="font-semibold">{weather.wind_speed} km/h</span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{weather.wind_direction}</span>
          </div>
        </div>
        <WeatherImpactIndicator weather={weather} impact={impact} />
      </CardContent>
      <div className="mt-4">
        <WeatherTrendChart sessionKey={weather?.session_key || "latest"} />
      </div>
    </Card>
  )
}