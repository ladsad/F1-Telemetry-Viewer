import { useState, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/components/ThemeProvider"
import dynamic from "next/dynamic"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

// Dynamically import components
const TelemetryDisplay = dynamic(() => import("@/components/TelemetryDisplay"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const TrackMap = dynamic(() => import("@/components/TrackMap"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  loading: () => <div className="h-48 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

const DriverPanel = dynamic(() => import("@/components/DriverPanel"), {
  loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>,
  ssr: false
})

// Interactive components - only load when used
const LapTimeComparisonChart = dynamic(() => import("@/components/LapTimeComparisonChart"), {
  ssr: false
})

const RaceProgressScrubBar = dynamic(() => import("@/components/RaceProgressScrubBar"), {
  ssr: false
})

type DashboardProps = {
  sessionKey: string
  driverNumber: number
  driverNumbers: number[]
}

export default function Dashboard({ sessionKey, driverNumber, driverNumbers }: DashboardProps) {
  const { colors } = useTheme()
  const [showComparison, setShowComparison] = useState(false)
  
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6">
      {/* Live Telemetry - Full width on all screens */}
      <div className="col-span-1">
        <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
          <TelemetryDisplay 
            fallbackApiUrl="/api/telemetry/latest"
          />
        </Suspense>
      </div>

      {/* Two-panel row that stacks on mobile, side-by-side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 col-span-1">
        <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
          <TrackMap />
        </Suspense>
        <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
          <WeatherOverlay />
        </Suspense>
      </div>

      {/* Driver panel and tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 col-span-1">
        <Suspense fallback={<div className="h-64 bg-muted/30 rounded-md animate-pulse"></div>}>
          <DriverPanel />
        </Suspense>
        
        <Card style={{ borderColor: colors.primary, background: colors.primary + "10" }}>
          <CardHeader>
            <CardTitle>Interactive Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <button 
              className="px-4 py-2 bg-primary text-white rounded mb-4"
              onClick={() => setShowComparison(prev => !prev)}
            >
              {showComparison ? "Hide Comparison Chart" : "Show Comparison Chart"}
            </button>
            
            {showComparison && (
              <Suspense fallback={<LoadingSpinner size="md" label="Loading race progress..." />}>
                <RaceProgressScrubBar 
                  onChange={(lap) => console.log(`Lap changed: ${lap}`)} 
                />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Only load comparison chart when needed */}
      {showComparison && (
        <div className="col-span-1">
          <Suspense fallback={<div className="h-80 bg-muted/30 rounded-md animate-pulse"></div>}>
            <LapTimeComparisonChart 
              sessionKey={sessionKey} 
              driverNumbers={driverNumbers} 
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}