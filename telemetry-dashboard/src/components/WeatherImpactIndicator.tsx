"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { WeatherData } from "@/types"

// Change the prop name from weatherData to weather
export default function WeatherImpactIndicator({
  weather,
  impact,
}: {
  weather: WeatherData
  impact: {
    rain: { timeLoss: number }
    temp: { timeLoss: number }
    wind: { timeLoss: number }
    total: number
    avgLap: number
  }
}) {
  // Impact calculation is already done in the parent, we just display it here

  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4">
        <h3 className="text-sm font-semibold mb-2">Weather Impact Analysis</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs">Rainfall Impact</span>
              <span className="text-xs font-semibold">
                +{impact.rain.timeLoss.toFixed(2)}s
              </span>
            </div>
            <Progress
              value={Math.min(impact.rain.timeLoss * 10, 100)}
              className="h-1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs">Temperature Impact</span>
              <span className="text-xs font-semibold">
                +{impact.temp.timeLoss.toFixed(2)}s
              </span>
            </div>
            <Progress
              value={Math.min(impact.temp.timeLoss * 10, 100)}
              className="h-1"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs">Wind Impact</span>
              <span className="text-xs font-semibold">
                +{impact.wind.timeLoss.toFixed(2)}s
              </span>
            </div>
            <Progress
              value={Math.min(impact.wind.timeLoss * 10, 100)}
              className="h-1"
            />
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold">
                Estimated Lap Time Impact
              </span>
              <span className="text-sm font-bold">
                +{impact.avgLap.toFixed(2)}s
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}