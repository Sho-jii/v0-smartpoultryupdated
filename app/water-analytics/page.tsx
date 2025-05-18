"use client"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import WaterUsageAnalytics from "@/components/water-usage-analytics"
import WaterSchedule from "@/components/water-schedule"
import NavigationMenu from "@/components/navigation-menu"
import HydrationMonitor from "@/components/hydration-monitor"

export default function WaterAnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [chickenCount, setChickenCount] = useState(10)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    const firebase = initFirebase()
    if (!firebase?.database) return

    // Get chicken count from feeding settings
    const settingsRef = ref(firebase.database, "/feedingSettings")
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val()
      if (settings && settings.chickenCount) {
        setChickenCount(settings.chickenCount)
      }
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [isAuthenticated, authLoading])

  if (authLoading || isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <header className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Water Usage Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor water consumption and hydration levels for your poultry
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <WaterUsageAnalytics />
        <HydrationMonitor chickenCount={chickenCount} />
      </div>

      <div className="mb-8">
        <WaterSchedule />
      </div>
    </div>
  )
}
