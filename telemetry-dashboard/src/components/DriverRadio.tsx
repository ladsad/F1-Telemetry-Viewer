"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { OpenF1RadioMessage } from "@/lib/api/types"
import { OpenF1Service } from "@/lib/api/openf1"
import { MessageCircle } from "lucide-react"

type DriverRadioProps = {
  sessionKey: string
  driverNumber: number
}

export default function DriverRadio({ sessionKey, driverNumber }: DriverRadioProps) {
  const [messages, setMessages] = useState<OpenF1RadioMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionKey || !driverNumber) return
    setLoading(true)
    setError(null)
    const openf1 = new OpenF1Service("https://api.openf1.org/v1")
    openf1.getRadioMessages(sessionKey, driverNumber)
      .then((data) => {
        setMessages(data || [])
        setLoading(false)
      })
      .catch((err) => {
        setError((err as Error).message)
        setLoading(false)
      })
  }, [sessionKey, driverNumber])

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading radio messages...</div>
  }
  if (error) {
    return <div className="text-xs text-destructive">{error}</div>
  }
  if (!messages.length) {
    return <div className="text-xs text-muted-foreground">No radio messages available.</div>
  }

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>
          <MessageCircle className="inline w-5 h-5 mr-2" />
          Driver Radio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-col border-b pb-2 last:border-b-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className="ml-2 font-semibold">{msg.source === "driver" ? "Driver" : "Engineer"}</span>
              </div>
              <div className="text-sm">{msg.message}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}