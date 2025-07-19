import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import TelemetryDisplay from "@/components/TelemetryDisplay"
import TrackMap from "@/components/TrackMap"
import { DriverPanel } from "@/components/DriverPanel"
import LapTimeComparisonChart from "@/components/LapTimeComparisonChart"
import RaceProgressScrubBar from "@/components/RaceProgressScrubBar"
import { WeatherOverlay } from "@/components/WeatherOverlay"
import { useTheme } from "@/components/ThemeProvider"

type DashboardProps = {
  sessionKey: string
  driverNumber: number
  driverNumbers: number[]
}

export default function Dashboard({ sessionKey, driverNumber, driverNumbers }: DashboardProps) {
  const { colors } = useTheme()
  
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
      {/* Live Telemetry - Full width on all screens */}
      <div className="col-span-1">
        <TelemetryDisplay 
          sessionKey={sessionKey} 
          wsUrl="wss://api.example.com/telemetry"
          fallbackApiUrl="/api/telemetry/latest"
        />
      </div>

      {/* Two-panel row that stacks on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 col-span-1">
        <TrackMap sessionKey={sessionKey} />
        <WeatherOverlay weather={null} />
      </div>

      {/* Driver panel and tools that stack on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 col-span-1">
        {/* Driver panel */}
        <div className="col-span-1">
          <DriverPanel sessionKey={sessionKey} driverNumber={driverNumber} />
        </div>

        {/* Interactive tools */}
        <div className="col-span-1">
          <Card style={{ borderColor: colors.primary, background: colors.primary + "10" }}>
            <CardHeader>
              <CardTitle>Interactive Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <RaceProgressScrubBar 
                sessionKey={sessionKey} 
                value={1} 
                onChange={(lap) => console.log(`Lap changed: ${lap}`)} 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full width comparison chart */}
      <div className="col-span-1">
        <LapTimeComparisonChart 
          sessionKey={sessionKey} 
          driverNumbers={driverNumbers} 
        />
      </div>
    </div>
  )
}