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

    // Fetch driver info for all drivers in this session
    let driverInfoMap: Record<string, OpenF1DriverInfo> = {}
    try {
      const driverInfos: OpenF1DriverInfo[] = await openf1.getDriverInfo(sessionKey)
      driverInfoMap = driverInfos.reduce((acc, info) => {
        acc[info.driver_number] = info
        return acc
      }, {} as Record<string, OpenF1DriverInfo>)
    } catch {
      // If driver info fails, just skip extra info
    }

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

    // Normalize positions and attach driver/team info
    const normalizedPositions = positions.map((pos: any) => {
      const info = driverInfoMap[pos.driver_number]
      return {
        driver_number: pos.driver_number,
        normalized_track_position_x: pos.normalized_track_position_x,
        normalized_track_position_y: pos.normalized_track_position_y,
        team_name: info?.team_name,
        driver_name: info?.full_name || info?.broadcast_name,
        color: info?.team_colour,
        ...pos,
      }
    })

    return NextResponse.json({
      positions: normalizedPositions,
      track,
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch driver positions" },
      { status: 500 }
    )
  }
}