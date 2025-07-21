/**
 * F1 Telemetry Dashboard - Type Definitions
 * 
 * This file centralizes all TypeScript interfaces used throughout the application.
 * It re-exports types from the API layer and defines component-specific prop types.
 */

import type { 
  OpenF1CarData,
  OpenF1WeatherData,
  OpenF1DriverInfo,
  OpenF1DriverPosition,
  OpenF1TrackLayout,
  OpenF1SectorTiming,
  OpenF1LapInfo,
  OpenF1LapTime,
  OpenF1WeatherTimeSeries,
  OpenF1WeatherAlertType,
  OpenF1WeatherAlert,
  WeatherImpactEstimate,
  OpenF1DriverStatus,
  OpenF1TireStint,
  OpenF1RadioMessage,
  OpenF1SessionEvent,
  OpenF1DeltaTime,
  AnalyticsMetric,
  AnalyticsFilter,
  TelemetryStatistics,
  QueryResult,
  MetricQueryFilter
} from '@/lib/api/types';

// Re-export all OpenF1 API types
export {
  OpenF1CarData,
  OpenF1WeatherData,
  OpenF1DriverInfo,
  OpenF1DriverPosition,
  OpenF1TrackLayout,
  OpenF1SectorTiming,
  OpenF1LapInfo,
  OpenF1LapTime,
  OpenF1WeatherTimeSeries,
  OpenF1WeatherAlertType,
  OpenF1WeatherAlert,
  WeatherImpactEstimate,
  OpenF1DriverStatus,
  OpenF1TireStint,
  OpenF1RadioMessage,
  OpenF1SessionEvent,
  OpenF1DeltaTime,
  AnalyticsMetric,
  AnalyticsFilter,
  TelemetryStatistics,
  QueryResult,
  MetricQueryFilter
};

// =============================================================
// Core Telemetry Data Interfaces
// =============================================================

/**
 * Core telemetry data model used throughout the application
 */
export interface TelemetryData {
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: boolean;
  rpm: number;
  timestamp?: number;
  date?: string;
}

/**
 * Driver position for track visualization
 */
export interface DriverPosition {
  driver_number: number;
  name: string;
  x: number;
  y: number;
  color: string;
  team_name?: string;
  timestamp?: number;
}

/**
 * Weather data for current and forecast conditions
 */
export interface WeatherData {
  rainfall?: number;
  air_temperature?: number;
  track_temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: string;
  timestamp?: number;
  forecast?: WeatherForecast[];
}

/**
 * Weather forecast for upcoming periods
 */
export interface WeatherForecast {
  period: string;
  temperature: number;
  rainfall_probability: number;
  wind_speed: number;
}

/**
 * Session information
 */
export interface SessionInfo {
  session_key: string;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end?: string;
  circuit_name: string;
  circuit_short_name: string;
  country_name: string;
  season: number;
  round_number: number;
  status: 'upcoming' | 'live' | 'completed';
}

/**
 * Lap information including sector times
 */
export interface LapData {
  lap_number: number;
  lap_time?: number;
  sector_times: {
    sector1?: number;
    sector2?: number;
    sector3?: number;
  };
  position?: number;
  gap_to_leader?: number;
  is_personal_best?: boolean;
  is_session_best?: boolean;
}

/**
 * Driver details with performance data
 */
export interface DriverData {
  driver_number: number;
  driver_name: string;
  team_name: string;
  team_color: string;
  position: number;
  best_lap_time?: number;
  last_lap_time?: number;
  gap_to_leader?: string;
  tire_data?: TireData;
  performance_status?: {
    ers_deployment: number;
    fuel_remaining: number;
    in_pit: boolean;
    lap_count: number;
  };
}

/**
 * Tire information
 */
export interface TireData {
  compound: 'Soft' | 'Medium' | 'Hard' | 'Inter' | 'Wet' | 'Unknown';
  age: number;
  wear_percentage?: number;
  optimal_window?: boolean;
}

/**
 * Connection status
 */
