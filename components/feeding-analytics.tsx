"use client"

import { useEffect, useState, useRef } from "react"
import { ref, get } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Settings, RefreshCw, Calendar, ChevronRight } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js"
import { Bar } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

interface FeedingAnalyticsProps {
  className?: string
}

interface FeedingDataPoint {
  id?: string
  timestamp: number
  gramsDispensed: number
  chickenCount?: number
  ageGroup?: string
}

export default function FeedingAnalytics({ className = "" }: FeedingAnalyticsProps) {
  const [chartPeriod, setChartPeriod] = useState("day")
  const [comparisonMode, setComparisonMode] = useState<"none" | "previous">("none")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<FeedingDataPoint[]>([])
  const [comparisonData, setComparisonData] = useState<FeedingDataPoint[]>([])
  const chartRef = useRef<any>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: "Food Dispensed (g)",
        data: [],
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
    ],
  })
  const [totalFeedDispensed, setTotalFeedDispensed] = useState<number>(0)
  const [averageFeedPerDay, setAverageFeedPerDay] = useState<number>(0)

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains("dark")
      setIsDarkMode(isDark)
    }

    // Check on mount
    checkDarkMode()

    // Set up a mutation observer to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          mutation.target === document.documentElement
        ) {
          checkDarkMode()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => observer.disconnect()
  }, [])

  // Fetch feeding data
  const fetchFeedingData = async () => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    console.log(`Fetching feeding data for period: ${chartPeriod}`)

    try {
      // Fetch feeding data from Firebase
      const feedingRef = ref(firebase.database, "/feedingLogs")

      const snapshot = await get(feedingRef)
      const data = snapshot.val()

      if (!data) {
        setError("No feeding data found in Firebase")
        setIsLoading(false)
        return
      }

      console.log(`Raw feeding data received: ${typeof data}, keys: ${Object.keys(data).length}`)

      // Process the data
      processFeedingData(data)
    } catch (err: any) {
      console.error("Error fetching feeding data:", err)
      setError(`Error: ${err.message}`)
      setIsLoading(false)
    }
  }

  const processFeedingData = (data: any) => {
    try {
      // Convert to array and prepare for processing
      let dataArray: FeedingDataPoint[] = []

      if (typeof data === "object" && data !== null) {
        dataArray = Object.entries(data).map(([key, value]: [string, any]) => {
          return {
            id: key,
            timestamp: typeof value.timestamp === "string" ? Number(value.timestamp) : value.timestamp || 0,
            gramsDispensed:
              typeof value.gramsDispensed === "string" ? Number(value.gramsDispensed) : value.gramsDispensed || 0,
            chickenCount: value.chickenCount || 0,
            ageGroup: value.ageGroup || "adult",
          }
        })
      }

      console.log(`Processed ${dataArray.length} feeding data points`)

      // Filter invalid data points
      dataArray = dataArray.filter((point) => point.timestamp > 0 && point.gramsDispensed > 0)

      console.log(`After filtering: ${dataArray.length} valid feeding data points`)

      if (dataArray.length === 0) {
        setError("No valid feeding data points found")
        setIsLoading(false)
        return
      }

      // Sort by timestamp
      dataArray.sort((a, b) => a.timestamp - b.timestamp)

      // Calculate total feed dispensed for all time
      const totalFeed = dataArray.reduce((sum, point) => sum + point.gramsDispensed, 0)
      setTotalFeedDispensed(totalFeed)

      // Calculate average feed per day
      const firstDay = new Date(dataArray[0].timestamp * 1000).setHours(0, 0, 0, 0)
      const lastDay = new Date().setHours(23, 59, 59, 999)
      const daysDiff = Math.max(1, Math.ceil((lastDay - firstDay) / (1000 * 60 * 60 * 24)))
      setAverageFeedPerDay(totalFeed / daysDiff)

      // Filter by time period
      const now = Math.floor(Date.now() / 1000)
      let comparisonTimeRange: { start: number; end: number } = { start: 0, end: 0 }
      let currentTimeRange: { start: number; end: number } = { start: 0, end: 0 }

      switch (chartPeriod) {
        case "day":
          // Start of today (midnight)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const todayStart = Math.floor(today.getTime() / 1000)
          const todayEnd = now

          // Yesterday
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          yesterday.setHours(0, 0, 0, 0)
          const yesterdayStart = Math.floor(yesterday.getTime() / 1000)
          const yesterdayEnd = todayStart - 1

          currentTimeRange = { start: todayStart, end: todayEnd }
          comparisonTimeRange = { start: yesterdayStart, end: yesterdayEnd }
          break

        case "week":
          // Start of this week (Sunday)
          const thisWeekStart = new Date()
          thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
          thisWeekStart.setHours(0, 0, 0, 0)
          const thisWeekStartTime = Math.floor(thisWeekStart.getTime() / 1000)

          // Last week
          const lastWeekStart = new Date(thisWeekStart)
          lastWeekStart.setDate(lastWeekStart.getDate() - 7)
          const lastWeekStartTime = Math.floor(lastWeekStart.getTime() / 1000)
          const lastWeekEndTime = thisWeekStartTime - 1

          currentTimeRange = { start: thisWeekStartTime, end: now }
          comparisonTimeRange = { start: lastWeekStartTime, end: lastWeekEndTime }
          break

        case "month":
          // Start of this month
          const thisMonthStart = new Date()
          thisMonthStart.setDate(1)
          thisMonthStart.setHours(0, 0, 0, 0)
          const thisMonthStartTime = Math.floor(thisMonthStart.getTime() / 1000)

          // Last month
          const lastMonthStart = new Date(thisMonthStart)
          lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
          const lastMonthStartTime = Math.floor(lastMonthStart.getTime() / 1000)

          // End of last month
          const lastMonthEnd = new Date(thisMonthStart)
          lastMonthEnd.setSeconds(lastMonthEnd.getSeconds() - 1)
          const lastMonthEndTime = Math.floor(lastMonthEnd.getTime() / 1000)

          currentTimeRange = { start: thisMonthStartTime, end: now }
          comparisonTimeRange = { start: lastMonthStartTime, end: lastMonthEndTime }
          break

        default:
          currentTimeRange = { start: now - 24 * 60 * 60, end: now }
          comparisonTimeRange = { start: now - 2 * 24 * 60 * 60, end: now - 24 * 60 * 60 }
      }

      // Filter current period data
      const filteredData = dataArray.filter(
        (point) => point.timestamp >= currentTimeRange.start && point.timestamp <= currentTimeRange.end,
      )

      // Filter comparison period data
      const filteredComparisonData = dataArray.filter(
        (point) => point.timestamp >= comparisonTimeRange.start && point.timestamp <= comparisonTimeRange.end,
      )

      console.log(
        `Filtered by time period: ${filteredData.length} current data points, ${filteredComparisonData.length} comparison data points`,
      )

      // Store filtered data
      setCurrentData(filteredData)
      setComparisonData(filteredComparisonData)

      // Update chart data
      updateChartData(filteredData, filteredComparisonData)

      setIsLoading(false)
    } catch (err: any) {
      console.error("Error processing feeding data:", err)
      setError(`Error processing data: ${err.message}`)
      setIsLoading(false)
    }
  }

  // Update chart with visible data
  const updateChartData = (dataToShow: FeedingDataPoint[], compData: FeedingDataPoint[]) => {
    const labels: string[] = []
    const feedData: (number | null)[] = []
    const compFeedData: (number | null)[] = []

    // Process current period data
    if (chartPeriod === "day") {
      // For day view, group by hour
      const hourlyData: { [hour: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const hour = date.getHours()
        hourlyData[hour] = (hourlyData[hour] || 0) + point.gramsDispensed
      })

      // Fill in all hours
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = `${hour.toString().padStart(2, "0")}:00`
        labels.push(hourStr)
        feedData.push(hourlyData[hour] || 0)
      }

      // Process comparison data (yesterday)
      if (comparisonMode === "previous") {
        const compHourlyData: { [hour: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const hour = date.getHours()
          compHourlyData[hour] = (compHourlyData[hour] || 0) + point.gramsDispensed
        })

        // Fill in all hours for comparison
        for (let hour = 0; hour < 24; hour++) {
          compFeedData.push(compHourlyData[hour] || 0)
        }
      }
    } else if (chartPeriod === "week") {
      // For week view, group by day
      const dailyData: { [day: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const day = date.getDay() // 0-6, where 0 is Sunday
        dailyData[day] = (dailyData[day] || 0) + point.gramsDispensed
      })

      // Fill in all days
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      for (let day = 0; day < 7; day++) {
        labels.push(dayNames[day])
        feedData.push(dailyData[day] || 0)
      }

      // Process comparison data (last week)
      if (comparisonMode === "previous") {
        const compDailyData: { [day: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const day = date.getDay()
          compDailyData[day] = (compDailyData[day] || 0) + point.gramsDispensed
        })

        // Fill in all days for comparison
        for (let day = 0; day < 7; day++) {
          compFeedData.push(compDailyData[day] || 0)
        }
      }
    } else if (chartPeriod === "month") {
      // For month view, group by date
      const monthlyData: { [date: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const day = date.getDate() // 1-31
        monthlyData[day] = (monthlyData[day] || 0) + point.gramsDispensed
      })

      // Get current month and year
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

      // Fill in all dates
      for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day.toString())
        feedData.push(monthlyData[day] || 0)
      }

      // Process comparison data (last month)
      if (comparisonMode === "previous") {
        const compMonthlyData: { [date: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const day = date.getDate()
          compMonthlyData[day] = (compMonthlyData[day] || 0) + point.gramsDispensed
        })

        // Get last month's days
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate()

        // Fill in all dates for comparison (up to current day)
        for (let day = 1; day <= daysInMonth; day++) {
          if (day <= daysInLastMonth) {
            compFeedData.push(compMonthlyData[day] || 0)
          } else {
            compFeedData.push(null) // No data for days that don't exist in last month
          }
        }
      }
    }

    // Update chart data
    const datasets = [
      {
        label: "Food Dispensed (g)",
        data: feedData,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
    ]

    // Add comparison dataset if needed
    if (comparisonMode === "previous") {
      datasets.push({
        label: getPreviousPeriodLabel(),
        data: compFeedData,
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        tension: 0.4,
      })
    }

    setChartData({
      labels,
      datasets,
    })
  }

  // Get label for previous period
  const getPreviousPeriodLabel = (): string => {
    switch (chartPeriod) {
      case "day":
        return "Yesterday"
      case "week":
        return "Last Week"
      case "month":
        return "Last Month"
      default:
        return "Previous Period"
    }
  }

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setChartPeriod(period)
    fetchFeedingData() // Refetch data for new period
  }

  // Toggle comparison mode
  const toggleComparisonMode = () => {
    const newMode = comparisonMode === "none" ? "previous" : "none"
    setComparisonMode(newMode)
    updateChartData(currentData, comparisonData)
  }

  // Initial data load and setup auto-refresh
  useEffect(() => {
    fetchFeedingData()

    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      fetchFeedingData()
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(refreshInterval)
  }, [chartPeriod, comparisonMode])

  // Get chart options based on current theme
  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
          },
          title: {
            display: true,
            text: "Grams",
            color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
          },
          grid: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          backgroundColor: isDarkMode ? "rgba(50, 50, 50, 0.8)" : "rgba(255, 255, 255, 0.8)",
          titleColor: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
          bodyColor: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
          borderColor: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || ""
              if (label) {
                label += ": "
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y + "g"
              }
              return label
            },
          },
        },
      },
    }
  }

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Settings className="mr-2" /> Food Dispensing Analytics
        </h2>
        <div className="flex items-center">
          <div className="flex mr-2">
            <button
              className={`px-3 py-1 text-sm rounded-l-md ${
                chartPeriod === "day" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"
              }`}
              onClick={() => handlePeriodChange("day")}
            >
              Day
            </button>
            <button
              className={`px-3 py-1 text-sm ${
                chartPeriod === "week" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"
              }`}
              onClick={() => handlePeriodChange("week")}
            >
              Week
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-r-md ${
                chartPeriod === "month" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"
              }`}
              onClick={() => handlePeriodChange("month")}
            >
              Month
            </button>
          </div>
          <button
            onClick={toggleComparisonMode}
            className={`px-3 py-1 text-sm rounded-md mr-2 ${
              comparisonMode !== "none" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"
            }`}
            title="Compare with previous period"
          >
            <Calendar size={16} className="inline-block mr-1" />
            Compare
          </button>
          <button
            onClick={() => fetchFeedingData()}
            className="p-1 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800">
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-80">
            <div className="text-red-500 mb-2">{error}</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-md mb-4">
              Make sure your system is sending feeding data to the /feedingLogs path in Firebase. The data should
              include timestamp, gramsDispensed, chickenCount, and ageGroup fields.
            </p>
            <button
              onClick={() => fetchFeedingData()}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="h-80 bg-white dark:bg-gray-800">
              <Bar ref={chartRef} data={chartData} options={getChartOptions()} />
            </div>

            {/* Summary statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Feed Dispensed</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(totalFeedDispensed)}g
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(totalFeedDispensed / 1000).toFixed(2)}kg total since tracking began
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Average Daily Feed</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(averageFeedPerDay)}g
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(averageFeedPerDay / 1000).toFixed(2)}kg per day on average
                </p>
              </div>
            </div>

            {/* View options at the bottom */}
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">View Data By Period</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePeriodChange("day")}
                  className={`flex items-center px-4 py-2 rounded-md text-sm ${
                    chartPeriod === "day"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  Today's Data
                  <ChevronRight size={16} className="ml-1" />
                </button>
                <button
                  onClick={() => handlePeriodChange("week")}
                  className={`flex items-center px-4 py-2 rounded-md text-sm ${
                    chartPeriod === "week"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  This Week
                  <ChevronRight size={16} className="ml-1" />
                </button>
                <button
                  onClick={() => handlePeriodChange("month")}
                  className={`flex items-center px-4 py-2 rounded-md text-sm ${
                    chartPeriod === "month"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  This Month
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
