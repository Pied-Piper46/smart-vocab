import { describe, it, expect } from 'vitest'
import { selectRandomPattern, selectPattern } from './pattern-selector'
import { SESSION_PATTERNS, type PatternName } from '@/config/session-patterns'

describe('pattern-selector', () => {
  describe('selectRandomPattern', () => {
    it('should return a valid pattern name', () => {
      const result = selectRandomPattern()
      const validPatterns: PatternName[] = [
        'newFocused',
        'balanced',
        'reviewFocused',
        'consolidationFocused',
        'masteryMaintenance'
      ]
      expect(validPatterns).toContain(result)
    })

    it('should return different patterns over multiple calls', () => {
      const results = new Set<PatternName>()
      // Run 100 times to increase chance of getting different patterns
      for (let i = 0; i < 100; i++) {
        results.add(selectRandomPattern())
      }
      // Should have at least 2 different patterns in 100 tries
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('selectPattern (deterministic)', () => {
    it('should return specified pattern', () => {
      expect(selectPattern('newFocused')).toBe('newFocused')
      expect(selectPattern('balanced')).toBe('balanced')
      expect(selectPattern('reviewFocused')).toBe('reviewFocused')
    })

    it('should return pattern composition', () => {
      const patternName = selectPattern('balanced')
      const composition = SESSION_PATTERNS[patternName]
      expect(composition).toEqual({
        new: 5,
        learning: 3,
        reviewing: 1,
        mastered: 1
      })
    })
  })
})
