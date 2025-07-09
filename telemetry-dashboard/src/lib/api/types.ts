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