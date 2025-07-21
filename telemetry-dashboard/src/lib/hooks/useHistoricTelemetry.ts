import { OpenF1Service } from "@/lib/api/openf1";
import { TelemetryTimeSeriesData, TelemetryDataPoint } from "@/types";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// Placeholder for virtualization hook - implement as needed
const useTelemetryVirtualization = <T>(data: T[], options?: any) => {
  return {
    visibleData: data,
    scrollToIndex: (index: number) => {},
    getVirtualizedProps: () => ({}),
  };
};

export interface HistoricTelemetryOptions {
  enableVirtualization?: boolean;
  cacheSize?: number;
  prefetchLaps?: boolean;
  enableStatistics?: boolean;
  dataTransformation?: (data: any[]) => TelemetryDataPoint[] | any[];
}

export interface TimeRangeFilter {
  startTime?: number;
  endTime?: number;
  startLap?: number;
  endLap?: number;
  minSpeed?: number;
  maxSpeed?: number;
  fields?: string[];
}

export interface HistoricTelemetryResult {
  // Core data
  telemetry: TelemetryDataPoint[];
  current: TelemetryDataPoint | null;
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Bounds
  min: number;
  max: number;
  
  // Query functions
  findByTimestamp: (timestamp: number) => { point: TelemetryDataPoint | null, index: number };
  queryRange: (startIdx: number, endIdx: number, fields?: string[]) => any[];
  queryTimeRange: (filter: TimeRangeFilter) => TelemetryDataPoint[];
  queryLapRange: (startLap: number, endLap: number) => TelemetryDataPoint[];
  
  // Statistics
  stats: TelemetryStatistics | null;
  
  // Performance
  cacheStats: {
    hitRate: number;
    size: number;
    maxSize: number;
  };
  
  // Virtualization (if enabled) - simplified type
  virtualization?: any;
  
  // Data management
  clearCache: () => void;
  preloadTimeRange: (startTime: number, endTime: number) => Promise<void>;
  exportData: (format: 'json' | 'csv', filter?: TimeRangeFilter) => string;
}

export interface TelemetryStatistics {
  maxSpeed: number;
  minSpeed: number;
  avgSpeed: number;
  maxThrottle: number;
  maxBrake: number;
  maxRpm: number;
  drsActivations: number;
  totalTime: number;
  totalDistance: number;
  lapCount: number;
  sectors: {
    count: number;
    avgTime: number;
    bestTime: number;
  };
}

