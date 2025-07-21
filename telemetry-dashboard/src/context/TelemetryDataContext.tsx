"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useTelemetryQueue } from "@/lib/hooks/useTelemetryQueue";
import { 
  TelemetryState, 
  TelemetryContextType, 
  ConnectionStatus, 
  TelemetryDataPoint,
  TelemetryTimeSeriesData,
  MetricQueryFilter,
  QueryResult
} from "@/types";

// Context initial state
const initialTelemetryState: TelemetryState = {
  carData: {
    speed: 0,
    throttle: 0,
    brake: 0,
    gear: 0,
    drs: false,
    rpm: 0,
  },
  positions: [],
  weather: null,
  raceProgress: {
    currentLap: 1,
    totalLaps: 0,
    sectorTimes: [],
  },
  driverStatus: null,
  sessionKey: "latest",
  telemetryHistory: null
};

// Create context
const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

// Provider component
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [telemetryState, setTelemetryState] = useState<TelemetryState>(initialTelemetryState);
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number>(1);

  // WebSocket endpoints
  const telemetryEndpoint = telemetryState.sessionKey 
    ? `wss://api.example.com/telemetry?session_key=${telemetryState.sessionKey}`
    : null;
    
  const positionsEndpoint = telemetryState.sessionKey 
    ? `wss://api.openf1.org/v1/position_data/stream?session_key=${telemetryState.sessionKey}`
    : null;

  // Telemetry queue for car data
  const carDataQueue = useTelemetryQueue<TelemetryState["carData"]>({
    throttleMs: 100,
    processStrategy: 'smooth',
  });

  // Telemetry queue for positions
  const positionsQueue = useTelemetryQueue<TelemetryState["positions"]>({
    throttleMs: 100,
    processStrategy: 'latest',
  });

  // Use WebSockets for real-time data
  const { data: wsCarData, status: telemetryStatus } = useWebSocket<TelemetryState["carData"]>(telemetryEndpoint);
  const { status: positionsStatus } = useWebSocket(positionsEndpoint, {
    onStatusChange: () => {},
  });

  // Handle car data updates
  useEffect(() => {
    if (wsCarData) {
      carDataQueue.enqueue(wsCarData);
    }
  }, [wsCarData]);

  // Update state with processed car data from queue
  useEffect(() => {
    if (carDataQueue.data) {
      setTelemetryState(prev => ({
        ...prev,
        carData: {
          ...carDataQueue.data!,
          timestamp: Date.now()
        }
      }));
    }
  }, [carDataQueue.data]);

  // Add offline detection
  useEffect(() => {
    function handleOnline() {
      // When back online, try to reconnect all WebSockets
      setConnectionStatus(prev => ({
        ...prev,
        telemetry: 'connecting',
        positions: 'connecting',
        timing: 'connecting',
      }))
    }
    
    function handleOffline() {
      // When offline, mark all connections as closed
      setConnectionStatus({
        telemetry: 'closed',
        positions: 'closed',
        timing: 'closed',
      })
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Add connection recovery mechanism
  useEffect(() => {
    // Check status periodically and attempt reconnection for closed connections
    const recoveryInterval = setInterval(() => {
      if (navigator.onLine) {
        if (connectionStatus.telemetry === 'closed') {
          setConnectionStatus(prev => ({
            ...prev,
            telemetry: 'connecting'
          }))
        }
        if (connectionStatus.positions === 'closed') {
          setConnectionStatus(prev => ({
            ...prev,
            positions: 'connecting'
          }))
        }
        if (connectionStatus.timing === 'closed') {
          setConnectionStatus(prev => ({
            ...prev,
            timing: 'connecting'
          }))
        }
      }
    }, 10000) // Try every 10 seconds
    
    return () => clearInterval(recoveryInterval)
  }, [connectionStatus])

  // Method to update entire telemetry state
  const updateTelemetryState = useCallback((update: Partial<TelemetryState>) => {
    setTelemetryState(prev => ({ ...prev, ...update }));
  }, []);

  // Method to update car telemetry data
  const updateCarData = useCallback((data: Partial<TelemetryState["carData"]>) => {
    setTelemetryState(prev => ({
      ...prev,
      carData: {
        ...prev.carData,
        ...data,
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Method to update driver positions
  const updatePositions = useCallback((positions: TelemetryState["positions"]) => {
    positionsQueue.enqueue(positions);
    
    // Use the queue's processing strategy for smoothness
    if (positionsQueue.data) {
      setTelemetryState(prev => ({
        ...prev,
        positions: positionsQueue.data!.map(pos => ({
          ...pos,
          timestamp: Date.now(),
        })),
      }));
    }
  }, []);

  // Method to update weather data
  const updateWeather = useCallback((weather: TelemetryState["weather"]) => {
    if (!weather) return;
    
    setTelemetryState(prev => ({
      ...prev,
      weather: {
        ...weather,
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Method to update race progress (lap, sector times)
  const updateRaceProgress = useCallback((progress: Partial<TelemetryState["raceProgress"]>) => {
    setTelemetryState(prev => ({
      ...prev,
      raceProgress: {
        ...prev.raceProgress,
        ...progress,
        timestamp: Date.now(),
      },
    }));
  }, []);

  // Method to update driver status (tire, ERS, etc)
  const updateDriverStatus = useCallback((driverNumber: number, status: any) => {
    setTelemetryState(prev => {
      const currentDriverStatus = prev.driverStatus || {};
      
      return {
        ...prev,
        driverStatus: {
          ...currentDriverStatus,
          [driverNumber]: {
            ...currentDriverStatus[driverNumber],
            ...status,
            driver_number: driverNumber,
            timestamp: Date.now(),
          },
        },
      };
    });
  }, []);

  // Method to set session key
  const setSessionKey = useCallback((key: string) => {
    setTelemetryState(prev => ({
      ...prev,
      sessionKey: key
    }));
  }, []);

  // Method to update telemetry history with new data points
  const updateTelemetryHistory = useCallback((newData: TelemetryDataPoint[]) => {
    setTelemetryState(prev => {
      // If history doesn't exist yet, create a new structure
      if (!prev.telemetryHistory) {
        return {
          ...prev,
          telemetryHistory: createTimeSeriesStore(newData)
        };
      }
      
      // Otherwise, append new data efficiently
      const currentHistory = prev.telemetryHistory;
      const updatedData = [...currentHistory.indexedData];
      const updatedTimestamps = [...currentHistory.sortedTimestamps];
      const updatedMap = new Map(currentHistory.timestampMap);
      
      // Add new data points
      newData.forEach(point => {
        const { timestamp } = point;
        
        // Only add if timestamp doesn't exist
        if (!updatedMap.has(timestamp)) {
          const newIndex = updatedData.length;
          updatedData.push(point);
          updatedTimestamps.push(timestamp);
          updatedMap.set(timestamp, newIndex);
        }
      });
      
      // Resort timestamps if needed
      if (newData.length > 0) {
        updatedTimestamps.sort((a, b) => a - b);
      }
      
      // Clear cache as data has changed
      const updatedCache = new Map();
      
      return {
        ...prev,
        telemetryHistory: {
          indexedData: updatedData,
          sortedTimestamps: updatedTimestamps,
          timestampMap: updatedMap,
          queryCache: updatedCache,
          cacheSize: currentHistory.cacheSize
        }
      };
    });
  }, []);
  
  // Efficient query method for telemetry history
  const queryTelemetryHistory = useCallback((filter: MetricQueryFilter): QueryResult<TelemetryDataPoint> => {
    const startTime = performance.now();
    
    if (!telemetryState.telemetryHistory) {
      return { data: [], total: 0, queryTime: performance.now() - startTime };
    }
    
    const { startTime: start, endTime: end, minValue, maxValue, fields, limit, sortBy, sortDirection } = filter;
    const { indexedData, queryCache } = telemetryState.telemetryHistory;
    
    // Generate cache key
    const cacheKey = JSON.stringify(filter);
    if (queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey);
      return { ...cached, queryTime: performance.now() - startTime };
    }
    
    // Find date range
    let filteredData = indexedData;
    
    if (start !== undefined || end !== undefined) {
      filteredData = indexedData.filter(point => {
        const ts = point.timestamp;
        return (start === undefined || ts >= start) && 
               (end === undefined || ts <= end);
      });
    }
    
    // Apply min/max value filters
    if (minValue !== undefined || maxValue !== undefined) {
      if (sortBy) {
        filteredData = filteredData.filter(point => {
          const value = point[sortBy];
          return (minValue === undefined || value >= minValue) &&
                 (maxValue === undefined || value <= maxValue);
        });
      }
    }
    
    // Apply sort
    if (sortBy) {
      filteredData.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      });
    }
    
    // Apply limit
    const total = filteredData.length;
    if (limit) {
      filteredData = filteredData.slice(0, limit);
    }
    
    // Project fields if specified
    let result = filteredData;
    if (fields && fields.length > 0) {
      result = filteredData.map(point => {
        const projected: Record<string, any> = {};
        fields.forEach(field => {
          if (field in point) {
            projected[field] = point[field];
          }
        });
        return projected as TelemetryDataPoint;
      });
    }
    
    const queryResult = { 
      data: result, 
      total, 
      queryTime: performance.now() - startTime 
    };
    
    // Cache result
    if (queryCache.size >= telemetryState.telemetryHistory.cacheSize) {
      const firstKey = queryCache.keys().next().value;
      queryCache.delete(firstKey);
    }
    queryCache.set(cacheKey, queryResult);
    
    return queryResult;
  }, [telemetryState.telemetryHistory]);
  
  // Helper to create efficient time series data structure
  function createTimeSeriesStore(data: TelemetryDataPoint[]): TelemetryTimeSeriesData {
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Create indexed array for direct access by index
    const indexedData = sortedData.map(item => ({
      speed: item.speed || 0,
      throttle: item.throttle || 0,
      brake: item.brake || 0,
      gear: item.gear || 0,
      rpm: item.rpm || 0,
      drs: !!item.drs,
      timestamp: item.timestamp
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
      cacheSize: CACHE_SIZE
    };
  }
  
  // Context value
  const value = {
    telemetryState,
    updateTelemetryState,
    updateCarData,
    updatePositions,
    updateWeather,
    updateRaceProgress,
    updateDriverStatus,
    connectionStatus: {
      telemetry: telemetryStatus,
      positions: positionsStatus,
    },
    setSessionKey,
    selectedDriverNumber,
    setSelectedDriverNumber,
    updateTelemetryHistory,
    queryTelemetryHistory
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

// Custom hook to use the telemetry context
export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}