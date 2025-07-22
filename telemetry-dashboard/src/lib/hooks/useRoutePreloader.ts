import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { componentPreloader } from '@/lib/utils/componentPreloader'

export function useRoutePreloader() {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      // Preload components for the target route
      componentPreloader.preloadRouteComponents(url)
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
    }
  }, [router.events])

  // Preload adjacent routes
  const preloadRoute = (route: string) => {
    componentPreloader.preloadRouteComponents(route)
  }

  return { preloadRoute }
}