// Custom hook for fetching and managing historical telemetry data with efficient storage
export function useHistoricTelemetry(
  sessionKey: string | null, 
  options: HistoricTelemetryOptions = {}
): HistoricTelemetryResult {
  const {
    enableVirtualization = false,
    cacheSize = 100,
    prefetchLaps = true,
    enableStatistics = true,
    dataTransformation
  } = options;

  const [telemetryStore, setTelemetryStore] = useState<TelemetryTimeSeriesData | null>(null);
  const [current, setCurrent] = useState<TelemetryDataPoint | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheHits, setCacheHits] = useState(0);
  const [cacheRequests, setCacheRequests] = useState(0);

  // Store record min and max indices
  const indexBounds = useRef({ min: 0, max: 0 });
  const dataRef = useRef<TelemetryTimeSeriesData | null>(null);
  const prefetchedRanges = useRef<Set<string>>(new Set());

  // Initialize virtualization if enabled
  const virtualization = enableVirtualization ? 
    useTelemetryVirtualization(telemetryStore?.indexedData || [], { batchSize: 200 }) :
    undefined;

  // Fetch telemetry data
  useEffect(() => {
    if (!sessionKey) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const openf1 = new OpenF1Service("https://api.openf1.org/v1");
        let rawData = await openf1.getCarTelemetry(sessionKey);
        
        if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
          setError("No telemetry data available");
          setLoading(false);
          return;
        }

        // Apply custom transformation if provided, otherwise use raw data
        let processedData: any[];
        if (dataTransformation) {
          processedData = dataTransformation(rawData);
        } else {
          processedData = rawData;
        }

        // Create efficient data structure for time series
        const timeSeriesStore = createTimeSeriesStore(processedData, { cacheSize });
        setTelemetryStore(timeSeriesStore);
        dataRef.current = timeSeriesStore;

        // Set index bounds
        indexBounds.current = {
          min: 0,
          max: timeSeriesStore.indexedData.length - 1
        };

        // Set initial data point
        setCurrentIdx(0);
        setCurrent(timeSeriesStore.indexedData[0]);
        setLoading(false);

        // Prefetch common ranges if enabled
        if (prefetchLaps && timeSeriesStore.indexedData.length > 0) {
          prefetchCommonRanges(timeSeriesStore);
        }
      } catch (err) {
        console.error("Error fetching telemetry data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch telemetry data");
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionKey, dataTransformation, prefetchLaps]);

  // Update current point when currentIdx changes
  useEffect(() => {
    if (!dataRef.current) return;
    
    const validIdx = Math.max(
      indexBounds.current.min,
      Math.min(currentIdx, indexBounds.current.max)
    );
    
    setCurrent(dataRef.current.indexedData[validIdx]);
  }, [currentIdx]);

  // Enhanced time-based lookup function with caching
  const findByTimestamp = useCallback((timestamp: number): { point: TelemetryDataPoint | null, index: number } => {
    if (!dataRef.current) return { point: null, index: -1 };

    setCacheRequests(prev => prev + 1);
    
    // Check cache first
    const cacheKey = `timestamp-${timestamp}`;
    if (dataRef.current.queryCache.has(cacheKey)) {
      setCacheHits(prev => prev + 1);
      return dataRef.current.queryCache.get(cacheKey);
    }

    // Binary search in sortedTimestamps
    const { sortedTimestamps, timestampMap } = dataRef.current;
    let left = 0;
    let right = sortedTimestamps.length - 1;

    // Exact match or closest timestamp
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedTimestamps[mid] === timestamp) {
        const index = timestampMap.get(timestamp)!;
        const result = { point: dataRef.current.indexedData[index], index };
        dataRef.current.queryCache.set(cacheKey, result);
        return result;
      }
      if (sortedTimestamps[mid] < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // No exact match, return closest
    const closestIdx = right >= 0 ? right : 0;
    const closestTimestamp = sortedTimestamps[closestIdx];
    const index = timestampMap.get(closestTimestamp)!;
    const result = { 
      point: dataRef.current.indexedData[index],
      index
    };
    
    // Cache result
    dataRef.current.queryCache.set(cacheKey, result);
    
    return result;
  }, []);

  // Enhanced utility function to create efficient data structure
  function createTimeSeriesStore(
    data: any[] | TelemetryDataPoint[], 
    options: { cacheSize: number }
  ): TelemetryTimeSeriesData {
    // Check if data is already in TelemetryDataPoint format
    const isAlreadyTransformed = data.length > 0 && 'index' in data[0] && 'timestamp' in data[0];
    
    let sortedData: any[];
    
    if (isAlreadyTransformed) {
      // Data is already transformed, just sort by timestamp
      sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    } else {
      // Sort raw API data by date
      sortedData = [...data].sort((a, b) => {
        return new Date(a.date || a.timestamp).getTime() - new Date(b.date || b.timestamp).getTime();
      });
    }

    // Create indexed array with enhanced data structure
    const indexedData: TelemetryDataPoint[] = sortedData.map((item, index) => {
      if (isAlreadyTransformed) {
        // Data is already in correct format, just ensure index is set
        return {
          ...item,
          index
        };
      } else {
        // Transform raw API data to TelemetryDataPoint format
        return {
          speed: item.speed || 0,
          throttle: item.throttle || 0,
          brake: item.brake || 0,
          gear: item.gear || 0,
          rpm: item.rpm || 0,
          drs: !!item.drs,
          timestamp: new Date(item.date || item.timestamp).getTime(),
          lap: item.lap_number || item.lap || Math.floor(index / 100) + 1,
          sector: item.sector || ((index % 300) < 100 ? 1 : (index % 300) < 200 ? 2 : 3),
          distance: item.distance || index * 10,
          index
        };
      }
    });

    // Create enhanced indexing structures
    const sortedTimestamps: number[] = [];
    const timestampMap = new Map<number, number>();
    const lapIndex = new Map<number, number[]>();
    const sectorIndex = new Map<number, number[]>();

    indexedData.forEach((item, index) => {
      sortedTimestamps.push(item.timestamp);
      timestampMap.set(item.timestamp, index);
      
      // Build lap index
      if (!lapIndex.has(item.lap)) {
        lapIndex.set(item.lap, []);
      }
      lapIndex.get(item.lap)!.push(index);
      
      // Build sector index
      if (!sectorIndex.has(item.sector)) {
        sectorIndex.set(item.sector, []);
      }
      sectorIndex.get(item.sector)!.push(index);
    });

    // Create LRU cache for recent queries
    const queryCache = new Map<string, any>();

    return {
      indexedData,
      sortedTimestamps,
      timestampMap,
      lapIndex,
      sectorIndex,
      queryCache,
      cacheSize: options.cacheSize, // This is now guaranteed to be a number
    };
  }

  // Enhanced range query with multiple filter options
  const queryRange = useCallback((startIdx: number, endIdx: number, fields: string[] = ['speed', 'throttle', 'brake']) => {
    if (!dataRef.current) return [];

    setCacheRequests(prev => prev + 1);

    // Check cache first
    const cacheKey = `range-${startIdx}-${endIdx}-${fields.join(',')}`;
    if (dataRef.current.queryCache.has(cacheKey)) {
      setCacheHits(prev => prev + 1);
      return dataRef.current.queryCache.get(cacheKey);
    }

    // Bounds checking
    const validStart = Math.max(indexBounds.current.min, Math.min(startIdx, indexBounds.current.max));
    const validEnd = Math.max(indexBounds.current.min, Math.min(endIdx, indexBounds.current.max));
    
    // Extract only needed fields for memory efficiency
    const result = dataRef.current.indexedData
      .slice(validStart, validEnd + 1)
      .map((point: TelemetryDataPoint) => {
        const filtered: Record<string, any> = { timestamp: point.timestamp, index: point.index };
        fields.forEach(field => {
          if (field in point) {
            filtered[field] = point[field as keyof TelemetryDataPoint];
          }
        });
        return filtered;
      });

    // Cache result with LRU eviction
    if (dataRef.current.queryCache.size >= dataRef.current.cacheSize) {
      const firstKey = dataRef.current.queryCache.keys().next().value;
      if (typeof firstKey === "string") {
        dataRef.current.queryCache.delete(firstKey);
      }
    }
    dataRef.current.queryCache.set(cacheKey, result);
    
    return result;
  }, []);

  // New: Time range query with advanced filtering
  const queryTimeRange = useCallback((filter: TimeRangeFilter): TelemetryDataPoint[] => {
    if (!dataRef.current) return [];

    const {
      startTime,
      endTime,
      minSpeed,
      maxSpeed,
      fields = ['speed', 'throttle', 'brake', 'rpm', 'gear', 'drs']
    } = filter;

    setCacheRequests(prev => prev + 1);

    // Check cache
    const cacheKey = `time-${JSON.stringify(filter)}`;
    if (dataRef.current.queryCache.has(cacheKey)) {
      setCacheHits(prev => prev + 1);
      return dataRef.current.queryCache.get(cacheKey);
    }

    let result = dataRef.current.indexedData;

    // Apply time filtering
    if (startTime !== undefined || endTime !== undefined) {
      result = result.filter((point: TelemetryDataPoint) => {
        return (startTime === undefined || point.timestamp >= startTime) &&
               (endTime === undefined || point.timestamp <= endTime);
      });
    }

    // Apply speed filtering
    if (minSpeed !== undefined || maxSpeed !== undefined) {
      result = result.filter((point: TelemetryDataPoint) => {
        return (minSpeed === undefined || point.speed >= minSpeed) &&
               (maxSpeed === undefined || point.speed <= maxSpeed);
      });
    }

    // Apply field selection
    if (fields.length < Object.keys(result[0] || {}).length) {
      result = result.map((point: TelemetryDataPoint) => {
        const filtered = { timestamp: point.timestamp, index: point.index } as any;
        fields.forEach(field => {
          if (field in point) {
            filtered[field] = point[field as keyof TelemetryDataPoint];
          }
        });
        return filtered;
      });
    }

    // Cache result
    dataRef.current.queryCache.set(cacheKey, result);
    return result;
  }, []);

  // New: Lap-based range query
  const queryLapRange = useCallback((startLap: number, endLap: number): TelemetryDataPoint[] => {
    if (!dataRef.current?.lapIndex) return [];

    setCacheRequests(prev => prev + 1);

    const cacheKey = `lap-${startLap}-${endLap}`;
    if (dataRef.current.queryCache.has(cacheKey)) {
      setCacheHits(prev => prev + 1);
      return dataRef.current.queryCache.get(cacheKey);
    }

    const indices: number[] = [];
    for (let lap = startLap; lap <= endLap; lap++) {
      const lapIndices = dataRef.current.lapIndex.get(lap) || [];
      indices.push(...lapIndices);
    }

    indices.sort((a, b) => a - b); // Ensure chronological order
    const result = indices.map(idx => dataRef.current!.indexedData[idx]);

    dataRef.current.queryCache.set(cacheKey, result);
    return result;
  }, []);

  // New: Preload time range
  const preloadTimeRange = useCallback(async (startTime: number, endTime: number): Promise<void> => {
    const rangeKey = `${startTime}-${endTime}`;
    if (prefetchedRanges.current.has(rangeKey)) return;

    // Simulate preloading by querying the range
    queryTimeRange({ startTime, endTime });
    prefetchedRanges.current.add(rangeKey);
  }, [queryTimeRange]);

  // New: Export functionality
  const exportData = useCallback((format: 'json' | 'csv', filter?: TimeRangeFilter): string => {
    const data = filter ? queryTimeRange(filter) : (dataRef.current?.indexedData || []);

    if (format === 'csv') {
      if (!data.length) return '';
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((row: any) => 
        Object.values(row).map((val: any) => 
          typeof val === 'string' ? `"${val}"` : val
        ).join(',')
      );
      
      return [headers, ...rows].join('\n');
    } else {
      return JSON.stringify(data, null, 2);
    }
  }, [queryTimeRange]);

  // Clear cache function
  const clearCache = useCallback(() => {
    if (dataRef.current) {
      dataRef.current.queryCache.clear();
      setCacheHits(0);
      setCacheRequests(0);
      prefetchedRanges.current.clear();
    }
  }, []);

  // Prefetch common ranges
  const prefetchCommonRanges = useCallback((store: TelemetryTimeSeriesData) => {
    const totalTime = store.indexedData.length;
    const chunkSize = Math.floor(totalTime / 10);
    
    // Prefetch 10% chunks
    for (let i = 0; i < 10; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize - 1, totalTime - 1);
      queryRange(start, end);
    }
  }, [queryRange]);

  // Memoized statistics
  const stats = useMemo(() => {
    if (!enableStatistics || !dataRef.current) return null;
    return calculateAdvancedStats(dataRef.current.indexedData);
  }, [telemetryStore, enableStatistics]);

  // Cache statistics
  const cacheStats = useMemo(() => ({
    hitRate: cacheRequests > 0 ? cacheHits / cacheRequests : 0,
    size: dataRef.current?.queryCache.size || 0,
    maxSize: cacheSize
  }), [cacheHits, cacheRequests, cacheSize]);

  return {
    // Core data
    telemetry: telemetryStore?.indexedData || [],
    current,
    currentIdx,
    setCurrentIdx,
    
    // State
    loading,
    error,
    
    // Bounds
    min: indexBounds.current.min,
    max: indexBounds.current.max,
    
    // Query functions
    findByTimestamp,
    queryRange,
    queryTimeRange,
    queryLapRange,
    
    // Statistics
    stats,
    
    // Performance
    cacheStats,
    
    // Virtualization
    ...(enableVirtualization && { virtualization }),
    
    // Data management
    clearCache,
    preloadTimeRange,
    exportData
  };
}

