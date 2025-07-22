import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service, ConfigurationError } from "@/lib/api/openf1"

// Create service instance that auto-reads from environment
const openf1 = new OpenF1Service()

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const season = req.nextUrl.searchParams.get("season")
  const round = req.nextUrl.searchParams.get("round")

  try {
    // Health check first to ensure API is accessible
    const health = await openf1.healthCheck()
    if (health.status === 'error') {
      return NextResponse.json(
        { error: `OpenF1 API unavailable: ${health.message}` },
        { status: 503 }
      )
    }

    if (sessionKey) {
      // Fetch details for a specific session
      const session = await openf1.getSessionDetails(sessionKey)
      
      if (!session) {
        return NextResponse.json(
          { error: `Session not found: ${sessionKey}` },
          { status: 404 }
        )
      }
      
      return NextResponse.json(session)
    } else {
      // Fetch a list of sessions, optionally filtered by season/round
      const sessions = await openf1.getSessions(
        season ? Number(season) : undefined,
        round ? Number(round) : undefined
      )
      
      return NextResponse.json(sessions)
    }
  } catch (err) {
    console.error('Sessions API error:', err)
    
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
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch session data"
    
    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        requestId: req.nextUrl.searchParams.get("session_key") || `${season}-${round}` || 'unknown'
      },
      { status: 500 }
    )
  }
}

// Add POST method for creating custom sessions (if needed in the future)
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "POST method not implemented for sessions endpoint" },
    { status: 405 }
  )
}

// Add health check endpoint
export async function HEAD(req: NextRequest) {
  try {
    const health = await openf1.healthCheck()
    
    return new NextResponse(null, {
      status: health.status === 'ok' ? 200 : 503,
      headers: {
        'X-Health-Status': health.status,
        'X-Health-Message': health.message,
        'X-Health-Timestamp': health.timestamp.toString()
      }
    })
  } catch (err) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'error',
        'X-Health-Message': err instanceof Error ? err.message : 'Unknown error'
      }
    })
  }
}