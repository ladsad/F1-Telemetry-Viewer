"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { useInView } from "react-intersection-observer"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { OpenF1Service } from "@/lib/api/openf1"
import { TelemetryProvider, useTelemetry } from "@/context/TelemetryDataContext"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Zap, Activity, Radio, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Dynamically import heavy components
const TelemetryDisplay = dynamic(() => import("@/components/TelemetryDisplay"), {
  loading: () => <LiveTelemetryDisplaySkeleton />,
  ssr: false
})

const TrackMap = dynamic(() => import("@/components/TrackMap"), {
  loading: () => <LiveTrackMapSkeleton />,
  ssr: false
})

const DriverPanel = dynamic(() => import("@/components/DriverPanel"), {
  loading: () => <LiveDriverPanelSkeleton />,
  ssr: false
})

const WeatherOverlay = dynamic(() => import("@/components/WeatherOverlay"), {
  loading: () => <LiveWeatherSkeleton />,
  ssr: false
})

// Live-specific components - only load when expanded
const TelemetryTable = dynamic(() => import("@/components/TelemetryTable"), {
  loading: () => <LiveTableSkeleton />,
  ssr: false
})

const LapTimeComparisonChart = dynamic(() => import("@/components/LapTimeComparisonChart"), {
  loading: () => <LiveChartSkeleton title="Live Lap Comparison" />,
  ssr: false
})

// Enhanced live-specific loading skeletons with real-time indicators
function LiveTelemetryDisplaySkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant="outline" className="animate-pulse">
          <Radio className="w-3 h-3 mr-1 animate-ping" />
          Connecting...
        </Badge>
      </div>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 animate-pulse" />
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-16 h-8 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div 
                key={i} 
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-8 h-8 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full animate-pulse mx-auto" />
                <div className="h-8 w-16 bg-muted rounded animate-pulse mx-auto" />
                <div className="h-4 w-12 bg-muted/60 rounded animate-pulse mx-auto" />
              </motion.div>
            ))}
          </div>
          {/* Animated data flow indicator */}
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
            <span>Awaiting live telemetry stream...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LiveTrackMapSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-muted-foreground animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          </div>
          <Badge variant="outline" className="animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            Live Track
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-gradient-to-br from-muted/30 via-muted/50 to-muted/30 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
          {/* Animated racing line */}
          <motion.div
            className="absolute inset-4 border-2 border-dashed border-primary/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <div className="text-center space-y-2 z-10">
            <motion.div
              className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-muted-foreground font-medium">Loading live track positions...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LiveDriverPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
          <Badge variant="outline" className="animate-pulse">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div 
              key={i} 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
            >
              <div className="w-6 h-6 bg-gradient-to-r from-primary/20 to-primary/40 rounded-full animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted/60 rounded animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LiveWeatherSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
            <div className="h-6 w-28 bg-muted rounded animate-pulse" />
          </div>
          <Badge variant="outline" className="animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div 
              key={i} 
              className="space-y-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-16 bg-gradient-to-r from-muted to-muted/50 rounded animate-pulse" />
            </motion.div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-2 w-full bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

function LiveTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 animate-pulse" />
            <span>Live Data Stream</span>
          </CardTitle>
          <Badge variant="outline" className="animate-pulse">Streaming...</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-6 gap-4 pb-2 border-b">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
          {/* Data rows with staggered animation */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div 
              key={i} 
              className="grid grid-cols-6 gap-4 py-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />
              ))}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LiveChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            <span>{title}</span>
          </CardTitle>
          <Badge variant="outline" className="animate-pulse">
            <Radio className="w-3 h-3 mr-1 animate-ping" />
            Live Updates
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-lg animate-pulse flex items-center justify-center relative overflow-hidden">
          {/* Animated chart lines */}
          <div className="absolute inset-0">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute h-0.5 bg-primary/20"
                style={{
                  top: `${30 + i * 20}%`,
                  left: 0,
                  right: 0
                }}
                animate={{
                  scaleX: [0, 1, 0.5, 1],
                  opacity: [0.3, 1, 0.6, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5
                }}
              />
            ))}
          </div>
          <div className="text-center space-y-2 z-10">
            <motion.div
              className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-muted-foreground">Loading {title.toLowerCase()}...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced live telemetry content with progressive loading
