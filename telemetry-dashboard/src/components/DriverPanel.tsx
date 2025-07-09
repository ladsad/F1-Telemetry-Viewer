import { Circle, Zap, Wrench } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type DriverPanelProps = {
  tireCompound: "Soft" | "Medium" | "Hard" | "Inter" | "Wet"
  ers: number // 0-100
  pitStatus: "None" | "Pitting" | "Out Lap" | "In Lap"
}

const compoundColors: Record<string, string> = {
  Soft: "bg-red-500",
  Medium: "bg-yellow-400",
  Hard: "bg-gray-300",
  Inter: "bg-green-500",
  Wet: "bg-blue-500",
}

export function DriverPanel({ tireCompound, ers, pitStatus }: DriverPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver Panel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Circle className={`w-5 h-5 ${compoundColors[tireCompound]}`} />
          <span className="font-semibold">{tireCompound} Tire</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-500" />
          <span className="font-semibold">{ers}%</span>
          <span className="text-xs text-muted-foreground">ERS</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          <span className="font-semibold">{pitStatus}</span>
        </div>
      </CardContent>
    </Card>
  )
}