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

interface WaterUsageAnalyticsProps {
  className?: string
}

interface WaterDataPoint {
  id?: string
  timestamp: number
  volumeDispensed: number
  durationSeconds?: number
}

export default function WaterUsageAnalytics({ className = "" }: WaterUsageAnalyticsProps) {
  const [chartPeriod, setChartPeriod] = useState("day")
  const [comparisonMode, setComparisonMode] = useState<"none" | "previous">("none")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentData, setCurrentData] = useState<WaterDataPoint[]>([])
  const [comparisonData, setComparisonData] = useState<WaterDataPoint[]>([])
  const chartRef = useRef<any>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: "Water Dispensed (ml)",
        data: [],
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ],
  })
  const [totalWaterDispensed, setTotalWaterDispensed] = useState<number>(0)
  const [averageWaterPerDay, setAverageWaterPerDay] = useState<number>(0)
  const [peakUsageTime, setPeakUsageTime] = useState<string>("--")

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

  // Fetch water usage data
  const fetchWaterData = async () => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    console.log(`Fetching water data for period: ${chartPeriod}`)

    try {
      // Fetch water data from Firebase
      const waterRef = ref(firebase.database, "/waterLogs")

      const snapshot = await get(waterRef)
      const data = snapshot.val()

      if (!data) {
        setError("No water usage data found in Firebase")
        setIsLoading(false)
        return
      }

      console.log(`Raw water data received: ${typeof data}, keys: ${Object.keys(data).length}`)

      // Process the data
      processWaterData(data)
    } catch (err: any) {
      console.error("Error fetching water data:", err)
      setError(`Error: ${err.message}`)
      setIsLoading(false)
    }
  }

  const processWaterData = (data: any) => {
    try {
      // Convert to array and prepare for processing
      let dataArray: WaterDataPoint[] = []

      if (typeof data === "object" && data !== null) {
        dataArray = Object.entries(data).map(([key, value]: [string, any]) => {
          return {
            id: key,
            timestamp: typeof value.timestamp === "string" ? Number(value.timestamp) : value.timestamp || 0,
            volumeDispensed:
              typeof value.volumeDispensed === "string" ? Number(value.volumeDispensed) : value.volumeDispensed || 0,
            durationSeconds: value.durationSeconds || 0,
          }
        })
      }

      console.log(`Processed ${dataArray.length} water data points`)

      // Filter invalid data points
      dataArray = dataArray.filter((point) => point.timestamp > 0 && point.volumeDispensed > 0)

      console.log(`After filtering: ${dataArray.length} valid water data points`)

      if (dataArray.length === 0) {
        // Create sample data for demonstration if no data exists
        const now = Math.floor(Date.now() / 1000)
        for (let i = 0; i < 24; i++) {
          const hourAgo = now - (24 - i) * 3600
          const volume = Math.floor(Math.random() * 2000) + 1000 // Random between 1000-3000ml
          dataArray.push({
            timestamp: hourAgo,
            volumeDispensed: volume,
            durationSeconds: volume / 100, // Assuming 100ml/s flow rate
          })
        }
        console.log("Created sample water data for demonstration")
      }

      // Sort by timestamp
      dataArray.sort((a, b) => a.timestamp - b.timestamp)

      // Calculate total water dispensed for all time
      const totalWater = dataArray.reduce((sum, point) => sum + point.volumeDispensed, 0)
      setTotalWaterDispensed(totalWater)

      // Calculate average water per day
      const firstDay = new Date(dataArray[0].timestamp * 1000).setHours(0, 0, 0, 0)
      const lastDay = new Date().setHours(23, 59, 59, 999)
      const daysDiff = Math.max(1, Math.ceil((lastDay - firstDay) / (1000 * 60 * 60 * 24)))
      setAverageWaterPerDay(totalWater / daysDiff)

      // Find peak usage time
      const hourlyUsage: { [hour: number]: number } = {}
      dataArray.forEach((point) => {
        const hour = new Date(point.timestamp * 1000).getHours()
        hourlyUsage[hour] = (hourlyUsage[hour] || 0) + point.volumeDispensed
      })

      let peakHour = 0
      let peakVolume = 0
      Object.entries(hourlyUsage).forEach(([hour, volume]) => {
        if (volume > peakVolume) {
          peakHour = Number.parseInt(hour)
          peakVolume = volume
        }
      })

      setPeakUsageTime(`${peakHour.toString().padStart(2, "0")}:00 - ${(peakHour + 1).toString().padStart(2, "0")}:00`)

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
      console.error("Error processing water data:", err)
      setError(`Error processing data: ${err.message}`)
      setIsLoading(false)
    }
  }

  // Update chart with visible data
  const updateChartData = (dataToShow: WaterDataPoint[], compData: WaterDataPoint[]) => {
    const labels: string[] = []
    const waterData: (number | null)[] = []
    const compWaterData: (number | null)[] = []

    // Process current period data
    if (chartPeriod === "day") {
      // For day view, group by hour
      const hourlyData: { [hour: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const hour = date.getHours()
        hourlyData[hour] = (hourlyData[hour] || 0) + point.volumeDispensed
      })

      // Fill in all hours
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = `${hour.toString().padStart(2, "0")}:00`
        labels.push(hourStr)
        waterData.push(hourlyData[hour] || 0)
      }

      // Process comparison data (yesterday)
      if (comparisonMode === "previous") {
        const compHourlyData: { [hour: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const hour = date.getHours()
          compHourlyData[hour] = (compHourlyData[hour] || 0) + point.volumeDispensed
        })

        // Fill in all hours for comparison
        for (let hour = 0; hour < 24; hour++) {
          compWaterData.push(compHourlyData[hour] || 0)
        }
      }
    } else if (chartPeriod === "week") {
      // For week view, group by day
      const dailyData: { [day: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const day = date.getDay() // 0-6, where 0 is Sunday
        dailyData[day] = (dailyData[day] || 0) + point.volumeDispensed
      })

      // Fill in all days
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      for (let day = 0; day < 7; day++) {
        labels.push(dayNames[day])
        waterData.push(dailyData[day] || 0)
      }

      // Process comparison data (last week)
      if (comparisonMode === "previous") {
        const compDailyData: { [day: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const day = date.getDay()
          compDailyData[day] = (compDailyData[day] || 0) + point.volumeDispensed
        })

        // Fill in all days for comparison
        for (let day = 0; day < 7; day++) {
          compWaterData.push(compDailyData[day] || 0)
        }
      }
    } else if (chartPeriod === "month") {
      // For month view, group by date
      const monthlyData: { [date: number]: number } = {}

      dataToShow.forEach((point) => {
        const date = new Date(point.timestamp * 1000)
        const day = date.getDate() // 1-31
        monthlyData[day] = (monthlyData[day] || 0) + point.volumeDispensed
      })

      // Get current month and year
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

      // Fill in all dates
      for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day.toString())
        waterData.push(monthlyData[day] || 0)
      }

      // Process comparison data (last month)
      if (comparisonMode === "previous") {
        const compMonthlyData: { [date: number]: number } = {}

        compData.forEach((point) => {
          const date = new Date(point.timestamp * 1000)
          const day = date.getDate()
          compMonthlyData[day] = (compMonthlyData[day] || 0) + point.volumeDispensed
        })

        // Get last month's days
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate()

        // Fill in all dates for comparison (up to current day)
        for (let day = 1; day <= daysInMonth; day++) {
          if (day <= daysInLastMonth) {
            compWaterData.push(compMonthlyData[day] || 0)
          } else {
            compWaterData.push(null) // No data for days that don't exist in last month
          }
        }
      }
    }

    // Update chart data
    const datasets = [
      {
        label: "Water Dispensed (ml)",
        data: waterData,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ]

    // Add comparison dataset if needed
    if (comparisonMode === "previous") {
      datasets.push({
        label: getPreviousPeriodLabel(),
        data: compWaterData,
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
    fetchWaterData() // Refetch data for new period
  }

  // Toggle comparison mode
  const toggleComparisonMode = () => {
    const newMode = comparisonMode === "none" ? "previous" : "none"
    setComparisonMode(newMode)
    updateChartData(currentData, comparisonData)
  }

  // Initial data load and setup auto-refresh
  useEffect(() => {
    fetchWaterData()

    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      fetchWaterData()
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
            text: "Milliliters (ml)",
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
                label += context.parsed.y + "ml"
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
          <Settings className="mr-2" /> Water Usage Analytics
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
            onClick={() => fetchWaterData()}
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
              Make sure your system is sending water data to the /waterLogs path in Firebase. The data should include
              timestamp, volumeDispensed, and durationSeconds fields.
            </p>
            <button
              onClick={() => fetchWaterData()}
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
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Water Dispensed</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(totalWaterDispensed)}ml
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(totalWaterDispensed / 1000).toFixed(2)}L total since tracking began
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Average Daily Usage</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(averageWaterPerDay)}ml
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(averageWaterPerDay / 1000).toFixed(2)}L per day on average
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peak Usage Time</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{peakUsageTime}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Highest water consumption period</p>
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