function LiveTelemetryContent() {
  const { setSelectedDriverNumber, connectionStatus } = useTelemetry()
  const [driverOptions, setDriverOptions] = useState<{ number: number, name: string }[]>([])
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    core: true,
    liveData: false,
    analytics: false
  })
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  const sessionKey = "latest"

  // Intersection observers for progressive loading
  const { ref: liveDataRef, inView: liveDataInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const { ref: analyticsRef, inView: analyticsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  // Update timestamp periodically to show live status
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch available drivers for the session
  useEffect(() => {
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    openf1.getDriverInfo("latest").then(drivers => {
      if (Array.isArray(drivers) && drivers.length) {
        const driverOpts = drivers.map(d => ({
          number: d.driver_number,
          name: d.broadcast_name || d.full_name || `Driver #${d.driver_number}`
        }))
        setDriverOptions(driverOpts)
        
        // Set default driver if none selected
        if (!selectedDriver && driverOpts.length > 0) {
          const defaultDriver = driverOpts[0].number
          setSelectedDriver(defaultDriver)
          setSelectedDriverNumber(defaultDriver)
        }
      }
    }).catch(console.error)
  }, [selectedDriver, setSelectedDriverNumber])
  
  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const driverNumber = Number(e.target.value)
    setSelectedDriver(driverNumber)
    setSelectedDriverNumber(driverNumber)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus.telemetry) {
      case 'open': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      case 'error': case 'closed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus.telemetry) {
      case 'open': return 'Live'
      case 'connecting': return 'Connecting...'
      case 'error': return 'Error'
      case 'closed': return 'Disconnected'
      default: return 'Unknown'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header with driver selection and live status */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold font-formula1">Live Telemetry Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.telemetry === 'open' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
              {getConnectionStatusText()}
            </span>
            {connectionStatus.telemetry === 'open' && (
              <span className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Driver selection */}
          <div className="flex items-center gap-2">
            <label htmlFor="driver-select" className="text-sm font-medium">Driver:</label>
            <select 
              id="driver-select"
              className="rounded bg-background border px-3 py-2 text-sm min-w-[150px]"
              value={selectedDriver || ""}
              onChange={handleDriverChange}
            >
              {driverOptions.length === 0 ? (
                <option value="">Loading drivers...</option>
              ) : (
                driverOptions.map(d => (
                  <option key={d.number} value={d.number}>
                    #{d.number} {d.name}
                  </option>
                ))
              )
            }
            </select>
          </div>

          {/* Manual refresh button for when connection is down */}
          {connectionStatus.telemetry !== 'open' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Core Live Display - Always visible */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-formula1 flex items-center gap-2">
            <Radio className="w-5 h-5" />
            Live Core Data
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('core')}
            className="flex items-center gap-2"
          >
            {expandedSections.core ? 'Collapse' : 'Expand'}
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
              <div className="grid grid-cols-1 gap-4">
                {/* Primary Telemetry Display */}
                <Suspense fallback={<LiveTelemetryDisplaySkeleton />}>
                  <TelemetryDisplay fallbackApiUrl="/api/telemetry/latest" />
                </Suspense>

                {/* Track and Driver Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Suspense fallback={<LiveTrackMapSkeleton />}>
                    <TrackMap />
                  </Suspense>

                  <Suspense fallback={<LiveDriverPanelSkeleton />}>
                    <DriverPanel />
                  </Suspense>
                </div>

                {/* Weather Information */}
                <Suspense fallback={<LiveWeatherSkeleton />}>
                  <WeatherOverlay />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Live Data Stream Section */}
      <section ref={liveDataRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-formula1 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Live Data Stream
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('liveData')}
            className="flex items-center gap-2"
          >
            {expandedSections.liveData ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        <AnimatePresence>
          {expandedSections.liveData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {liveDataInView && (
                <Suspense fallback={<LiveTableSkeleton />}>
                  <TelemetryTable
                    title="Live Telemetry Stream"
                    maxHeight={400}
                    virtualScrollOptions={{
                      itemSize: 35,
                      overscanCount: 3,
                      useVariableSize: false,
                      enableSelection: false,
                      enableFiltering: true
                    }}
                  />
                </Suspense>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Live Analytics Section */}
      <section ref={analyticsRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-formula1 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Analytics
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('analytics')}
            className="flex items-center gap-2"
          >
            {expandedSections.analytics ? 'Collapse' : 'Expand'}
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
                <Suspense fallback={<LiveChartSkeleton title="Live Lap Comparison" />}>
                  <LapTimeComparisonChart
                    sessionKey={sessionKey}
                    driverNumbers={selectedDriver ? [selectedDriver] : []}
                  />
                </Suspense>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Connection Status Alert */}
      {connectionStatus.telemetry !== 'open' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Connection Issue
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Live telemetry feed is {getConnectionStatusText().toLowerCase()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default function LiveTelemetryPage() {
  const sessionKey = "latest"
  
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
            <Suspense fallback={<EnhancedLiveDashboardSkeleton />}>
              <LiveTelemetryContent />
            </Suspense>
          </TelemetryProvider>
        </main>
      </div>
    </>
  )
}

// Enhanced loading skeleton for the entire page
function EnhancedLiveDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-40 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Core section skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <LiveTelemetryDisplaySkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LiveTrackMapSkeleton />
            <LiveDriverPanelSkeleton />
          </div>
          <LiveWeatherSkeleton />
        </div>
      </div>
    </div>
  )
}