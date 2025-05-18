import { ref, set } from "firebase/database"
import { initFirebase } from "./firebase"

/**
 * Add a sample history data point to Firebase
 * This can be used to test the historical chart
 */
export const addSampleHistoryData = async () => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    // Create a timestamp (seconds since epoch)
    const timestamp = Math.floor(Date.now() / 1000)

    // Generate random temperature and humidity values
    const temperature = (20 + Math.random() * 15).toFixed(1)
    const humidity = (40 + Math.random() * 40).toFixed(1)

    // Add data to Firebase
    await set(ref(firebase.database, `/history/${timestamp}`), {
      timestamp: timestamp,
      temperature: Number.parseFloat(temperature),
      humidity: Number.parseFloat(humidity),
    })

    console.log("Sample history data added successfully")
    return true
  } catch (error) {
    console.error("Error adding sample history data:", error)
    return false
  }
}

/**
 * Add multiple sample history data points to Firebase
 * This can be used to populate the historical chart with test data
 */
export const populateHistoryData = async (count = 24) => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const hourInSeconds = 60 * 60

    // Add data points at hourly intervals
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * hourInSeconds
      const temperature = (20 + Math.random() * 15).toFixed(1)
      const humidity = (40 + Math.random() * 40).toFixed(1)

      await set(ref(firebase.database, `/history/${timestamp}`), {
        timestamp: timestamp,
        temperature: Number.parseFloat(temperature),
        humidity: Number.parseFloat(humidity),
      })
    }

    console.log(`${count} sample history data points added successfully`)
    return true
  } catch (error) {
    console.error("Error populating history data:", error)
    return false
  }
}

/**
 * Add a sample water usage data point to Firebase
 * This can be used to test the water usage analytics
 */
export const addSampleWaterData = async () => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    // Create a timestamp (seconds since epoch)
    const timestamp = Math.floor(Date.now() / 1000)

    // Generate random water usage values
    const volumeDispensed = Math.floor(Math.random() * 1000) + 500 // Random between 500-1500ml
    const durationSeconds = Math.floor(volumeDispensed / 100) // Assuming 100ml/s flow rate

    // Add data to Firebase
    await set(ref(firebase.database, `/waterLogs/${timestamp}`), {
      timestamp: timestamp,
      volumeDispensed: volumeDispensed,
      durationSeconds: durationSeconds,
    })

    console.log("Sample water data added successfully")
    return true
  } catch (error) {
    console.error("Error adding sample water data:", error)
    return false
  }
}

/**
 * Add multiple sample water usage data points to Firebase
 * This can be used to populate the water usage analytics with test data
 */
export const populateWaterData = async (count = 24) => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
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

      await set(ref(firebase.database, `/waterLogs/${timestamp}`), {
        timestamp: timestamp,
        volumeDispensed: volumeDispensed,
        durationSeconds: durationSeconds,
      })
    }

    console.log(`${count} sample water data points added successfully`)
    return true
  } catch (error) {
    console.error("Error populating water data:", error)
    return false
  }
}

/**
 * Add a sample feeding data point to Firebase
 * This can be used to test the feeding analytics
 */
export const addSampleFeedingData = async () => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    // Create a timestamp (seconds since epoch)
    const timestamp = Math.floor(Date.now() / 1000)

    // Generate random feeding values
    const gramsDispensed = Math.floor(Math.random() * 500) + 500 // Random between 500-1000g
    const ageGroups = ["chick", "grower", "adult"]
    const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)]
    const chickenCount = Math.floor(Math.random() * 20) + 5 // Random between 5-25 chickens

    // Add data to Firebase
    await set(ref(firebase.database, `/feedingLogs/${timestamp}`), {
      timestamp: timestamp,
      gramsDispensed: gramsDispensed,
      ageGroup: ageGroup,
      chickenCount: chickenCount,
    })

    console.log("Sample feeding data added successfully")
    return true
  } catch (error) {
    console.error("Error adding sample feeding data:", error)
    return false
  }
}

/**
 * Add multiple sample feeding data points to Firebase
 * This can be used to populate the feeding analytics with test data
 */
export const populateFeedingData = async (count = 24) => {
  const firebase = initFirebase()
  if (!firebase?.database) {
    console.error("Firebase not initialized")
    return false
  }

  try {
    const now = Math.floor(Date.now() / 1000)
    const hourInSeconds = 60 * 60

    // Add data points at hourly intervals
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i) * hourInSeconds
      const gramsDispensed = Math.floor(Math.random() * 500) + 500 // Random between 500-1000g
      const ageGroups = ["chick", "grower", "adult"]
      const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)]
      const chickenCount = Math.floor(Math.random() * 20) + 5 // Random between 5-25 chickens

      await set(ref(firebase.database, `/feedingLogs/${timestamp}`), {
        timestamp: timestamp,
        gramsDispensed: gramsDispensed,
        ageGroup: ageGroup,
        chickenCount: chickenCount,
      })
    }

    console.log(`${count} sample feeding data points added successfully`)
    return true
  } catch (error) {
    console.error("Error populating feeding data:", error)
    return false
  }
}
