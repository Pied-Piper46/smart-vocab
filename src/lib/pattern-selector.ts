/**
 * Session pattern selection
 */

import { SESSION_PATTERNS, type PatternName } from '@/config/session-patterns'

/**
 * Select a random pattern
 * @returns Random pattern name
 */
export function selectRandomPattern(): PatternName {
  const patternNames = Object.keys(SESSION_PATTERNS) as PatternName[]
  const randomIndex = Math.floor(Math.random() * patternNames.length)
  return patternNames[randomIndex]
}

/**
 * Select a specific pattern (deterministic, for testing)
 * @param patternName - Pattern name to select
 * @returns The same pattern name
 */
export function selectPattern(patternName: PatternName): PatternName {
  return patternName
}
