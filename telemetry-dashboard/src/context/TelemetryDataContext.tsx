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
export function TelemetryProvider({ children, initialSessionKey }: { children: React.ReactNode, initialSessionKey?: string }) {
  const [telemetryState, setTelemetryState] = useState<TelemetryState>({
    ...initialTelemetryState,
    sessionKey: initialSessionKey || "", // Use the prop if provided
  });
  const [selectedDriverNumber, setSelectedDriverNumber] = useState<number>(1);
  
  // Add the missing connection status state
  const [connectionStatus, setConnectionStatus] = useState<{
    telemetry: ConnectionStatus;
    positions: ConnectionStatus;
    timing: ConnectionStatus;
  }>({
    telemetry: 'closed',
    positions: 'closed',
    timing: 'closed'
  });

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
    if (!newData || newData.length === 0) return;
    
    setTelemetryState(prev => {
      try {
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
        newData.forEach((point, originalIndex) => {
          const { timestamp } = point;
          
          // Only add if timestamp doesn't exist
          if (!updatedMap.has(timestamp)) {
            const newIndex = updatedData.length;
            const completePoint: TelemetryDataPoint = {
              speed: point.speed || 0,
              throttle: point.throttle || 0,
              brake: point.brake || 0,
              gear: point.gear || 0,
              rpm: point.rpm || 0,
              drs: !!point.drs,
              timestamp: timestamp,
              lap: point.lap || 1,
              sector: point.sector || 1,
              distance: point.distance || 0,
              index: newIndex
            };
            
            updatedData.push(completePoint);
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
            lapIndex: currentHistory.lapIndex || new Map(),
            sectorIndex: currentHistory.sectorIndex || new Map(),
            queryCache: updatedCache,
            cacheSize: currentHistory.cacheSize
          }
        };
      } catch (error) {
        console.error('Error updating telemetry history:', error);
        return prev; // Return previous state if error occurs
      }
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
      if (sortBy && sortBy in (filteredData[0] || {})) {
        filteredData = filteredData.filter(point => {
          const value = (point as any)[sortBy];
          return typeof value === 'number' &&
                 (minValue === undefined || value >= minValue) &&
                 (maxValue === undefined || value <= maxValue);
        });
      }
    }
    
    // Apply sort
    if (sortBy && sortBy in (filteredData[0] || {})) {
      filteredData.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
        }
        return 0;
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
          const value = getPointValue(point, field);
          if (value !== undefined) {
            projected[field] = value;
          }
        });
        return projected as TelemetryDataPoint;
      });
    }
    
    const queryResult: QueryResult<TelemetryDataPoint> = { 
      data: result, 
      total, 
      queryTime: performance.now() - startTime 
    };
    
    // Cache result
    if (queryCache.size >= telemetryState.telemetryHistory.cacheSize) {
      const firstKey = queryCache.keys().next().value;
      if (typeof firstKey === "string") {
        queryCache.delete(firstKey);
      }
    }
    queryCache.set(cacheKey, queryResult);
    
    return queryResult;
  }, [telemetryState.telemetryHistory]);
  
  // Helper to create efficient time series data structure
  function createTimeSeriesStore(data: TelemetryDataPoint[]): TelemetryTimeSeriesData {
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Create indexed array for direct access by index
    const indexedData = sortedData.map((item, index) => ({
      speed: item.speed || 0,
      throttle: item.throttle || 0,
      brake: item.brake || 0,
      gear: item.gear || 0,
      rpm: item.rpm || 0,
      drs: !!item.drs,
      timestamp: item.timestamp,
      lap: item.lap || 1, // Add missing lap property
      sector: item.sector || 1, // Add missing sector property
      distance: item.distance || 0, // Add missing distance property
      index: index // Add missing index property
    }));

    // Create timestamp index for quick lookup
    const sortedTimestamps: number[] = [];
    const timestampMap = new Map<number, number>();
    const lapIndex = new Map<number, number[]>(); // Add missing lap index
    const sectorIndex = new Map<number, number[]>(); // Add missing sector index

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
    const CACHE_SIZE = 100;

    return {
      indexedData,
      sortedTimestamps,
      timestampMap,
      lapIndex, // Add missing property
      sectorIndex, // Add missing property
      queryCache,
      cacheSize: CACHE_SIZE
    };
  }
  
  // Update the value object to include the full connection status
  const value: TelemetryContextType = {
    telemetryState,
    updateTelemetryState,
    updateCarData,
    updatePositions,
    updateWeather,
    updateRaceProgress,
    updateDriverStatus,
    connectionStatus: {
      telemetry: telemetryStatus || 'closed',
      positions: positionsStatus || 'closed',
      timing: connectionStatus.timing
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
  if (context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}

// Add this helper function before the queryTelemetryHistory function:
const getPointValue = (point: TelemetryDataPoint, key: string): any => {
  const validKeys: (keyof TelemetryDataPoint)[] = [
    'speed', 'throttle', 'brake', 'gear', 'rpm', 'drs', 
    'timestamp', 'lap', 'sector', 'distance', 'index'
  ];
  
  if (validKeys.includes(key as keyof TelemetryDataPoint)) {
    return point[key as keyof TelemetryDataPoint];
  }
  return undefined;
};