/**
 * Utility functions for microcontroller integration
 * This file handles the communication between the frontend and the ESP32 microcontroller
 */

import { ref, set, get, push } from "firebase/database"
import { initFirebase } from "./firebase"

/**
 * Send a command to the microcontroller to open the feeder for a specific duration
 * @param durationSeconds The duration in seconds to keep the servo open
 * @returns Promise that resolves to true if successful
 */
export async function sendFeedCommand(durationSeconds: number): Promise<boolean> {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    // Set the feed duration
    await set(ref(firebase.database, "/controls/feedDuration"), durationSeconds)

    // Trigger the feed command
    await set(ref(firebase.database, "/controls/feed"), true)

    // Reset the feed command after a delay to prevent repeated feeding
    setTimeout(() => {
      set(ref(firebase.database, "/controls/feed"), false).catch((err) =>
        console.error("Error resetting feed command:", err),
      )
    }, 2000)

    return true
  } catch (error) {
    console.error("Error sending feed command:", error)
    return false
  }
}

/**
 * Log a feeding event to Firebase
 * @param gramsDispensed Amount of feed dispensed in grams
 * @param ageGroup Age group of chickens (chick, grower, adult)
 * @param chickenCount Number of chickens
 * @param servoOpenTime Duration the servo was open in seconds
 * @returns Promise that resolves to true if successful
 */
export async function logFeedingEvent(
  gramsDispensed: number,
  ageGroup: string,
  chickenCount: number,
  servoOpenTime: number,
): Promise<boolean> {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    // Create a new entry in the feedingLogs collection
    const feedingLogRef = push(ref(firebase.database, "/feedingLogs"))
    await set(feedingLogRef, {
      timestamp: Math.floor(Date.now() / 1000),
      gramsDispensed,
      ageGroup,
      chickenCount,
      servoOpenTime,
    })

    // Also log as an event for the events feed
    const eventRef = push(ref(firebase.database, "/events"))
    await set(eventRef, {
      timestamp: Math.floor(Date.now() / 1000),
      type: "feeding",
      description: `Dispensed ${gramsDispensed}g of feed for ${chickenCount} ${ageGroup} chickens`,
    })

    return true
  } catch (error) {
    console.error("Error logging feeding event:", error)
    return false
  }
}

/**
 * Save feeding settings to Firebase
 * @param ageGroup Age group of chickens (chick, grower, adult)
 * @param chickenCount Number of chickens
 * @returns Promise that resolves to true if successful
 */
export async function saveFeedingSettings(ageGroup: string, chickenCount: number): Promise<boolean> {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    await set(ref(firebase.database, "/feedingSettings"), {
      ageGroup,
      chickenCount,
      lastUpdated: Math.floor(Date.now() / 1000),
    })

    return true
  } catch (error) {
    console.error("Error saving feeding settings:", error)
    return false
  }
}

/**
 * Get the last feeding settings from Firebase
 * @returns Promise that resolves to the feeding settings
 */
export async function getLastFeedingSettings(): Promise<{
  ageGroup: string
  chickenCount: number
  lastUpdated?: number
} | null> {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return null
  }

  try {
    const snapshot = await get(ref(firebase.database, "/feedingSettings"))
    return snapshot.val()
  } catch (error) {
    console.error("Error getting feeding settings:", error)
    return null
  }
}
