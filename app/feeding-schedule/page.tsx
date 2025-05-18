"use client"

import { useEffect, useState } from "react"
import { ref, onValue, set } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import NavigationMenu from "@/components/navigation-menu"
import { Clock } from "lucide-react"

export default function FeedingSchedulePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [feedingSchedule, setFeedingSchedule] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    const firebase = initFirebase()
    if (!firebase?.database) return

    // Load feeding schedule
    const scheduleRef = ref(firebase.database, "/feedingSchedule")
    const unsubscribe = onValue(scheduleRef, (snapshot) => {
      const schedule = snapshot.val()
      if (schedule) {
        const processedSchedule: { [key: string]: boolean } = {}
        Object.keys(schedule).forEach((key) => {
          const value = schedule[key]
          processedSchedule[key] = value === true || value === "true" || value === 1 || value === "1"
        })
        setFeedingSchedule(processedSchedule)
      } else {
        setFeedingSchedule({})
      }
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [isAuthenticated, authLoading])

  // Toggle feeding schedule for a specific hour
  const toggleFeedingHour = (hour: number) => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      const newSchedule = { ...feedingSchedule }
      newSchedule[hour] = !newSchedule[hour]
      setFeedingSchedule(newSchedule)
      set(ref(firebase.database, `/feedingSchedule/${hour}`), newSchedule[hour])
        .then(() => console.log(`Feeding schedule for hour ${hour} updated in Firebase`))
        .catch((err) => console.error("Error updating feeding schedule:", err))
    } catch (err: any) {
      console.error("Error toggling feeding hour:", err)
    }
  }

  if (authLoading || isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <header className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Feeding Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400">Set automatic feeding times throughout the day</p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="bg-gray-700 text-white p-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="mr-2" /> Feeding Schedule
          </h2>
        </div>
        <div className="p-6">
          <p className="mb-6 dark:text-white">Set automatic feeding times (24-hour format):</p>

          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
            {Array.from({ length: 24 }).map((_, hour) => (
              <button
                key={hour}
                className={`w-full h-12 rounded-md text-sm ${
                  feedingSchedule[hour]
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
                onClick={() => toggleFeedingHour(hour)}
              >
                {hour.toString().padStart(2, "0")}:00
              </button>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
            <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">How it works</h3>
            <ul className="list-disc pl-5 text-blue-700 dark:text-blue-400 space-y-1 text-sm">
              <li>Click on a time slot to toggle automatic feeding at that hour</li>
              <li>Green slots indicate active feeding times</li>
              <li>The system will dispense the recommended amount based on your chicken age group and count</li>
              <li>Make sure your feed container has enough feed before scheduling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
