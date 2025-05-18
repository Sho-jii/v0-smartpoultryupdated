"use client"

import { useState, useEffect } from "react"

interface ClockDisplayProps {
  className?: string
}

export default function ClockDisplay({ className = "" }: ClockDisplayProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Clean up interval on unmount
    return () => clearInterval(timer)
  }, [])

  // Format date as "Day, Month Date, Year"
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }

  const formattedDate = currentTime.toLocaleDateString(undefined, dateOptions)

  // Format time as "HH:MM:SS AM/PM"
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }

  const formattedTime = currentTime.toLocaleTimeString(undefined, timeOptions)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${className}`}>
      <div className="text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">{formattedDate}</div>
        <div className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formattedTime}</div>
      </div>
    </div>
  )
}
