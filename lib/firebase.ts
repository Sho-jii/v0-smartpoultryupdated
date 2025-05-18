import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { type Database, getDatabase } from "firebase/database"
import { ref, get } from "firebase/database"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJcVgw5VpT2CEHLqgIRjvt6Lc0x_Lrys4",
  databaseURL: "https://smartpoultry-4d359-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartpoultry-4d359",
}

/**
 * Initialize Firebase if it hasn't been initialized yet
 * @returns Firebase app instance and database
 */
export function initFirebase(): { app: FirebaseApp; database: Database } | null {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    console.error("Firebase can only be initialized in a browser environment")
    return null
  }

  try {
    // Check if Firebase is already initialized
    const apps = getApps()
    let app

    if (apps.length === 0) {
      // Initialize Firebase
      app = initializeApp(firebaseConfig)
      console.log("Firebase initialized successfully")
    } else {
      // Use existing Firebase instance
      app = apps[0]
      console.log("Using existing Firebase instance")
    }

    // Get database instance
    const database = getDatabase(app)

    return { app, database }
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return null
  }
}

/**
 * Test Firebase connection by trying to read a test path
 * @param database Firebase database instance
 * @returns Promise that resolves to true if connection is successful
 */
export async function testFirebaseConnection(database: Database | undefined): Promise<boolean> {
  if (!database) {
    console.error("Database instance is undefined")
    return false
  }

  try {
    // Try to read from a test path
    const testRef = ref(database, "/test")
    const snapshot = await get(testRef)

    console.log("Firebase connection test successful")
    return true
  } catch (error) {
    console.error("Firebase connection test failed:", error)
    return false
  }
}
