import { describe, it, expect } from 'vitest'
import {
  calculateMasteryStatus,
  getRecommendedReviewInterval,
} from './mastery'

describe('mastery calculation', () => {
  describe('calculateMasteryStatus', () => {
    it('should return "new" when totalReviews is 0', () => {
      const result = calculateMasteryStatus({
        totalReviews: 0,
        correctAnswers: 0,
        streak: 0,
      })
      expect(result).toBe('new')
    })

    it('should return "learning" when totalReviews <= 3', () => {
      const result = calculateMasteryStatus({
        totalReviews: 2,
        correctAnswers: 1,
        streak: 1,
      })
      expect(result).toBe('learning')
    })

    it('should return "mastered" when streak >= 3', () => {
      const result = calculateMasteryStatus({
        totalReviews: 5,
        correctAnswers: 4,
        streak: 3,
      })
      expect(result).toBe('mastered')
    })

    it('should return "mastered" when streak >= 2 and accuracy >= 0.80', () => {
      const result = calculateMasteryStatus({
        totalReviews: 5,
        correctAnswers: 4, // 80% accuracy
        streak: 2,
      })
      expect(result).toBe('mastered')
    })

    it('should return "reviewing" when not meeting mastery criteria', () => {
      const result = calculateMasteryStatus({
        totalReviews: 5,
        correctAnswers: 3, // 60% accuracy
        streak: 1,
      })
      expect(result).toBe('reviewing')
    })
  })

  describe('getRecommendedReviewInterval', () => {
    it('should return 1 day for streak 0', () => {
      expect(getRecommendedReviewInterval(0)).toBe(1)
    })

    it('should return 3 days for streak 1', () => {
      expect(getRecommendedReviewInterval(1)).toBe(3)
    })

    it('should return 7 days for streak 2', () => {
      expect(getRecommendedReviewInterval(2)).toBe(7)
    })

    it('should return 14 days for streak 3', () => {
      expect(getRecommendedReviewInterval(3)).toBe(14)
    })

    it('should return 30 days for streak 4+', () => {
      expect(getRecommendedReviewInterval(4)).toBe(30)
      expect(getRecommendedReviewInterval(10)).toBe(30)
    })
  })
})
