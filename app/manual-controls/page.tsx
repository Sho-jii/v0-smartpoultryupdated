"use client"

import { useEffect, useState } from "react"
import { ref, onValue, set } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import NavigationMenu from "@/components/navigation-menu"
import { Fan, Lightbulb, Droplet, RefreshCw } from "lucide-react"

export default function ManualControls() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [firebase, setFirebase] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fanState, setFanState] = useState(false)
  const [heatState, setHeatState] = useState(false)
  const [pumpState, setPumpState] = useState(false)
  const [automationEnabled, setAutomationEnabled] = useState(true)
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      return
    }

    try {
      const firebaseInstance = initFirebase()
      if (firebaseInstance) {
        setFirebase(firebaseInstance)
      } else {
        setError("Failed to initialize Firebase. Browser environment required.")
      }
    } catch (err: any) {
      console.error("Firebase initialization error:", err)
      setError("Failed to initialize Firebase. Please check your connection.")
    } finally {
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }
  }, [isAuthenticated, authLoading])

  // Effect to listen for device states
  useEffect(() => {
    if (!firebase?.database) {
      return
    }

    try {
      const deviceStatesRef = ref(firebase.database, "/deviceStates")

      const unsubscribe = onValue(
        deviceStatesRef,
        (snapshot) => {
          const data = snapshot.val()

          if (!data) {
            return
          }

          if (data.fan !== undefined) {
            const fanValue = data.fan === true || data.fan === "true" || data.fan === 1 || data.fan === "1"
            setFanState(!fanValue) // Invert to get the actual state
          }

          if (data.heat !== undefined) {
            const heatValue = data.heat === true || data.heat === "true" || data.heat === 1 || data.heat === "1"
            setHeatState(!heatValue) // Invert to get the actual state
          }

          if (data.pump !== undefined) {
            const pumpValue = data.pump === true || data.pump === "true" || data.pump === 1 || data.pump === "1"
            setPumpState(!pumpValue) // Invert to get the actual state
          }

          setLastDataRefresh(new Date())
        },
        (error) => {
          console.error("Firebase device states error:", error)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error("Error setting up device states listener:", err)
    }
  }, [firebase])

  // Effect to listen for automation state
  useEffect(() => {
    if (!firebase?.database) {
      return
    }

    try {
      const automationRef = ref(firebase.database, "/controls/automationEnabled")

      const unsubscribe = onValue(
        automationRef,
        (snapshot) => {
          const enabled = snapshot.val()
          // FIX: Handle different data types for boolean values
          const automationValue = enabled === true || enabled === "true" || enabled === 1 || enabled === "1"
          setAutomationEnabled(automationValue)
        },
        (error) => {
          console.error("Firebase automation state error:", error)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error("Error setting up automation state listener:", err)
    }
  }, [firebase])

  // Toggle automation
  const toggleAutomation = () => {
    if (!firebase?.database) {
      return
    }

    try {
      const newState = !automationEnabled
      setAutomationEnabled(newState)
      set(ref(firebase.database, "/controls/automationEnabled"), newState)
        .then(() => console.log("Automation state updated in Firebase"))
        .catch((err) => console.error("Error updating automation state:", err))
    } catch (err: any) {
      console.error("Error toggling automation:", err)
    }
  }

  // Toggle fan
  const toggleFan = () => {
    if (!firebase?.database) {
      return
    }

    try {
      const newState = !fanState
      setFanState(newState)

      // Write the actual desired state to Firebase
      // The Arduino expects true to mean ON and false to mean OFF
      set(ref(firebase.database, "/controls/fan"), newState)
        .then(() => console.log("Fan state updated in Firebase"))
        .catch((err) => console.error("Error updating fan state:", err))
    } catch (err: any) {
      console.error("Error toggling fan:", err)
    }
  }

  // Toggle heat
  const toggleHeat = () => {
    if (!firebase?.database) {
      return
    }

    try {
      const newState = !heatState
      setHeatState(newState)

      // Write the actual desired state to Firebase
      // The Arduino expects true to mean ON and false to mean OFF
      set(ref(firebase.database, "/controls/heat"), newState)
        .then(() => console.log("Heat state updated in Firebase"))
        .catch((err) => console.error("Error updating heat state:", err))
    } catch (err: any) {
      console.error("Error toggling heat:", err)
    }
  }

  // Toggle pump
  const togglePump = () => {
    if (!firebase?.database) {
      return
    }

    try {
      const newState = !pumpState
      setPumpState(newState)

      // Write the actual desired state to Firebase
      // The Arduino expects true to mean ON and false to mean OFF
      set(ref(firebase.database, "/controls/pump"), newState)
        .then(() => console.log("Pump state updated in Firebase"))
        .catch((err) => console.error("Error updating pump state:", err))
    } catch (err: any) {
      console.error("Error toggling pump:", err)
    }
  }

  // Manual data refresh function
  const refreshData = () => {
    if (!firebase?.database) {
      return
    }

    try {
      const deviceStatesRef = ref(firebase.database, "/deviceStates")
      onValue(
        deviceStatesRef,
        (snapshot) => {
          const data = snapshot.val()

          if (!data) {
            return
          }

          if (data.fan !== undefined) {
            const fanValue = data.fan === true || data.fan === "true" || data.fan === 1 || data.fan === "1"
            setFanState(!fanValue) // Invert to get the actual state
          }

          if (data.heat !== undefined) {
            const heatValue = data.heat === true || data.heat === "true" || data.heat === 1 || data.heat === "1"
            setHeatState(!heatValue) // Invert to get the actual state
          }

          if (data.pump !== undefined) {
            const pumpValue = data.pump === true || data.pump === "true" || data.pump === 1 || data.pump === "1"
            setPumpState(!pumpValue) // Invert to get the actual state
          }

          setLastDataRefresh(new Date())
        },
        { onlyOnce: true },
      )

      const automationRef = ref(firebase.database, "/controls/automationEnabled")
      onValue(
        automationRef,
        (snapshot) => {
          const enabled = snapshot.val()
          const automationValue = enabled === true || enabled === "true" || enabled === 1 || enabled === "1"
          setAutomationEnabled(automationValue)
        },
        { onlyOnce: true },
      )
    } catch (err: any) {
      console.error("Error refreshing data:", err)
    }
  }

  if (authLoading || isLoading) {
    return <LoadingAnimation />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center mb-4 dark:text-white">Connection Error</h1>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 transition-colors duration-200 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <NavigationMenu />

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Manual Controls</h1>
        <div className="flex items-center">
          <button
            onClick={refreshData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md mr-4 flex items-center"
          >
            <RefreshCw size={16} className="mr-1" />
            Refresh Data
          </button>
          <div className="flex items-center">
            <span className="mr-2 dark:text-white">Automation</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={automationEnabled} onChange={toggleAutomation} />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fan Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Fan className="mr-2" size={20} />
              Fan Control
            </h2>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${fanState ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Fan
                size={64}
                className={`${fanState ? "text-green-500 animate-spin" : "text-gray-400"}`}
                style={{ animationDuration: "3s" }}
              />
            </div>
            <p className="text-lg font-medium mb-4 dark:text-white">
              Status: <span className={fanState ? "text-green-500" : "text-red-500"}>{fanState ? "ON" : "OFF"}</span>
            </p>
            <button
              onClick={toggleFan}
              disabled={automationEnabled}
              className={`px-6 py-2 rounded-md font-medium ${
                automationEnabled
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : fanState
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {fanState ? "Turn OFF" : "Turn ON"}
            </button>
            {automationEnabled && (
              <p className="text-xs text-gray-500 mt-2 text-center">Disable automation to manually control the fan</p>
            )}
          </div>
        </div>

        {/* Heat Lamp Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Lightbulb className="mr-2" size={20} />
              Heat Lamp Control
            </h2>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${heatState ? "bg-orange-100 dark:bg-orange-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Lightbulb size={64} className={heatState ? "text-orange-500" : "text-gray-400"} />
            </div>
            <p className="text-lg font-medium mb-4 dark:text-white">
              Status: <span className={heatState ? "text-orange-500" : "text-red-500"}>{heatState ? "ON" : "OFF"}</span>
            </p>
            <button
              onClick={toggleHeat}
              disabled={automationEnabled}
              className={`px-6 py-2 rounded-md font-medium ${
                automationEnabled
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : heatState
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {heatState ? "Turn OFF" : "Turn ON"}
            </button>
            {automationEnabled && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Disable automation to manually control the heat lamp
              </p>
            )}
          </div>
        </div>

        {/* Water Pump Control */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 text-white p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Droplet className="mr-2" size={20} />
              Water Pump Control
            </h2>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${pumpState ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-700"}`}
            >
              <Droplet size={64} className={pumpState ? "text-blue-500" : "text-gray-400"} />
            </div>
            <p className="text-lg font-medium mb-4 dark:text-white">
              Status: <span className={pumpState ? "text-blue-500" : "text-red-500"}>{pumpState ? "ON" : "OFF"}</span>
            </p>
            <button
              onClick={togglePump}
              disabled={automationEnabled}
              className={`px-6 py-2 rounded-md font-medium ${
                automationEnabled
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : pumpState
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {pumpState ? "Turn OFF" : "Turn ON"}
            </button>
            {automationEnabled && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Disable automation to manually control the water pump
              </p>
            )}
          </div>
        </div>
      </div>

      {lastDataRefresh && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-right">
          Last updated: {lastDataRefresh.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
