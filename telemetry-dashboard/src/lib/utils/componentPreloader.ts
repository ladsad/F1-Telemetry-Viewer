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

  preloadRouteComponents(route: string) {
    switch (route) {
      case '/dashboard':
        this.preloadDashboardComponents()
        break
      case '/dashboard/live':
        this.preloadLiveComponents()
        break
      case '/dashboard/analytics':
        this.preloadAnalyticsComponents()
        break
      case '/dashboard/settings':
        this.preloadSettingsComponents()
        break
    }
  }

  private preloadLiveComponents() {
    // Critical for live dashboard
    this.preloadComponent('TelemetryDisplay', () => import('@/components/TelemetryDisplay'))
    this.preloadComponent('TrackMap', () => import('@/components/TrackMap'))
    this.preloadComponent('DriverPanel', () => import('@/components/DriverPanel'))
    this.preloadComponent('WeatherOverlay', () => import('@/components/WeatherOverlay'))
  }

  private preloadAnalyticsComponents() {
    // Analytics-specific components
    this.preloadComponent('PerformanceAnalytics', () => import('@/components/PerformanceAnalyticsDashboard'))
    this.preloadComponent('LapTimeChart', () => import('@/components/LapTimeComparisonChart'))
    this.preloadComponent('DeltaTimeChart', () => import('@/components/DeltaTimeChart'))
    this.preloadComponent('TireStrategy', () => import('@/components/TireStrategyChart'))
  }

  private preloadSettingsComponents() {
    // Settings components
    this.preloadComponent('ThemeToggle', () => import('@/components/ThemeToggle'))
    this.preloadComponent('ConnectionStatus', () => import('@/components/ConnectionStatusIndicator'))
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

    const pathname = window.location.pathname
    componentPreloader.preloadRouteComponents(pathname)
  })
}