"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import dynamic from "next/dynamic"
import { useInView } from "react-intersection-observer"
import Link from "next/link"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import MobileNav from "@/components/layout/MobileNav"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { TelemetryProvider } from "@/context/TelemetryDataContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AnimatedButton from "@/components/AnimatedButton"
import { 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  BarChart3, 
  Map, 
  CloudSun, 
  User,
  Activity,
  History,
  Zap,
  Radio,
  ArrowRight,
  Eye,
  TrendingUp,
  Clock,
  Globe,
  ExternalLink
} from "lucide-react"
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

// Enhanced navigation cards for sub-sections
const dashboardSections = [
  {
    id: "live",
    title: "Live Dashboard",
    description: "Real-time race data and driver positions with live telemetry streams",
    href: "/dashboard/live",
    icon: Activity,
    gradient: "from-red-500 to-orange-500",
    features: ["Live Telemetry", "Real-time Updates", "Driver Analytics"],
    status: "Live",
    statusColor: "bg-green-500"
  },
  {
    id: "historic",
    title: "Historic Analysis",
    description: "Replay and analyze past race sessions with advanced playback controls",
    href: "/dashboard/historic",
    icon: History,
    gradient: "from-blue-500 to-cyan-500",
    features: ["Session Playback", "Data Analysis", "Race Comparison"],
    status: "Available",
    statusColor: "bg-blue-500"
  },
  {
    id: "analytics",
    title: "Performance Analytics",
    description: "Advanced metrics and comparative analysis tools for F1 data",
    href: "/dashboard/analytics",
    icon: BarChart3,
    gradient: "from-green-500 to-teal-500",
    features: ["Lap Analysis", "Performance Metrics", "Driver Comparison"],
    status: "Enhanced",
    statusColor: "bg-teal-500"
  },
  {
    id: "track",
    title: "Track Focus",
    description: "Detailed circuit analysis with interactive track layouts",
    href: "/dashboard/track",
    icon: Map,
    gradient: "from-purple-500 to-pink-500",
    features: ["Circuit Layout", "Sector Analysis", "Track Insights"],
    status: "Interactive",
    statusColor: "bg-purple-500"
  }
]

// Quick stats for the overview
const quickStats = [
  { label: "Session Status", value: "Live", icon: Radio, color: "text-green-500" },
  { label: "Active Drivers", value: "20", icon: User, color: "text-blue-500" },
  { label: "Current Lap", value: "42/58", icon: TrendingUp, color: "text-orange-500" },
  { label: "Data Points", value: "15.2K", icon: Globe, color: "text-purple-500" }
]

// Enhanced loading skeletons
function TelemetryLoadingSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-16 h-8 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse mx-auto" />
              <div className="h-8 w-16 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MapLoadingSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
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
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading track layout...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WeatherLoadingSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CloudSun className="w-6 h-6 text-muted-foreground animate-pulse" />
          <div className="h-6 w-28 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DriverLoadingSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-6 h-6 text-muted-foreground animate-pulse" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

