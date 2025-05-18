/**
 * Utility functions for the water system
 */

// Define water consumption rates based on age (ml per chicken per day)
export const WATER_CONSUMPTION_RATES = {
  chick: 80, // 0-8 weeks
  grower: 150, // 8-20 weeks
  adult: 200, // 20+ weeks (broilers at 45 days need 180-250ml)
}

// Define hydration thresholds
export const HYDRATION_THRESHOLDS = {
  warning: 180, // ml per bird per day (below this is a warning)
  alert: 120, // ml per bird per day (below this is an alert)
}

// Define water pump flow rate conversion
// Default: 1 second = 100ml of water
export const DEFAULT_WATER_FLOW_RATE = 100 // 100ml per second

/**
 * Calculate recommended water based on age group and chicken count
 * @param ageGroup The age group of the chickens
 * @param chickenCount The number of chickens
 * @returns The recommended amount of water in ml
 */
export function calculateRecommendedWater(ageGroup: "chick" | "grower" | "adult", chickenCount: number): number {
  return WATER_CONSUMPTION_RATES[ageGroup] * chickenCount
}

/**
 * Calculate pump run time based on ml
 * @param ml The amount of water in ml
 * @param flowRate The flow rate in ml/second
 * @returns The time in seconds the pump should run
 */
export function calculatePumpRunTime(ml: number, flowRate: number = DEFAULT_WATER_FLOW_RATE): number {
  return ml / flowRate
}

/**
 * Format a timestamp to a readable date/time string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date/time string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString()
}

/**
 * Get the hydration status based on water consumption
 * @param waterPerBird Water consumption per bird in ml
 * @returns Hydration status: 'normal', 'warning', or 'alert'
 */
export function getHydrationStatus(waterPerBird: number): "normal" | "warning" | "alert" {
  if (waterPerBird < HYDRATION_THRESHOLDS.alert) {
    return "alert"
  } else if (waterPerBird < HYDRATION_THRESHOLDS.warning) {
    return "warning"
  } else {
    return "normal"
  }
}

/**
 * Convert ml to liters with proper formatting
 * @param ml Amount in milliliters
 * @returns Formatted string in liters
 */
export function mlToLiters(ml: number): string {
  return (ml / 1000).toFixed(2) + "L"
}

/**
 * Add sample water usage data to Firebase for testing
 * @param database Firebase database instance
 * @returns Promise that resolves to true if successful
 */
export async function addSampleWaterData(database: any): Promise<boolean> {
  if (!database) {
    console.error("Database not initialized")
    return false
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const volumeDispensed = Math.floor(Math.random() * 1000) + 500 // Random between 500-1500ml
    const durationSeconds = Math.floor(volumeDispensed / 100) // Assuming 100ml/s flow rate

    // Create a reference to the waterLogs path
    const waterLogRef = ref(database, `/waterLogs/${timestamp}`)

    // Set the data
    await set(waterLogRef, {
      timestamp,
      volumeDispensed,
      durationSeconds,
    })

    console.log("Sample water data added successfully")
    return true
  } catch (error) {
    console.error("Error adding sample water data:", error)
    return false
  }
}

/**
 * Populate water usage data with multiple entries for testing
 * @param database Firebase database instance
 * @param count Number of entries to add
 * @returns Promise that resolves to true if successful
 */
export async function populateWaterData(database: any, count = 24): Promise<boolean> {
  if (!database) {
    console.error("Database not initialized")
    return false
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const hourInSeconds = 60 * 60

    // Add data points at hourly intervals
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * hourInSeconds
      const volumeDispensed = Math.floor(Math.random() * 1000) + 500 // Random between 500-1500ml
      const durationSeconds = Math.floor(volumeDispensed / 100) // Assuming 100ml/s flow rate

      // Create a reference to the waterLogs path
      const waterLogRef = ref(database, `/waterLogs/${timestamp}`)

      // Set the data
      await set(waterLogRef, {
        timestamp,
        volumeDispensed,
        durationSeconds,
      })
    }

    console.log(`${count} sample water data points added successfully`)
    return true
  } catch (error) {
    console.error("Error populating water data:", error)
    return false
  }
}

// Import the necessary Firebase functions
import { ref, set } from "firebase/database"
