import { describe, it, expect } from 'vitest'
import { addDays, daysBetween } from './date-utils'

describe('date-utils', () => {
  describe('addDays', () => {
    it('should add positive days correctly', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const result = addDays(date, 5)
      expect(result.toISOString()).toBe('2024-01-06T00:00:00.000Z')
    })

    it('should add negative days correctly', () => {
      const date = new Date('2024-01-10T00:00:00.000Z')
      const result = addDays(date, -3)
      expect(result.toISOString()).toBe('2024-01-07T00:00:00.000Z')
    })

    it('should handle zero days', () => {
      const date = new Date('2024-01-15T12:30:00.000Z')
      const result = addDays(date, 0)
      expect(result.toISOString()).toBe('2024-01-15T12:30:00.000Z')
    })

    it('should not mutate original date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const original = date.toISOString()
      addDays(date, 10)
      expect(date.toISOString()).toBe(original)
    })

    it('should handle month boundaries', () => {
      const date = new Date('2024-01-30T00:00:00.000Z')
      const result = addDays(date, 5)
      expect(result.toISOString()).toBe('2024-02-04T00:00:00.000Z')
    })

    it('should handle leap year', () => {
      const date = new Date('2024-02-28T00:00:00.000Z')
      const result = addDays(date, 1)
      expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z')
    })
  })

  describe('daysBetween', () => {
    it('should calculate positive difference', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z')
      const date2 = new Date('2024-01-05T00:00:00.000Z')
      expect(daysBetween(date1, date2)).toBe(4)
    })

    it('should calculate negative difference', () => {
      const date1 = new Date('2024-01-10T00:00:00.000Z')
      const date2 = new Date('2024-01-05T00:00:00.000Z')
      expect(daysBetween(date1, date2)).toBe(-5)
    })

    it('should return 0 for same date', () => {
      const date1 = new Date('2024-01-15T12:00:00.000Z')
      const date2 = new Date('2024-01-15T18:00:00.000Z')
      expect(daysBetween(date1, date2)).toBe(0)
    })

    it('should ignore time component', () => {
      const date1 = new Date('2024-01-01T23:59:59.999Z')
      const date2 = new Date('2024-01-02T00:00:00.000Z')
      expect(daysBetween(date1, date2)).toBe(0)
    })

    it('should handle month boundaries', () => {
      const date1 = new Date('2024-01-31T00:00:00.000Z')
      const date2 = new Date('2024-02-03T00:00:00.000Z')
      expect(daysBetween(date1, date2)).toBe(3)
    })
  })
})
