class ComponentPreloader {
  private preloadedComponents = new Set<string>()
  private preloadPromises = new Map<string, Promise<any>>()

  async preloadComponent(name: string, importFn: () => Promise<any>) {
    if (this.preloadedComponents.has(name)) {
      return this.preloadPromises.get(name)
    }

    const promise = importFn()
    this.preloadPromises.set(name, promise)

    try {
      await promise
      this.preloadedComponents.add(name)
    } catch (error) {
      console.warn(`Failed to preload component ${name}:`, error)
      this.preloadPromises.delete(name)
    }

    return promise
  }

  preloadDashboardComponents() {
    // Preload critical components
    this.preloadComponent('TelemetryDisplay', () => import('@/components/TelemetryDisplay'))
    this.preloadComponent('TrackMap', () => import('@/components/TrackMap'))
    
    // Preload secondary components with delay
    setTimeout(() => {
      this.preloadComponent('LapTimeChart', () => import('@/components/LapTimeComparisonChart'))
      this.preloadComponent('WeatherOverlay', () => import('@/components/WeatherOverlay'))
    }, 2000)

    // Preload advanced components after user interaction
    setTimeout(() => {
      this.preloadComponent('TelemetryTable', () => import('@/components/TelemetryTable'))
      this.preloadComponent('Analytics', () => import('@/components/PerformanceAnalyticsDashboard'))
    }, 5000)
  }

  isPreloaded(name: string): boolean {
    return this.preloadedComponents.has(name)
  }
}

export const componentPreloader = new ComponentPreloader()

// Auto-start preloading on module import
if (typeof window !== 'undefined') {
  // Start preloading after page load
  window.addEventListener('load', () => {
    componentPreloader.preloadDashboardComponents()
  })
}