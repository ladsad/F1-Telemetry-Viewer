import { useState, useEffect } from "react"
import { WeatherOverlay } from "@/components/WeatherOverlay"
import { DriverPanel } from "@/components/DriverPanel"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import TelemetryDisplay from "@/components/TelemetryDisplay"

// 1. Telemetry data interface
interface TelemetryData {
  speed: number
  throttle: number
  brake: number
  gear: number
  drs: boolean
  rpm: number
}

// 2. Dummy lap time data for two drivers (in seconds)
const lapsA = [88.2, 87.9, 88.5, 87.7, 88.1]
const lapsB = [89.1, 88.8, 88.6, 88.0, 88.3]

// Team color themes
const TEAM_THEMES = {
  Ferrari: "from-red-700 to-red-400",
  Mercedes: "from-gray-700 to-teal-400",
  RedBull: "from-indigo-900 to-yellow-400",
  McLaren: "from-orange-600 to-yellow-300",
  Alpine: "from-blue-800 to-blue-300",
}

function LapTimeComparison() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lap Time Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Driver A</span>
            <span>Driver B</span>
          </div>
          <div className="flex flex-col gap-1">
            {lapsA.map((lap, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 text-right">{lap.toFixed(2)}s</span>
                <div className="flex-1 h-2 bg-blue-200 rounded">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{ width: `${(88.5 - lap) * 100}px` }}
                  />
                </div>
                <span className="w-12 text-right">{lapsB[i].toFixed(2)}s</span>
                <div className="flex-1 h-2 bg-red-200 rounded">
                  <div
                    className="h-2 bg-red-500 rounded"
                    style={{ width: `${(89.1 - lapsB[i]) * 100}px` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RaceProgressScrubBar() {
  const [lap, setLap] = useState(1)
  const totalLaps = 5

  return (
    <Card>
      <CardHeader>
        <CardTitle>Race Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Slider
            min={1}
            max={totalLaps}
            step={1}
            value={[lap]}
            onValueChange={([v]) => setLap(v)}
          />
          <div className="text-xs text-muted-foreground mt-2">
            Lap {lap} / {totalLaps}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardSidebar() {
  const [team, setTeam] = useState<keyof typeof TEAM_THEMES>("Ferrari")

  // 3. Simulate live telemetry data
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speed: 280,
    throttle: 92,
    brake: 8,
    gear: 7,
    drs: true,
    rpm: 12800,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        speed: Math.max(0, Math.min(350, prev.speed + (Math.random() - 0.5) * 10)),
        throttle: Math.max(0, Math.min(100, prev.throttle + (Math.random() - 0.5) * 5)),
        brake: Math.max(0, Math.min(100, prev.brake + (Math.random() - 0.5) * 10)),
        gear: Math.max(1, Math.min(8, prev.gear + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
        drs: Math.random() > 0.8 ? !prev.drs : prev.drs,
        rpm: Math.max(5000, Math.min(15000, prev.rpm + (Math.random() - 0.5) * 200)),
      }))
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`min-h-screen w-full bg-gradient-to-br ${TEAM_THEMES[team]} transition-colors duration-500`}
    >
      <div className="flex flex-col gap-4 max-w-xl mx-auto p-4 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-semibold text-sm text-white">Team Theme:</span>
          <select
            className="rounded px-2 py-1 text-sm bg-white/80 text-black"
            value={team}
            onChange={e => setTeam(e.target.value as keyof typeof TEAM_THEMES)}
          >
            {Object.keys(TEAM_THEMES).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <TelemetryDisplay data={telemetry} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeatherOverlay rainProbability={42} windDirection="NE" windSpeed={18} />
          <DriverPanel tireCompound="Soft" ers={67} pitStatus="None" />
        </div>
        <LapTimeComparison />
        <RaceProgressScrubBar />
      </div>
    </div>
  )
}