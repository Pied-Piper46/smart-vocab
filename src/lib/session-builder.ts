/**
 * Session construction logic
 * Builds learning sessions based on session patterns
 */

import { SESSION_SIZE, CANDIDATE_MULTIPLIER, NEW_CANDIDATE_MULTIPLIER, type SessionPattern } from '@/config/session-patterns'
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
 * Select N words from a category
 * For 'new' status words with same recommendedReviewDate, shuffle for randomness
 * For other statuses, take first N (already sorted by priority)
 *
 * @param words - Array of words (sorted by priority for learning/reviewing/mastered)
 * @param count - Number of words to select
 * @param randomize - If true, shuffle before selecting (for 'new' status words)
 * @returns Selected words
 */
export function selectWordsFromCategory<T>(
  words: T[],
  count: number,
  randomize: boolean = false
): T[] {
  if (count === 0 || words.length === 0) {
    return []
  }

  // For 'new' status: shuffle candidates to provide variety
  const candidates = randomize
    ? [...words].sort(() => Math.random() - 0.5)
    : words

  return candidates.slice(0, Math.min(count, candidates.length))
}

/**
 * Build a session from categorized candidates
 * If insufficient words are available, backfill from candidate pool by recommendedReviewDate
 *
 * @param pattern - Session pattern (word counts per status)
 * @param candidates - Pre-fetched and sorted candidates (should be fetched with CANDIDATE_MULTIPLIER)
 * @returns Session words (shuffled for variety)
 */
export function buildSession(
  pattern: SessionPattern,
  candidates: CategorizedCandidates
): WordProgressForSession[] {
  const session: WordProgressForSession[] = []

  // Step 1: Select words from each category according to pattern
  // For 'new' status: randomize to provide variety for new users
  const selectedNew = selectWordsFromCategory(candidates.new, pattern.new, true)
  const selectedLearning = selectWordsFromCategory(candidates.learning, pattern.learning)
  const selectedReviewing = selectWordsFromCategory(candidates.reviewing, pattern.reviewing)
  const selectedMastered = selectWordsFromCategory(candidates.mastered, pattern.mastered)

  session.push(...selectedNew, ...selectedLearning, ...selectedReviewing, ...selectedMastered)

  // Step 2: Build candidate pool from remaining words (not yet selected)
  const candidatePool = [
    ...candidates.new.slice(pattern.new),
    ...candidates.learning.slice(pattern.learning),
    ...candidates.reviewing.slice(pattern.reviewing),
    ...candidates.mastered.slice(pattern.mastered)
  ]

  // Step 3: If session is not full, backfill from candidate pool
  const shortage = SESSION_SIZE - session.length
  if (shortage > 0 && candidatePool.length > 0) {
    // Shuffle candidate pool for randomness
    // (especially important for new users where all words have same recommendedReviewDate)
    const fillers = candidatePool
      .sort(() => Math.random() - 0.5)
      .slice(0, shortage)

    session.push(...fillers)
  }

  // Step 4: Shuffle for variety (avoid status-based ordering)
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
      count: pattern.new * NEW_CANDIDATE_MULTIPLIER,  // Use higher multiplier for more variety
      orderBy: { createdAt: 'desc' as const }  // Order doesn't matter (will be shuffled)
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
