import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service, ConfigurationError } from "@/lib/api/openf1"
import type { OpenF1CarData } from "@/lib/api/types"

// Create service instance that auto-reads from environment
const openf1 = new OpenF1Service()

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const lapNumber = req.nextUrl.searchParams.get("lap_number")
  const driverNumber = req.nextUrl.searchParams.get("driver_number")
  const limit = req.nextUrl.searchParams.get("limit")
  const latest = req.nextUrl.searchParams.get("latest") === "true"

  if (!sessionKey) {
    return NextResponse.json(
      { 
        error: "Missing session_key parameter",
        example: "/api/telemetry?session_key=latest&driver_number=1&lap_number=1&limit=100&latest=true"
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

    // Fetch telemetry data
    const data: OpenF1CarData[] = await openf1.getCarTelemetry(
      sessionKey,
      lapNumber ? Number(lapNumber) : undefined,
      driverNumber ? Number(driverNumber) : undefined
    )

    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          error: `No telemetry data found`,
          sessionKey,
          driverNumber: driverNumber || null,
          lapNumber: lapNumber || null
        },
        { status: 404 }
      )
    }

    // Process data based on request parameters
    let processedData = data

    // If latest=true, return only the most recent data point
    if (latest) {
      processedData = [data[data.length - 1]]
    }

    // Apply limit if specified
    if (limit) {
      const limitNum = Number(limit)
      if (limitNum > 0) {
        processedData = processedData.slice(-limitNum) // Take the most recent N entries
      }
    }

    // Transform data to ensure consistency
    const transformedData = processedData.map(item => ({
      speed: item.speed || 0,
      throttle: item.throttle || 0,
      brake: item.brake || 0,
      gear: item.gear || 0,
      rpm: item.rpm || 0,
      drs: item.drs || false,
      timestamp: item.timestamp || Date.now(),
      session_key: item.session_key || sessionKey,
      driver_number: item.driver_number || (driverNumber ? Number(driverNumber) : null),
      lap_number: item.lap_number || (lapNumber ? Number(lapNumber) : null),
      // Include original data
      ...item
    }))

    // Calculate response metadata
    const responseMetadata = {
      sessionKey,
      driverNumber: driverNumber ? Number(driverNumber) : null,
      lapNumber: lapNumber ? Number(lapNumber) : null,
      dataPoints: transformedData.length,
      originalDataPoints: data.length,
      isLatest: latest,
      appliedLimit: limit ? Number(limit) : null,
      timestamp: new Date().toISOString(),
      dataRange: transformedData.length > 0 ? {
        start: transformedData[0].timestamp,
        end: transformedData[transformedData.length - 1].timestamp
      } : null
    }

    // Determine cache headers based on session type
    const cacheMaxAge = sessionKey === 'latest' ? 1 : 30 // 1 second for live, 30 seconds for historical

    return NextResponse.json({
      data: transformedData,
      metadata: responseMetadata
    }, {
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}, stale-while-revalidate=5`,
        'X-Data-Points': transformedData.length.toString(),
        'X-Session-Key': sessionKey,
        'X-Driver-Number': driverNumber || 'all',
        'X-Is-Latest': latest.toString()
      }
    })

  } catch (err) {
    console.error('Telemetry API error:', err)
    
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

    // Handle other errors
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch car telemetry data"
    
    return NextResponse.json(
      { 
        error: errorMessage,
        sessionKey,
        driverNumber: driverNumber || null,
        lapNumber: lapNumber || null,
        timestamp: new Date().toISOString(),
        suggestion: "Check if session_key exists and has telemetry data available"
      },
      { status: 500 }
    )
  }
}

// Add WebSocket endpoint info
export async function HEAD(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-WebSocket-Available': 'true',
      'X-WebSocket-URL': process.env.NEXT_PUBLIC_OPENF1_WS_URL || 'wss://api.openf1.org/v1/live',
      'X-API-Version': '1.0.0'
    }
  })
}