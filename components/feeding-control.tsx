"use client"

import { useState, useEffect } from "react"
import { ref, set, get, push, onValue } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Utensils, Info, ChevronDown, ChevronUp } from "lucide-react"

interface FeedingControlProps {
  className?: string
}

// Define feeding rates based on age
const FEEDING_RATES = {
  chick: 50, // 50g per chick per day
  grower: 100, // 100g per grower per day
  adult: 150, // 150g per adult per day
}

// Define servo open time conversion
// 1 second = 50g of feed
const SERVO_OPEN_TIME_PER_GRAM = 0.02 // 0.02 seconds per gram (50g per second)

export default function FeedingControl({ className = "" }: FeedingControlProps) {
  const [ageGroup, setAgeGroup] = useState<"chick" | "grower" | "adult">("adult")
  const [chickenCount, setChickenCount] = useState<number>(10)
  const [customGrams, setCustomGrams] = useState<number | "">("")
  const [isFeeding, setIsFeeding] = useState(false)
  const [feedingError, setFeedingError] = useState<string | null>(null)
  const [feedingSuccess, setFeedingSuccess] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [lastFeedingData, setLastFeedingData] = useState<{
    timestamp: number
    gramsDispensed: number
    ageGroup: string
    chickenCount: number
  } | null>(null)
  const [deviceFeedingState, setDeviceFeedingState] = useState(false)
  const [feedingSchedule, setFeedingSchedule] = useState<{ [key: string]: boolean }>({})

  // Load last feeding settings from Firebase and monitor feeding state
  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      // Get last feeding settings
      const settingsRef = ref(firebase.database, "/feedingSettings")
      get(settingsRef)
        .then((snapshot) => {
          const settings = snapshot.val()
          if (settings) {
            if (settings.ageGroup) {
              setAgeGroup(settings.ageGroup)
            }
            if (settings.chickenCount) {
              setChickenCount(settings.chickenCount)
            }
          }
        })
        .catch((error) => {
          console.error("Error loading feeding settings:", error)
        })

      // Get last feeding data
      const logsRef = ref(firebase.database, "/feedingLogs")
      get(logsRef)
        .then((snapshot) => {
          const logs = snapshot.val()
          if (logs) {
            // Find the most recent log
            const logEntries = Object.entries(logs).map(([key, value]: [string, any]) => ({
              id: key,
              ...value,
              timestamp: typeof value.timestamp === "string" ? Number(value.timestamp) : value.timestamp || 0,
            }))

            if (logEntries.length > 0) {
              // Sort by timestamp (newest first)
              logEntries.sort((a, b) => b.timestamp - a.timestamp)
              setLastFeedingData(logEntries[0])
            }
          }
        })
        .catch((error) => {
          console.error("Error loading feeding logs:", error)
        })

      // Monitor device feeding state
      const feedStateRef = ref(firebase.database, "/controls/feed")
      const unsubscribe = onValue(feedStateRef, (snapshot) => {
        const feedState = snapshot.val()
        setDeviceFeedingState(feedState === true)
      })

      // Monitor isFeeding state from device
      const deviceFeedingRef = ref(firebase.database, "/deviceStates/isFeeding")
      const unsubscribeDeviceFeeding = onValue(deviceFeedingRef, (snapshot) => {
        const deviceFeeding = snapshot.val()
        if (deviceFeeding === false && isFeeding) {
          // Device has finished feeding, reset our state
          setTimeout(() => {
            setIsFeeding(false)
            console.log("Device finished feeding, resetting state")
          }, 1000)
        }
      })

      // Load feeding schedule
      const scheduleRef = ref(firebase.database, "/feedingSchedule")
      const unsubscribeSchedule = onValue(scheduleRef, (snapshot) => {
        const schedule = snapshot.val()
        if (schedule) {
          setFeedingSchedule(schedule)
        }
      })

      return () => {
        unsubscribe()
        unsubscribeDeviceFeeding()
        unsubscribeSchedule()
      }
    } catch (error) {
      console.error("Error setting up Firebase listeners:", error)
    }
  }, [isFeeding])

  // Calculate recommended grams based on age and count
  const calculateRecommendedGrams = (): number => {
    return FEEDING_RATES[ageGroup] * chickenCount
  }

  // Calculate servo open time based on grams
  const calculateServoOpenTime = (grams: number): number => {
    return grams * SERVO_OPEN_TIME_PER_GRAM
  }

  // Reset feed control in Firebase
  const resetFeedControl = async () => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    try {
      await set(ref(firebase.database, "/controls/feed"), false)
      console.log("Feed control reset to false")
    } catch (error) {
      console.error("Error resetting feed control:", error)
    }
  }

  // Handle feeding action
  const handleFeed = async (useRecommended = true) => {
    setFeedingError(null)
    setFeedingSuccess(null)

    const firebase = initFirebase()
    if (!firebase?.database) {
      setFeedingError("Firebase not initialized")
      return
    }

    try {
      // Check if device is already feeding
      if (deviceFeedingState) {
        setFeedingError("The feeder is currently active. Please wait for it to complete.")
        return
      }

      // Check if we're already in a feeding state
      if (isFeeding) {
        setFeedingError("A feeding operation is already in progress. Please wait.")
        return
      }

      // Set feeding state
      setIsFeeding(true)

      // First, ensure feed control is reset
      await resetFeedControl()

      // Wait a moment to ensure the reset is processed
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Determine grams to dispense - use EITHER recommended OR custom amount, not both
      let gramsToDispense = 0
      if (useRecommended) {
        gramsToDispense = calculateRecommendedGrams()
        console.log(`Using recommended amount: ${gramsToDispense}g`)
      } else {
        gramsToDispense = typeof customGrams === "number" ? customGrams : 0
        console.log(`Using custom amount: ${gramsToDispense}g`)
      }

      if (gramsToDispense <= 0) {
        setFeedingError("Please enter a valid amount of feed")
        setIsFeeding(false)
        return
      }

      // Calculate servo open time
      const servoOpenTime = calculateServoOpenTime(gramsToDispense)
      console.log(`Feeding with ${gramsToDispense}g (${servoOpenTime}s)`)

      // Save current settings
      await set(ref(firebase.database, "/feedingSettings"), {
        ageGroup,
        chickenCount,
        lastFeedTime: Math.floor(Date.now() / 1000),
      })

      // Set feed duration first
      await set(ref(firebase.database, "/controls/feedDuration"), servoOpenTime)

      // Wait a moment to ensure the duration is set
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Log feeding event directly to ensure it appears in the events feed
      const eventRef = ref(firebase.database, `/events/${Math.floor(Date.now() / 1000)}`)
      await set(eventRef, {
        timestamp: Math.floor(Date.now() / 1000),
        type: "feeding",
        description: `Dispensed ${gramsToDispense}g of feed for ${chickenCount} ${ageGroup} chickens (${useRecommended ? "recommended" : "custom"} amount)`,
      })

      // Log feeding data for analytics
      const feedingLogRef = push(ref(firebase.database, "/feedingLogs"))
      await set(feedingLogRef, {
        timestamp: Math.floor(Date.now() / 1000),
        gramsDispensed: gramsToDispense,
        ageGroup,
        chickenCount,
        servoOpenTime,
        feedType: useRecommended ? "recommended" : "custom",
      })

      // Update last feeding data
      setLastFeedingData({
        timestamp: Math.floor(Date.now() / 1000),
        gramsDispensed: gramsToDispense,
        ageGroup,
        chickenCount,
      })

      // Now trigger the feeding
      await set(ref(firebase.database, "/controls/feed"), true)
      console.log("Feed command sent to device")

      // Show success message
      setFeedingSuccess(`Successfully dispensed ${gramsToDispense}g of feed`)

      // Set a timeout to reset the feed control after the expected feeding duration plus a buffer
      const resetTimeout = servoOpenTime * 1000 + 5000 // Convert to ms and add 5s buffer
      setTimeout(() => {
        resetFeedControl()
        // Also reset our feeding state after a delay
        setTimeout(() => {
          setIsFeeding(false)
        }, 1000)
      }, resetTimeout)
    } catch (error: any) {
      console.error("Error triggering feed:", error)
      setFeedingError(`Error: ${error.message}`)
      setIsFeeding(false)
      // Try to reset feed control in case of error
      resetFeedControl()
    }
  }

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Utensils className="mr-2" /> Intelligent Feeding Control
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
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Feeding Guidelines</h3>
          <ul className="list-disc pl-5 text-blue-700 dark:text-blue-400 space-y-1">
            <li>Chicks (0-8 weeks): {FEEDING_RATES.chick}g per bird per day</li>
            <li>Growers (8-20 weeks): {FEEDING_RATES.grower}g per bird per day</li>
            <li>Adults (20+ weeks): {FEEDING_RATES.adult}g per bird per day</li>
            <li>Servo calibration: 1 second open time ≈ 50g of feed</li>
          </ul>
        </div>
      )}

      <div className="p-4">
        {/* Last feeding info */}
        {lastFeedingData && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Last Feeding</h3>
            <div className="text-gray-600 dark:text-gray-400 mt-1">
              <p>{formatTimestamp(lastFeedingData.timestamp)}</p>
              <p>
                {lastFeedingData.gramsDispensed}g for {lastFeedingData.chickenCount} {lastFeedingData.ageGroup} chickens
              </p>
            </div>
          </div>
        )}

        {/* Age group selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chicken Age Group</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`py-2 px-4 rounded-md text-sm ${
                ageGroup === "chick"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setAgeGroup("chick")}
            >
              Chicks
              <br />
              (0-8 weeks)
            </button>
            <button
              className={`py-2 px-4 rounded-md text-sm ${
                ageGroup === "grower"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setAgeGroup("grower")}
            >
              Growers
              <br />
              (8-20 weeks)
            </button>
            <button
              className={`py-2 px-4 rounded-md text-sm ${
                ageGroup === "adult"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
              }`}
              onClick={() => setAgeGroup("adult")}
            >
              Adults
              <br />
              (20+ weeks)
            </button>
          </div>
        </div>

        {/* Chicken count */}
        <div className="mb-4">
          <label htmlFor="chickenCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Number of Chickens
          </label>
          <div className="flex items-center">
            <button
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-l-md"
              onClick={() => setChickenCount(Math.max(1, chickenCount - 1))}
              disabled={chickenCount <= 1}
            >
              <ChevronDown size={16} />
            </button>
            <input
              type="number"
              id="chickenCount"
              min="1"
              value={chickenCount}
              onChange={(e) => setChickenCount(Math.max(1, Number.parseInt(e.target.value) || 1))}
              className="w-full text-center py-2 border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <button
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-r-md"
              onClick={() => setChickenCount(chickenCount + 1)}
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>

        {/* Recommended amount */}
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Recommended Amount</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {calculateRecommendedGrams()}g
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Based on {FEEDING_RATES[ageGroup]}g per {ageGroup} chicken
              </p>
            </div>
            <button
              onClick={() => handleFeed(true)}
              disabled={isFeeding || deviceFeedingState}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFeeding || deviceFeedingState ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Feeding...
                </>
              ) : (
                <>
                  <Utensils className="mr-2" size={16} /> Feed Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label htmlFor="customGrams" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Custom Amount (grams)
          </label>
          <div className="flex">
            <input
              type="number"
              id="customGrams"
              min="1"
              value={customGrams}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Math.max(1, Number.parseInt(e.target.value) || 0)
                setCustomGrams(val)
              }}
              placeholder="Enter grams..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <button
              onClick={() => handleFeed(false)}
              disabled={
                isFeeding ||
                deviceFeedingState ||
                customGrams === "" ||
                (typeof customGrams === "number" && customGrams <= 0)
              }
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFeeding || deviceFeedingState ? "Dispensing..." : "Dispense"}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Servo will open for {calculateServoOpenTime(typeof customGrams === "number" ? customGrams : 0).toFixed(2)}{" "}
            seconds
          </p>
        </div>

        {/* Error/Success messages */}
        {feedingError && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {feedingError}
          </div>
        )}

        {feedingSuccess && (
          <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-sm">
            {feedingSuccess}
          </div>
        )}

        {/* Reset button for emergency use */}
        <div className="mt-4 text-center">
          <button
            onClick={resetFeedControl}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          >
            Reset Feeder (Emergency Use Only)
          </button>
        </div>
      </div>
    </div>
  )
}
