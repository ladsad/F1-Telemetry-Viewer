import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HistoricPlaybackControls } from "@/types";

export interface PlaybackOptions {
  onFrame?: (currentIdx: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  initialSpeed?: number;
  frameInterval?: number; // Base interval in milliseconds
  enableKeyboardControls?: boolean;
  autoLoop?: boolean;
}

export interface PlaybackSyncState {
  currentIdx: number;
  playing: boolean;
  speed: number;
  totalFrames: number;
  progress: number; // 0-1
  timestamp?: number;
}

/**
 * Enhanced historic playback hook with synchronization capabilities
 * Provides playback controls for historic telemetry data with cross-component sync
 */
export function useHistoricPlayback(
  totalFrames: number,
  options: PlaybackOptions = {}
): HistoricPlaybackControls {
  const {
    onFrame,
    onPlayStateChange,
    onSpeedChange,
    initialSpeed = 1,
    frameInterval = 100,
    enableKeyboardControls = true,
    autoLoop = false,
  } = options;

  // Core playback state
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedInternal] = useState(initialSpeed);
  const [currentIdx, setCurrentIdxInternal] = useState(0);

  // Playback control refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);

  // Memoized derived state
  const derivedState = useMemo(() => ({
    canStepBack: currentIdx > 0,
    canStepForward: currentIdx < totalFrames - 1,
    progress: totalFrames > 0 ? currentIdx / (totalFrames - 1) : 0,
    isAtStart: currentIdx === 0,
    isAtEnd: currentIdx >= totalFrames - 1,
  }), [currentIdx, totalFrames]);

  // Enhanced setCurrentIdx with bounds checking and callbacks
  const setCurrentIdx = useCallback((idx: number) => {
    const boundedIdx = Math.max(0, Math.min(idx, totalFrames - 1));
    setCurrentIdxInternal(boundedIdx);
    onFrame?.(boundedIdx);
  }, [totalFrames, onFrame]);

  // Enhanced setSpeed with callback
  const setSpeed = useCallback((newSpeed: number) => {
    const validSpeed = Math.max(0.1, Math.min(newSpeed, 8));
    setSpeedInternal(validSpeed);
    onSpeedChange?.(validSpeed);
  }, [onSpeedChange]);

  // Playback engine using high-precision timing
  const startPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    lastUpdateTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;

      // Accumulate time with speed multiplier
      accumulatedTimeRef.current += deltaTime * speed;

