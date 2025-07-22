"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import AnimatedButton from "@/components/AnimatedButton"
import { useTheme } from "@/components/ThemeProvider"
import { OpenF1Service } from "@/lib/api/openf1"
import { useOpenF1Telemetry } from "@/lib/hooks/useWebSocket"
import ConnectionStatusIndicator, { TelemetryConnectionIndicator } from "@/components/ConnectionStatusIndicator"
import AnimatedGauge, { SpeedGauge, RPMGauge, ThrottleGauge, BrakeGauge } from "@/components/ui/AnimatedGauge"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import MobileNav from "@/components/layout/MobileNav"
import { TelemetryProvider, useTelemetry } from "@/context/TelemetryDataContext"
import { 
  Activity, 
  Radio, 
  Users, 
  Clock, 
  Thermometer, 
  Wind, 
  Droplets,
  Zap,
  Settings,
  Pause,
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  WifiOff,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Filter,
  Download,
  Share2,
  BarChart3
} from "lucide-react"
import type { 
  OpenF1CarData, 
  OpenF1WeatherData, 
  OpenF1DriverInfo,
  OpenF1DriverPosition,
  OpenF1DriverStatus 
} from "@/lib/api/types"

// Real-time driver data interface
interface LiveDriverData extends OpenF1CarData {
  // Required from OpenF1CarData
  session_key: string
  lap_number: number
  driver_number: number
  date: string
  
  // Additional live data fields
  position?: number
  gap_to_leader?: number
  tire_compound?: string
  tire_age?: number
  pit_status?: string
  driver_name?: string
  team_name?: string
  team_color?: string
}

// Live session state
interface LiveSessionState {
  sessionKey: string
  isLive: boolean
  currentLap: number
  totalLaps: number
  sessionTime: number
  sessionType: string
  trackName: string
  weather: OpenF1WeatherData | null
  drivers: LiveDriverData[]
  selectedDrivers: number[]
  lastUpdate: Date
}

