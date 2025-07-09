// --- Telemetry API Types ---
export interface TelemetryApiData {
  speed: number
  throttle: number
  brake: number
  gear: number
  drs: boolean
  rpm: number
  timestamp: number
}

// --- Utility: Fetch latest telemetry (real-time) ---
export async function fetchLiveTelemetry(): Promise<TelemetryApiData> {
  // Placeholder: Replace with real API endpoint
  const res = await fetch("/api/telemetry/live")
  if (!res.ok) throw new Error("Failed to fetch live telemetry")
  return res.json()
}

// --- Utility: Fetch historical telemetry for a session/lap ---
export async function fetchHistoricalTelemetry(sessionId: string, lap: number): Promise<TelemetryApiData[]> {
  // Placeholder: Replace with real API endpoint
  const res = await fetch(`/api/telemetry/history?session=${sessionId}&lap=${lap}`)
  if (!res.ok) throw new Error("Failed to fetch historical telemetry")
  return res.json()
}