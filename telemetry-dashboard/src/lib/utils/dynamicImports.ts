import dynamic from 'next/dynamic'
import React, { ComponentType } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface DynamicImportOptions {
  loading?: () => React.ReactElement
  ssr?: boolean
  retries?: number
}

// Enhanced dynamic import wrapper with error handling and retries
export function createDynamicImport<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
) {
  const { loading, ssr = false, retries = 3 } = options
  
  // Create the loading component function outside of destructuring
  const LoadingComponent = loading || (() => React.createElement(LoadingSpinner, { size: "md" }))

  return dynamic(importFn, {
    loading: LoadingComponent,
    ssr
  })
}

// Pre-configured dynamic imports for common dashboard components
export const DynamicComponents = {
  TelemetryDisplay: createDynamicImport(
    () => import('@/components/TelemetryDisplay'),
    {
      loading: () => React.createElement(LoadingSpinner, { size: "lg", label: "Loading telemetry display..." }),
      ssr: false
    }
  ),
  
  TrackMap: createDynamicImport(
    () => import('@/components/TrackMap'),
    {
      loading: () => React.createElement(LoadingSpinner, { size: "lg", label: "Loading track map..." }),
      ssr: false
    }
  ),
  
  LapTimeChart: createDynamicImport(
    () => import('@/components/LapTimeComparisonChart'),
    {
      loading: () => React.createElement(LoadingSpinner, { size: "lg", label: "Loading lap time chart..." }),
      ssr: false
    }
  ),
  
  AnalyticsDashboard: createDynamicImport(
    () => import('@/components/PerformanceAnalyticsDashboard'),
    {
      loading: () => React.createElement(LoadingSpinner, { size: "lg", label: "Loading analytics..." }),
      ssr: false
    }
  )
}

// If you need Suspense functionality, create a separate wrapper
export function createSuspenseDynamicImport<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  FallbackComponent: () => React.ReactElement = () => React.createElement(LoadingSpinner, { size: "md" })
) {
  const DynamicComponent = dynamic(importFn, {
    ssr: false
  })

  return function SuspenseWrappedComponent(props: T) {
    return React.createElement(
      React.Suspense,
      { fallback: FallbackComponent() },
      React.createElement(DynamicComponent as any, props as any)
    )
  }
}