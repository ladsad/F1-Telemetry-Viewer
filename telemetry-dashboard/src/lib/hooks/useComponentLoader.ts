import { useState, useCallback, useRef } from 'react'

interface ComponentLoadState {
  isLoading: boolean
  hasLoaded: boolean
  error: Error | null
  retryCount: number
}

interface ComponentLoaderOptions {
  maxRetries?: number
  retryDelay?: number
  onLoad?: () => void
  onError?: (error: Error) => void
}

export function useComponentLoader(
  componentName: string,
  options: ComponentLoaderOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onLoad,
    onError
  } = options

  const [state, setState] = useState<ComponentLoadState>({
    isLoading: false,
    hasLoaded: false,
    error: null,
    retryCount: 0
  })

  const timeoutRef = useRef<NodeJS.Timeout>()

  const loadComponent = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Simulate component loading (replace with actual loading logic)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasLoaded: true,
        error: null
      }))
      
      onLoad?.()
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Component loading failed')
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err,
        retryCount: prev.retryCount + 1
      }))
      
      onError?.(err)
      
      // Auto-retry if under max retries
      if (state.retryCount < maxRetries) {
        timeoutRef.current = setTimeout(() => {
          loadComponent()
        }, retryDelay * (state.retryCount + 1))
      }
    }
  }, [state.retryCount, maxRetries, retryDelay, onLoad, onError])

  const retry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState(prev => ({ ...prev, retryCount: 0 }))
    loadComponent()
  }, [loadComponent])

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState({
      isLoading: false,
      hasLoaded: false,
      error: null,
      retryCount: 0
    })
  }, [])

  return {
    ...state,
    loadComponent,
    retry,
    reset,
    canRetry: state.retryCount < maxRetries
  }
}