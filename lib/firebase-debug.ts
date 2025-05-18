/**
 * Log Firebase data for debugging purposes
 * @param path Firebase path
 * @param data Data received from Firebase
 */
export function logFirebaseData(path: string, data: any): void {
  console.log(`[Firebase Debug] Data from ${path}:`, data)

  // Log data types for debugging
  if (data) {
    console.log(`[Firebase Debug] Data types for ${path}:`)
    Object.entries(data).forEach(([key, value]) => {
      console.log(`  - ${key}: ${typeof value} (${value})`)
    })
  }
}
