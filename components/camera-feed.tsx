"use client"

import { useEffect, useState, useRef } from "react"
import { ref, get, set } from "firebase/database"
import { initFirebase } from "@/lib/firebase"
import { Play, RefreshCw } from "lucide-react"

interface CameraFeedProps {
  className?: string
}

export default function CameraFeed({ className = "" }: CameraFeedProps) {
  const [cameraIP, setCameraIP] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLiveStream, setShowLiveStream] = useState(false)
  const [streamInterval, setStreamInterval] = useState<NodeJS.Timeout | null>(null)
  const [streamFps, setStreamFps] = useState(5)

  const snapshotRef = useRef<HTMLImageElement>(null)
  const streamRef = useRef<HTMLImageElement>(null)

  // Helper function for logging
  const logDebug = (message: string) => {
    console.log(`[CameraFeed] ${message}`)
  }

  // Load camera IP from Firebase
  useEffect(() => {
    const firebase = initFirebase()
    if (!firebase?.database) {
      console.error("[CameraFeed] Firebase database not initialized")
      setError("Firebase not initialized")
      setIsLoading(false)
      return
    }

    const cameraIPRef = ref(firebase.database, "/settings/cameraIP")

    get(cameraIPRef)
      .then((snapshot) => {
        const ip = snapshot.val()
        console.log("[CameraFeed] Camera IP:", ip)

        if (ip) {
          setCameraIP(ip)
          updateCameraFeed(ip)
        } else {
          console.log("[CameraFeed] No camera IP found")
          setError("No camera IP configured")
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[CameraFeed] Error fetching camera IP:", error)
        setError("Failed to fetch camera IP")
        setIsLoading(false)
      })
  }, [])

  // Clean up interval when component unmounts
  useEffect(() => {
    return () => {
      if (streamInterval) {
        clearInterval(streamInterval)
      }
    }
  }, [streamInterval])

  // Update camera feed with the given IP
  const updateCameraFeed = (ip: string) => {
    if (!ip) return

    console.log(`[CameraFeed] Updating camera feed with IP: ${ip}`)
    const timestamp = new Date().getTime() // Add timestamp to prevent caching

    if (snapshotRef.current) {
      snapshotRef.current.src = `http://${ip}/capture?t=${timestamp}`
      snapshotRef.current.onerror = () => {
        console.error("[CameraFeed] Failed to load snapshot")
        setError("Failed to connect to camera")
      }
      snapshotRef.current.onload = () => {
        setError(null)
      }
    }
  }

  // Set up pseudo-streaming
  const setupPseudoStream = (fps = 5) => {
    if (!cameraIP) return

    // Clear any existing interval
    if (streamInterval) {
      clearInterval(streamInterval)
      setStreamInterval(null)
    }

    const intervalMs = 1000 / fps

    // Set initial image if we have a ref
    if (streamRef.current) {
      streamRef.current.src = `http://${cameraIP}/capture?t=${Date.now()}`
    }

    // Set up interval to refresh the image
    const interval = setInterval(() => {
      if (streamRef.current) {
        streamRef.current.src = `http://${cameraIP}/capture?t=${Date.now()}`
      }
    }, intervalMs)

    setStreamInterval(interval)
    logDebug(`Started pseudo-streaming at ${fps} FPS`)
  }

  // Toggle live stream view
  const toggleLiveStream = () => {
    if (!showLiveStream) {
      // Start streaming
      setShowLiveStream(true)
      setTimeout(() => {
        setupPseudoStream(streamFps)
      }, 100)
    } else {
      // Stop streaming
      if (streamInterval) {
        clearInterval(streamInterval)
        setStreamInterval(null)
      }
      setShowLiveStream(false)
    }
  }

  // Save camera IP to Firebase
  const saveCameraIP = (ip: string) => {
    const firebase = initFirebase()
    if (!firebase?.database) return

    set(ref(firebase.database, "/settings/cameraIP"), ip)
      .then(() => {
        console.log("[CameraFeed] Camera IP saved to Firebase")
        setCameraIP(ip)
        updateCameraFeed(ip)
      })
      .catch((error) => {
        console.error("[CameraFeed] Error saving camera IP:", error)
      })
  }

  // Prompt user to enter camera IP
  const discoverCameraIP = () => {
    const userIP = prompt("Please enter the ESP32-CAM IP address:", cameraIP || "")
    if (userIP) {
      saveCameraIP(userIP)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gray-700 text-white p-4 flex justify-between items-center">
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
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Live Camera Feed
        </h2>
        <div className="flex items-center">
          <button
            className="p-2 bg-gray-600 rounded-full hover:bg-gray-500 transition-colors"
            onClick={() => updateCameraFeed(cameraIP)}
            title="Refresh camera feed"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              onClick={discoverCameraIP}
            >
              Configure Camera IP
            </button>
          </div>
        ) : (
          <>
            {!showLiveStream ? (
              <div className="relative w-full pt-[75%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  ref={snapshotRef}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  src="/placeholder.svg?height=300&width=400"
                  alt="Camera Feed"
                />
              </div>
            ) : (
              <div className="relative w-full pt-[75%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  ref={streamRef}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                  src="/placeholder.svg?height=300&width=400"
                  alt="Live Stream"
                />
              </div>
            )}

            <div className="mt-4 text-center">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
                onClick={toggleLiveStream}
              >
                <Play className="mr-2" size={16} />
                {showLiveStream ? "View Snapshot" : "View Live Stream"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
