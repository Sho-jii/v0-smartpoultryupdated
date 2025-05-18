"use client"

import { useEffect, useState } from "react"
import { ref, onValue, set } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import NavigationMenu from "@/components/navigation-menu"
import { Clock, Droplet } from "lucide-react"

export default function WaterSchedulePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [waterSchedule, setWaterSchedule] = useState<{ [key: string]: boolean }>({})
  const [waterFillDuration, setWaterFillDuration] = useState(30) // Default 30 seconds
  const [waterFlowRate, setWaterFlowRate] = useState(100) // Default 100ml/second
  const [autoWaterEnabled, setAutoWaterEnabled] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    const firebase = initFirebase()
    if (!firebase?.database) return

    // Load water schedule
    const scheduleRef = ref(firebase.database, "/waterSchedule")
    const unsubscribe = onValue(scheduleRef, (snapshot) => {
      const schedule = snapshot.val()
      if (schedule) {
        const processedSchedule: { [key: string]: boolean } = {}
        Object.keys(schedule).forEach((key) => {
          const value = schedule[key]
          processedSchedule[key] = value === true || value === "true" || value === 1 || value === "1"
        })
        setWaterSchedule(processedSchedule)
      } else {
        setWaterSchedule({})
      }
    })

    // Load water settings
    const settingsRef = ref(firebase.database, "/waterSettings")
    const settingsUnsubscribe = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val()
      if (settings) {
        if (settings.fillDuration !== undefined) {
          setWaterFillDuration(settings.fillDuration)
        }
        if (settings.flowRate !== undefined) {
          setWaterFlowRate(settings.flowRate)
        }
        if (settings.autoEnabled !== undefined) {
          setAutoWaterEnabled(
            settings.autoEnabled === true ||
              settings.autoEnabled === "true" ||
              settings.autoEnabled === 1 ||
              settings.autoEnabled === "1",
          )
        }
      }
      setIsLoading(false)
    })

    return () => {
      unsubscribe()
      settingsUnsubscribe()
    }
  }, [isAuthenticated, authLoading])

  // Toggle water schedule for a specific hour
  const toggleWaterHour = (hour: number) => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      const newSchedule = { ...waterSchedule }
      newSchedule[hour] = !newSchedule[hour]
      setWaterSchedule(newSchedule)
      set(ref(firebase.database, `/waterSchedule/${hour}`), newSchedule[hour])
        .then(() => console.log(`Water schedule for hour ${hour} updated in Firebase`))
        .catch((err) => console.error("Error updating water schedule:", err))
    } catch (err: any) {
      console.error("Error toggling water hour:", err)
    }
  }

  // Update water fill duration
  const updateWaterFillDuration = (duration: number) => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      setWaterFillDuration(duration)
      set(ref(firebase.database, "/waterSettings/fillDuration"), duration)
        .then(() => console.log(`Water fill duration updated to ${duration}s`))
        .catch((err) => console.error("Error updating water fill duration:", err))
    } catch (err: any) {
      console.error("Error updating water fill duration:", err)
    }
  }

  // Update water flow rate
  const updateWaterFlowRate = (rate: number) => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      setWaterFlowRate(rate)
      set(ref(firebase.database, "/waterSettings/flowRate"), rate)
        .then(() => console.log(`Water flow rate updated to ${rate}ml/s`))
        .catch((err) => console.error("Error updating water flow rate:", err))
    } catch (err: any) {
      console.error("Error updating water flow rate:", err)
    }
  }

  // Toggle auto water
  const toggleAutoWater = () => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      const newState = !autoWaterEnabled
      setAutoWaterEnabled(newState)
      set(ref(firebase.database, "/waterSettings/autoEnabled"), newState)
        .then(() => console.log(`Auto water ${newState ? "enabled" : "disabled"}`))
        .catch((err) => console.error("Error updating auto water state:", err))
    } catch (err: any) {
      console.error("Error toggling auto water:", err)
    }
  }

  // Trigger manual water fill
  const triggerManualWaterFill = () => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      // Set water fill command
      set(ref(firebase.database, "/controls/waterFill"), true)
        .then(() => {
          console.log("Manual water fill triggered")
          // Reset command after 2 seconds
          setTimeout(() => {
            set(ref(firebase.database, "/controls/waterFill"), false).catch((err) =>
              console.error("Error resetting water fill command:", err),
            )
          }, 2000)
        })
        .catch((err) => console.error("Error triggering manual water fill:", err))
    } catch (err: any) {
      console.error("Error triggering manual water fill:", err)
    }
  }

  if (authLoading || isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <header className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Water Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400">Set automatic water filling times and manage water settings</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Clock className="mr-2" /> Water Filling Schedule
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="dark:text-white">Set automatic water filling times (24-hour format):</p>
              <div className="flex items-center">
                <span className="mr-2 text-sm dark:text-white">Auto Schedule</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoWaterEnabled}
                    onChange={toggleAutoWater}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {Array.from({ length: 24 }).map((_, hour) => (
                <button
                  key={hour}
                  className={`w-full h-12 rounded-md text-sm ${
                    waterSchedule[hour]
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => toggleWaterHour(hour)}
                  disabled={!autoWaterEnabled}
                >
                  {hour.toString().padStart(2, "0")}:00
                </button>
              ))}
            </div>

            <div className="mt-8">
              <button
                onClick={triggerManualWaterFill}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center w-full"
              >
                <Droplet className="mr-2" size={18} />
                Fill Water Now
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Droplet className="mr-2" /> Water Settings
            </h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <label htmlFor="fillDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fill Duration (seconds)
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  id="fillDuration"
                  min="5"
                  max="120"
                  step="5"
                  value={waterFillDuration}
                  onChange={(e) => updateWaterFillDuration(Number.parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="ml-4 w-12 text-center dark:text-white">{waterFillDuration}s</span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Estimated volume: {(waterFillDuration * waterFlowRate).toLocaleString()}ml (
                {((waterFillDuration * waterFlowRate) / 1000).toFixed(1)}L)
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="flowRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Flow Rate Calibration (ml/second)
              </label>
              <div className="flex">
                <input
                  type="number"
                  id="flowRate"
                  min="10"
                  max="500"
                  value={waterFlowRate}
                  onChange={(e) => updateWaterFlowRate(Number.parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
                <span className="ml-2 flex items-center text-gray-700 dark:text-gray-300">ml/s</span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Calibrate based on your pump's actual flow rate
              </p>
            </div>

            <div className="mt-8 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <h3 className="text-blue-800 dark:text-blue-300 font-medium mb-2">Water Management Tips</h3>
              <ul className="list-disc pl-5 text-blue-700 dark:text-blue-400 space-y-1 text-sm">
                <li>Broiler chickens (45 days) need 180-250ml of water per day</li>
                <li>Water should be available throughout the day</li>
                <li>Clean water containers regularly to prevent bacterial growth</li>
                <li>Monitor water consumption to detect health issues early</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
