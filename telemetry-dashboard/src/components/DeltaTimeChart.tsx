"use client"

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpenF1Service } from "@/lib/api/openf1";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { DeltaTimeChartProps } from "@/types";

// Define proper types for the data structures
interface LapTime {
  lap_number: number;
  lap_time: number;
}

interface DriverData {
  driverNumber: number;
  name: string;
  color: string;
  laps: LapTime[];
}

interface DeltaSeriesData {
  name: string;
  color: string;
  data: Array<{ lap: number; delta: number }>;

}

interface DriverInfo {
  driver_number: number;
  broadcast_name?: string;
  full_name?: string;
  color?: string;
  team_colour?: string;
}

function extractDriverInfo(info: any, driverNumber: number): { name: string; color: string } {
  const getDriverName = (info: any, driverNumber: number): string => {
    if (Array.isArray(info) && info[0]) {
      return info[0].broadcast_name || info[0].full_name || `#${driverNumber}`;
    }
    if (info && typeof info === 'object') {
      return info.broadcast_name || info.full_name || `#${driverNumber}`;
    }
    return `#${driverNumber}`;
  };

  const getDriverColor = (info: any): string => {
    if (Array.isArray(info) && info[0]) {
      return info[0].color || info[0].team_colour || "#8884d8";
    }
    if (info && typeof info === 'object') {
      return info.color || info.team_colour || "#8884d8";
    }
    return "#8884d8";
  };

  const driverName = getDriverName(info, driverNumber);
  const color = getDriverColor(info);

  return {
    name: driverName,
    color
  };
}

export default function DeltaTimeChart({
  sessionKey,
  driverNumbers = [], // Add default value
  referenceDriver,
}: DeltaTimeChartProps) {
  const { colors } = useTheme()
  const [series, setSeries] = useState<DeltaSeriesData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || driverNumbers.length < 2) return
    
    setLoading(true)
    setError(null)
    
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    
    Promise.all(
      driverNumbers.map(async (driverNumber): Promise<DriverData> => {
        try {
          const [laps, info] = await Promise.all([
            openf1.getLapTimes(sessionKey, driverNumber),
            openf1.getDriverInfo(sessionKey, driverNumber),
          ])
          
          const { name: driverName, color } = extractDriverInfo(info, driverNumber);
            
          return {
            driverNumber,
            name: driverName,
            color,
            laps: Array.isArray(laps) ? laps : [],
          }
        } catch (err) {
          console.error(`Error fetching data for driver ${driverNumber}:`, err)
          return {
            driverNumber,
            name: `#${driverNumber}`,
            color: "#8884d8",
            laps: [],
          }
        }
      })
    )
      .then((driverData: DriverData[]) => {
        // Reference is first driver unless specified
        const refIdx = referenceDriver
          ? driverData.findIndex(d => d.driverNumber === referenceDriver)
          : 0
          
        // Ensure we have a valid reference index
        const validRefIdx = refIdx >= 0 ? refIdx : 0
        const refLaps = driverData[validRefIdx]?.laps || []
        const refName = driverData[validRefIdx]?.name || "Reference"
        
        // Build delta series for each driver (except reference)
        const allSeries: DeltaSeriesData[] = driverData
          .filter((_, i) => i !== validRefIdx)
          .map((d) => {
            const data = d.laps
              .map((lap) => {
                const refLap = refLaps.find(l => l.lap_number === lap.lap_number)
                if (!refLap || !lap.lap_time || !refLap.lap_time) return null
                
                const delta = lap.lap_time - refLap.lap_time
                return { lap: lap.lap_number, delta }
              })
              .filter((d): d is { lap: number; delta: number } => d !== null)
              
            return {
              name: `${d.name} vs ${refName}`,
              color: d.color,
              data,
            }
          })
          
        setSeries(allSeries)
      })
      .catch((err) => {
        console.error('Error fetching delta time data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load delta time data')
      })
      .finally(() => setLoading(false))
  }, [sessionKey, driverNumbers, referenceDriver])

  // Build chart data: one object per lap, with each delta as a key
  const chartData: Array<Record<string, any>> = []
  if (series.length > 0) {
    const maxLap = Math.max(...series.flatMap((s) => s.data.map((d) => d.lap)))
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry: Record<string, any> = { lap }
      series.forEach((s) => {
        const found = s.data.find((d) => d.lap === lap)
        entry[s.name] = found ? found.delta : null
      })
      chartData.push(entry)
    }
  }

  // Custom tooltip component for better formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{`Lap ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${entry.value > 0 ? '+' : ''}${entry.value?.toFixed(3)}s`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="mt-4" style={{ borderColor: colors.primary, background: colors.primary + "10" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Delta Time Chart</span>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading delta times...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
              {error}
            </div>
          </div>
        )}
        
        {!loading && !error && series.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">
              No delta time data available. Ensure you have selected at least 2 drivers.
            </div>
          </div>
        )}
        
        {!loading && !error && series.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="lap" 
                  label={{ value: "Lap", position: "insideBottomRight", offset: -5 }}
                  type="number"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  label={{ value: "Delta (s)", angle: -90, position: "insideLeft" }}
                  domain={["auto", "auto"]}
                  allowDecimals={true}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {series.map((s) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {chartData.length > 0 && (
              <div className="mt-4 border rounded">
                <div className="p-2 bg-muted font-semibold text-sm">
                  Delta Times (seconds) - Negative values are faster
                </div>
                <div className="h-56 w-full">
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
                              <div className="w-16 font-semibold text-sm">
                                Lap {lap.lap}
                              </div>
                              {series.map((s) => {
                                const deltaValue = lap[s.name];
                                return (
                                  <div 
                                    key={s.name} 
                                    className={`flex-1 text-sm text-right px-2 ${
                                      deltaValue != null
                                        ? deltaValue < 0 
                                          ? 'text-green-500 font-medium' 
                                          : deltaValue > 0 
                                            ? 'text-red-500' 
                                            : ''
                                        : 'text-muted-foreground'
                                    }`}
                                    title={deltaValue != null ? `${s.name}: ${deltaValue > 0 ? '+' : ''}${deltaValue.toFixed(3)}s` : 'No data'}
                                  >
                                    {deltaValue != null 
                                      ? `${deltaValue > 0 ? '+' : ''}${deltaValue.toFixed(3)}s`
                                      : '-'}
                                  </div>
                                )
                              })}
                            </div>
                          );
                        }}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}