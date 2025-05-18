"use client"

import { useEffect, useState } from "react"
import { ref, onValue, get } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import LoadingAnimation from "@/components/loading-animation"
import CameraFeed from "@/components/camera-feed"
import HistoricalChart from "@/components/historical-chart"
import RecentAlerts from "@/components/recent-alerts"
import NavigationMenu from "@/components/navigation-menu"
import ClockDisplay from "@/components/clock-display"
import ThemeToggle from "@/components/theme-toggle"
import { LogOut, RefreshCw } from "lucide-react"

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const [firebase, setFirebase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [temperature, setTemperature] = useState<number | null>(null)
  const [humidity, setHumidity] = useState<number | null>(null)
  const [foodLevel, setFoodLevel] = useState<number | null>(null)
  const [waterLevelMain, setWaterLevelMain] = useState<number | null>(null)
  const [waterLevelDrinker, setWaterLevelDrinker] = useState<number | null>(null)
  const [automationEnabled, setAutomationEnabled] = useState(true)
  const [lastDataRefresh, setLastDataRefresh] = useState<Date | null>(null)
  const [alerts, setAlerts] = useState<{
    highTemperature: boolean
    lowTemperature: boolean
    lowFood: boolean
    lowWaterMain: boolean
    lowWaterDrinker: boolean
    lowHydration: boolean
  }>({
    highTemperature: false,
    lowTemperature: false,
    lowFood: false,
    lowWaterMain: false,
    lowWaterDrinker: false,
    lowHydration: false,
  })

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

  const refreshData = () => {
    if (!firebase?.database) {
      return
    }

    const sensorsRef = ref(firebase.database, "/sensors")
    get(sensorsRef)
      .then((snapshot) => {
        const data = snapshot.val()

        if (data) {
          if (data.temperature !== undefined) {
            const tempValue = Number(data.temperature)
            setTemperature(isNaN(tempValue) ? null : tempValue)
          }

          if (data.humidity !== undefined) {
            const humValue = Number(data.humidity)
            setHumidity(isNaN(humValue) ? null : humValue)
          }

          if (data.foodLevel !== undefined) {
            const foodValue = Number(data.foodLevel)
            setFoodLevel(isNaN(foodValue) ? null : foodValue)
          }

          if (data.waterLevelMain !== undefined) {
            const waterMainValue = Number(data.waterLevelMain)
            setWaterLevelMain(isNaN(waterMainValue) ? null : waterMainValue)
          }

          if (data.waterLevelDrinker !== undefined) {
            const waterDrinkerValue = Number(data.waterLevelDrinker)
            setWaterLevelDrinker(isNaN(waterDrinkerValue) ? null : waterDrinkerValue)
          }
        }

        const alertsRef = ref(firebase.database, "/alerts")
        return get(alertsRef)
      })
      .then((snapshot) => {
        const data = snapshot.val()

        if (data) {
          setAlerts({
            highTemperature:
              data.highTemperature === true || data.highTemperature === "true" || data.highTemperature === 1,
            lowTemperature: data.lowTemperature === true || data.lowTemperature === "true" || data.lowTemperature === 1,
            lowFood: data.lowFood === true || data.lowFood === "true" || data.lowFood === 1,
            lowWaterMain: data.lowWaterMain === true || data.lowWaterMain === "true" || data.lowWaterMain === 1,
            lowWaterDrinker:
              data.lowWaterDrinker === true || data.lowWaterDrinker === "true" || data.lowWaterDrinker === 1,
            lowHydration: data.lowHydration === true || data.lowHydration === "true" || data.lowHydration === 1,
          })
        }

        const controlsRef = ref(firebase.database, "/controls")
        return get(controlsRef)
      })
      .then((snapshot) => {
        const data = snapshot.val()

        if (data && data.automationEnabled !== undefined) {
          const autoValue =
            data.automationEnabled === true ||
            data.automationEnabled === "true" ||
            data.automationEnabled === 1 ||
            data.automationEnabled === "1"
          setAutomationEnabled(autoValue)
        }

        setLastDataRefresh(new Date())
      })
      .catch((error) => {
        console.error("Manual refresh error:", error)
      })
  }

  useEffect(() => {
    if (!firebase?.database) {
      return
    }

    try {
      const sensorsRef = ref(firebase.database, "/sensors")

      const unsubscribe = onValue(
        sensorsRef,
        (snapshot) => {
          const data = snapshot.val()

          if (!data) {
            return
          }

          if (data.temperature !== undefined) {
            const tempValue = Number(data.temperature)
            if (!isNaN(tempValue)) {
              setTemperature(tempValue)
            }
          }

          if (data.humidity !== undefined) {
            const humValue = Number(data.humidity)
            if (!isNaN(humValue)) {
              setHumidity(humValue)
            }
          }

          if (data.foodLevel !== undefined) {
            const foodValue = Number(data.foodLevel)
            if (!isNaN(foodValue)) {
              setFoodLevel(foodValue)
            }
          }

          if (data.waterLevelMain !== undefined) {
            const waterMainValue = Number(data.waterLevelMain)
            if (!isNaN(waterMainValue)) {
              setWaterLevelMain(waterMainValue)
            }
          }

          if (data.waterLevelDrinker !== undefined) {
            const waterDrinkerValue = Number(data.waterLevelDrinker)
            if (!isNaN(waterDrinkerValue)) {
              setWaterLevelDrinker(waterDrinkerValue)
            }
          }

          setLastDataRefresh(new Date())
        },
        (error) => {
          console.error("Firebase sensors data error:", error)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error("Error setting up sensors listener:", err)
    }
  }, [firebase])

  useEffect(() => {
    if (!firebase?.database) {
      return
    }

    try {
      const alertsRef = ref(firebase.database, "/alerts")

      const unsubscribe = onValue(
        alertsRef,
        (snapshot) => {
          const data = snapshot.val()

          if (!data) {
            return
          }

          setAlerts({
            highTemperature:
              data.highTemperature === true || data.highTemperature === "true" || data.highTemperature === 1,
            lowTemperature: data.lowTemperature === true || data.lowTemperature === "true" || data.lowTemperature === 1,
            lowFood: data.lowFood === true || data.lowFood === "true" || data.lowFood === 1,
            lowWaterMain: data.lowWaterMain === true || data.lowWaterMain === "true" || data.lowWaterMain === 1,
            lowWaterDrinker:
              data.lowWaterDrinker === true || data.lowWaterDrinker === "true" || data.lowWaterDrinker === 1,
            lowHydration: data.lowHydration === true || data.lowHydration === "true" || data.lowHydration === 1,
          })

          setLastDataRefresh(new Date())
        },
        (error) => {
          console.error("Firebase alerts error:", error)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error("Error setting up alerts listener:", err)
    }
  }, [firebase])

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

      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">Smart IoT-Based Poultry Farming Solution</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor and control your poultry farm in real-time</p>
            {lastDataRefresh && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Last updated: {lastDataRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="mt-4 md:mt-0 md:mx-auto">
            <ClockDisplay />
          </div>

          <div className="mt-4 md:mt-0 flex items-center">
            <div className="mr-4">
              <ThemeToggle />
            </div>
            <button
              onClick={refreshData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md mr-4 flex items-center"
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh Data
            </button>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md flex items-center"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CameraFeed />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative">
            <div
              className={`bg-gray-700 text-white p-4 ${alerts.highTemperature || alerts.lowTemperature ? "bg-red-600" : ""}`}
            >
              <h2 className="text-lg font-semibold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Temperature
              </h2>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold dark:text-white">
                {temperature !== null ? temperature.toFixed(1) : "--"}
              </div>
              <div className="text-gray-500 dark:text-gray-400">°C</div>
              <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${
                    temperature !== null
                      ? temperature > 32
                        ? "bg-red-500"
                        : temperature < 24
                          ? "bg-blue-500"
                          : "bg-green-500"
                      : "bg-gray-500"
                  }`}
                  style={{ width: `${temperature !== null ? Math.min(100, (temperature / 50) * 100) : 0}%` }}
                ></div>
              </div>
              {(alerts.highTemperature || alerts.lowTemperature) && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
                  {alerts.highTemperature ? "High temperature alert!" : "Low temperature alert!"}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-700 text-white p-4">
              <h2 className="text-lg font-semibold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Humidity
              </h2>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold dark:text-white">{humidity !== null ? humidity.toFixed(1) : "--"}</div>
              <div className="text-gray-500 dark:text-gray-400">%</div>
              <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-blue-500"
                  style={{ width: `${humidity !== null ? humidity : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative">
            <div className={`bg-gray-700 text-white p-4 ${alerts.lowFood ? "bg-red-600" : ""}`}>
              <h2 className="text-lg font-semibold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Food Level
              </h2>
            </div>
            <div className="p-4 text-center">
              <div className="text-4xl font-bold dark:text-white">{foodLevel !== null ? foodLevel : "--"}</div>
              <div className="text-gray-500 dark:text-gray-400">%</div>
              <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${foodLevel !== null && foodLevel < 20 ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${foodLevel !== null ? foodLevel : 0}%` }}
                ></div>
              </div>
              {alerts.lowFood && (
                <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">Low food level alert!</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative">
            <div
              className={`bg-gray-700 text-white p-4 ${alerts.lowWaterMain || alerts.lowWaterDrinker || alerts.lowHydration ? "bg-red-600" : ""}`}
            >
              <h2 className="text-lg font-semibold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                Water Levels
              </h2>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="dark:text-white">Main Tank</span>
                  <span className="dark:text-white">{waterLevelMain !== null ? waterLevelMain : "--"}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${waterLevelMain !== null && waterLevelMain < 20 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${waterLevelMain !== null ? waterLevelMain : 0}%` }}
                  ></div>
                </div>
                {alerts.lowWaterMain && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">Low water level alert!</div>
                )}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="dark:text-white">Drinker</span>
                  <span className="dark:text-white">{waterLevelDrinker !== null ? waterLevelDrinker : "--"}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${waterLevelDrinker !== null && waterLevelDrinker < 30 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{ width: `${waterLevelDrinker !== null ? waterLevelDrinker : 0}%` }}
                  ></div>
                </div>
                {alerts.lowWaterDrinker && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">
                    Low drinker water level alert!
                  </div>
                )}
                {alerts.lowHydration && (
                  <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                    Low hydration alert! Check water analytics.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <HistoricalChart />
      </div>

      <div className="mt-8">
        <RecentAlerts />
      </div>
    </div>
  )
}
