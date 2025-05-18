"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import FeedingAnalytics from "@/components/feeding-analytics"
import FeedingControl from "@/components/feeding-control"
import NavigationMenu from "@/components/navigation-menu"

export default function FeedingAnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    // Short timeout to ensure smooth loading transition
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [isAuthenticated, authLoading])

  if (authLoading || isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <header className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Feeding Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor feed consumption and manage feeding schedules</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <FeedingControl />
        <FeedingAnalytics />
      </div>
    </div>
  )
}
