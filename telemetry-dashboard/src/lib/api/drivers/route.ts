import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1DriverInfo } from "@/lib/api/types"

const OPENF1_BASE_URL = "https://api.openf1.org/v1"
const openf1 = new OpenF1Service(OPENF1_BASE_URL)

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const lapNumber = req.nextUrl.searchParams.get("lap_number")

  if (!sessionKey) {
    return NextResponse.json({ error: "Missing session_key parameter" }, { status: 400 })
  }

  try {
    // Fetch driver positions from OpenF1
    const positions = await openf1.getDriverPositions(
      sessionKey,
      lapNumber ? Number(lapNumber) : undefined
    )

    // Optionally, fetch track/circuit location from session details
    let track: { circuit?: string; country?: string; location?: string } = {}
    try {
      const session = await openf1.getSessionDetails(sessionKey)
      track = {
        circuit: session?.circuit_short_name || session?.circuit_name,
        country: session?.country_name,
        location: session?.location,
      }
    } catch {
      // If session details fail, just skip track info
    }

    return NextResponse.json({
      positions,
      track,
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch driver positions" },
      { status: 500 }
    )
  }
}