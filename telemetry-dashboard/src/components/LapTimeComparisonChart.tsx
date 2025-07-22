"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { OpenF1Service } from "@/lib/api/openf1";
import { useTheme } from "@/components/ThemeProvider";
import { Clock, ArrowUpDown, Download, AlertTriangle, Filter, Zap, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedButton from "@/components/AnimatedButton";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Loader2 } from "lucide-react";
import { FixedSizeList as List } from 'react-window';
import { LapTimeComparisonChartProps, OpenF1LapTime } from "@/types";
import { useTelemetry } from "@/context/TelemetryDataContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ReferenceLine } from "recharts";

// Lazy load chart dependencies with correct module paths
const Legend = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.Legend as any })), 
  { ssr: false }
) as any;

const ResponsiveContainer = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.ResponsiveContainer as any })), 
  { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted animate-pulse rounded" />
  }
) as any;

const LineChart = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.LineChart as any })), 
  { ssr: false }
) as any;

const XAxis = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.XAxis as any })), 
  { ssr: false }
) as any;

const YAxis = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.YAxis as any })), 
  { ssr: false }
) as any;

const Tooltip = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.Tooltip as any })), 
  { ssr: false }
) as any;

const Line = dynamic(() => 
  import("recharts").then(mod => ({ default: mod.Line as any })), 
  { ssr: false }
) as any;

// Lazy load virtualization
const AutoSizer = dynamic(() => 
  import("react-virtualized-auto-sizer").then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse rounded" />
})

// Enhanced types for virtualization
interface VirtualizedSeries {
  name: string;
  color: string;
  driverNumber: number;
  originalData: { lap: number; time: number }[];
  virtualizedData: { lap: number; time: number }[];
  isVisible: boolean;
  totalDataPoints: number;
  loadedRange: { start: number; end: number };
}

interface ChartViewport {
  minLap: number;
  maxLap: number;
  visibleDataPoints: number;
  totalDataPoints: number;
  compressionRatio: number;
}

interface DataVirtualizationOptions {
  maxVisiblePoints: number;
  compressionThreshold: number;
  progressiveLoadBatchSize: number;
  enableDataCulling: boolean;
  enableProgressiveLoading: boolean;
  cullingStrategy: 'uniform' | 'adaptive' | 'importance-based';
}

// Advanced data point sampling strategies
class DataSampler {
  // Uniform sampling - evenly spaced points
  static uniformSample(data: any[], targetCount: number): any[] {
    if (data.length <= targetCount) return data;
    
    const step = data.length / targetCount;
    const result: typeof data = [];
    
    for (let i = 0; i < targetCount; i++) {
      const index = Math.floor(i * step);
      result.push(data[index]);
    }
    
    return result;
  }

  // Adaptive sampling - preserve important features
  static adaptiveSample(data: any[], targetCount: number): any[] {
    if (data.length <= targetCount) return data;
    
    const result = [data[0]]; // Always include first point
    const remaining = targetCount - 2; // Reserve space for first and last
    
    // Calculate importance scores (rate of change)
    const importanceScores = this.calculateImportanceScores(data);
    const sortedIndices = importanceScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .slice(0, remaining)
      .sort((a, b) => a.index - b.index);
    
    sortedIndices.forEach(({ index }) => {
      result.push(data[index]);
    });
    
    result.push(data[data.length - 1]); // Always include last point
    return result.sort((a, b) => a.lap - b.lap);
  }

  // Importance-based sampling - focus on outliers and trends
  static importanceBasedSample(data: any[], targetCount: number): any[] {
    if (data.length <= targetCount) return data;
    
    const windows = this.createSlidingWindows(data, Math.ceil(data.length / targetCount));
    const result: typeof data = [];
    
    windows.forEach(window => {
      // Find the most representative point in each window
      const representative = this.findRepresentativePoint(window);
      result.push(representative);
    });
    
    return result;
  }

  private static calculateImportanceScores(data: any[]): number[] {
    const scores = new Array(data.length).fill(0);
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Calculate rate of change
      const leftDiff = Math.abs(current.time - prev.time);
      const rightDiff = Math.abs(next.time - current.time);
      const curvature = Math.abs(leftDiff - rightDiff);
      
      scores[i] = curvature;
    }
    
