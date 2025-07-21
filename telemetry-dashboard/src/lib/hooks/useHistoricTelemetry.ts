import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { OpenF1Service } from "@/lib/api/openf1";
import { TelemetryTimeSeriesData, TelemetryDataPoint } from "@/lib/types";

// Custom hook for fetching and managing historical telemetry data with efficient storage
export function useHistoricTelemetry(sessionKey: string | null) {
  const [telemetryStore, setTelemetryStore] = useState<TelemetryTimeSeriesData | null>(null);
  const [current, setCurrent] = useState<TelemetryDataPoint | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store record min and max indices
  const indexBounds = useRef({ min: 0, max: 0 });
  const dataRef = useRef<TelemetryTimeSeriesData | null>(null);

  // Fetch telemetry data
  useEffect(() => {
    if (!sessionKey) return;

    setLoading(true);
    setError(null);

    // Hybrid approach: sparse array for direct index lookup + indexed map for timestamp queries
    const fetchData = async () => {
      try {
        const openf1 = new OpenF1Service("https://api.openf1.org/v1");
        const data = await openf1.getCarTelemetry(sessionKey);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          setError("No telemetry data available");
          setLoading(false);
          return;
        }

        // Create efficient data structure for time series
        const timeSeriesStore = createTimeSeriesStore(data);
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
      } catch (err) {
        console.error("Error fetching telemetry data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch telemetry data");
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionKey]);

  // Update current point when currentIdx changes
  useEffect(() => {
    if (!dataRef.current) return;
    
    const validIdx = Math.max(
      indexBounds.current.min,
      Math.min(currentIdx, indexBounds.current.max)
    );
    
    setCurrent(dataRef.current.indexedData[validIdx]);
  }, [currentIdx]);

  // Time-based lookup function - efficiently find data by timestamp
  const findByTimestamp = useCallback((timestamp: number): { point: TelemetryDataPoint | null, index: number } => {
    if (!dataRef.current) return { point: null, index: -1 };

    // Binary search in sortedTimestamps
    const { sortedTimestamps, timestampMap } = dataRef.current;
    let left = 0;
    let right = sortedTimestamps.length - 1;

    // Exact match or closest timestamp
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedTimestamps[mid] === timestamp) {
        const index = timestampMap.get(timestamp)!;
        return { point: dataRef.current.indexedData[index], index };
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
    
    return { 
      point: dataRef.current.indexedData[index],
      index
    };
  }, []);

  // Utility function to create efficient data structure for time series
  function createTimeSeriesStore(data: any[]): TelemetryTimeSeriesData {
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Create indexed array for direct access by index
    const indexedData = sortedData.map(item => ({
      speed: item.speed || 0,
      throttle: item.throttle || 0,
      brake: item.brake || 0,
      gear: item.gear || 0,
      rpm: item.rpm || 0,
      drs: !!item.drs,
      timestamp: new Date(item.date).getTime()
    }));

    // Create timestamp index for quick lookup
    const sortedTimestamps: number[] = [];
    const timestampMap = new Map<number, number>();

    indexedData.forEach((item, index) => {
      sortedTimestamps.push(item.timestamp);
      timestampMap.set(item.timestamp, index);
    });

    // Create LRU cache for recent queries
    const queryCache = new Map<string, any>();
    const CACHE_SIZE = 100;

    return {
      indexedData,
      sortedTimestamps,
      timestampMap,
      queryCache,
      cacheSize: CACHE_SIZE,
      // Optional: Add tree-based structure for range queries
      // rangeIndex: createRangeIndex(indexedData)
    };
  }

  // Range query with caching
  const queryRange = useCallback((startIdx: number, endIdx: number, fields: string[] = ['speed', 'throttle', 'brake']) => {
    if (!dataRef.current) return [];

    // Check cache first
    const cacheKey = `${startIdx}-${endIdx}-${fields.join(',')}`;
    if (dataRef.current.queryCache.has(cacheKey)) {
      return dataRef.current.queryCache.get(cacheKey);
    }

    // Bounds checking
    const validStart = Math.max(indexBounds.current.min, Math.min(startIdx, indexBounds.current.max));
    const validEnd = Math.max(indexBounds.current.min, Math.min(endIdx, indexBounds.current.max));
    
    // Extract only needed fields for memory efficiency
    const result = dataRef.current.indexedData
      .slice(validStart, validEnd + 1)
      .map(point => {
        const filtered: Record<string, any> = { timestamp: point.timestamp };
        fields.forEach(field => {
          if (field in point) {
            filtered[field] = point[field as keyof TelemetryDataPoint];
          }
        });
        return filtered;
      });
    
    // Cache result with LRU eviction
    if (dataRef.current.queryCache.size >= dataRef.current.cacheSize) {
      // Remove oldest entry (first key in map)
      const firstKey = dataRef.current.queryCache.keys().next().value;
      dataRef.current.queryCache.delete(firstKey);
    }
    dataRef.current.queryCache.set(cacheKey, result);
    
    return result;
  }, []);

  return {
    telemetry: telemetryStore?.indexedData || [],
    current,
    currentIdx,
    setCurrentIdx,
    loading,
    error,
    min: indexBounds.current.min,
    max: indexBounds.current.max,
    findByTimestamp,
    queryRange,
    // Statistics from telemetry
    stats: dataRef.current ? calculateStats(dataRef.current.indexedData) : null
  };
}

// Calculate basic statistics for telemetry data
function calculateStats(data: TelemetryDataPoint[]) {
  if (!data.length) return null;
  
  // Pre-allocate arrays for numerical fields
  const speedValues = new Float32Array(data.length);
  const throttleValues = new Float32Array(data.length);
  const brakeValues = new Float32Array(data.length);
  const rpmValues = new Float32Array(data.length);
  
  // Single-pass calculation for min/max/avg
  let maxSpeed = -Infinity;
  let minSpeed = Infinity;
  let maxThrottle = -Infinity;
  let maxBrake = -Infinity;
  let maxRpm = -Infinity;
  let drsActivations = 0;
  let lastDrsState = false;
  
  // Populate arrays and calculate in single pass
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    // Track values for statistics
    speedValues[i] = point.speed;
    throttleValues[i] = point.throttle;
    brakeValues[i] = point.brake;
    rpmValues[i] = point.rpm;
    
    // Update min/max
    maxSpeed = Math.max(maxSpeed, point.speed);
    minSpeed = Math.min(minSpeed, point.speed);
    maxThrottle = Math.max(maxThrottle, point.throttle);
    maxBrake = Math.max(maxBrake, point.brake);
    maxRpm = Math.max(maxRpm, point.rpm);
    
    // Count DRS activations (state changes from false to true)
    if (point.drs && !lastDrsState) {
      drsActivations++;
    }
    lastDrsState = point.drs;
  }
  
  return {
    maxSpeed,
    minSpeed,
    avgSpeed: calculateAverage(speedValues),
    maxThrottle,
    maxBrake,
    maxRpm,
    drsActivations,
    totalTime: data.length ? (data[data.length - 1].timestamp - data[0].timestamp) / 1000 : 0
  };
}

function calculateAverage(array: Float32Array): number {
  const sum = array.reduce((acc, val) => acc + val, 0);
  return sum / array.length;
}