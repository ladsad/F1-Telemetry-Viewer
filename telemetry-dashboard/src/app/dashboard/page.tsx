"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useInView } from "react-intersection-observer"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { TelemetryProvider } from "@/context/TelemetryDataContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Settings, BarChart3, Map, CloudSun, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Route-specific dynamic imports with independent loading
const TelemetryDisplay = dynamic(() => import("@/components/TelemetryDisplay"), {
  loading: () => <TelemetryLoadingSkeleton />,
  ssr: false
})

const TrackMap = dynamic(() => import("@/components/TrackMap"), {
  loading: () => <MapLoadingSkeleton />,
  ssr: false
})

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  loading: () => <WeatherLoadingSkeleton />,
  ssr: false
})

const DriverPanel = dynamic(() => import("@/components/DriverPanel"), {
  loading: () => <DriverLoadingSkeleton />,
  ssr: false
})

// Analytics components - only loaded when analytics section is expanded
const LapTimeComparisonChart = dynamic(() => import("@/components/LapTimeComparisonChart"), {
  loading: () => <ChartLoadingSkeleton title="Lap Time Comparison" />,
  ssr: false
})

const PerformanceAnalyticsDashboard = dynamic(() => import("@/components/PerformanceAnalyticsDashboard"), {
  loading: () => <AnalyticsLoadingSkeleton />,
  ssr: false
})

// Advanced components - only loaded when advanced section is expanded
const TelemetryTable = dynamic(() => import("@/components/TelemetryTable"), {
  loading: () => <TableLoadingSkeleton />,
  ssr: false
})

const TireStrategyChart = dynamic(() => import("@/components/TireStrategyChart"), {
  loading: () => <ChartLoadingSkeleton title="Tire Strategy" />,
  ssr: false
})

// Enhanced loading skeletons
function TelemetryLoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-16 h-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse mx-auto" />
              <div className="h-8 w-16 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function MapLoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Map className="w-6 h-6 text-muted-foreground animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex space-x-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="aspect-video bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading track layout...</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function WeatherLoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <CloudSun className="w-6 h-6 text-muted-foreground animate-pulse" />
          <div className="h-6 w-28 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function DriverLoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-6 h-6 text-muted-foreground animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ChartLoadingSkeleton({ title }: { title: string }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-muted-foreground animate-pulse" />
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex space-x-2">
            <div className="w-20 h-8 bg-muted rounded animate-pulse" />
            <div className="w-16 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading {title.toLowerCase()}...</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function TableLoadingSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="flex space-x-2">
            <div className="w-24 h-8 bg-muted rounded animate-pulse" />
            <div className="w-16 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-4 pb-2 border-b">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-32 h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <ChartLoadingSkeleton key={i} title="Analytics Chart" />
        ))}
      </div>
    </div>
  )
}

