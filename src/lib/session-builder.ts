/**
 * Session construction logic
 * Builds learning sessions based on session patterns
 */

import { SESSION_SIZE, CANDIDATE_MULTIPLIER, type SessionPattern } from '@/config/session-patterns'
import type { MasteryStatus } from './mastery'

export interface WordProgressForSession {
  id: string
  wordId: string
  status: MasteryStatus
  recommendedReviewDate: Date
  createdAt: Date
  streak: number
  totalReviews: number
  correctAnswers: number
  lastReviewedAt: Date | null
}

export interface CategorizedCandidates {
  new: WordProgressForSession[]
  learning: WordProgressForSession[]
  reviewing: WordProgressForSession[]
  mastered: WordProgressForSession[]
}

/**
 * Select first N words from a category
 * @param words - Array of words (already sorted by priority)
 * @param count - Number of words to select
 * @returns Selected words
 */
export function selectWordsFromCategory<T>(
  words: T[],
  count: number
): T[] {
  if (count === 0 || words.length === 0) {
    return []
  }

  return words.slice(0, Math.min(count, words.length))
}

/**
 * Build a session from categorized candidates
 * @param pattern - Session pattern (word counts per status)
 * @param candidates - Pre-fetched and sorted candidates
 * @returns Session words (shuffled for variety)
 */
export function buildSession(
  pattern: SessionPattern,
  candidates: CategorizedCandidates
): WordProgressForSession[] {
  const session: WordProgressForSession[] = []

  // Select words from each category according to pattern
  session.push(...selectWordsFromCategory(candidates.new, pattern.new))
  session.push(...selectWordsFromCategory(candidates.learning, pattern.learning))
  session.push(...selectWordsFromCategory(candidates.reviewing, pattern.reviewing))
  session.push(...selectWordsFromCategory(candidates.mastered, pattern.mastered))

  // Shuffle for variety (avoid status-based ordering)
  return session.sort(() => Math.random() - 0.5)
}

/**
 * Fetch candidates for session construction (to be called by API/service layer)
 * This is a pure function that defines the query requirements.
 * Actual DB fetching should be done in API route or service layer.
 *
 * @param userId - User ID to fetch words for
 * @param pattern - Session pattern to determine how many candidates to fetch
 * @returns Query specifications for each status category
 */
export function getCandidateQuerySpecs(
  pattern: SessionPattern
) {
  return {
    new: {
      count: pattern.new * CANDIDATE_MULTIPLIER,
      orderBy: { createdAt: 'desc' as const }  // Random-ish for new words
    },
    learning: {
      count: pattern.learning * CANDIDATE_MULTIPLIER,
      orderBy: { recommendedReviewDate: 'asc' as const }  // Priority order
    },
    reviewing: {
      count: pattern.reviewing * CANDIDATE_MULTIPLIER,
      orderBy: { recommendedReviewDate: 'asc' as const }
    },
    mastered: {
      count: pattern.mastered * CANDIDATE_MULTIPLIER,
      orderBy: { recommendedReviewDate: 'asc' as const }
    }
  }
}
