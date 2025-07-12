// Car telemetry data (car_data)
export interface OpenF1CarData {
  session_key: string
  driver_number: number
  lap_number: number
  date: string // ISO timestamp
  speed: number
  throttle: number
  brake: number
  gear: number
  drs: boolean
  rpm: number
  // Add more fields as needed from OpenF1 docs
}

// Weather data (weather_data)
export interface OpenF1WeatherData {
  session_key: string
  date: string // ISO timestamp
  air_temperature: number
  track_temperature: number
  humidity: number
  pressure: number
  wind_speed: number
  wind_direction: string
  rainfall: number
  // Add more fields as needed from OpenF1 docs
}

// Driver information (from /drivers or session endpoints)
export interface OpenF1DriverInfo {
  driver_number: number
  broadcast_name: string
  full_name: string
  team_name: string
  country_code: string
  headshot_url?: string
  color?: string
  // Add more fields as needed from OpenF1 docs
}

export interface OpenF1DriverPosition {
  driver_number: number
  name: string
  x: number // normalized 0-1
  y: number // normalized 0-1
  color: string
}

export interface OpenF1TrackLayout {
  svgPath: string
  width: number
  height: number
}



// Sector timing and performance for a driver in a session
export interface OpenF1SectorTiming {
  driver_number: number
  sector: number // 1, 2, or 3
  sector_time: number // seconds
  performance: "fastest" | "personal_best" | "slow" // for color-coding
  // Optionally, sector start/end positions (normalized 0-1)
  start_x?: number
  start_y?: number
  end_x?: number
  end_y?: number
}

// Lap info for a session
export interface OpenF1LapInfo {
  currentLap: number
  totalLaps: number
  sectorTimes: {
    sector: number
    time: number
    driver_number: number
  }[]
}

// Lap time for a driver in a session
export interface OpenF1LapTime {
  driver_number: number
  lap_number: number
  lap_time: number // seconds
  // Add more fields as needed
}

// Driver info for comparison
export interface OpenF1DriverInfo {
  driver_number: number
  broadcast_name: string
  full_name: string
  team_name: string
  country_code: string
  headshot_url?: string
  color?: string
  // Add more fields as needed from OpenF1 docs
}

// Time-series weather data for trends
export interface OpenF1WeatherTimeSeries {
  date: string // ISO timestamp
  air_temperature: number
  track_temperature: number
  wind_speed: number
  rainfall: number
  // Add more fields as needed
}

export type OpenF1WeatherAlertType = "rain_start" | "temp_spike" | "wind_gust"

export interface OpenF1WeatherAlert {
  type: OpenF1WeatherAlertType
  message: string
  icon?: React.ReactNode
}

export interface WeatherImpactEstimate {
  rain: { timeLoss: number }
  temp: { timeLoss: number }
  wind: { timeLoss: number }
  total: number
  avgLap: number
}

export interface OpenF1DriverStatus {
  driver_number: number
  driver_name: string
  tire_compound: "Soft" | "Medium" | "Hard" | "Inter" | "Wet"
  tire_age: number
  ers: number // 0-100
  pit_status: "None" | "Pitting" | "Out Lap" | "In Lap"
  last_pit?: number // lap number of last pit stop
  // Add more fields as needed
}

// Tire stint for a driver in a session
export interface OpenF1TireStint {
  driver_number: number
  start_lap: number
  end_lap: number
  compound: "Soft" | "Medium" | "Hard" | "Inter" | "Wet"
}

// Radio message for a driver in a session
export interface OpenF1RadioMessage {
  driver_number: number
  session_key: string
  timestamp: string // ISO timestamp
  message: string
  source: "driver" | "engineer"
}

// Session event (for timeline/scrub bar)
export interface OpenF1SessionEvent {
  type: "pit" | "safetycar" | "crash" | "vsc" | string
  lap_number: number
  description?: string
  timestamp?: string
  driver_number?: number
}

// Delta time between drivers per lap
export interface OpenF1DeltaTime {
  lap_number: number
  driver_number: number
  reference_driver_number: number
  delta: number // seconds (positive = behind reference)
}

export type AnalyticsMetric = {
  key: string
  label: string
}

export type AnalyticsFilter = {
  drivers: number[]
  referenceDriver?: number
  metric: string
  // Add more filter fields as needed (lap range, stint, weather, etc.)
}