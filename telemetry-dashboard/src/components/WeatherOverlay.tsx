import { CloudRain, Wind } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type WeatherOverlayProps = {
  rainProbability: number // 0-100
  windDirection: string // e.g. "NE", "S"
  windSpeed: number // km/h
}

export function WeatherOverlay({ rainProbability, windDirection, windSpeed }: WeatherOverlayProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Weather</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <CloudRain className="text-blue-500" />
          <span className="font-semibold">{rainProbability}%</span>
          <span className="text-xs text-muted-foreground">Rain</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="text-cyan-500" />
          <span className="font-semibold">{windSpeed} km/h</span>
          <span className="text-xs text-muted-foreground">{windDirection}</span>
        </div>
      </CardContent>
    </Card>
  )
}