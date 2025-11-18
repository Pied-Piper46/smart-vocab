/**
 * Review scheduling logic
 * Calculates recommended review dates based on streak, accuracy, and learning progress
 */

import { addDays } from './date-utils'
import { REVIEW_INTERVAL_CONFIG } from '@/config/review-interval'

export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered'

/**
 * Get base interval in days based on streak
 * @param streak - Number of consecutive correct answers
 * @returns Number of days for next review
 */
export function getBaseInterval(streak: number): number {
  const intervals = REVIEW_INTERVAL_CONFIG.BASE_INTERVALS
  if (streak >= intervals.length) {
    return intervals[intervals.length - 1]
  }
  return intervals[streak]
}

/**
 * Calculate recommended review date
 * @param streak - Consecutive correct answers
 * @param accuracy - Overall accuracy (correctAnswers / totalReviews)
 * @param totalReviews - Total number of reviews
 * @param status - Current mastery status
 * @param now - Current date (for testing)
 * @returns Recommended review date
 */
export function calculateRecommendedReviewDate(
  streak: number,
  accuracy: number,
  totalReviews: number,
  status: MasteryStatus,
  now: Date = new Date()
): Date {
  const config = REVIEW_INTERVAL_CONFIG

  // Step 1: Get base interval from streak
  let baseInterval = getBaseInterval(streak)

  // Step 2: Learning stage constraint
  if (status === 'learning' && totalReviews <= 3) {
    baseInterval = Math.min(baseInterval, config.LEARNING_MAX_INTERVAL)
  }

  // Step 3: Accuracy adjustment (only if enough data)
  let accuracyMultiplier = 1.0
  if (totalReviews >= 4) {
    if (accuracy < config.ACCURACY_THRESHOLDS.CRITICAL) {
      accuracyMultiplier = config.ACCURACY_MULTIPLIERS.CRITICAL
    } else if (accuracy < config.ACCURACY_THRESHOLDS.LOW) {
      accuracyMultiplier = config.ACCURACY_MULTIPLIERS.LOW
    } else if (accuracy > config.ACCURACY_THRESHOLDS.HIGH) {
      accuracyMultiplier = config.ACCURACY_MULTIPLIERS.HIGH
    }
  }

  // Step 4: Total reviews adjustment
  let reviewsMultiplier = 1.0
  if (totalReviews >= config.REVIEWS_THRESHOLD) {
    reviewsMultiplier = config.REVIEWS_MULTIPLIER
  }

  // Step 5: Calculate final interval
  const finalInterval = Math.max(
    config.MIN_INTERVAL,
    Math.floor(baseInterval * accuracyMultiplier * reviewsMultiplier)
  )

  return addDays(now, finalInterval)
}