// Enhanced statistics calculation
function calculateAdvancedStats(data: TelemetryDataPoint[]): TelemetryStatistics {
  if (!data.length) return {
    maxSpeed: 0, minSpeed: 0, avgSpeed: 0, maxThrottle: 0, maxBrake: 0,
    maxRpm: 0, drsActivations: 0, totalTime: 0, totalDistance: 0,
    lapCount: 0, sectors: { count: 0, avgTime: 0, bestTime: 0 }
  };

  // Pre-allocate arrays for numerical fields
  const speedValues = new Float32Array(data.length);
  const throttleValues = new Float32Array(data.length);
  const brakeValues = new Float32Array(data.length);
  const rpmValues = new Float32Array(data.length);

  // Single-pass calculation
  let maxSpeed = -Infinity, minSpeed = Infinity;
  let maxThrottle = -Infinity, maxBrake = -Infinity, maxRpm = -Infinity;
  let drsActivations = 0, lastDrsState = false;
  let totalDistance = 0, lapCount = 0;
  const lapTimes = new Map<number, number[]>();
  const sectorTimes = new Map<number, number[]>();

  let lastLap = -1;
  let lastSector = -1;
  let sectorStartTime = 0;

  for (let i = 0; i < data.length; i++) {
    const point = data[i];

    // Basic statistics
    speedValues[i] = point.speed;
    throttleValues[i] = point.throttle;
    brakeValues[i] = point.brake;
    rpmValues[i] = point.rpm;

    maxSpeed = Math.max(maxSpeed, point.speed);
    minSpeed = Math.min(minSpeed, point.speed);
    maxThrottle = Math.max(maxThrottle, point.throttle);
    maxBrake = Math.max(maxBrake, point.brake);
    maxRpm = Math.max(maxRpm, point.rpm);

    // DRS activations
    if (point.drs && !lastDrsState) {
      drsActivations++;
    }
    lastDrsState = point.drs;

    // Distance calculation (estimated)
    if (i > 0) {
      const timeDiff = (point.timestamp - data[i-1].timestamp) / 1000;
      const avgSpeed = (point.speed + data[i-1].speed) / 2;
      totalDistance += (avgSpeed * timeDiff) / 3.6; // Convert km/h to m/s
    }

    // Lap counting
    if (point.lap && point.lap !== lastLap) {
      lastLap = point.lap;
      lapCount++;
    }

    // Sector timing
    if (point.sector && point.sector !== lastSector) {
      if (lastSector !== -1) {
        const sectorTime = point.timestamp - sectorStartTime;
        if (!sectorTimes.has(lastSector)) {
          sectorTimes.set(lastSector, []);
        }
        sectorTimes.get(lastSector)!.push(sectorTime);
      }
      lastSector = point.sector;
      sectorStartTime = point.timestamp;
    }
  }

  // Calculate sector statistics
  const sectorStats = {
    count: sectorTimes.size,
    avgTime: 0,
    bestTime: Infinity
  };

  if (sectorTimes.size > 0) {
    let totalSectorTime = 0;
    let totalSectors = 0;

    sectorTimes.forEach(times => {
      times.forEach(time => {
        totalSectorTime += time;
        totalSectors++;
        sectorStats.bestTime = Math.min(sectorStats.bestTime, time);
      });
    });

    sectorStats.avgTime = totalSectorTime / totalSectors;
  }

  return {
    maxSpeed,
    minSpeed,
    avgSpeed: calculateAverage(speedValues),
    maxThrottle,
    maxBrake,
    maxRpm,
    drsActivations,
    totalTime: data.length ? (data[data.length - 1].timestamp - data[0].timestamp) / 1000 : 0,
    totalDistance,
    lapCount,
    sectors: sectorStats
  };
}

function calculateAverage(array: Float32Array): number {
  const sum = array.reduce((acc, val) => acc + val, 0);
  return sum / array.length;
}