import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export function useHistoricPlayback(
  max: number,
  { initialSpeed = 1, onFrame }: { initialSpeed?: number; onFrame?: (idx: number) => void } = {}
) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const frameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Memoize playback handlers to prevent recreations on rerenders
  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying(p => !p), []);
  const stepBack = useCallback(() => 
    setCurrentIdx(idx => Math.max(0, idx - 1)), 
    []
  );
  
  const stepForward = useCallback(() => 
    setCurrentIdx(idx => Math.min(max, idx + 1)), 
    [max]
  );

  // Memoize derived state to prevent unnecessary calculations
  const canStepBack = useMemo(() => currentIdx > 0, [currentIdx]);
  const canStepForward = useMemo(() => currentIdx < max, [currentIdx, max]);

  // Animation frame effect with optimized calculation logic
  useEffect(() => {
    if (!playing) return;

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;
      const frameRate = 1000 / (60 / speed); // Adjust for speed

      if (elapsed > frameRate) {
        lastFrameTimeRef.current = timestamp;
        
        if (currentIdx < max) {
          const newIdx = currentIdx + 1;
          setCurrentIdx(newIdx);
          onFrame?.(newIdx);
        } else {
          setPlaying(false);
        }
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      lastFrameTimeRef.current = null;
    };
  }, [playing, speed, max, currentIdx, onFrame]);

  // Reset playback when max changes, use useCallback to optimize
  const resetPlayback = useCallback(() => {
    setCurrentIdx(0);
    setPlaying(false);
  }, []);

  useEffect(() => {
    resetPlayback();
  }, [max, resetPlayback]);

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
    canStepBack,
    canStepForward
  };
}