import { describe, it, expect } from 'vitest'
import type { MasteryStatus } from './mastery'
import { buildSession, selectWordsFromCategory, getCandidateQuerySpecs, type WordProgressForSession } from './session-builder'
import { SESSION_PATTERNS, CANDIDATE_MULTIPLIER } from '@/config/session-patterns'

describe('Session Builder', () => {
  describe('getCandidateQuerySpecs', () => {
    it('should return query specs for each status category', () => {
      const pattern = SESSION_PATTERNS.newFocused
      const specs = getCandidateQuerySpecs(pattern)

      expect(specs.new.count).toBe(pattern.new * CANDIDATE_MULTIPLIER)
      expect(specs.learning.count).toBe(pattern.learning * CANDIDATE_MULTIPLIER)
      expect(specs.reviewing.count).toBe(pattern.reviewing * CANDIDATE_MULTIPLIER)
      expect(specs.mastered.count).toBe(pattern.mastered * CANDIDATE_MULTIPLIER)
    })

    it('should order new words by createdAt desc', () => {
      const pattern = SESSION_PATTERNS.balanced
      const specs = getCandidateQuerySpecs(pattern)

      expect(specs.new.orderBy).toEqual({ createdAt: 'desc' })
    })

    it('should order learning/reviewing/mastered by recommendedReviewDate asc', () => {
      const pattern = SESSION_PATTERNS.balanced
      const specs = getCandidateQuerySpecs(pattern)

      expect(specs.learning.orderBy).toEqual({ recommendedReviewDate: 'asc' })
      expect(specs.reviewing.orderBy).toEqual({ recommendedReviewDate: 'asc' })
      expect(specs.mastered.orderBy).toEqual({ recommendedReviewDate: 'asc' })
    })

    it('should use CANDIDATE_MULTIPLIER correctly', () => {
      const pattern = { new: 5, learning: 3, reviewing: 1, mastered: 1 }
      const specs = getCandidateQuerySpecs(pattern)

      expect(specs.new.count).toBe(5 * 3) // CANDIDATE_MULTIPLIER = 3
      expect(specs.learning.count).toBe(3 * 3)
      expect(specs.reviewing.count).toBe(1 * 3)
      expect(specs.mastered.count).toBe(1 * 3)
    })
  })

  describe('buildSession', () => {
    it('should build a session with correct total count', () => {
      const pattern = {
        new: 6,
        learning: 2,
        reviewing: 1,
        mastered: 1
      }

      const now = new Date('2024-01-01T00:00:00.000Z')

      const candidates = {
        new: Array.from({ length: 18 }, (_, i) => ({
          id: `new_${i}`,
          wordId: `word_new_${i}`,
          status: 'new' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          streak: 0,
          totalReviews: 0,
          correctAnswers: 0,
          lastReviewedAt: null
        })),
        learning: Array.from({ length: 6 }, (_, i) => ({
          id: `learning_${i}`,
          wordId: `word_learning_${i}`,
          status: 'learning' as MasteryStatus,
          recommendedReviewDate: new Date(now.getTime() + i * 1000 * 60 * 60 * 24),
          createdAt: now,
          streak: 1,
          totalReviews: 2,
          correctAnswers: 1,
          lastReviewedAt: now
        })),
        reviewing: Array.from({ length: 3 }, (_, i) => ({
          id: `reviewing_${i}`,
          wordId: `word_reviewing_${i}`,
          status: 'reviewing' as MasteryStatus,
          recommendedReviewDate: new Date(now.getTime() + i * 1000 * 60 * 60 * 24),
          createdAt: now,
          streak: 2,
          totalReviews: 5,
          correctAnswers: 3,
          lastReviewedAt: now
        })),
        mastered: Array.from({ length: 3 }, (_, i) => ({
          id: `mastered_${i}`,
          wordId: `word_mastered_${i}`,
          status: 'mastered' as MasteryStatus,
          recommendedReviewDate: new Date(now.getTime() + i * 1000 * 60 * 60 * 24),
          createdAt: now,
          streak: 3,
          totalReviews: 10,
          correctAnswers: 9,
          lastReviewedAt: now
        }))
      }

      const session = buildSession(pattern, candidates)

      expect(session.length).toBe(10) // 6 + 2 + 1 + 1
    })

    it('should select words according to pattern counts', () => {
      const pattern = { new: 3, learning: 2, reviewing: 1, mastered: 1 }
      const now = new Date('2024-01-01')

      const candidates = {
        new: Array.from({ length: 10 }, (_, i) => ({
          id: `new_${i}`,
          wordId: `w${i}`,
          status: 'new' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: now,
          streak: 0,
          totalReviews: 0,
          correctAnswers: 0,
          lastReviewedAt: null
        })),
        learning: Array.from({ length: 5 }, (_, i) => ({
          id: `learning_${i}`,
          wordId: `w${i}`,
          status: 'learning' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: now,
          streak: 1,
          totalReviews: 2,
          correctAnswers: 1,
          lastReviewedAt: now
        })),
        reviewing: Array.from({ length: 5 }, (_, i) => ({
          id: `reviewing_${i}`,
          wordId: `w${i}`,
          status: 'reviewing' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: now,
          streak: 2,
          totalReviews: 5,
          correctAnswers: 3,
          lastReviewedAt: now
        })),
        mastered: Array.from({ length: 5 }, (_, i) => ({
          id: `mastered_${i}`,
          wordId: `w${i}`,
          status: 'mastered' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: now,
          streak: 3,
          totalReviews: 10,
          correctAnswers: 9,
          lastReviewedAt: now
        }))
      }

      const session = buildSession(pattern, candidates)

      // Count each status
      const counts = {
        new: session.filter(w => w.status === 'new').length,
        learning: session.filter(w => w.status === 'learning').length,
        reviewing: session.filter(w => w.status === 'reviewing').length,
        mastered: session.filter(w => w.status === 'mastered').length
      }

      expect(counts.new).toBe(3)
      expect(counts.learning).toBe(2)
      expect(counts.reviewing).toBe(1)
      expect(counts.mastered).toBe(1)
    })

    it('should handle cases where candidates are fewer than pattern requires', () => {
      const pattern = { new: 6, learning: 2, reviewing: 1, mastered: 1 }
      const now = new Date('2024-01-01')

      const candidates = {
        new: Array.from({ length: 2 }, (_, i) => ({
          id: `new_${i}`,
          wordId: `w${i}`,
          status: 'new' as MasteryStatus,
          recommendedReviewDate: now,
          createdAt: now,
          streak: 0,
          totalReviews: 0,
          correctAnswers: 0,
          lastReviewedAt: null
        })),
        learning: [],
        reviewing: [],
        mastered: []
      }

      const session = buildSession(pattern, candidates)

      expect(session.length).toBe(2) // Only 2 new words available
    })

    it('should return empty array when no candidates available', () => {
      const pattern = { new: 6, learning: 2, reviewing: 1, mastered: 1 }
      const candidates = {
        new: [],
        learning: [],
        reviewing: [],
        mastered: []
      }

      const session = buildSession(pattern, candidates)

      expect(session).toEqual([])
    })
  })

  describe('selectWordsFromCategory', () => {
    it('should select the first N words from a category', () => {
      const words: WordProgressForSession[] = [
        {
          id: 'word_1',
          wordId: 'w1',
          status: 'learning',
          recommendedReviewDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          streak: 1,
          totalReviews: 2,
          correctAnswers: 1,
          lastReviewedAt: new Date('2024-01-01')
        },
        {
          id: 'word_2',
          wordId: 'w2',
          status: 'learning',
          recommendedReviewDate: new Date('2024-01-02'),
          createdAt: new Date('2024-01-01'),
          streak: 1,
          totalReviews: 2,
          correctAnswers: 1,
          lastReviewedAt: new Date('2024-01-01')
        },
        {
          id: 'word_3',
          wordId: 'w3',
          status: 'learning',
          recommendedReviewDate: new Date('2024-01-03'),
          createdAt: new Date('2024-01-01'),
          streak: 1,
          totalReviews: 2,
          correctAnswers: 1,
          lastReviewedAt: new Date('2024-01-01')
        }
      ]

      const result = selectWordsFromCategory(words, 2)

      expect(result.length).toBe(2)
      expect(result[0].id).toBe('word_1')
      expect(result[1].id).toBe('word_2')
    })

    it('should return all words if count exceeds available', () => {
      const words: WordProgressForSession[] = [
        {
          id: 'word_1',
          wordId: 'w1',
          status: 'new',
          recommendedReviewDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          streak: 0,
          totalReviews: 0,
          correctAnswers: 0,
          lastReviewedAt: null
        }
      ]

      const result = selectWordsFromCategory(words, 5)

      expect(result.length).toBe(1)
      expect(result[0].id).toBe('word_1')
    })

    it('should return empty array if count is 0', () => {
      const words: WordProgressForSession[] = [
        {
          id: 'word_1',
          wordId: 'w1',
          status: 'new',
          recommendedReviewDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          streak: 0,
          totalReviews: 0,
          correctAnswers: 0,
          lastReviewedAt: null
        }
      ]

      const result = selectWordsFromCategory(words, 0)

      expect(result).toEqual([])
    })

    it('should return empty array if words array is empty', () => {
      const words: WordProgressForSession[] = []

      const result = selectWordsFromCategory(words, 5)

      expect(result).toEqual([])
    })
  })
})
