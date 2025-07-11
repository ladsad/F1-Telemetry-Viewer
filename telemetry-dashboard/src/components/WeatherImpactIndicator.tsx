import { CloudRain, Thermometer, Wind } from "lucide-react"
import type { OpenF1WeatherData, WeatherImpactEstimate } from "@/lib/api/types"

type WeatherImpactIndicatorProps = {
  weather: OpenF1WeatherData | null
  impact: WeatherImpactEstimate | null
}

export default function WeatherImpactIndicator({ weather, impact }: WeatherImpactIndicatorProps) {
  if (!weather || !impact) return null

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center gap-2 text-xs">
        <CloudRain className="w-4 h-4 text-blue-500" />
        Rain Impact:{" "}
        <span className={impact.rain.timeLoss > 0 ? "text-red-500" : "text-green-500"}>
          {impact.rain.timeLoss > 0 ? "+" : ""}
          {impact.rain.timeLoss.toFixed(2)}s/lap
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Thermometer className="w-4 h-4 text-orange-500" />
        Temp Impact:{" "}
        <span className={impact.temp.timeLoss > 0 ? "text-red-500" : "text-green-500"}>
          {impact.temp.timeLoss > 0 ? "+" : ""}
          {impact.temp.timeLoss.toFixed(2)}s/lap
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Wind className="w-4 h-4 text-cyan-500" />
        Wind Impact:{" "}
        <span className={impact.wind.timeLoss > 0 ? "text-red-500" : "text-green-500"}>
          {impact.wind.timeLoss > 0 ? "+" : ""}
          {impact.wind.timeLoss.toFixed(2)}s/lap
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        <span className="font-semibold">Est. Total Impact: </span>
        <span className={impact.total > 0 ? "text-red-500" : "text-green-500"}>
          {impact.total > 0 ? "+" : ""}
          {impact.total.toFixed(2)}s/lap
        </span>
      </div>
    </div>
  )
}