export type ConnectionStatus = 'open' | 'closed' | 'connecting' | 'error';

export interface ConnectionStatusState {
  telemetry: ConnectionStatus;
  positions: ConnectionStatus;
  timing: ConnectionStatus;
  weather: ConnectionStatus;
}

// =============================================================
// Component Prop Types
// =============================================================

/**
 * Props for TelemetryDisplay component
 */
export interface TelemetryDisplayProps {
  data?: TelemetryData;
  fallbackApiUrl?: string;
  refreshIntervalMs?: number;
  isOffline?: boolean;
  theme?: {
    primary: string;
    secondary: string;
    background: string;
  };
}

/**
 * Props for TrackMap component
 */
export interface TrackMapProps {
  positions?: DriverPosition[];
  trackLayout?: OpenF1TrackLayout;
  selectedDriver?: number;
  onDriverSelect?: (driverNumber: number) => void;
  isInteractive?: boolean;
}

/**
 * Props for DriverPanel component
 */
export interface DriverPanelProps {
  driverNumber?: number;
  sessionKey?: string;
  showDetails?: boolean;
}

/**
 * Props for WeatherOverlay component
 */
export interface WeatherOverlayProps {
  weatherData?: WeatherData;
  showForecast?: boolean;
  showImpact?: boolean;
  refreshInterval?: number;
}

/**
 * Props for LapTimeComparisonChart component
 */
export interface LapTimeComparisonChartProps {
  sessionKey: string;
  driverNumbers: number[];
  highlightedLap?: number;
}

/**
 * Props for DeltaTimeChart component
 */
export interface DeltaTimeChartProps {
  sessionKey: string;
  driverNumbers: number[];
  referenceDriver?: number;
}

/**
 * Props for RaceProgressScrubBar component
 */
export interface RaceProgressScrubBarProps {
  sessionKey?: string;
  value?: number;
  max?: number;
  onChange?: (lap: number) => void;
  showEvents?: boolean;
}

/**
 * Props for SessionComparison component
 */
export interface SessionComparisonProps {
  selectedSessions?: string[]; // This should be session keys, not full Session objects
  metricType?: string;
}

/**
 * Props for PerformanceAnalyticsDashboard component
 */
export interface PerformanceAnalyticsDashboardProps {
  sessionKey: string;
  initialMetric?: string;
}

/**
 * Props for TelemetryTable and TelemetryHistoryGrid components
 */
export interface TelemetryTableProps {
  data?: TelemetryData[];
  title?: string;
  maxHeight?: number;
  showConnectionStatus?: boolean;
  virtualScrollOptions?: {
    itemSize: number;
    overscanCount: number;
  };
}

/**
 * Props for TelemetryHistoryGrid component
 */
export interface TelemetryHistoryGridProps {
  sessionKey?: string;
  maxHeight?: number;
  title?: string;
}

/**
 * Props for ConnectionStatusIndicator component
 */
export interface ConnectionStatusIndicatorProps {
  service?: 'all' | 'telemetry' | 'positions' | 'timing' | 'weather';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'inline' | 'floating';
}

/**
 * Props for AnimatedButton component
 */
export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "primary" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Props for SessionDetailDialog component
 */
export interface SessionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionKey: string;
  driverNumber?: number;
  driverNumbers?: number[];
}

/**
 * Props for StatusIndicator component
 */
export interface StatusIndicatorProps {
  label: string;
  value: string | number;
  icon: React.ReactElement<{
    className?: string;
    [key: string]: any;
  }>;
  color?: string;
}

/**
 * Props for DriverPerformanceMetrics component
 */
export interface DriverPerformanceMetricsProps {
  sessionKey: string;
  driverNumber: number;
}

/**
 * Props for DriverRadio component
 */
export interface DriverRadioProps {
  sessionKey: string;
  driverNumber: number;
}

/**
 * Props for TireStrategyChart component
 */
export interface TireStrategyChartProps {
  sessionKey: string;
  driverNumber: number;
}

/**
 * Props for WeatherTrendChart component
 */