// Live data hooks
function useLiveSessionData(sessionKey: string) {
  const [sessionState, setSessionState] = useState<LiveSessionState>({
    sessionKey,
    isLive: false,
    currentLap: 1,
    totalLaps: 0,
    sessionTime: 0,
    sessionType: 'Practice',
    trackName: 'Unknown Circuit',
    weather: null,
    drivers: [],
    selectedDrivers: [],
    lastUpdate: new Date()
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // WebSocket connection for real-time telemetry
  const { 
    data: telemetryData, 
    status: connectionState, 
    reconnect,
    disconnect 
  } = useOpenF1Telemetry(sessionKey)

  // Fetch session details and initialize
  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const openf1 = new OpenF1Service(); // No longer needs explicit URL parameter
      
      // Fetch session details
      const [sessionData, weather, drivers] = await Promise.all([
        openf1.getSessionDetails(sessionKey),
        openf1.getWeather(sessionKey),
        openf1.getDriverInfo(sessionKey)
      ])

      // Get initial driver data
      const initialDriverData = await Promise.all(
        drivers.map(async (driver: OpenF1DriverInfo) => {
          try {
            const carData = await openf1.getCarTelemetry(sessionKey, undefined, driver.driver_number)
            const positions = await openf1.getDriverPositions(sessionKey)
            const position = positions.find((p: any) => p.driver_number === driver.driver_number)
            
            const latestData = Array.isArray(carData) && carData.length > 0 
              ? carData[carData.length - 1] 
              : null

            return {
              // Include all required fields from OpenF1CarData and LiveDriverData
              session_key: sessionKey,
              lap_number: latestData?.lap_number || 1,
              driver_number: driver.driver_number,
              driver_name: driver.broadcast_name || driver.full_name,
              team_name: driver.team_name,
              team_color: driver.color,
              position: position?.position || 0,
              speed: latestData?.speed || 0,
              throttle: latestData?.throttle || 0,
              brake: latestData?.brake || 0,
              gear: latestData?.gear || 0,
              rpm: latestData?.rpm || 0,
              drs: latestData?.drs || false,
              timestamp: latestData?.timestamp || Date.now(),
              date: (latestData && 'date' in latestData ? latestData.date : new Date().toISOString()),
              gap_to_leader: 0, // 'gap_to_leader' not available in position object
              tire_compound: 'Unknown',
              tire_age: 0,
              pit_status: 'None'
            } as LiveDriverData
          } catch (error) {
            console.warn(`Failed to fetch data for driver ${driver.driver_number}:`, error)
            return {
              session_key: sessionKey,
              lap_number: 1,
              driver_number: driver.driver_number,
              driver_name: driver.broadcast_name || driver.full_name,
              team_name: driver.team_name,
              team_color: driver.color,
              position: 0,
              speed: 0,
              throttle: 0,
              brake: 0,
              gear: 0,
              rpm: 0,
              drs: false,
              timestamp: Date.now(),
              date: new Date().toISOString(),
              gap_to_leader: 0,
              tire_compound: 'Unknown',
              tire_age: 0,
              pit_status: 'None'
            } as LiveDriverData
          }
        })
      )

      setSessionState({
        sessionKey,
        isLive: sessionData?.session_type?.includes('Race') || false,
        currentLap: 1,
        totalLaps: sessionData?.session_type?.includes('Race') ? 50 : 0,
        sessionTime: 0,
        sessionType: sessionData?.session_type || 'Practice',
        trackName: sessionData?.circuit_short_name || sessionData?.circuit_name || 'Unknown Circuit',
        weather: Array.isArray(weather) && weather.length > 0 ? weather[weather.length - 1] : null,
        drivers: initialDriverData.sort((a, b) => (a.position || 999) - (b.position || 999)),
        selectedDrivers: initialDriverData.slice(0, 6).map(d => d.driver_number),
        lastUpdate: new Date()
      })

    } catch (err) {
      console.error('Failed to initialize live session:', err)
      setError(err instanceof Error ? err.message : 'Failed to load session data')
    } finally {
      setIsLoading(false)
    }
  }, [sessionKey])

  // Update live data periodically
  const updateLiveData = useCallback(async () => {
    if (!sessionState.isLive) return

    try {
      const openf1 = new OpenF1Service(); // No longer needs explicit URL parameter
      
      // Update weather and positions
      const [weather, positions] = await Promise.all([
        openf1.getWeather(sessionKey),
        openf1.getDriverPositions(sessionKey)
      ])

      // Update driver data with latest telemetry from WebSocket
      if (telemetryData) {
        setSessionState(prev => {
          const updatedDrivers = prev.drivers.map(driver => {
            const wsData = Array.isArray(telemetryData) 
              ? telemetryData.find((d: any) => d.driver_number === driver.driver_number)
              : telemetryData.driver_number === driver.driver_number ? telemetryData : null

            const position = positions.find((p: any) => p.driver_number === driver.driver_number)

            if (wsData) {
              return {
                ...driver,
                ...wsData,
                position: position?.position || driver.position,
                timestamp: Date.now(),
                // Ensure required fields are preserved
                session_key: driver.session_key,
                lap_number: wsData.lap_number || driver.lap_number,
                date: wsData.date || driver.date
              }
            }

            return {
              ...driver,
              position: position?.position || driver.position
            }
          })

          return {
            ...prev,
            weather: Array.isArray(weather) && weather.length > 0 ? weather[weather.length - 1] : prev.weather,
            drivers: updatedDrivers.sort((a, b) => (a.position || 999) - (b.position || 999)),
            lastUpdate: new Date()
          }
        })
      }

    } catch (err) {
      console.warn('Failed to update live data:', err)
    }
  }, [sessionKey, sessionState.isLive, telemetryData])

  // Setup periodic updates
  useEffect(() => {
    if (sessionState.isLive && connectionState === 'open') {
      intervalRef.current = setInterval(updateLiveData, 2000) // Update every 2 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sessionState.isLive, connectionState, updateLiveData])

  // Initialize on mount
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  return {
    sessionState,
    setSessionState,
    isLoading,
    error,
    connectionState,
    reconnect,
    disconnect,
    refresh: initializeSession
  }
}

// Live telemetry display component
function LiveTelemetryDisplay({ drivers, selectedDrivers, onDriverSelect }: {
  drivers: LiveDriverData[]
  selectedDrivers: number[]
  onDriverSelect: (driverNumber: number) => void
}) {
  const { colors } = useTheme()
  
  const selectedDriver = drivers.find(d => d.driver_number === selectedDrivers[0])
  const [comparisonMode, setComparisonMode] = useState(false)

  if (!selectedDriver) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Driver Selected</h3>
          <p className="text-muted-foreground">Select a driver to view live telemetry data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Driver Selection Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedDriver.team_color || colors.primary }}
              />
              <div>
                <CardTitle className="font-formula1">
                  {selectedDriver.driver_name} #{selectedDriver.driver_number}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{selectedDriver.team_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={selectedDriver.position === 1 ? "default" : "secondary"}
                className="font-mono"
              >
                P{selectedDriver.position || 'N/A'}
              </Badge>
              <TelemetryConnectionIndicator size="sm" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold font-mono" style={{ color: colors.primary }}>
                {Math.round(selectedDriver.speed || 0)}
              </div>
              <div className="text-xs text-muted-foreground">km/h</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">
                {selectedDriver.gear || 'N'}
              </div>
              <div className="text-xs text-muted-foreground">Gear</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">
                {Math.round(selectedDriver.rpm || 0)}
              </div>
              <div className="text-xs text-muted-foreground">RPM</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${selectedDriver.drs ? 'text-green-500' : 'text-gray-400'}`}>
                {selectedDriver.drs ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-muted-foreground">DRS</div>
            </div>
          </div>

          {/* Gauges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SpeedGauge 
              value={selectedDriver.speed || 0}
              size="md"
              showLabels={true}
            />
            
            <RPMGauge 
              value={selectedDriver.rpm || 0}
              size="md"
              showLabels={true}
            />
            
            <ThrottleGauge 
              value={selectedDriver.throttle || 0}
              size="md"
              showLabels={true}
            />
            
            <BrakeGauge 
              value={selectedDriver.brake || 0}
              size="md"
              showLabels={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Driver Selection Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Driver Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {drivers.slice(0, 20).map((driver) => (
              <motion.button
                key={driver.driver_number}
                className={`p-3 rounded-lg border transition-all ${
                  selectedDrivers.includes(driver.driver_number)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onDriverSelect(driver.driver_number)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: driver.team_color || colors.primary }}
                  />
                  <span className="font-formula1 text-sm">#{driver.driver_number}</span>
                  {driver.position && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      P{driver.position}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-left">
                  <div className="font-medium truncate">{driver.driver_name}</div>
                  <div className="text-muted-foreground">{Math.round(driver.speed || 0)} km/h</div>
                </div>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Live driver positions component
function LiveDriverPositions({ drivers }: { drivers: LiveDriverData[] }) {
  const { colors } = useTheme()
  const [sortBy, setSortBy] = useState<'position' | 'speed' | 'team'>('position')

  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      switch (sortBy) {
        case 'position':
          return (a.position || 999) - (b.position || 999)
        case 'speed':
          return (b.speed || 0) - (a.speed || 0)
        case 'team':
          return (a.team_name || '').localeCompare(b.team_name || '')
        default:
          return 0
      }
    })
  }, [drivers, sortBy])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Live Positions
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy('position')}
              className={sortBy === 'position' ? 'bg-primary/20' : ''}
            >
              Position
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy('speed')}
              className={sortBy === 'speed' ? 'bg-primary/20' : ''}
            >
              Speed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy('team')}
              className={sortBy === 'team' ? 'bg-primary/20' : ''}
            >
              Team
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedDrivers.map((driver, index) => (
            <motion.div
              key={driver.driver_number}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-center min-w-[2rem]">
                  <div className="text-lg font-bold font-mono">
                    {driver.position || 'N/A'}
                  </div>
                </div>
                
                <div 
                  className="w-1 h-8 rounded-full"
                  style={{ backgroundColor: driver.team_color || colors.primary }}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="font-formula1 text-sm">
                    #{driver.driver_number} {driver.driver_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {driver.team_name}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-mono font-bold">
                  {Math.round(driver.speed || 0)} km/h
                </div>
                <div className="text-xs text-muted-foreground">
                  Gear {driver.gear || 'N'}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {driver.drs && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                    DRS
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Live weather widget
function LiveWeatherWidget({ weather }: { weather: OpenF1WeatherData | null }) {
  const { colors } = useTheme()

  if (!weather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Thermometer className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Weather data unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="w-5 h-5" />
          Live Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Temperature */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              <span className="text-sm">Air Temperature</span>
            </div>
            <span className="font-mono font-bold" style={{ color: colors.primary }}>
              {Math.round(weather.air_temperature)}°C
            </span>
          </div>

          {/* Track Temperature */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Track Temperature</span>
            </div>
            <span className="font-mono font-bold">
              {Math.round(weather.track_temperature)}°C
            </span>
          </div>

          {/* Wind */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4" />
              <span className="text-sm">Wind</span>
            </div>
            <span className="font-mono font-bold">
              {Math.round(weather.wind_speed)} km/h {weather.wind_direction}
            </span>
          </div>

          {/* Humidity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span className="text-sm">Humidity</span>
            </div>
            <span className="font-mono font-bold">
              {Math.round(weather.humidity)}%
            </span>
          </div>

          {/* Rain */}
          {weather.rainfall > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Rainfall</span>
              </div>
              <span className="font-mono font-bold text-blue-500">
                {weather.rainfall}mm
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main live dashboard content
function LiveDashboardContent() {
  const sessionKey = "latest" // Use latest session
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  const {
    sessionState,
    setSessionState,
    isLoading,
    error,
    connectionState,
    reconnect,
    disconnect,
    refresh
  } = useLiveSessionData(sessionKey)

  // Handle driver selection
  const handleDriverSelect = useCallback((driverNumber: number) => {
    setSelectedDriverNumber(driverNumber)
    setSessionState(prev => ({
      ...prev,
      selectedDrivers: [driverNumber, ...prev.selectedDrivers.filter(d => d !== driverNumber)].slice(0, 6)
    }))
  }, [setSessionState])

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      const timer = setTimeout(() => setShowControls(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setShowControls(true)
    }
  }, [isFullscreen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h3 className="text-xl font-bold font-formula1 mt-4 mb-2">
            Connecting to Live Session
          </h3>
          <p className="text-muted-foreground">
            Establishing real-time telemetry connection...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <WifiOff className="w-5 h-5" />
              <CardTitle>Connection Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <AnimatedButton onClick={refresh} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </AnimatedButton>
              <AnimatedButton 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
              >
                Back to Dashboard
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4 overflow-auto' : ''}`}>
      {/* Header */}
      <AnimatePresence>
        {(!isFullscreen || showControls) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-formula1">
                  LIVE TELEMETRY
                </h1>
                <Badge 
                  variant={sessionState.isLive ? "default" : "secondary"}
                  className="font-formula1"
                >
                  <Radio className={`w-3 h-3 mr-1 ${sessionState.isLive ? 'animate-pulse' : ''}`} />
                  {sessionState.isLive ? 'LIVE' : 'PRACTICE'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{sessionState.trackName}</span>
                <span>•</span>
                <span>{sessionState.sessionType}</span>
                {sessionState.totalLaps > 0 && (
                  <>
                    <span>•</span>
                    <span>Lap {sessionState.currentLap}/{sessionState.totalLaps}</span>
                  </>
                )}
                <span>•</span>
                <span>Updated {sessionState.lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ConnectionStatusIndicator 
                service="all"
                size="sm"
              />
              
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </AnimatedButton>

              {connectionState !== 'open' && (
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  loading={connectionState === 'connecting'}
                  loadingText="Connecting..."
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reconnect
                </AnimatedButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Telemetry Display - Takes up 3 columns */}
        <div className="lg:col-span-3">
          <LiveTelemetryDisplay
            drivers={sessionState.drivers}
            selectedDrivers={sessionState.selectedDrivers}
            onDriverSelect={handleDriverSelect}
          />
        </div>

        {/* Side Panel - 1 column */}
        <div className="space-y-6">
          <LiveWeatherWidget weather={sessionState.weather} />
          <LiveDriverPositions drivers={sessionState.drivers} />
        </div>
      </div>

      {/* Floating Controls for Fullscreen */}
      {isFullscreen && (
        <motion.div
          className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg p-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onMouseEnter={() => setShowControls(true)}
        >
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </AnimatedButton>
          
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
          >
            <Minimize className="w-4 h-4" />
          </AnimatedButton>
        </motion.div>
      )}
    </div>
  )
}

// Main page component
export default function LiveDashboardPage() {
  return (
    <>
      <Header />
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <div className="block md:hidden">
          <MobileNav />
        </div>
        <main className="flex-1 p-2 sm:p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <TelemetryProvider initialSessionKey="latest">
            <LiveDashboardContent />
          </TelemetryProvider>
        </main>
      </div>
    </>
  )
}