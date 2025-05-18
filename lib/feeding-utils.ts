/**
 * Utility functions for the feeding system
 */

// Define feeding rates based on age (grams per chicken per day)
export const FEEDING_RATES = {
  chick: 50, // 0-8 weeks
  grower: 100, // 8-20 weeks
  adult: 150, // 20+ weeks
}

// Define servo open time conversion
// 1 second = 50g of feed
export const SERVO_OPEN_TIME_PER_GRAM = 0.02 // 0.02 seconds per gram (50g per second)

/**
 * Calculate recommended grams based on age group and chicken count
 * @param ageGroup The age group of the chickens
 * @param chickenCount The number of chickens
 * @returns The recommended amount of feed in grams
 */
export function calculateRecommendedGrams(ageGroup: "chick" | "grower" | "adult", chickenCount: number): number {
  return FEEDING_RATES[ageGroup] * chickenCount
}

/**
 * Calculate servo open time based on grams
 * @param grams The amount of feed in grams
 * @returns The time in seconds the servo should stay open
 */
export function calculateServoOpenTime(grams: number): number {
  return grams * SERVO_OPEN_TIME_PER_GRAM
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
 * Get the age group label for display
 * @param ageGroup The age group code
 * @returns Human-readable age group label
 */
export function getAgeGroupLabel(ageGroup: string): string {
  switch (ageGroup) {
    case "chick":
      return "Chicks (0-8 weeks)"
    case "grower":
      return "Growers (8-20 weeks)"
    case "adult":
      return "Adults (20+ weeks)"
    default:
      return ageGroup
  }
}
