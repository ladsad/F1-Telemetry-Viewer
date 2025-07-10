import { Card, CardContent } from "@/components/ui/card"

type LapCounterProps = {
  currentLap: number
  totalLaps: number
}

export default function LapCounter({ currentLap, totalLaps }: LapCounterProps) {
  return (
    <Card className="inline-block mb-2">
      <CardContent className="py-2 px-4 flex items-center gap-2">
        <span className="font-bold text-lg">{currentLap}</span>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-sm">{totalLaps} Laps</span>
      </CardContent>
    </Card>
  )
}