    return scores;
  }

  private static createSlidingWindows(data: any[], windowSize: number): any[][] {
    const windows = [];
    for (let i = 0; i < data.length; i += windowSize) {
      windows.push(data.slice(i, i + windowSize));
    }
    return windows;
  }

  private static findRepresentativePoint(window: any[]): any {
    if (window.length === 1) return window[0];
    
    // Find median time value
    const sorted = [...window].sort((a, b) => a.time - b.time);
    const medianIndex = Math.floor(sorted.length / 2);
    return sorted[medianIndex];
  }
}

// Progressive data loader
class ProgressiveDataLoader {
  private loadedRanges = new Map<string, { start: number; end: number }>();
  private pendingRequests = new Set<string>();

  async loadRange(
    sessionKey: string,
    driverNumber: number,
    startLap: number,
    endLap: number,
    openf1Service: OpenF1Service
  ): Promise<{ lap: number; time: number }[]> {
    const key = `${sessionKey}-${driverNumber}`;
    
    if (this.pendingRequests.has(key)) {
      return [];
    }

    this.pendingRequests.add(key);
    
    try {
      const laps = await openf1Service.getLapTimes(sessionKey, driverNumber);
      const filteredLaps = Array.isArray(laps) 
        ? laps.filter(l => l.lap_number >= startLap && l.lap_number <= endLap)
            .map(l => ({
              lap: l.lap_number || 0,
              time: l.lap_time || 0,
            }))
        : [];

      this.loadedRanges.set(key, { start: startLap, end: endLap });
      return filteredLaps;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  getLoadedRange(sessionKey: string, driverNumber: number): { start: number; end: number } | null {
    return this.loadedRanges.get(`${sessionKey}-${driverNumber}`) || null;
  }

  clearCache(): void {
    this.loadedRanges.clear();
    this.pendingRequests.clear();
  }
}

// Main virtualized component
function LapTimeComparisonChart({
  sessionKey,
  driverNumbers = [],
  highlightedLap
}: LapTimeComparisonChartProps) {
  const { colors } = useTheme();
  const { connectionStatus } = useTelemetry();
  
  // Enhanced state management
  const [series, setSeries] = useState<VirtualizedSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ChartViewport>({
    minLap: 1,
    maxLap: 100,
    visibleDataPoints: 0,
    totalDataPoints: 0,
    compressionRatio: 1
  });
  
  // Virtualization options
  const [virtualizationOptions, setVirtualizationOptions] = useState<DataVirtualizationOptions>({
    maxVisiblePoints: 500,
    compressionThreshold: 1000,
    progressiveLoadBatchSize: 50,
    enableDataCulling: true,
    enableProgressiveLoading: true,
    cullingStrategy: 'adaptive'
  });

  // UI state
  const [activeDrivers, setActiveDrivers] = useState<number[]>([]);
  const [lapRangeFilter, setLapRangeFilter] = useState({ min: 1, max: 100 });
  const [timeFilter, setTimeFilter] = useState({ enabled: false, min: 0, max: 200 });
  const [showVirtualizationStats, setShowVirtualizationStats] = useState(false);
  
  // Refs
  const chartRef = useRef<HTMLDivElement>(null);
  const progressiveLoader = useRef(new ProgressiveDataLoader());

  // Initialize active drivers
  useEffect(() => {
    setActiveDrivers([...driverNumbers]);
  }, [driverNumbers]);

  // Data virtualization engine
  const virtualizeSeriesData = useCallback((
    originalData: { lap: number; time: number }[],
    options: DataVirtualizationOptions,
    viewport: ChartViewport
  ): { lap: number; time: number }[] => {
    if (!options.enableDataCulling || originalData.length <= options.maxVisiblePoints) {
      return originalData;
    }

    // Filter by lap range
    let filteredData = originalData.filter(d => 
      d.lap >= lapRangeFilter.min && 
      d.lap <= lapRangeFilter.max &&
      d.time > 0
    );

    // Filter by time range if enabled
    if (timeFilter.enabled) {
      filteredData = filteredData.filter(d => 
        d.time >= timeFilter.min && 
        d.time <= timeFilter.max
      );
    }

    // Apply sampling strategy
    switch (options.cullingStrategy) {
      case 'uniform':
        return DataSampler.uniformSample(filteredData, options.maxVisiblePoints);
      case 'adaptive':
        return DataSampler.adaptiveSample(filteredData, options.maxVisiblePoints);
      case 'importance-based':
        return DataSampler.importanceBasedSample(filteredData, options.maxVisiblePoints);
      default:
        return DataSampler.adaptiveSample(filteredData, options.maxVisiblePoints);
    }
  }, [lapRangeFilter, timeFilter]);

  // Enhanced data fetching with virtualization
  const fetchLapData = useCallback(async () => {
    if (!sessionKey || !driverNumbers.length) return;
    
    setLoading(true);
    setError(null);
    
    const openf1 = new OpenF1Service();
    
    try {
      const seriesPromises = driverNumbers.map(async (driverNumber) => {
        try {
          const [laps, info] = await Promise.all([
            virtualizationOptions.enableProgressiveLoading
              ? progressiveLoader.current.loadRange(
                  sessionKey, 
                  driverNumber, 
                  lapRangeFilter.min, 
                  lapRangeFilter.max, 
                  openf1
                )
              : (async () => {
                  const lapData = await openf1.getLapTimes(sessionKey, driverNumber);
                  return Array.isArray(lapData) ? lapData.map(l => ({
                    lap: l.lap_number || 0,
                    time: l.lap_time || 0,
                  })) : [];
                })(),
            openf1.getDriverInfo(sessionKey, driverNumber),
          ]);

          // Extract driver info
          const getDriverName = (info: any): string => {
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

          const originalData = Array.isArray(laps) ? laps.filter(l => l.time > 0) : [];
          
          return {
            name: getDriverName(info),
            color: getDriverColor(info),
            driverNumber,
            originalData,
            virtualizedData: [], // Will be populated by virtualization
            isVisible: true,
            totalDataPoints: originalData.length,
            loadedRange: { start: lapRangeFilter.min, end: lapRangeFilter.max }
          } as VirtualizedSeries;
          
        } catch (err) {
          console.error(`Error fetching data for driver ${driverNumber}:`, err);
          return {
            name: `#${driverNumber}`,
            color: "#8884d8",
            driverNumber,
            originalData: [],
            virtualizedData: [],
            isVisible: true,
            totalDataPoints: 0,
            loadedRange: { start: 1, end: 1 }
          } as VirtualizedSeries;
        }
      });

      const newSeries = await Promise.all(seriesPromises);
      
      // Update viewport information
      const allLaps = newSeries.flatMap(s => s.originalData.map(d => d.lap));
      const totalPoints = newSeries.reduce((sum, s) => sum + s.totalDataPoints, 0);
      
      if (allLaps.length > 0) {
        setViewport({
          minLap: Math.min(...allLaps),
          maxLap: Math.max(...allLaps),
          visibleDataPoints: 0, // Will be calculated after virtualization
          totalDataPoints: totalPoints,
          compressionRatio: 1 // Will be calculated after virtualization
        });
      }

      setSeries(newSeries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [sessionKey, driverNumbers, lapRangeFilter, virtualizationOptions]);

  // Apply virtualization to series data
  useEffect(() => {
    if (series.length === 0) return;

    const virtualizedSeries = series.map(s => {
      const virtualizedData = virtualizeSeriesData(s.originalData, virtualizationOptions, viewport);
      return {
        ...s,
        virtualizedData
      };
    });

    const totalVisible = virtualizedSeries.reduce((sum, s) => sum + s.virtualizedData.length, 0);
    const compressionRatio = viewport.totalDataPoints > 0 ? totalVisible / viewport.totalDataPoints : 1;

    setViewport(prev => ({
      ...prev,
      visibleDataPoints: totalVisible,
      compressionRatio
    }));

    // Only update if the data actually changed
    setSeries(prev => {
      const hasChanged = prev.length !== virtualizedSeries.length || 
        prev.some((s, i) => s.virtualizedData.length !== virtualizedSeries[i].virtualizedData.length);
      
      return hasChanged ? virtualizedSeries : prev;
    });
  }, [virtualizationOptions, lapRangeFilter, timeFilter]); // Remove circular dependencies

  // Fetch data when dependencies change
  useEffect(() => {
    fetchLapData();
  }, [fetchLapData]);

  // Memoized chart data for performance
  const chartData = useMemo(() => {
    if (!series.length) return [];
    
    const result: Record<string, any>[] = [];
    const visibleSeries = series.filter(s => s.isVisible && activeDrivers.includes(s.driverNumber));
    const allLaps = visibleSeries.flatMap(s => s.virtualizedData.map(d => d.lap));
    
    if (allLaps.length === 0) return [];
    
    const uniqueLaps = [...new Set(allLaps)].sort((a, b) => a - b);
    
    uniqueLaps.forEach(lap => {
      const entry: Record<string, any> = { lap };
      visibleSeries.forEach(s => {
        const dataPoint = s.virtualizedData.find(d => d.lap === lap);
        entry[s.name] = dataPoint ? dataPoint.time : null;
      });
      result.push(entry);
    });
    
    return result;
  }, [series, activeDrivers]);

  // Event handlers
  const toggleDriver = useCallback((driverNumber: number) => {
    setActiveDrivers(current => 
      current.includes(driverNumber) 
        ? current.filter(d => d !== driverNumber)
        : [...current, driverNumber]
    );
  }, []);

  const toggleDriverVisibility = useCallback((driverNumber: number) => {
    setSeries(current => 
      current.map(s => 
        s.driverNumber === driverNumber 
          ? { ...s, isVisible: !s.isVisible }
          : s
      )
    );
  }, []);

  const updateVirtualizationOptions = useCallback((updates: Partial<DataVirtualizationOptions>) => {
    setVirtualizationOptions(current => ({ ...current, ...updates }));
  }, []);

  const exportToCSV = useCallback(() => {
    if (!series.length || !chartData.length) return;
    
    try {
      const visibleSeries = series.filter(s => s.isVisible && activeDrivers.includes(s.driverNumber));
      const headers = ["Lap", ...visibleSeries.map(s => s.name)].join(",");
      const rows = chartData.map(row => {
        return [
          row.lap,
          ...visibleSeries.map(s => row[s.name] !== null && row[s.name] !== undefined ? row[s.name].toFixed(3) : "")
        ].join(",");
      });
      
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `lap_times_${sessionKey}_virtualized.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  }, [series, chartData, sessionKey, activeDrivers]);

  // Virtualized row renderer for data table
  const VirtualizedRow = useCallback(
    ({ index, style }: { index: number; style: any }) => {
      const lap = chartData[index];
      const visibleSeries = series.filter(s => s.isVisible && activeDrivers.includes(s.driverNumber));
      
      return (
        <div 
          className={`flex items-center px-2 py-1 ${
            index % 2 === 0 ? 'bg-muted/30' : ''
          }`}
          style={style}
        >
          <div className="w-16 font-medium">
            <Badge variant={highlightedLap === lap.lap ? "default" : "secondary"}>
              Lap {lap.lap}
            </Badge>
          </div>
          {visibleSeries.map((s) => (
            <div 
              key={s.name} 
              className="flex-1 text-sm text-right px-2"
              style={{ color: s.color }}
            >
              {lap[s.name] && lap[s.name] > 0 ? (
                <span className="font-mono">
                  {lap[s.name].toFixed(3)}s
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          ))}
        </div>
      );
    },
    [chartData, series, activeDrivers, highlightedLap]
  );

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
            {virtualizationOptions.enableDataCulling && (
              <Badge variant="outline" className="ml-2">
                <Zap className="w-3 h-3 mr-1" />
                Virtualized
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => setShowVirtualizationStats(!showVirtualizationStats)}
              aria-label="Toggle virtualization stats"
            >
              {showVirtualizationStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </AnimatedButton>
            
            <AnimatedButton
              variant="ghost"
              size="sm"
              onClick={() => setActiveDrivers([...driverNumbers])}
              aria-label="Show all drivers"
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
        
        {/* Virtualization Statistics */}
        <AnimatePresence>
          {showVirtualizationStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-3 bg-muted/30 rounded-lg"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Points:</span>
                  <div className="font-mono font-medium">{viewport.totalDataPoints.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Visible Points:</span>
                  <div className="font-mono font-medium">{viewport.visibleDataPoints.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Compression:</span>
                  <div className="font-mono font-medium">{(viewport.compressionRatio * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Strategy:</span>
                  <div className="font-medium capitalize">{virtualizationOptions.cullingStrategy}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Advanced Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Lap Range</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={lapRangeFilter.min}
                onChange={(e) => setLapRangeFilter(prev => ({ ...prev, min: Number(e.target.value) }))}
                className="w-20"
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max"
                value={lapRangeFilter.max}
                onChange={(e) => setLapRangeFilter(prev => ({ ...prev, max: Number(e.target.value) }))}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sampling Strategy</label>
            <Select
              value={virtualizationOptions.cullingStrategy}
              onValueChange={(value) => updateVirtualizationOptions({ cullingStrategy: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="adaptive">Adaptive</SelectItem>
                <SelectItem value="importance-based">Importance-Based</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Max Points</label>
            <Input
              type="number"
              value={virtualizationOptions.maxVisiblePoints}
              onChange={(e) => updateVirtualizationOptions({ maxVisiblePoints: Number(e.target.value) })}
              min="100"
              max="2000"
              step="100"
            />
          </div>
        </div>

        {/* Driver Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          {series.map((s) => (
            <div key={s.driverNumber} className="flex items-center gap-2">
              <button
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                  activeDrivers.includes(s.driverNumber) && s.isVisible
                    ? 'text-white'
                    : 'text-foreground opacity-50'
                }`}
                style={{ 
                  backgroundColor: activeDrivers.includes(s.driverNumber) && s.isVisible
                    ? s.color 
                    : s.color + '30'
                }}
                onClick={() => toggleDriver(s.driverNumber)}
              >
                #{s.driverNumber}
                <Badge variant="secondary" className="text-xs">
                  {s.virtualizedData.length}/{s.totalDataPoints}
                </Badge>
              </button>
              <Checkbox
                checked={s.isVisible}
                onCheckedChange={() => toggleDriverVisibility(s.driverNumber)}
                className="w-4 h-4"
              />
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <div className="text-sm text-center">Loading lap times...</div>
            <div className="text-xs text-muted-foreground mt-2">
              {virtualizationOptions.enableProgressiveLoading ? 
                "Progressive loading enabled" : 
                "Loading full dataset..."}
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
              onClick={fetchLapData}
            >
              Retry
            </AnimatedButton>
          </div>
        )}
        
        {!loading && !error && (
          <div className="w-full h-[400px] relative" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 10, right: 10, bottom: 20, left: 40 }}
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
                  formatter={(value: any) => [
                    value ? `${value.toFixed(3)}s` : 'N/A',
                    'Lap Time'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: 14 }} 
                  verticalAlign="bottom"
                  height={40}
                />
                
                {highlightedLap && (
                  <ReferenceLine 
                    x={highlightedLap} 
                    stroke={colors.primary} 
                    strokeDasharray="5 5" 
                    label={{ value: `Lap ${highlightedLap}`, position: "top" }}
                  />
                )}
                
                {series
                  .filter(s => s.isVisible && activeDrivers.includes(s.driverNumber))
                  .map((s) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={s.color}
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {/* Virtualized Data Table */}
        {!loading && !error && chartData.length > 0 && (
          <div className="mt-6 border rounded">
            <div className="p-3 bg-muted font-semibold text-sm flex items-center justify-between">
              <span>Virtualized Lap Time Data</span>
              <Badge variant="outline">
                {chartData.length} / {viewport.totalDataPoints} rows
              </Badge>
            </div>
            <div className="h-64 w-full">
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    height={height}
                    itemCount={chartData.length}
                    itemSize={40}
                    width={width}
                  >
                    {VirtualizedRow}
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