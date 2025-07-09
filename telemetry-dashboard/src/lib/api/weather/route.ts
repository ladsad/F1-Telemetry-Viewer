import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"

const OPENF1_BASE_URL = "https://api.openf1.org/v1"
const openf1 = new OpenF1Service(OPENF1_BASE_URL)

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")

  if (!sessionKey) {
    return NextResponse.json({ error: "Missing session_key parameter" }, { status: 400 })
  }

  try {
    // Fetch weather data from OpenF1
    const weather: OpenF1WeatherData[] = await openf1.getWeather(sessionKey)

    // Optionally, extract location from session info (if available)
    let location: { circuit?: string; country?: string } = {}
    try {
      const session = await openf1.getSessionDetails(sessionKey)
      location = {
        circuit: session?.circuit_short_name || session?.circuit_name,
        country: session?.country_name,
      }
    } catch {
      // If session details fail, just skip location
    }

    return NextResponse.json({
      weather,
      location,
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch weather data" },
      { status: 500 }
    )
  }
}