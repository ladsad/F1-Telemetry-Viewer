"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1LapTime, OpenF1DriverInfo } from "@/lib/api/types"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts"
import { useTheme } from "@/components/ThemeProvider"
import { Clock, ArrowUpDown, Download } from "lucide-react"
import AnimatedButton from "@/components/AnimatedButton"
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator"
import { Loader2 } from "lucide-react"
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

type LapTimeComparisonChartProps = {
  sessionKey: string
  driverNumbers: number[]
}

type Series = {
  name: string
  color: string
  data: { lap: number; time: number }[]
}

export default function LapTimeComparisonChart({
  sessionKey,
  driverNumbers,
}: LapTimeComparisonChartProps) {
  const { colors } = useTheme()
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDrivers, setActiveDrivers] = useState<number[]>([...driverNumbers])
  const [touchPoints, setTouchPoints] = useState<{x: number, y: number}[]>([])
  const chartRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!sessionKey || !driverNumbers.length) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    Promise.all(
      driverNumbers.map(async (driverNumber) => {
        const [laps, info] = await Promise.all([
          openf1.getLapTimes(sessionKey, driverNumber),
          openf1.getDriverInfo(sessionKey, driverNumber),
        ])
        const driverName =
          (Array.isArray(info) ? info[0]?.broadcast_name : info?.broadcast_name) ||
          `#${driverNumber}`
        const color =
          (Array.isArray(info) ? info[0]?.color : info?.color) ||
          "#8884d8"
        return {
          name: driverName,
          color,
          data: (laps || []).map((l: OpenF1LapTime) => ({
            lap: l.lap_number,
            time: l.lap_time,
          })),
        }
      })
    )
      .then(setSeries)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [sessionKey, driverNumbers])

  // Touch-friendly driver toggle
  const toggleDriver = (driverNumber: number) => {
    if (activeDrivers.includes(driverNumber)) {
      setActiveDrivers(activeDrivers.filter(d => d !== driverNumber))
    } else {
      setActiveDrivers([...activeDrivers, driverNumber])
    }
  }
  
  // Handle touch interactions with chart
  const handleChartTouch = (e: React.TouchEvent) => {
    if (!chartRef.current || e.touches.length === 0) return
    
    const rect = chartRef.current.getBoundingClientRect()
    const touchX = e.touches[0].clientX - rect.left
    const touchY = e.touches[0].clientY - rect.top
    
    // Add touch indicator for feedback
    setTouchPoints([...touchPoints, {x: touchX, y: touchY}])
    setTimeout(() => setTouchPoints(prev => prev.slice(1)), 1000)
  }
  
  // Export chart data to CSV
  const exportToCSV = () => {
    // Implementation for exporting data
    console.log("Exporting chart data")
  }

  // Build chart data: one object per lap, with each driver's time as a key
  const chartData: Record<string, any>[] = []
  if (series.length) {
    const maxLap = Math.max(...series.flatMap((s) => s.data.map((d) => d.lap)))
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry: Record<string, any> = { lap }
      series.forEach((s) => {
        const found = s.data.find((d) => d.lap === lap)
        entry[s.name] = found ? found.time : null
      })
      chartData.push(entry)
    }
  }

  return (
    <Card 
      className="mt-4 w-full card-transition card-hover" 
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader className="p-responsive-md">
        <div className="flex flex-wrap items-center justify-between gap-responsive-sm">
          <CardTitle className="flex items-center gap-2 text-responsive-lg">
            <Clock className="w-6 h-6" />
            <span>Lap Time Comparison</span>
            <ConnectionStatusIndicator service="timing" size="sm" showLabel={false} />
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => setActiveDrivers(driverNumbers)}
              aria-label="Toggle all drivers"
              className="tap-target"
            >
              <ArrowUpDown className="w-5 h-5 mr-1" />
              <span className="text-responsive-sm">All</span>
            </AnimatedButton>
            
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={exportToCSV}
              aria-label="Export data"
              className="tap-target"
            >
              <Download className="w-5 h-5 mr-1" />
              <span className="text-responsive-sm">Export</span>
            </AnimatedButton>
          </div>
        </div>
        
        {/* Driver selection pills - touch friendly */}
        <div className="flex flex-wrap gap-2 mt-2">
          {series.map((s) => (
            <button
              key={s.name}
              className={`px-3 py-2 rounded-full text-responsive-xs font-formula1 tap-target transition-all ${
                activeDrivers.includes(s.driverNumber)
                  ? 'bg-opacity-100 text-white'
                  : 'bg-opacity-30 text-foreground'
              }`}
              style={{ 
                backgroundColor: activeDrivers.includes(s.driverNumber) 
                  ? s.color 
                  : s.color + '30'
              }}
              onClick={() => toggleDriver(s.driverNumber)}
            >
              #{s.driverNumber}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-responsive-md">
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <div className="text-responsive-sm text-center">Loading lap times...</div>
            <div className="text-xs text-muted-foreground mt-2">
              {connectionStatus.timing === "closed" ? 
                "Connection unavailable - using cached data" : 
                "Fetching data from timing service..."}
            </div>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center p-8 h-64">
            <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
            <div className="text-destructive text-center mb-2">{error}</div>
            <button 
              className="px-4 py-2 rounded bg-primary text-white mt-4"
              onClick={() => {
                setLoading(true)
                setError(null)
                // Retry logic
              }}
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <div 
            className="w-full h-[300px] md:h-[400px] relative touch-manipulation"
            ref={chartRef}
            onTouchStart={handleChartTouch}
            onTouchMove={handleChartTouch}
          >
            {/* Touch feedback indicators */}
            {touchPoints.map((point, i) => (
              <motion.div
                key={i}
                className="absolute w-8 h-8 rounded-full bg-primary opacity-30"
                style={{ left: point.x - 16, top: point.y - 16 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.7 }}
              />
            ))}
            
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
              >
                <XAxis 
                  dataKey="lap" 
                  label={{ value: "LAP", position: "insideBottomRight", offset: -5 }}
                  tick={{ fontFamily: "Formula1", fontSize: 12 }}
                  tickMargin={8}
                />
                <YAxis
                  label={{ value: "LAP TIME (s)", angle: -90, position: "insideLeft", fontFamily: "Formula1", fontSize: 12 }}
                  domain={["auto", "auto"]}
                  allowDecimals={true}
                  tick={{ fontFamily: "Formula1", fontSize: 12 }}
                  tickMargin={8}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontFamily: "Formula1", 
                    fontSize: '16px',
                    borderRadius: '8px',
                    padding: '12px'
                  }} 
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  wrapperStyle={{ fontFamily: "Formula1", textTransform: "uppercase", fontSize: 14 }} 
                  verticalAlign="bottom"
                  height={40}
                  onClick={(e) => toggleDriver(e.dataKey)} // Make legend items clickable
                />
                {series
                  .filter(s => activeDrivers.includes(s.driverNumber))
                  .map((s) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={s.color}
                      strokeWidth={3}
                      dot={{ r: 6, strokeWidth: 2 }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Virtualized lap data table */}
        {!loading && !error && chartData.length > 0 && (
          <div className="mt-6 border rounded">
            <div className="p-2 bg-muted font-semibold text-sm font-formula1">
              Raw Lap Time Data
            </div>
            <div className="h-64 w-full">
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    className="virtualized-list"
                    height={height}
                    itemCount={chartData.length}
                    itemSize={35}
                    width={width}
                  >
                    {({ index, style }) => {
                      const lap = chartData[index];
                      return (
                        <div 
                          className={`flex items-center px-2 py-1 ${
                            index % 2 === 0 ? 'bg-muted/30' : ''
                          }`}
                          style={style}
                        >
                          <div className="w-16 font-formula1">Lap {lap.lap}</div>
                          {series
                            .filter(s => activeDrivers.includes(s.driverNumber))
                            .map((s) => (
                              <div 
                                key={s.name} 
                                className="flex-1 text-sm text-right px-2"
                                style={{ color: s.color }}
                              >
                                {lap[s.name] ? lap[s.name].toFixed(3) + 's' : '-'}
                              </div>
                            ))
                          }
                        </div>
                      );
                    }}
                  </List>
                )}
              </AutoSizer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}