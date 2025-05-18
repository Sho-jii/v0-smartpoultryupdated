"use client"

import { useEffect, useState, useRef } from "react"
import { ref, get } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Settings, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line } from "react-chartjs-2"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface HistoricalChartProps {
  className?: string
}

interface HistoryDataPoint {
  id?: string
  timestamp: number
  temperature?: number
  humidity?: number
}

export default function HistoricalChart({ className = "" }: HistoricalChartProps) {
  const [chartPeriod, setChartPeriod] = useState("day")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allData, setAllData] = useState<HistoryDataPoint[]>([])
  const [visibleData, setVisibleData] = useState<HistoryDataPoint[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pointsPerPage, setPointsPerPage] = useState(24) // Default for day view
  const chartRef = useRef<any>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.4,
      },
      {
        label: "Humidity (%)",
        data: [],
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        tension: 0.4,
      },
    ],
  })

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

  // Fetch historical data
  const fetchHistoricalData = async () => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    console.log(`Fetching historical data for period: ${chartPeriod}`)

    try {
      // Instead of using orderByChild which requires an index,
      // we'll fetch all data and sort it client-side
      const historyRef = ref(firebase.database, "/history")

      const snapshot = await get(historyRef)
      const data = snapshot.val()

      if (!data) {
        setError("No historical data found in Firebase")
        setIsLoading(false)
        return
      }

      console.log(`Raw data received: ${typeof data}, keys: ${Object.keys(data).length}`)

      // Process the data
      processHistoricalData(data)
    } catch (err: any) {
      console.error("Error fetching historical data:", err)
      setError(`Error: ${err.message}`)
      setIsLoading(false)
    }
  }

  const processHistoricalData = (data: any) => {
    try {
      // Convert to array and prepare for processing
      let dataArray: HistoryDataPoint[] = []

      if (typeof data === "object" && data !== null) {
        dataArray = Object.entries(data).map(([key, value]: [string, any]) => {
          // Handle different data structures
          if (typeof value === "object" && value !== null) {
            // Standard structure: { timestamp, temperature, humidity }
            return {
              id: key,
              timestamp: typeof value.timestamp === "string" ? Number(value.timestamp) : value.timestamp || 0,
              temperature: typeof value.temperature === "string" ? Number(value.temperature) : value.temperature,
              humidity: typeof value.humidity === "string" ? Number(value.humidity) : value.humidity,
            }
          } else if (typeof value === "number") {
            // Simple structure: timestamp is the value
            return {
              id: key,
              timestamp: value,
              temperature: null,
              humidity: null,
            }
          } else {
            // Unknown structure
            console.log(`Unknown data structure for key ${key}: ${JSON.stringify(value)}`)
            return {
              id: key,
              timestamp: 0,
              temperature: null,
              humidity: null,
            }
          }
        })
      }

      console.log(`Processed ${dataArray.length} data points`)

      // Filter invalid data points
      dataArray = dataArray.filter(
        (point) => point.timestamp > 0 && (point.temperature !== undefined || point.humidity !== undefined),
      )

      console.log(`After filtering: ${dataArray.length} valid data points`)

      if (dataArray.length === 0) {
        setError("No valid data points found")
        setIsLoading(false)
        return
      }

      // Sort by timestamp
      dataArray.sort((a, b) => a.timestamp - b.timestamp)

      // Filter by time period
      const now = Math.floor(Date.now() / 1000)
      let timeRange: number
      let pointsToShow: number

      switch (chartPeriod) {
        case "day":
          // Start of today (midnight)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          timeRange = now - Math.floor(today.getTime() / 1000)
          pointsToShow = 24 // Show up to 24 points for day view
          break
        case "week":
          timeRange = 7 * 24 * 60 * 60 // 7 days
          pointsToShow = 7 * 24 // Show up to 168 points for week view (hourly)
          break
        case "month":
          timeRange = 30 * 24 * 60 * 60 // 30 days
          pointsToShow = 30 * 24 // Show up to 720 points for month view (hourly)
          break
        default:
          timeRange = 24 * 60 * 60 // Default to 24 hours
          pointsToShow = 24
      }

      // For day view, only show data from the current day
      let startTime: number
      if (chartPeriod === "day") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startTime = Math.floor(today.getTime() / 1000)
      } else {
        startTime = now - timeRange
      }

      const filteredData = dataArray.filter((point) => point.timestamp >= startTime)

      console.log(`Filtered by time period: ${filteredData.length} data points`)

      if (filteredData.length === 0) {
        if (chartPeriod === "day") {
          setError("No data available for today. Switch to Week or Month view to see historical data.")
          setIsLoading(false)
          setAllData([])
          setVisibleData([])
          setTotalPages(1)
          setCurrentPage(0)
          return
        } else {
          // For week/month views, if no data in the selected period, use all available data
          console.log("No data in selected period, using all available data")
        }
      }

      // Use filtered data if available, otherwise use all data
      const dataToUse = filteredData.length > 0 ? filteredData : dataArray

      // Store all filtered data
      setAllData(dataToUse)

      // Set points per page based on chart period
      setPointsPerPage(pointsToShow)

      // Calculate total pages
      const pages = Math.ceil(dataToUse.length / pointsToShow)
      setTotalPages(pages > 0 ? pages : 1)

      // Reset to last page to show most recent data
      setCurrentPage(pages > 0 ? pages - 1 : 0)

      // Update visible data
      updateVisibleData(dataToUse, pages - 1, pointsToShow)

      setIsLoading(false)
    } catch (err: any) {
      console.error("Error processing historical data:", err)
      setError(`Error processing data: ${err.message}`)
      setIsLoading(false)
    }
  }

  // Update visible data based on pagination
  const updateVisibleData = (data: HistoryDataPoint[], page: number, pointsPerPage: number) => {
    const startIdx = page * pointsPerPage
    const endIdx = Math.min(startIdx + pointsPerPage, data.length)
    const dataToShow = data.slice(startIdx, endIdx)
    setVisibleData(dataToShow)

    // Update chart data
    updateChartData(dataToShow)
  }

  // Update chart with visible data
  const updateChartData = (dataToShow: HistoryDataPoint[]) => {
    const labels: string[] = []
    const tempData: (number | null)[] = []
    const humidityData: (number | null)[] = []

    dataToShow.forEach((point) => {
      const date = new Date(point.timestamp * 1000)
      let timeStr

      if (chartPeriod === "day") {
        timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      } else if (chartPeriod === "week") {
        timeStr = date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
      } else {
        timeStr = date.toLocaleDateString([], { month: "short", day: "numeric" })
      }

      labels.push(timeStr)
      tempData.push(point.temperature !== undefined ? point.temperature : null)
      humidityData.push(point.humidity !== undefined ? point.humidity : null)
    })

    console.log(
      `Chart data: ${labels.length} labels, ${tempData.filter(Boolean).length} temp points, ${humidityData.filter(Boolean).length} humidity points`,
    )

    // Update chart data
    setChartData({
      labels,
      datasets: [
        {
          label: "Temperature (°C)",
          data: tempData,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          tension: 0.4,
          spanGaps: true,
        },
        {
          label: "Humidity (%)",
          data: humidityData,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          tension: 0.4,
          spanGaps: true,
        },
      ],
    })
  }

  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      updateVisibleData(allData, newPage, pointsPerPage)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      updateVisibleData(allData, newPage, pointsPerPage)
    }
  }

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setChartPeriod(period)
    setCurrentPage(0) // Reset pagination
    fetchHistoricalData() // Refetch data for new period
  }

  // Initial data load and setup auto-refresh
  useEffect(() => {
    fetchHistoricalData()

    // Set up auto-refresh
    const refreshInterval = setInterval(() => {
      fetchHistoricalData()
    }, 60000) // Refresh every 60 seconds

    return () => clearInterval(refreshInterval)
  }, [chartPeriod])

  // Get chart options based on current theme
  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
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
        },
      },
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Settings className="mr-2" /> Historical Data
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
            onClick={() => fetchHistoricalData()}
            className="p-1 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-gray-800">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-red-500 mb-2">{error}</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-md mb-4">
              Make sure your Arduino is sending data to the /history path in Firebase. The data should include
              timestamp, temperature, and humidity fields.
            </p>
            <button
              onClick={() => fetchHistoricalData()}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="h-64 bg-white dark:bg-gray-800">
              <Line ref={chartRef} data={chartData} options={getChartOptions()} />
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">{`Page ${currentPage + 1} of ${totalPages}`}</span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                  className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
