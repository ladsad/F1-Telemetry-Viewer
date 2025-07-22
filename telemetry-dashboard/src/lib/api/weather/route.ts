import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service, ConfigurationError } from "@/lib/api/openf1"
import type { OpenF1WeatherData } from "@/lib/api/types"

// Create service instance that auto-reads from environment
const openf1 = new OpenF1Service()

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const includeHistory = req.nextUrl.searchParams.get("history") === "true"
  const includeImpact = req.nextUrl.searchParams.get("impact") === "true"

  if (!sessionKey) {
    return NextResponse.json(
      { 
        error: "Missing session_key parameter",
        example: "/api/weather?session_key=latest&history=true&impact=true"
      },
      { status: 400 }
    )
  }

  try {
    // Health check first
    const health = await openf1.healthCheck()
    if (health.status === 'error') {
      return NextResponse.json(
        { error: `OpenF1 API unavailable: ${health.message}` },
        { status: 503 }
      )
    }

    // Fetch current weather data from OpenF1
    const weather: OpenF1WeatherData[] = await openf1.getWeather(sessionKey)

    if (!weather || weather.length === 0) {
      return NextResponse.json(
        { 
          error: `No weather data found for session: ${sessionKey}`,
          sessionKey 
        },
        { status: 404 }
      )
    }

    // Get session location info
    let location: { circuit?: string; country?: string } = {}
    try {
      const session = await openf1.getSessionDetails(sessionKey)
      location = {
        circuit: session?.circuit_short_name || session?.circuit_name,
        country: session?.country_name,
      }
    } catch (err) {
      console.warn('Failed to fetch session details for location:', err)
      // Continue without location data
    }

    // Prepare response data
    const responseData: any = {
      weather,
      location,
      sessionKey,
      lastUpdate: new Date().toISOString(),
      dataPoints: weather.length
    }

    // Optionally include historical weather data
    if (includeHistory) {
      try {
        const historicWeather = await openf1.getHourlyWeather(sessionKey)
        responseData.history = historicWeather
      } catch (err) {
        console.warn('Failed to fetch historic weather:', err)
        responseData.history = []
      }
    }

    // Optionally include weather impact estimation
    if (includeImpact) {
      try {
        const { estimateWeatherImpact } = await import("@/lib/api/openf1")
        const impact = await estimateWeatherImpact(sessionKey)
        responseData.impact = impact
      } catch (err) {
        console.warn('Failed to estimate weather impact:', err)
        responseData.impact = null
      }
    }

    // Add cache headers for weather data (5 seconds for live sessions, 1 minute for others)
    const cacheMaxAge = sessionKey === 'latest' ? 5 : 60
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}, stale-while-revalidate=10`,
        'X-Data-Points': weather.length.toString(),
        'X-Session-Key': sessionKey
      }
    })

  } catch (err) {
    console.error('Weather API error:', err)
    
    // Handle configuration errors specifically
    if (err instanceof ConfigurationError) {
      return NextResponse.json(
        { 
          error: `Configuration error: ${err.message}`,
          code: err.code 
        },
        { status: 500 }
      )
    }

    // Handle other errors with detailed logging
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch weather data"
    
    return NextResponse.json(
      { 
        error: errorMessage,
        sessionKey,
        timestamp: new Date().toISOString(),
        suggestion: "Try with a different session_key or check if the session exists"
      },
      { status: 500 }
    )
  }
}

// Add POST method for weather alerts subscription (future feature)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionKey, alertTypes, webhookUrl } = body

    // Placeholder for weather alerts subscription
    return NextResponse.json(
      { 
        message: "Weather alerts subscription not yet implemented",
        receivedData: { sessionKey, alertTypes, webhookUrl }
      },
      { status: 501 }
    )
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}