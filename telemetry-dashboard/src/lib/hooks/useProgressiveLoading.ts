import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'

interface ProgressiveLoadingOptions {
  threshold?: number
  triggerOnce?: boolean
  rootMargin?: string
  enabled?: boolean
}

export function useProgressiveLoading(
  options: ProgressiveLoadingOptions = {}
) {
  const {
    threshold = 0.1,
    triggerOnce = true,
    rootMargin = '50px',
    enabled = true
  } = options

  const [shouldLoad, setShouldLoad] = useState(!enabled)
  const [hasLoaded, setHasLoaded] = useState(false)

  const { ref, inView } = useInView({
    threshold,
    triggerOnce,
    rootMargin
  })

  useEffect(() => {
    if (inView && enabled && !hasLoaded) {
      setShouldLoad(true)
      setHasLoaded(true)
    }
  }, [inView, enabled, hasLoaded])

  const forceLoad = useCallback(() => {
    setShouldLoad(true)
    setHasLoaded(true)
  }, [])

  return {
    ref,
    shouldLoad,
    hasLoaded,
    inView,
    forceLoad
  }
}