      // Check if we should advance frame
      const targetInterval = frameInterval;
      if (accumulatedTimeRef.current >= targetInterval) {
        accumulatedTimeRef.current = 0;

        setCurrentIdxInternal(prevIdx => {
          const nextIdx = prevIdx + 1;
          
          if (nextIdx >= totalFrames) {
            if (autoLoop) {
              onFrame?.(0);
              return 0;
            } else {
              // Auto-pause at end
              setPlaying(false);
              onPlayStateChange?.(false);
              return prevIdx;
            }
          }
          
          onFrame?.(nextIdx);
          return nextIdx;
        });
      }
    }, 16); // ~60fps update rate for smooth UI
  }, [speed, frameInterval, totalFrames, autoLoop, onFrame, onPlayStateChange]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Playback control functions
  const play = useCallback(() => {
    if (derivedState.isAtEnd && !autoLoop) {
      setCurrentIdx(0); // Reset to beginning if at end
    }
    setPlaying(true);
    onPlayStateChange?.(true);
  }, [derivedState.isAtEnd, autoLoop, setCurrentIdx, onPlayStateChange]);

  const pause = useCallback(() => {
    setPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, play, pause]);

  const stepBack = useCallback(() => {
    if (derivedState.canStepBack) {
      setCurrentIdx(currentIdx - 1);
    }
  }, [currentIdx, derivedState.canStepBack, setCurrentIdx]);

  const stepForward = useCallback(() => {
    if (derivedState.canStepForward) {
      setCurrentIdx(currentIdx + 1);
    }
  }, [currentIdx, derivedState.canStepForward, setCurrentIdx]);

  // Jump to specific progress (0-1)
  const seekToProgress = useCallback((progress: number) => {
    const targetIdx = Math.round(progress * (totalFrames - 1));
    setCurrentIdx(targetIdx);
  }, [totalFrames, setCurrentIdx]);

  // Jump to specific time (if timestamps are available)
  const seekToTime = useCallback((timestamp: number, timestamps?: number[]) => {
    if (!timestamps?.length) return;
    
    // Binary search for closest timestamp
    let left = 0;
    let right = timestamps.length - 1;
    let closestIdx = 0;
    let minDiff = Infinity;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const diff = Math.abs(timestamps[mid] - timestamp);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = mid;
      }

      if (timestamps[mid] < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    setCurrentIdx(closestIdx);
  }, [setCurrentIdx]);

  // Advanced playback functions
  const skipToStart = useCallback(() => setCurrentIdx(0), [setCurrentIdx]);
  const skipToEnd = useCallback(() => setCurrentIdx(totalFrames - 1), [setCurrentIdx, totalFrames]);

  // Batch control for synchronized playback across components
  const getSyncState = useCallback((): PlaybackSyncState => ({
    currentIdx,
    playing,
    speed,
    totalFrames,
    progress: derivedState.progress,
    timestamp: Date.now(),
  }), [currentIdx, playing, speed, totalFrames, derivedState.progress]);

  const applySyncState = useCallback((syncState: PlaybackSyncState) => {
    setCurrentIdxInternal(syncState.currentIdx);
    setPlaying(syncState.playing);
    setSpeedInternal(syncState.speed);
    onFrame?.(syncState.currentIdx);
  }, [onFrame]);

  // Keyboard controls
  useEffect(() => {
    if (!enableKeyboardControls) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepBack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepForward();
          break;
        case 'Home':
          e.preventDefault();
          skipToStart();
          break;
        case 'End':
          e.preventDefault();
          skipToEnd();
          break;
        case 'Digit1':
          e.preventDefault();
          setSpeed(0.25);
          break;
        case 'Digit2':
          e.preventDefault();
          setSpeed(0.5);
          break;
        case 'Digit3':
          e.preventDefault();
          setSpeed(1);
          break;
        case 'Digit4':
          e.preventDefault();
          setSpeed(2);
          break;
        case 'Digit5':
          e.preventDefault();
          setSpeed(4);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardControls, toggle, stepBack, stepForward, skipToStart, skipToEnd, setSpeed]);

  // Playback engine effect
  useEffect(() => {
    if (playing && totalFrames > 0) {
      startPlayback();
    } else {
      stopPlayback();
    }

    return stopPlayback;
  }, [playing, startPlayback, stopPlayback, totalFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Auto-pause when reaching end (if not looping)
  useEffect(() => {
    if (derivedState.isAtEnd && playing && !autoLoop) {
      pause();
    }
  }, [derivedState.isAtEnd, playing, autoLoop, pause]);

  return {
    // Basic controls
    playing,
    play,
    pause,
    toggle,
    speed,
    setSpeed,
    
    // Position controls
    currentIdx,
    setCurrentIdx,
    stepBack,
    stepForward,
    skipToStart,
    skipToEnd,
    
    // State queries
    canStepBack: derivedState.canStepBack,
    canStepForward: derivedState.canStepForward,
    progress: derivedState.progress,
    isAtStart: derivedState.isAtStart,
    isAtEnd: derivedState.isAtEnd,
    
    // Advanced controls
    seekToProgress,
    seekToTime,
    
    // Synchronization
    getSyncState,
    applySyncState,
    
    // Metadata
    totalFrames,
  };
}

/**
 * Hook for synchronizing multiple playback instances
 * Useful for coordinating playback across different dashboard components
 */
export function usePlaybackSync() {
  const [syncState, setSyncState] = useState<PlaybackSyncState | null>(null);
  const subscribersRef = useRef<Set<(state: PlaybackSyncState) => void>>(new Set());

  const broadcast = useCallback((state: PlaybackSyncState) => {
    setSyncState(state);
    subscribersRef.current.forEach(callback => callback(state));
  }, []);

  const subscribe = useCallback((callback: (state: PlaybackSyncState) => void) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  }, []);

  const syncPlayback = useCallback((playbackControls: HistoricPlaybackControls) => {
    const state = playbackControls.getSyncState();
    broadcast(state);
  }, [broadcast]);

  return {
    syncState,
    broadcast,
    subscribe,
    syncPlayback,
  };
}

/**
 * Specialized hook for lap-based playback
 * Provides additional controls for lap-specific navigation
 */
export function useLapBasedPlayback(
  totalFrames: number,
  lapData: Array<{ startIdx: number; endIdx: number; lapNumber: number }>,
  options: PlaybackOptions = {}
) {
  const basePlayback = useHistoricPlayback(totalFrames, options);
  const [currentLap, setCurrentLap] = useState(1);

  // Find current lap based on currentIdx
  useEffect(() => {
    const lap = lapData.find(l => 
      basePlayback.currentIdx >= l.startIdx && basePlayback.currentIdx <= l.endIdx
    );
    if (lap) {
      setCurrentLap(lap.lapNumber);
    }
  }, [basePlayback.currentIdx, lapData]);

  // Jump to specific lap
  const jumpToLap = useCallback((lapNumber: number) => {
    const lap = lapData.find(l => l.lapNumber === lapNumber);
    if (lap) {
      basePlayback.setCurrentIdx(lap.startIdx);
      setCurrentLap(lapNumber);
    }
  }, [lapData, basePlayback]);

  // Navigate between laps
  const nextLap = useCallback(() => {
    const nextLapData = lapData.find(l => l.lapNumber === currentLap + 1);
    if (nextLapData) {
      jumpToLap(nextLapData.lapNumber);
    }
  }, [currentLap, lapData, jumpToLap]);

  const previousLap = useCallback(() => {
    const prevLapData = lapData.find(l => l.lapNumber === currentLap - 1);
    if (prevLapData) {
      jumpToLap(prevLapData.lapNumber);
    }
  }, [currentLap, lapData, jumpToLap]);

  return {
    ...basePlayback,
    currentLap,
    jumpToLap,
    nextLap,
    previousLap,
    canNextLap: lapData.some(l => l.lapNumber === currentLap + 1),
    canPreviousLap: lapData.some(l => l.lapNumber === currentLap - 1),
    totalLaps: lapData.length,
  };
}