export interface WeatherTrendChartProps {
  sessionKey: string;
}

/**
 * Props for LoadingSpinner component
 */
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

// =============================================================
// State Management Types
// =============================================================

/**
 * Telemetry state for application context
 */
export interface TelemetryState {
  carData: TelemetryData;
  positions: DriverPosition[];
  weather: WeatherData | null;
  raceProgress: {
    currentLap: number;
    totalLaps: number;
    sectorTimes: {
      sector: number;
      time?: number;
      driver?: number;
      performance?: string;
      color: string;
    }[];
    timestamp?: number;
  };
  driverStatus: Record<number, {
    driver_number: number;
    driver_name: string;
    teamColor: string;
    tire_compound: string;
    tire_age: number;
    ers_deployment?: number;
    fuel_remaining?: number;
    in_pit?: boolean;
    last_lap_time?: number;
    timestamp?: number;
  }> | null;
  sessionKey: string;
  telemetryHistory: TelemetryTimeSeriesData | null;
}

/**
 * Telemetry context interface
 */
export interface TelemetryContextType {
  telemetryState: TelemetryState;
  updateTelemetryState: (update: Partial<TelemetryState>) => void;
  updateCarData: (data: Partial<TelemetryState["carData"]>) => void;
  updatePositions: (positions: TelemetryState["positions"]) => void;
  updateWeather: (weather: TelemetryState["weather"]) => void;
  updateRaceProgress: (progress: Partial<TelemetryState["raceProgress"]>) => void;
  updateDriverStatus: (driverNumber: number, status: any) => void;
  connectionStatus: {
    telemetry: ConnectionStatus;
    positions: ConnectionStatus;
    timing: ConnectionStatus;
  };
  setSessionKey: (key: string) => void;
  selectedDriverNumber: number;
  setSelectedDriverNumber: (driverNumber: number) => void;
  updateTelemetryHistory: (data: TelemetryDataPoint[]) => void;
  queryTelemetryHistory: (filter: MetricQueryFilter) => QueryResult<TelemetryDataPoint>;
}

// =============================================================
// Hook Return Types
// =============================================================

/**
 * Return type for useHistoricPlayback hook
 */
export interface HistoricPlaybackControls {
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  speed: number;
  setSpeed: (speed: number) => void;
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  stepBack: () => void;
  stepForward: () => void;
  canStepBack: boolean;
  canStepForward: boolean;
}

/**
 * Return type for useTelemetryVirtualization hook
 */
export interface TelemetryVirtualizationResult<T> {
  processedData: T[];
  visibleData: T[];
  updateVisibleRange: (start: number, end: number) => void;
  isProcessing: boolean;
  totalCount: number;
  processedCount: number;
}

/**
 * OpenF1 API event type
 */
export interface OpenF1Event {
  type: "overtake" | "pit" | "crash" | "flag" | string;
  lap_number: number;
  description?: string;
  timestamp?: number;
  session_key?: string;
  driver_number?: number;
}

/**
 * Weather alert properties for components
 */
export interface WeatherAlertProps {
  weather: WeatherData; 
}

/**
 * Weather impact properties for components
 */
export interface WeatherImpactProps {
  weather: WeatherData;
  impact: {
    rain: { timeLoss: number };
    temp: { timeLoss: number };
    wind: { timeLoss: number };
    total: number;
    avgLap: number;
  };
}

/**
 * Telemetry data point for historic data playback and analysis
 */
export interface TelemetryDataPoint {
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  drs: boolean;
  timestamp: number;
  lap: number;
  sector: number;
  distance: number;
  index: number;
}

/**
 * Time series data structure for efficient telemetry querying
 */
export interface TelemetryTimeSeriesData {
  indexedData: TelemetryDataPoint[];
  sortedTimestamps: number[];
  timestampMap: Map<number, number>;
  lapIndex: Map<number, number[]>;
  sectorIndex: Map<number, number[]>;
  queryCache: Map<string, any>;
  cacheSize: number;
}