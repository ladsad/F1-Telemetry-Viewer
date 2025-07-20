import { useEffect, useRef, useState } from "react"
import { OpenF1WebSocket } from "@/lib/api/openf1WebSocket"

export function useWebSocket<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const wsRef = useRef<OpenF1WebSocket | null>(null)

  useEffect(() => {
    wsRef.current = new OpenF1WebSocket(url)
    wsRef.current.onMessage((msg: T) => setData(msg))
    return () => {
      wsRef.current?.close()
    }
  }, [url])

  return data
}