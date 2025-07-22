"use client"

import { useParams } from "next/navigation"

export default function SessionDashboardPage() {
  const { sessionKey } = useParams<{ sessionKey: string }>()
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Session Dashboard</h1>
      <div>Session Key: {sessionKey}</div>
      {/* Render session-specific telemetry/dashboard here */}
    </div>
  )
}