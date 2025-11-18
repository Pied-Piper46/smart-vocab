import { describe, it, expect } from 'vitest'
import {
  calculateRecommendedReviewDate,
  getBaseInterval,
} from './review-scheduler'

describe('review-scheduler', () => {
  describe('getBaseInterval', () => {
    it('should return 1 day for streak 0', () => {
      expect(getBaseInterval(0)).toBe(1)
    })

    it('should return 3 days for streak 1', () => {
      expect(getBaseInterval(1)).toBe(3)
    })

    it('should return 7 days for streak 2', () => {
      expect(getBaseInterval(2)).toBe(7)
    })

    it('should return 14 days for streak 3', () => {
      expect(getBaseInterval(3)).toBe(14)
    })

    it('should return 30 days for streak 4+', () => {
      expect(getBaseInterval(4)).toBe(30)
      expect(getBaseInterval(10)).toBe(30)
    })
  })

  describe('calculateRecommendedReviewDate', () => {
    const now = new Date('2024-01-01T00:00:00.000Z')

    it('should calculate basic interval for streak 2 with neutral accuracy', () => {
      const result = calculateRecommendedReviewDate(2, 0.75, 5, 'reviewing', now)
      // 7 days base (accuracy 0.75 is neutral, no adjustment)
      expect(result.toISOString()).toBe('2024-01-08T00:00:00.000Z')
    })

    it('should shorten interval for low accuracy (< 0.5)', () => {
      const result = calculateRecommendedReviewDate(2, 0.4, 5, 'reviewing', now)
      // 7 * 0.7 = 4.9 → 4 days
      expect(result.toISOString()).toBe('2024-01-05T00:00:00.000Z')
    })

    it('should shorten interval for low accuracy (< 0.7)', () => {
      const result = calculateRecommendedReviewDate(2, 0.6, 5, 'reviewing', now)
      // 7 * 0.85 = 5.95 → 5 days
      expect(result.toISOString()).toBe('2024-01-06T00:00:00.000Z')
    })

    it('should extend interval for high accuracy (> 0.9)', () => {
      const result = calculateRecommendedReviewDate(2, 0.95, 5, 'reviewing', now)
      // 7 * 1.3 = 9.1 → 9 days
      expect(result.toISOString()).toBe('2024-01-10T00:00:00.000Z')
    })

    it('should not apply accuracy adjustment if totalReviews < 4', () => {
      const result = calculateRecommendedReviewDate(2, 0.3, 3, 'reviewing', now)
      // 7 days (no adjustment)
      expect(result.toISOString()).toBe('2024-01-08T00:00:00.000Z')
    })

    it('should extend interval if totalReviews >= 10', () => {
      const result = calculateRecommendedReviewDate(2, 0.6, 10, 'reviewing', now)
      // 7 * 0.85 * 1.2 = 7.14 → 7 days
      expect(result.toISOString()).toBe('2024-01-08T00:00:00.000Z')
    })

    it('should limit learning status to 3 days max', () => {
      const result = calculateRecommendedReviewDate(2, 0.6, 2, 'learning', now)
      // 7 days → capped at 3 days for learning
      expect(result.toISOString()).toBe('2024-01-04T00:00:00.000Z')
    })

    it('should not cap learning status if interval already <= 3', () => {
      const result = calculateRecommendedReviewDate(1, 0.6, 2, 'learning', now)
      // 3 days → no cap needed
      expect(result.toISOString()).toBe('2024-01-04T00:00:00.000Z')
    })

    it('should enforce minimum interval of 1 day', () => {
      const result = calculateRecommendedReviewDate(0, 0.2, 5, 'reviewing', now)
      // 1 * 0.7 = 0.7 → minimum 1 day
      expect(result.toISOString()).toBe('2024-01-02T00:00:00.000Z')
    })

    it('should handle streak 0 correctly', () => {
      const result = calculateRecommendedReviewDate(0, 0.6, 5, 'reviewing', now)
      // streak 0 → 1 day
      expect(result.toISOString()).toBe('2024-01-02T00:00:00.000Z')
    })

    it('should handle high streak correctly', () => {
      const result = calculateRecommendedReviewDate(4, 0.8, 15, 'mastered', now)
      // 30 * 1.0 * 1.2 = 36 days
      expect(result.toISOString()).toBe('2024-02-06T00:00:00.000Z')
    })
  })
})
