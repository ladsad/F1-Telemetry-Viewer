import { useEffect, useRef, useState } from "react"

export function useHistoricPlayback(
  max: number,
  { initialSpeed = 1, onFrame }: { initialSpeed?: number; onFrame?: (idx: number) => void } = {}
) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  const [currentIdx, setCurrentIdx] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setCurrentIdx((idx) => {
        if (idx < max) {
          const next = idx + 1
          onFrame?.(next)
          return next
        } else {
          setPlaying(false)
          return idx
        }
      })
    }, 1000 / speed)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, max])

  // Reset playback if max changes
  useEffect(() => {
    setCurrentIdx(0)
    setPlaying(false)
  }, [max])

  const play = () => setPlaying(true)
  const pause = () => setPlaying(false)
  const toggle = () => setPlaying((p) => !p)

  const stepBack = () => setCurrentIdx((idx) => Math.max(0, idx - 1))
  const stepForward = () => setCurrentIdx((idx) => Math.min(max, idx + 1))

  return {
    playing,
    play,
    pause,
    toggle,
    speed,
    setSpeed,
    currentIdx,
    setCurrentIdx,
    stepBack,
    stepForward,
    canStepBack: currentIdx > 0,
    canStepForward: currentIdx < max,
  }
}