import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service, ConfigurationError } from "@/lib/api/openf1"
import type { OpenF1DriverInfo } from "@/lib/api/types"

// Create service instance that auto-reads from environment
const openf1 = new OpenF1Service()

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const lapNumber = req.nextUrl.searchParams.get("lap_number")
  const driverNumber = req.nextUrl.searchParams.get("driver_number")
  const includePositions = req.nextUrl.searchParams.get("positions") !== "false"
  const includeTrackInfo = req.nextUrl.searchParams.get("track") !== "false"

  if (!sessionKey) {
    return NextResponse.json(
      { 
        error: "Missing session_key parameter",
        example: "/api/drivers?session_key=latest&lap_number=1&driver_number=1&positions=true&track=true"
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

    // Parallel data fetching for better performance
    const dataPromises: Promise<any>[] = []
    
    // Always fetch driver info
    dataPromises.push(
      driverNumber 
        ? openf1.getDriverInfo(sessionKey, Number(driverNumber))
        : openf1.getDriverInfo(sessionKey)
    )

    // Conditionally fetch positions
    if (includePositions) {
      dataPromises.push(
        openf1.getDriverPositions(
          sessionKey,
          lapNumber ? Number(lapNumber) : undefined
        )
      )
    } else {
      dataPromises.push(Promise.resolve([]))
    }

    // Conditionally fetch session/track info
    if (includeTrackInfo) {
      dataPromises.push(openf1.getSessionDetails(sessionKey))
    } else {
      dataPromises.push(Promise.resolve(null))
    }

    const [driverInfos, positions, sessionDetails] = await Promise.allSettled(dataPromises)

    // Process driver info
    let driverInfoMap: Record<string, OpenF1DriverInfo> = {}
    let drivers: OpenF1DriverInfo[] = []
    
    if (driverInfos.status === 'fulfilled' && driverInfos.value) {
      drivers = Array.isArray(driverInfos.value) ? driverInfos.value : [driverInfos.value]
      driverInfoMap = drivers.reduce((acc, info) => {
        acc[info.driver_number] = info
        return acc
      }, {} as Record<string, OpenF1DriverInfo>)
    } else {
      console.warn('Failed to fetch driver info:', driverInfos.status === 'rejected' ? driverInfos.reason : 'No data')
    }

    // Process positions
    let normalizedPositions: any[] = []
    
    if (positions.status === 'fulfilled' && positions.value) {
      normalizedPositions = positions.value.map((pos: any) => {
        const info = driverInfoMap[pos.driver_number]
        return {
          driver_number: pos.driver_number,
          position: pos.position,
          x: pos.x || 0,
          y: pos.y || 0,
          normalized_track_position_x: pos.x,
          normalized_track_position_y: pos.y,
          team_name: info?.team_name,
          driver_name: info?.full_name || info?.broadcast_name,
          color: info?.color || pos.color || '#8884d8',
          lap_number: lapNumber ? Number(lapNumber) : undefined,
          ...pos,
        }
      })
    } else if (positions.status === 'rejected') {
      console.warn('Failed to fetch positions:', positions.reason)
    }

    // Process track/session info
    let track: { circuit?: string; country?: string; location?: string; session_type?: string } = {}
    
    if (sessionDetails.status === 'fulfilled' && sessionDetails.value) {
      const session = sessionDetails.value
      track = {
        circuit: session?.circuit_short_name || session?.circuit_name,
        country: session?.country_name,
        location: session?.location,
        session_type: session?.session_type
      }
    } else if (sessionDetails.status === 'rejected') {
      console.warn('Failed to fetch session details:', sessionDetails.reason)
    }

    // Build response
    const responseData = {
      sessionKey,
      lapNumber: lapNumber ? Number(lapNumber) : null,
      timestamp: new Date().toISOString(),
      drivers: drivers,
      driverCount: drivers.length,
      ...(includePositions && { 
        positions: normalizedPositions,
        positionCount: normalizedPositions.length 
      }),
      ...(includeTrackInfo && { track })
    }

    // If specific driver requested, return just that driver's data
    if (driverNumber && drivers.length === 1) {
      const driver = drivers[0]
      const driverPosition = normalizedPositions.find(p => p.driver_number === Number(driverNumber))
      
      return NextResponse.json({
        ...responseData,
        driver,
        position: driverPosition || null
      }, {
        headers: {
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
          'X-Driver-Number': driverNumber
        }
      })
    }

    // Return all data
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
        'X-Driver-Count': drivers.length.toString(),
        'X-Position-Count': normalizedPositions.length.toString()
      }
    })

  } catch (err) {
    console.error('Drivers API error:', err)
    
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
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch driver data"
    
    return NextResponse.json(
      { 
        error: errorMessage,
        sessionKey,
        driverNumber: driverNumber || null,
        timestamp: new Date().toISOString(),
        suggestion: "Verify session_key exists and try again"
      },
      { status: 500 }
    )
  }
}

// Add POST method for driver data updates (future feature)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionKey, driverNumber, data } = body

    // Placeholder for driver data updates
    return NextResponse.json(
      { 
        message: "Driver data updates not yet implemented",
        receivedData: { sessionKey, driverNumber, data }
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

// Add DELETE method for removing driver data (if needed)
export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: "DELETE method not implemented for drivers endpoint" },
    { status: 405 }
  )
}