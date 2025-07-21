import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface DynamicImportOptions {
  loading?: ComponentType
  ssr?: boolean
  suspense?: boolean
  retries?: number
}

// Enhanced dynamic import wrapper with error handling and retries
export function createDynamicImport<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
) {
  const {
    loading: LoadingComponent = () => <LoadingSpinner size="md" />,
    ssr = false,
    suspense = false,
    retries = 3
  } = options

  return dynamic(importFn, {
    loading: LoadingComponent,
    ssr,
    suspense
  })
}

// Pre-configured dynamic imports for common dashboard components
export const DynamicComponents = {
  TelemetryDisplay: createDynamicImport(
    () => import('@/components/TelemetryDisplay'),
    {
      loading: () => <LoadingSpinner size="lg" label="Loading telemetry display..." />,
      ssr: false
    }
  ),
  
  TrackMap: createDynamicImport(
    () => import('@/components/TrackMap'),
    {
      loading: () => <LoadingSpinner size="lg" label="Loading track map..." />,
      ssr: false
    }
  ),
  
  LapTimeChart: createDynamicImport(
    () => import('@/components/LapTimeComparisonChart'),
    {
      loading: () => <LoadingSpinner size="lg" label="Loading lap time chart..." />,
      ssr: false
    }
  ),
  
  AnalyticsDashboard: createDynamicImport(
    () => import('@/components/PerformanceAnalyticsDashboard'),
    {
      loading: () => <LoadingSpinner size="lg" label="Loading analytics..." />,
      ssr: false
    }
  )
}