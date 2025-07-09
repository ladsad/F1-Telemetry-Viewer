import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service } from "@/lib/api/openf1"

const OPENF1_BASE_URL = "https://api.openf1.org/v1"
const openf1 = new OpenF1Service(OPENF1_BASE_URL)

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const season = req.nextUrl.searchParams.get("season")
  const round = req.nextUrl.searchParams.get("round")

  try {
    if (sessionKey) {
      // Fetch details for a specific session
      const session = await openf1.getSessionDetails(sessionKey)
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
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch session data" },
      { status: 500 }
    )
  }
}