function ChartLoadingSkeleton({ title }: { title: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
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
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading {title.toLowerCase()}...</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TableLoadingSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="flex space-x-2">
            <div className="w-24 h-8 bg-muted rounded animate-pulse" />
            <div className="w-16 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
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

// Dashboard content with enhanced grid layout
function DashboardContent({ weather, sessionKey, driverNumber, driverNumbers }: {
  weather: OpenF1WeatherData | null;
  sessionKey: string;
  driverNumber: number;
  driverNumbers: number[];
}) {
  const [expandedSections, setExpandedSections] = useState({
    core: true,
    analytics: false,
    navigation: true
  })

  // Intersection observers for progressive loading
  const { ref: analyticsRef, inView: analyticsInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  })

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Quick Stats */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-formula1 mb-2">
              F1 Telemetry Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time Formula 1 data analysis and race insights
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              Live Session
            </Badge>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ${stat.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-lg font-mono">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Core Dashboard Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <span>Live Core Data</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('core')}
            className="flex items-center gap-2 text-sm"
          >
            {expandedSections.core ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="hidden sm:inline">{expandedSections.core ? 'Collapse' : 'Expand'}</span>
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
              {/* Enhanced Grid Layout */}
              <div className="space-y-6">
                {/* Main Telemetry Display - Full Width */}
                <div className="w-full">
                  <Suspense fallback={<TelemetryLoadingSkeleton />}>
                    <TelemetryDisplay fallbackApiUrl="/api/telemetry/latest" />
                  </Suspense>
                </div>

                {/* Three-Column Grid for Track, Weather, and Driver Data */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Track Map - Larger column */}
                  <div className="lg:col-span-2">
                    <Suspense fallback={<MapLoadingSkeleton />}>
                      <div className="relative">
                        <TrackMap />
                        {/* Quick action overlay */}
                        <div className="absolute top-4 right-4">
                          <Link href="/dashboard/track">
                            <AnimatedButton variant="ghost" size="sm" className="bg-background/80 backdrop-blur-sm">
                              <ExternalLink className="w-4 h-4" />
                              <span className="ml-1 hidden sm:inline">Full View</span>
                            </AnimatedButton>
                          </Link>
                        </div>
                      </div>
                    </Suspense>
                  </div>

                  {/* Right Column - Weather and Driver */}
                  <div className="space-y-6">
                    <Suspense fallback={<WeatherLoadingSkeleton />}>
                      <WeatherOverlay />
                    </Suspense>

                    <Suspense fallback={<DriverLoadingSkeleton />}>
                      <DriverPanel />
                    </Suspense>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Navigation to Sub-Sections */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 flex items-center gap-2">
            <Map className="w-5 h-5" />
            <span>Specialized Dashboards</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('navigation')}
            className="flex items-center gap-2 text-sm"
          >
            {expandedSections.navigation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="hidden sm:inline">{expandedSections.navigation ? 'Collapse' : 'Expand'}</span>
          </Button>
        </div>

        <AnimatePresence>
          {expandedSections.navigation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dashboardSections.map((section, index) => {
                  const IconComponent = section.icon
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="group"
                    >
                      <Link href={section.href}>
                        <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden relative cursor-pointer">
                          {/* Background gradient overlay */}
                          <div 
                            className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} 
                          />
                          
                          <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                              <div 
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} p-3 shadow-lg`}
                              >
                                <IconComponent className="w-full h-full text-white" />
                              </div>
                              
                              <Badge 
                                variant="secondary" 
                                className={`${section.statusColor} text-white font-formula1 text-xs`}
                              >
                                {section.status}
                              </Badge>
                            </div>

                            <CardTitle className="text-xl font-formula1 group-hover:text-primary transition-colors duration-300">
                              {section.title}
                            </CardTitle>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {section.description}
                            </p>
                          </CardHeader>

                          <CardContent className="relative z-10">
                            {/* Features list */}
                            <div className="space-y-2 mb-6">
                              {section.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>

                            {/* CTA */}
                            <div className="flex items-center justify-between text-primary group-hover:text-primary">
                              <span className="text-sm font-medium font-formula1">
                                EXPLORE {section.title.toUpperCase()}
                              </span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Analytics Preview Section */}
      <section ref={analyticsRef} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold font-formula1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <span>Performance Analytics Preview</span>
          </h2>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/analytics">
              <AnimatedButton variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                View All Analytics
              </AnimatedButton>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('analytics')}
              className="flex items-center gap-2 text-sm"
            >
              {expandedSections.analytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="hidden sm:inline">{expandedSections.analytics ? 'Collapse' : 'Expand'}</span>
            </Button>
          </div>
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Suspense fallback={<ChartLoadingSkeleton title="Lap Time Comparison" />}>
                    <LapTimeComparisonChart
                      sessionKey={sessionKey}
                      driverNumbers={driverNumbers}
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