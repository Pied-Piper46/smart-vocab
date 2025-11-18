import { describe, it, expect } from 'vitest'
import {
  calculateMasteryStatus,
  calculateAccuracy,
} from './mastery'
import { getBaseInterval } from './review-scheduler'

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

  describe('getBaseInterval (from review-scheduler)', () => {
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

  describe('calculateAccuracy', () => {
    it('should calculate accuracy correctly', () => {
      expect(calculateAccuracy(10, 8)).toBe(0.8)
      expect(calculateAccuracy(5, 3)).toBe(0.6)
      expect(calculateAccuracy(20, 19)).toBe(0.95)
    })

    it('should return 0 when totalReviews is 0', () => {
      expect(calculateAccuracy(0, 0)).toBe(0)
    })

    it('should handle 100% accuracy', () => {
      expect(calculateAccuracy(10, 10)).toBe(1.0)
    })

    it('should handle 0% accuracy', () => {
      expect(calculateAccuracy(10, 0)).toBe(0)
    })

    it('should handle decimal results', () => {
      expect(calculateAccuracy(3, 2)).toBeCloseTo(0.6667, 4)
    })
  })
})
