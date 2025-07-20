import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const OPENF1_WS_URL = "wss://api.openf1.org/v1/telemetry"

export async function GET(req: NextRequest) {
  // Optionally add authentication/rate-limiting logic here
  return NextResponse.json({ wsUrl: OPENF1_WS_URL })
}