// Dashboard content with enhanced mobile responsiveness
function DashboardContent({ weather, sessionKey, driverNumber, driverNumbers }: {
  weather: OpenF1WeatherData | null;
  sessionKey: string;
  driverNumber: number;
  driverNumbers: number[];
}) {
  const [expandedSections, setExpandedSections] = useState({
    core: true,
    analytics: false,
    advanced: false
  })

  // Intersection observers for progressive loading
  const { ref: analyticsRef, inView: analyticsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const { ref: advancedRef, inView: advancedInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Core Dashboard Section - Enhanced mobile layout */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 truncate">Live Telemetry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('core')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm shrink-0"
          >
            {expandedSections.core ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden sm:inline">{expandedSections.core ? 'Collapse' : 'Expand'}</span>
            <span className="sm:hidden">{expandedSections.core ? '−' : '+'}</span>
          </Button>
        </div>

        <AnimatePresence>
          {expandedSections.core && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 sm:space-y-4">
                {/* Primary Telemetry Display */}
                <Suspense fallback={<TelemetryLoadingSkeleton />}>
                  <TelemetryDisplay fallbackApiUrl="/api/telemetry/latest" />
                </Suspense>

                {/* Mobile-optimized grid layout */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                  <Suspense fallback={<MapLoadingSkeleton />}>
                    <TrackMap />
                  </Suspense>

                  <Suspense fallback={<DriverLoadingSkeleton />}>
                    <DriverPanel />
                  </Suspense>
                </div>

                {/* Weather Information */}
                <Suspense fallback={<WeatherLoadingSkeleton />}>
                  <WeatherOverlay />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Analytics Section - Enhanced mobile responsiveness */}
      <section ref={analyticsRef} className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 flex items-center gap-2 truncate">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Performance Analytics</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('analytics')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm shrink-0"
          >
            {expandedSections.analytics ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden sm:inline">{expandedSections.analytics ? 'Collapse' : 'Expand'}</span>
            <span className="sm:hidden">{expandedSections.analytics ? '−' : '+'}</span>
          </Button>
        </div>

        <AnimatePresence>
          {expandedSections.analytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {analyticsInView && (
                <div className="space-y-3 sm:space-y-4">
                  <Suspense fallback={<ChartLoadingSkeleton title="Lap Time Comparison" />}>
                    <LapTimeComparisonChart
                      sessionKey={sessionKey}
                      driverNumbers={driverNumbers}
                    />
                  </Suspense>

                  <Suspense fallback={<AnalyticsLoadingSkeleton />}>
                    <PerformanceAnalyticsDashboard 
                      sessionKey={sessionKey}
                    />
                  </Suspense>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Advanced Section - Enhanced mobile responsiveness */}
      <section ref={advancedRef} className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 flex items-center gap-2 truncate">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Advanced Data</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('advanced')}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm shrink-0"
          >
            {expandedSections.advanced ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden sm:inline">{expandedSections.advanced ? 'Collapse' : 'Expand'}</span>
            <span className="sm:hidden">{expandedSections.advanced ? '−' : '+'}</span>
          </Button>
        </div>

        <AnimatePresence>
          {expandedSections.advanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {advancedInView && (
                <div className="space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                  <Suspense fallback={<TableLoadingSkeleton />}>
                    <TelemetryTable
                      title="Real-time Data Stream"
                      maxHeight={400}
                      virtualScrollOptions={{
                        itemSize: 35,
                        overscanCount: 5,
                        useVariableSize: false,
                        enableSelection: true,
                        enableFiltering: true
                      }}
                    />
                  </Suspense>

                  <Suspense fallback={<ChartLoadingSkeleton title="Tire Strategy" />}>
                    <TireStrategyChart
                      sessionKey={sessionKey}
                      driverNumber={driverNumber}
                    />
                  </Suspense>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}

// Main dashboard page component
export default function MainDashboardPage() {
  const [weather, setWeather] = useState<OpenF1WeatherData | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const sessionKey = "latest"
  const driverNumber = 1
  const driverNumbers = [1, 16, 44, 63]

  // Enhanced weather fetching with error handling
  const fetchWeather = useCallback(async () => {
    try {
      const openf1 = new OpenF1Service("https://api.openf1.org/v1")
      const data = await openf1.getWeather(sessionKey)
      
      if (Array.isArray(data) && data.length > 0) {
        setWeather(data[data.length - 1])
      }
    } catch (error) {
      console.warn('Failed to fetch weather data:', error)
      setWeather(null)
    }
  }, [sessionKey])

  useEffect(() => {
    let mounted = true
    
    const initializeData = async () => {
      await fetchWeather()
      if (mounted) {
        setIsInitialLoading(false)
      }
    }

    initializeData()
    
    // Set up periodic weather updates
    const weatherInterval = setInterval(fetchWeather, 30000) // Every 30 seconds
    
    return () => {
      mounted = false
      clearInterval(weatherInterval)
    }
  }, [fetchWeather])

  if (isInitialLoading) {
    return (
      <>
        <Header />
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar />
          <div className="block md:hidden">
            <MobileNav />
          </div>
          <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <LoadingSpinner size="lg" />
              <h2 className="text-xl font-bold font-formula1 mt-4 mb-2">
                Initializing Dashboard
              </h2>
              <p className="text-muted-foreground text-center max-w-md">
                Setting up your F1 telemetry dashboard with the latest data...
              </p>
            </div>
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <TelemetryProvider initialSessionKey={sessionKey}>
            <h1 className="sr-only">F1 Telemetry Dashboard</h1>
            <DashboardContent
              weather={weather}
              sessionKey={sessionKey}
              driverNumber={driverNumber}
              driverNumbers={driverNumbers}
            />
          </TelemetryProvider>
        </main>
      </div>
    </>
  )
}