/**
 * Session composition patterns
 * Defines how many words of each status to include in a session
 */

export const SESSION_PATTERNS = {
  newFocused: {
    new: 6,
    learning: 2,
    reviewing: 1,
    mastered: 1
  },
  balanced: {
    new: 5,
    learning: 3,
    reviewing: 1,
    mastered: 1
  },
  reviewFocused: {
    new: 3,
    learning: 3,
    reviewing: 3,
    mastered: 1
  },
  consolidationFocused: {
    new: 2,
    learning: 4,
    reviewing: 3,
    mastered: 1
  },
  masteryMaintenance: {
    new: 4,
    learning: 2,
    reviewing: 2,
    mastered: 2
  }
} as const

export type SessionPattern = typeof SESSION_PATTERNS[keyof typeof SESSION_PATTERNS]
export type PatternName = keyof typeof SESSION_PATTERNS

/**
 * Session size (fixed)
 */
export const SESSION_SIZE = 10

/**
 * Candidate fetch multiplier
 * Fetch N times the required count to ensure enough candidates
 */
export const CANDIDATE_MULTIPLIER = 3

/**
 * NEW words candidate fetch multiplier
 * Fetch more candidates for 'new' status words to increase randomness
 * Higher value = more variety in word selection for new users
 */
export const NEW_CANDIDATE_MULTIPLIER = 100
