"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { logFirebaseData } from "@/lib/firebase-debug"

interface SensorValueDisplayProps {
  path: string
  label: string
  unit?: string
  precision?: number
  className?: string
  showIcon?: boolean
  icon?: React.ReactNode
}

export default function SensorValueDisplay({
  path,
  label,
  unit = "",
  precision = 1,
  className = "",
  showIcon = false,
  icon,
}: SensorValueDisplayProps) {
  const [value, setValue] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      console.error(`[SensorValueDisplay] Firebase database not initialized for ${path}`)
      setError("Firebase not initialized")
      setLoading(false)
      return
    }

    console.log(`[SensorValueDisplay] Setting up listener for ${path}`)

    try {
      const dataRef = ref(firebase.database, path)

      const unsubscribe = onValue(
        dataRef,
        (snapshot) => {
          const data = snapshot.val()
          console.log(`[SensorValueDisplay] Data received for ${path}:`, data)
          logFirebaseData(path, data)

          if (data !== null && data !== undefined) {
            // Convert to number and handle different data types
            const numValue = Number(data)
            if (!isNaN(numValue)) {
              setValue(numValue)
              console.log(`[SensorValueDisplay] Value set for ${path}: ${numValue}`)
            } else {
              console.error(`[SensorValueDisplay] Invalid numeric value for ${path}: ${data}`)
              setError(`Invalid value: ${data}`)
            }
          } else {
            console.warn(`[SensorValueDisplay] No data available for ${path}`)
            setValue(null)
          }

          setLoading(false)
        },
        (error) => {
          console.error(`[SensorValueDisplay] Error fetching data for ${path}:`, error)
          setError(error.message)
          setLoading(false)
        },
      )

      return () => {
        console.log(`[SensorValueDisplay] Cleaning up listener for ${path}`)
        unsubscribe()
      }
    } catch (err: any) {
      console.error(`[SensorValueDisplay] Error setting up listener for ${path}:`, err)
      setError(err.message)
      setLoading(false)
    }
  }, [path])

  return (
    <div className={`sensor-value-display ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {showIcon && icon && <span className="mr-2">{icon}</span>}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm">
          {loading ? (
            "Loading..."
          ) : error ? (
            <span className="text-red-500">Error</span>
          ) : value !== null ? (
            `${precision > 0 ? value.toFixed(precision) : value}${unit}`
          ) : (
            "--"
          )}
        </span>
      </div>
      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full ${
            error ? "bg-red-500" : value !== null && value < 20 ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${value !== null ? Math.min(100, value) : 0}%` }}
        ></div>
      </div>
    </div>
  )
}
