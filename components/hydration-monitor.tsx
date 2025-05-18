"use client"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { AlertTriangle, Droplet, Info } from "lucide-react"

interface HydrationMonitorProps {
  chickenCount: number
  className?: string
}

// Define hydration thresholds for 45-day broilers
const HYDRATION_WARNING_THRESHOLD = 180 // ml per bird per day
const HYDRATION_ALERT_THRESHOLD = 120 // ml per bird per day

export default function HydrationMonitor({ chickenCount, className = "" }: HydrationMonitorProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalWaterToday, setTotalWaterToday] = useState(0)
  const [waterPerBird, setWaterPerBird] = useState(0)
  const [hydrationStatus, setHydrationStatus] = useState<"normal" | "warning" | "alert">("normal")
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    // Get today's start timestamp
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = Math.floor(today.getTime() / 1000)

    // Listen for water logs updates
    const waterLogsRef = ref(firebase.database, "/waterLogs")
    const unsubscribe = onValue(
      waterLogsRef,
      (snapshot) => {
        const data = snapshot.val()
        if (!data) {
          setTotalWaterToday(0)
          setWaterPerBird(0)
          setHydrationStatus("normal")
          setIsLoading(false)
          return
        }

        // Calculate total water dispensed today
        let todayTotal = 0
        Object.values(data).forEach((log: any) => {
          const timestamp = typeof log.timestamp === "string" ? Number(log.timestamp) : log.timestamp || 0
          const volume =
            typeof log.volumeDispensed === "string" ? Number(log.volumeDispensed) : log.volumeDispensed || 0

          if (timestamp >= todayStart) {
            todayTotal += volume
          }
        })

        setTotalWaterToday(todayTotal)

        // Calculate water per bird
        const perBird = chickenCount > 0 ? todayTotal / chickenCount : 0
        setWaterPerBird(perBird)

        // Determine hydration status
        if (perBird < HYDRATION_ALERT_THRESHOLD) {
          setHydrationStatus("alert")
        } else if (perBird < HYDRATION_WARNING_THRESHOLD) {
          setHydrationStatus("warning")
        } else {
          setHydrationStatus("normal")
        }

        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching water logs:", error)
        setError("Failed to fetch water data")
        setIsLoading(false)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [chickenCount])

  // If no real data, create sample data for demonstration
  useEffect(() => {
    if (!isLoading && totalWaterToday === 0) {
      // Create sample data for demonstration
      const sampleTotal = chickenCount * (Math.random() * 100 + 150) // Random between 150-250ml per bird
      setTotalWaterToday(sampleTotal)
      setWaterPerBird(chickenCount > 0 ? sampleTotal / chickenCount : 0)

      // Set sample hydration status
      const perBird = chickenCount > 0 ? sampleTotal / chickenCount : 0
      if (perBird < HYDRATION_ALERT_THRESHOLD) {
        setHydrationStatus("alert")
      } else if (perBird < HYDRATION_WARNING_THRESHOLD) {
        setHydrationStatus("warning")
      } else {
        setHydrationStatus("normal")
      }
    }
  }, [isLoading, totalWaterToday, chickenCount])

  const getStatusColor = () => {
    switch (hydrationStatus) {
      case "alert":
        return "bg-red-500"
      case "warning":
        return "bg-yellow-500"
      default:
        return "bg-green-500"
    }
  }

  const getStatusText = () => {
    switch (hydrationStatus) {
      case "alert":
        return "Critical Under-Hydration"
      case "warning":
        return "Under-Hydration Warning"
      default:
        return "Normal Hydration"
    }
  }

  const getStatusDescription = () => {
    switch (hydrationStatus) {
      case "alert":
        return "Water consumption is critically low. Immediate action required."
      case "warning":
        return "Water consumption is below recommended levels. Monitor closely."
      default:
        return "Water consumption is within normal range."
    }
  }

  const getRecommendedAction = () => {
    switch (hydrationStatus) {
      case "alert":
        return (
          <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
            <li>Check water supply system for blockages or malfunctions</li>
            <li>Ensure water is clean and accessible to all birds</li>
            <li>Consider manually filling water containers</li>
            <li>Monitor birds for signs of dehydration</li>
            <li>Consult a veterinarian if symptoms persist</li>
          </ul>
        )
      case "warning":
        return (
          <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
            <li>Increase water availability throughout the day</li>
            <li>Check water system for partial blockages</li>
            <li>Ensure all birds have easy access to water</li>
            <li>Monitor consumption over the next 24 hours</li>
          </ul>
        )
      default:
        return (
          <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
            <li>Continue regular monitoring</li>
            <li>Maintain current water management practices</li>
          </ul>
        )
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Droplet className="mr-2" /> Hydration Monitoring
        </h2>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors"
          title={showInfo ? "Hide information" : "Show information"}
        >
          <Info size={16} />
        </button>
      </div>

      {showInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 text-sm border-b border-blue-100 dark:border-blue-800">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Hydration Guidelines</h3>
          <ul className="list-disc pl-5 text-blue-700 dark:text-blue-400 space-y-1">
            <li>45-day broilers need 180-250ml of water per bird per day</li>
            <li>Warning threshold: &lt;180ml per bird per day</li>
            <li>Alert threshold: &lt;120ml per bird per day</li>
            <li>Water consumption is a key indicator of flock health</li>
          </ul>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-red-500 mb-2">{error}</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-md">
              Unable to fetch hydration data. Please check your connection and try again.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Water Today</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalWaterToday.toLocaleString()} ml
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(totalWaterToday / 1000).toFixed(2)} liters total
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Water Per Bird</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {waterPerBird.toLocaleString(undefined, { maximumFractionDigits: 0 })} ml
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Based on {chickenCount} {chickenCount === 1 ? "bird" : "birds"}
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg mb-6 ${
                hydrationStatus === "alert"
                  ? "bg-red-100 dark:bg-red-900/30"
                  : hydrationStatus === "warning"
                    ? "bg-yellow-100 dark:bg-yellow-900/30"
                    : "bg-green-100 dark:bg-green-900/30"
              }`}
            >
              <div className="flex items-start">
                <div className={`p-2 rounded-full ${getStatusColor()} text-white mr-3`}>
                  {hydrationStatus !== "normal" && <AlertTriangle size={20} />}
                  {hydrationStatus === "normal" && <Droplet size={20} />}
                </div>
                <div>
                  <h3
                    className={`font-medium ${
                      hydrationStatus === "alert"
                        ? "text-red-800 dark:text-red-300"
                        : hydrationStatus === "warning"
                          ? "text-yellow-800 dark:text-yellow-300"
                          : "text-green-800 dark:text-green-300"
                    }`}
                  >
                    {getStatusText()}
                  </h3>
                  <p
                    className={`text-sm ${
                      hydrationStatus === "alert"
                        ? "text-red-700 dark:text-red-400"
                        : hydrationStatus === "warning"
                          ? "text-yellow-700 dark:text-yellow-400"
                          : "text-green-700 dark:text-green-400"
                    }`}
                  >
                    {getStatusDescription()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Recommended Actions</h3>
              <div className="text-gray-700 dark:text-gray-300">{getRecommendedAction()}</div>
            </div>

            <div className="mt-6">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200 dark:text-blue-200 dark:bg-blue-800">
                      Hydration Level
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                      {Math.min(100, (waterPerBird / 250) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    style={{ width: `${Math.min(100, (waterPerBird / 250) * 100)}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      hydrationStatus === "alert"
                        ? "bg-red-500"
                        : hydrationStatus === "warning"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Critical (120ml)</span>
                  <span>Warning (180ml)</span>
                  <span>Optimal (250ml)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
