import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { OpenF1Service } from "@/lib/api/openf1"
import type { OpenF1CarData } from "@/lib/api/types"

const OPENF1_BASE_URL = "https://api.openf1.org/v1"
const openf1 = new OpenF1Service(OPENF1_BASE_URL)

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("session_key")
  const lapNumber = req.nextUrl.searchParams.get("lap_number")

  if (!sessionKey) {
    return NextResponse.json({ error: "Missing session_key parameter" }, { status: 400 })
  }

  try {
    const data: OpenF1CarData[] = await openf1.getCarTelemetry(
      sessionKey,
      lapNumber ? Number(lapNumber) : undefined
    )
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch car telemetry data" },
      { status: 500 }
    )
  }