/**
 * Review interval configuration
 * Adjustable coefficients for recommended review date calculation
 */

export const REVIEW_INTERVAL_CONFIG = {
  // Base intervals by streak (in days)
  BASE_INTERVALS: [1, 3, 7, 14, 30] as const,

  // Accuracy multipliers
  ACCURACY_MULTIPLIERS: {
    CRITICAL: 0.7,   // accuracy < 0.5: shorten by 30%
    LOW: 0.85,       // accuracy < 0.7: shorten by 15%
    HIGH: 1.3,       // accuracy > 0.9: extend by 30%
  },

  // Accuracy thresholds
  ACCURACY_THRESHOLDS: {
    CRITICAL: 0.5,
    LOW: 0.7,
    HIGH: 0.9,
  },

  // Total reviews multiplier
  REVIEWS_THRESHOLD: 10,
  REVIEWS_MULTIPLIER: 1.2,  // Extend by 20% if totalReviews >= 10

  // Learning stage constraints
  LEARNING_MAX_INTERVAL: 3,  // Maximum interval for learning status

  // Minimum interval
  MIN_INTERVAL: 1,  // Minimum 1 day
} as const
