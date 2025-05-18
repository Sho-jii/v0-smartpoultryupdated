"use client"

import { useState, useEffect } from "react"
import { ref, onValue, set } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Clock, Calendar, Settings, Save, RefreshCw } from "lucide-react"

interface WaterScheduleProps {
  className?: string
}

export default function WaterSchedule({ className = "" }: WaterScheduleProps) {
  const [schedule, setSchedule] = useState<{ [hour: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null)
  const [waterSettings, setWaterSettings] = useState({
    flowRate: 100, // ml per second
    fillDuration: 30, // seconds
    autoEnabled: true,
  })

  // Load schedule from Firebase
  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    // Get water schedule from Firebase
    const scheduleRef = ref(firebase.database, "/waterSchedule")
    const unsubscribeSchedule = onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val() || {}

      // Convert to our format with hour keys
      const formattedSchedule: { [hour: string]: boolean } = {}
      for (let i = 0; i < 24; i++) {
        const hourKey = i.toString()
        formattedSchedule[hourKey] = !!data[hourKey]
      }

      setSchedule(formattedSchedule)
      setIsLoading(false)
    })

    // Get water settings from Firebase
    const settingsRef = ref(firebase.database, "/waterSettings")
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val() || {}
      setWaterSettings({
        flowRate: data.flowRate || 100,
        fillDuration: data.fillDuration || 30,
        autoEnabled: data.autoEnabled !== undefined ? data.autoEnabled : true,
      })
    })

    return () => {
      unsubscribeSchedule()
      unsubscribeSettings()
    }
  }, [])

  // Toggle hour in schedule
  const toggleHour = (hour: string) => {
    setSchedule((prev) => ({
      ...prev,
      [hour]: !prev[hour],
    }))
  }

  // Save schedule to Firebase
  const saveSchedule = async () => {
    setIsSaving(true)
    setSaveSuccess(null)

    try {
      const firebase = initFirebase()
      if (!firebase?.database) throw new Error("Firebase not initialized")

      // Save schedule
      await set(ref(firebase.database, "/waterSchedule"), schedule)

      // Save settings
      await set(ref(firebase.database, "/waterSettings"), waterSettings)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error) {
      console.error("Error saving water schedule:", error)
      setSaveSuccess(false)
      setTimeout(() => setSaveSuccess(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle settings change
  const handleSettingChange = (setting: keyof typeof waterSettings, value: any) => {
    setWaterSettings((prev) => ({
      ...prev,
      [setting]: setting === "autoEnabled" ? value : Number(value),
    }))
  }

  // Calculate water volume based on flow rate and duration
  const calculatedVolume = waterSettings.flowRate * waterSettings.fillDuration

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Calendar className="mr-2" /> Water Filling Schedule
        </h2>
        <div className="flex items-center">
          <button
            onClick={saveSchedule}
            disabled={isSaving}
            className="flex items-center px-3 py-1 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save Schedule
          </button>
        </div>
      </div>

      {saveSuccess === true && (
        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm p-2 text-center">
          Schedule saved successfully!
        </div>
      )}

      {saveSuccess === false && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm p-2 text-center">
          Failed to save schedule. Please try again.
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Settings className="mr-1 h-4 w-4" /> Water Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Flow Rate (ml/second)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={waterSettings.flowRate}
                    onChange={(e) => handleSettingChange("flowRate", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Fill Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={waterSettings.fillDuration}
                    onChange={(e) => handleSettingChange("fillDuration", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Calculated Volume</label>
                  <div className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                    {calculatedVolume} ml ({(calculatedVolume / 1000).toFixed(2)} L)
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={waterSettings.autoEnabled}
                    onChange={(e) => handleSettingChange("autoEnabled", e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable automatic water filling schedule
                  </span>
                </label>
              </div>
            </div>

            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <Clock className="mr-1 h-4 w-4" /> Select Hours for Water Filling
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {Array.from({ length: 24 }).map((_, i) => {
                const hour = i.toString()
                const isActive = schedule[hour]
                const displayHour = i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`

                return (
                  <button
                    key={hour}
                    onClick={() => toggleHour(hour)}
                    className={`p-2 rounded-md text-center text-sm transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-500"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-2 border-transparent"
                    }`}
                  >
                    {displayHour}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">How it works</h4>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Select the hours when you want the system to automatically fill water. The system will dispense{" "}
                <span className="font-medium">{calculatedVolume} ml</span> of water at the beginning of each selected
                hour. Make sure to adjust the flow rate and fill duration based on your pump's actual performance.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
