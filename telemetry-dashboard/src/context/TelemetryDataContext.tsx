"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import { useTelemetryQueue } from "@/lib/hooks/useTelemetryQueue";

// Define types for all telemetry data that needs to be synchronized
export interface TelemetryState {
  // Car telemetry
  carData: {
    speed: number;
    throttle: number;
    brake: number;
    gear: number;
    drs: boolean;
    rpm: number;
    timestamp?: number;
  };

  // Driver positions for track map
  positions: Array<{
    driver_number: number;
    name: string;
    x: number;
    y: number;
    color: string;
    timestamp?: number;
  }>;

  // Current weather conditions
  weather: {
    air_temperature: number;
    track_temperature: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction: string;
    rainfall: number;
    timestamp?: number;
  } | null;

  // Current lap and sector information
  raceProgress: {
    currentLap: number;
    totalLaps: number;
    sectorTimes: Array<{
      sector: number;
      time?: number;
      driver?: number;
      performance?: string;
      color: string;
    }>;
    timestamp?: number;
  };

  // Selected driver status (tire, ERS, etc)
  driverStatus: Record<number, {
    driver_number: number;
    driver_name: string;
    teamColor: string;
    tire_compound: string;
    tire_age: number;
    ers: number;
    pit_status: string;
    last_pit: number | null;
    timestamp?: number;
  }> | null;

  // Session identifier
  sessionKey: string;
}

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
  sessionKey: "latest"
};

// Create context
interface TelemetryContextType {
  telemetryState: TelemetryState;
  updateTelemetryState: (update: Partial<TelemetryState>) => void;
  updateCarData: (data: Partial<TelemetryState["carData"]>) => void;
  updatePositions: (positions: TelemetryState["positions"]) => void;
  updateWeather: (weather: TelemetryState["weather"]) => void;
  updateRaceProgress: (progress: Partial<TelemetryState["raceProgress"]>) => void;
  updateDriverStatus: (driverNumber: number, status: Partial<TelemetryState["driverStatus"][number]>) => void;
  connectionStatus: {
    telemetry: "open" | "connecting" | "closed" | "error";
    positions: "open" | "connecting" | "closed" | "error";
  };
  setSessionKey: (key: string) => void;
  selectedDriverNumber: number;
  setSelectedDriverNumber: (driverNumber: number) => void;
}

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
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

// Custom hook for using the telemetry context
export function useTelemetry() {
  const context = useContext(TelemetryContext);
  
  if (context === undefined) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  
  return context;
}