"use client"

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpenF1Service } from "@/lib/api/openf1";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { Clock, ArrowUpDown, Download, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedButton from "@/components/AnimatedButton";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Loader2 } from "lucide-react";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { LapTimeComparisonChartProps, OpenF1LapTime } from "@/types";
import { useTelemetry } from "@/context/TelemetryDataContext";

type Series = {
  name: string;
  color: string;
  driverNumber: number;
  data: { lap: number; time: number }[];
};

function LapTimeComparisonChart({
  sessionKey,
  driverNumbers = [], // Add default value
  highlightedLap
}: LapTimeComparisonChartProps) {
  const { colors } = useTheme();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<number[]>([]);
  const [touchPoints, setTouchPoints] = useState<{x: number, y: number}[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Get connection status from context
  const { connectionStatus } = useTelemetry();

  // Initialize activeDrivers when driverNumbers change
  useEffect(() => {
    setActiveDrivers([...driverNumbers]);
  }, [driverNumbers]);
  
  // Fetch lap times with useEffect
  useEffect(() => {
    if (!sessionKey || !driverNumbers.length) return;
    
    setLoading(true);
    setError(null);
    
    const openf1 = new OpenF1Service("https://api.openf1.org/v1");
    
    Promise.all(
      driverNumbers.map(async (driverNumber) => {
        try {
          const [laps, info] = await Promise.all([
            openf1.getLapTimes(sessionKey, driverNumber),
            openf1.getDriverInfo(sessionKey, driverNumber),
          ]);
          
          // Add these helper functions after line 25:
          const getDriverName = (info: any, driverNumber: number): string => {
            if (Array.isArray(info) && info.length > 0 && info[0]) {
              return info[0].broadcast_name || info[0].full_name || `#${driverNumber}`;
            }
            if (info && typeof info === 'object' && 'broadcast_name' in info) {
              return (info as any).broadcast_name || (info as any).full_name || `#${driverNumber}`;
            }
            return `#${driverNumber}`;
          };

          const getDriverColor = (info: any): string => {
            if (Array.isArray(info) && info.length > 0 && info[0]) {
              return info[0].color || "#8884d8";
            }
            if (info && typeof info === 'object' && 'color' in info) {
              return (info as any).color || "#8884d8";
            }
            return "#8884d8";
          };
            
          return {
            name: getDriverName(info, driverNumber),
            color: getDriverColor(info),
            driverNumber,
            data: Array.isArray(laps) ? laps.map((l: any) => ({
              lap: l.lap_number || 0,
              time: l.lap_time || l.lap_duration || 0,
            })) : [],
          };
        } catch (err) {
          console.error(`Error fetching data for driver ${driverNumber}:`, err);
          return {
            name: `#${driverNumber}`,
            color: "#8884d8",
            driverNumber,
            data: [],
          };
        }
      })
    )
      .then(setSeries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [sessionKey, driverNumbers]);

  // Memoize driver toggle handler
  const toggleDriver = useCallback((driverNumber: number) => {
    setActiveDrivers(current => 
      current.includes(driverNumber) 
        ? current.filter(d => d !== driverNumber)
        : [...current, driverNumber]
    );
  }, []);
  
  // Memoize chart touch handler
  const handleChartTouch = useCallback((e: React.TouchEvent) => {
    if (!chartRef.current || e.touches.length === 0) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    
    setTouchPoints(prev => {
      const newPoints = [...prev, {x: touchX, y: touchY}];
      setTimeout(() => setTouchPoints(p => p.slice(1)), 1000);
      return newPoints;
    });
  }, []);

  // Memoize chart data calculation (expensive operation)
  const chartData = React.useMemo(() => {
    if (!series.length) return [];
    
    const result: Record<string, any>[] = [];
    const allLaps = series.flatMap((s) => s.data.map((d) => d.lap)).filter(lap => lap > 0);
    
    if (allLaps.length === 0) return [];
    
    const maxLap = Math.max(...allLaps);
    
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry: Record<string, any> = { lap };
      series.forEach((s) => {
        const found = s.data.find((d) => d.lap === lap);
        entry[s.name] = found && found.time > 0 ? found.time : null;
      });
      result.push(entry);
    }
    
    return result;
  }, [series]);
  
  // Replace the exportToCSV function
  const exportToCSV = useCallback(() => {
    if (!series.length || !chartData.length) return;
    
    try {
      // Create CSV content
      const headers = ["Lap", ...series.map(s => s.name)].join(",");
      const rows = chartData.map(row => {
        return [
          row.lap,
          ...series.map(s => row[s.name] !== null && row[s.name] !== undefined ? row[s.name].toFixed(3) : "")
        ].join(",");
      });
      
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `lap_times_${sessionKey}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  }, [series, chartData, sessionKey]);

  // Function to handle legend clicks - fixed typing issue
  const handleLegendClick = useCallback((e: any) => {
    const driverEntry = series.find(s => s.name === e.dataKey);
    if (driverEntry) {
      toggleDriver(driverEntry.driverNumber);
    }
  }, [series, toggleDriver]);

  // Retry function for error handling
  const retryFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    
    const openf1 = new OpenF1Service("https://api.openf1.org/v1");
    Promise.all(
      driverNumbers.map(async (driverNumber) => {
        try {
          const [laps, infoRaw] = await Promise.all([
            openf1.getLapTimes(sessionKey, driverNumber),
            openf1.getDriverInfo(sessionKey, driverNumber),
          ]);
          const info: any = infoRaw;
          
          return {
            name: (Array.isArray(info) ? info[0]?.broadcast_name : info?.broadcast_name) || `#${driverNumber}`,
            color: (Array.isArray(info) ? info[0]?.color : info?.color) || "#8884d8",
            driverNumber,
            data: Array.isArray(laps) ? laps.map((l: any) => ({
              lap: l.lap_number || 0,
              time: l.lap_time || l.lap_duration || 0, // Handle both possible field names
            })) : [],
          };
        } catch (err) {
          return {
            name: `#${driverNumber}`,
            color: "#8884d8",
            driverNumber,
            data: [],
          };
        }
      })
    )
      .then(setSeries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [sessionKey, driverNumbers]);

  return (
    <Card 
      className="mt-4 w-full card-transition card-hover" 
      style={{ borderColor: colors.primary, background: colors.primary + "10" }}
    >
      <CardHeader className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-6 h-6" />
            <span>Lap Time Comparison</span>
            <ConnectionStatusIndicator service="telemetry" size="sm" showLabel={false} />
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => setActiveDrivers([...driverNumbers])}
              aria-label="Toggle all drivers"
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              <span className="text-sm">All</span>
            </AnimatedButton>
            
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={exportToCSV}
              aria-label="Export data"
            >
              <Download className="w-4 h-4 mr-1" />
              <span className="text-sm">Export</span>
            </AnimatedButton>
          </div>
        </div>
        
        {/* Driver selection pills */}
        <div className="flex flex-wrap gap-2 mt-2">
          {series.map((s) => (
            <button
              key={s.name}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                activeDrivers.includes(s.driverNumber)
                  ? 'text-white'
                  : 'text-foreground opacity-50'
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
      
      <CardContent className="p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <div className="text-sm text-center">Loading lap times...</div>
            <div className="text-xs text-muted-foreground mt-2">
              {connectionStatus?.telemetry === "closed" ? 
                "Connection unavailable - using cached data" : 
                "Fetching data from timing service..."}
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center justify-center p-8 h-64">
            <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
            <div className="text-destructive text-center mb-2">{error}</div>
            <AnimatedButton
              variant="default"
              size="sm"
              onClick={retryFetch}
            >
              Retry
            </AnimatedButton>
          </div>
        )}
        
        {!loading && !error && (
          <div 
            className="w-full h-[300px] md:h-[400px] relative"
            ref={chartRef}
            onTouchStart={handleChartTouch}
            onTouchMove={handleChartTouch}
          >
            {/* Touch feedback indicators */}
            {touchPoints.map((point, i) => (
              <motion.div
                key={i}
                className="absolute w-8 h-8 rounded-full bg-primary opacity-30 pointer-events-none"
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
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                />
                <YAxis
                  label={{ value: "LAP TIME (s)", angle: -90, position: "insideLeft", fontSize: 12 }}
                  domain={["auto", "auto"]}
                  allowDecimals={true}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: '14px',
                    borderRadius: '8px',
                    padding: '12px'
                  }} 
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 14 }} 
                  verticalAlign="bottom"
                  height={40}
                  onClick={handleLegendClick}
                />
                
                {highlightedLap && (
                  <ReferenceLine x={highlightedLap} stroke={colors.primary} strokeDasharray="5 5" />
                )}
                
                {series
                  .filter(s => activeDrivers.includes(s.driverNumber))
                  .map((s) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={s.color}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={false}
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
            <div className="p-2 bg-muted font-semibold text-sm">
              Raw Lap Time Data
            </div>
            <div className="h-64 w-full">
              <AutoSizer>
                {({ height, width }) => (
                  <List
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
                          <div className="w-16 font-medium">Lap {lap.lap}</div>
                          {series
                            .filter(s => activeDrivers.includes(s.driverNumber))
                            .map((s) => (
                              <div 
                                key={s.name} 
                                className="flex-1 text-sm text-right px-2"
                                style={{ color: s.color }}
                              >
                                {lap[s.name] && lap[s.name] > 0 ? `${lap[s.name].toFixed(3)}s` : '-'}
                              </div>
                            ))}
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
  );
}

export default React.memo(LapTimeComparisonChart);