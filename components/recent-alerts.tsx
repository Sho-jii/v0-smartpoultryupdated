"use client"

import { useEffect, useState } from "react"
import { ref, onValue, remove, query, limitToLast, orderByChild } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Trash2, ChevronDown, ChevronUp } from "lucide-react"

interface AlertEvent {
  id: string
  timestamp: number
  type: string
  description: string
}

interface RecentAlertsProps {
  className?: string
}

export default function RecentAlerts({ className = "" }: RecentAlertsProps) {
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<AlertEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({})
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "all">("day")
  const [showAll, setShowAll] = useState(false)
  const MAX_VISIBLE_ITEMS = 15

  // Load alert events from Firebase
  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    try {
      // Use query to limit to last 100 events, ordered by timestamp
      const eventsRef = query(ref(firebase.database, "/events"), orderByChild("timestamp"), limitToLast(100))

      const unsubscribe = onValue(
        eventsRef,
        (snapshot) => {
          const events = snapshot.val()

          if (!events) {
            setAlertEvents([])
            setFilteredEvents([])
            setIsLoading(false)
            return
          }

          // Convert to array and sort by timestamp (newest first)
          const eventsArray = Object.entries(events)
            .map(([key, value]: [string, any]) => ({
              id: key,
              ...value,
              // Ensure timestamp is a number
              timestamp: typeof value.timestamp === "string" ? Number(value.timestamp) : value.timestamp,
            }))
            .sort((a, b) => b.timestamp - a.timestamp)

          setAlertEvents(eventsArray)
          applyTimeFilter(eventsArray, timeFilter)
          setIsLoading(false)
        },
        (error) => {
          console.error("Firebase events error:", error)
          setError(`Failed to fetch alerts: ${error.message}`)
          setIsLoading(false)
        },
      )

      return () => {
        unsubscribe()
      }
    } catch (err: any) {
      console.error("Error setting up events listener:", err)
      setError(`Error: ${err.message}`)
      setIsLoading(false)
    }
  }, [])

  // Apply time filter to events
  const applyTimeFilter = (events: AlertEvent[], filter: "day" | "week" | "month" | "all") => {
    if (filter === "all") {
      setFilteredEvents(events)
      return
    }

    const now = Math.floor(Date.now() / 1000)
    let cutoffTime: number

    switch (filter) {
      case "day":
        // Start of today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        cutoffTime = Math.floor(today.getTime() / 1000)
        break
      case "week":
        cutoffTime = now - 7 * 24 * 60 * 60 // 7 days ago
        break
      case "month":
        cutoffTime = now - 30 * 24 * 60 * 60 // 30 days ago
        break
      default:
        cutoffTime = 0
    }

    const filtered = events.filter((event) => event.timestamp >= cutoffTime)
    setFilteredEvents(filtered)
  }

  // Handle filter change
  const handleFilterChange = (filter: "day" | "week" | "month" | "all") => {
    setTimeFilter(filter)
    applyTimeFilter(alertEvents, filter)
  }

  // Delete an alert event
  const deleteAlert = async (id: string) => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      console.error("Firebase not initialized")
      return
    }

    try {
      setIsDeleting((prev) => ({ ...prev, [id]: true }))

      // Delete the event from Firebase
      await remove(ref(firebase.database, `/events/${id}`))

      // Update local state
      setAlertEvents((prev) => prev.filter((event) => event.id !== id))
      setFilteredEvents((prev) => prev.filter((event) => event.id !== id))
    } catch (error) {
      console.error("Error deleting alert:", error)
    } finally {
      setIsDeleting((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Toggle show all/less
  const toggleShowAll = () => {
    setShowAll(!showAll)
  }

  // Helper function to get description from event type
  const getDescriptionFromType = (event: AlertEvent) => {
    // Use the description from the event if available
    if (event.description) {
      return event.description
    }

    // Otherwise, generate a description based on the type
    switch (event.type) {
      case "highTemperature":
        return "Temperature exceeded safe threshold"
      case "lowTemperature":
        return "Temperature below safe threshold"
      case "lowFood":
        return "Food level is low"
      case "lowWaterMain":
        return "Main water tank level is low"
      case "lowWaterDrinker":
        return "Drinker water level is low"
      case "feeding":
        return "Automatic feeding activated"
      default:
        return "System event"
    }
  }

  // Helper function to get status badge class
  const getStatusBadgeClass = (type: string) => {
    switch (type) {
      case "highTemperature":
      case "lowTemperature":
      case "lowFood":
      case "lowWaterMain":
      case "lowWaterDrinker":
        return "bg-red-500"
      case "feeding":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Helper function to get status text
  const getStatusText = (type: string) => {
    switch (type) {
      case "highTemperature":
      case "lowTemperature":
      case "lowFood":
      case "lowWaterMain":
      case "lowWaterDrinker":
        return "Alert"
      case "feeding":
        return "Success"
      default:
        return "Info"
    }
  }

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // Get visible events based on showAll state
  const visibleEvents = showAll ? filteredEvents : filteredEvents.slice(0, MAX_VISIBLE_ITEMS)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4">
        <h2 className="text-lg font-semibold flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 mr-2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Recent Alerts & Events
        </h2>
      </div>

      {/* Filter controls */}
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
        <div className="flex space-x-2">
          <button
            onClick={() => handleFilterChange("day")}
            className={`px-2 py-1 text-xs rounded ${
              timeFilter === "day"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleFilterChange("week")}
            className={`px-2 py-1 text-xs rounded ${
              timeFilter === "week"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handleFilterChange("month")}
            className={`px-2 py-1 text-xs rounded ${
              timeFilter === "month"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-2 py-1 text-xs rounded ${
              timeFilter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"
            }`}
          >
            All
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-300">
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-4">{error}</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center p-4">No recent alerts or events</div>
        ) : (
          <div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
              {visibleEvents.map((event) => (
                <div key={event.id} className="py-3 flex items-start">
                  <div
                    className={`${getStatusBadgeClass(event.type)} text-white text-xs font-medium px-2 py-1 rounded-md mr-3 mt-0.5`}
                  >
                    {getStatusText(event.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{getDescriptionFromType(event)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(event.timestamp)}</div>
                  </div>
                  <button
                    onClick={() => deleteAlert(event.id)}
                    disabled={isDeleting[event.id]}
                    className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete alert"
                  >
                    {isDeleting[event.id] ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-gray-500 dark:border-gray-400"></div>
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Show more/less button */}
            {filteredEvents.length > MAX_VISIBLE_ITEMS && (
              <button
                onClick={toggleShowAll}
                className="mt-4 w-full py-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center"
              >
                {showAll ? (
                  <>
                    Show Less <ChevronUp size={16} className="ml-1" />
                  </>
                ) : (
                  <>
                    Show All ({filteredEvents.length}) <ChevronDown size={16} className="ml-1" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
