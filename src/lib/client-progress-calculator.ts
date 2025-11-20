/**
 * Client-side progress calculation for immediate UI feedback
 * NOTE: Display-only calculations - server results are authoritative
 */

import type { SessionAnswer } from '@/types';
import type { MasteryStatus } from '@/lib/mastery';

export interface ClientProgressResult {
  wordId: string;
  totalReviews: number;
  correctAnswers: number;
  streak: number;
  accuracy: number;
  status: MasteryStatus;
  statusChanged: boolean;
  previousStatus: MasteryStatus;
}

export interface CurrentProgress {
  totalReviews: number;
  correctAnswers: number;
  streak: number;
  status: MasteryStatus;
}

/**
 * Calculate mastery status (client-side version)
 * Must match server-side logic in @/lib/mastery:calculateMasteryStatus
 *
 * Flow: new → learning → reviewing → mastered
 *
 * Two paths to mastery:
 * - Path A: Recent mastery (streak-focused) - streak >= 3
 * - Path B: Overall aptitude (accuracy-focused) - streak >= 2 && accuracy >= 0.80
 */
function calculateMasteryStatusClient(
  totalReviews: number,
  correctAnswers: number,
  streak: number
): MasteryStatus {
  // New words (first time appearance only)
  if (totalReviews === 0) {
    return 'new';
  }

  const accuracy = correctAnswers / totalReviews;

  // Learning: Initial learning phase (first few attempts)
  if (totalReviews <= 3) {
    return 'learning';
  }

  // Mastered: Two paths for motivation
  // Path A: Recent mastery (streak-focused)
  // Path B: Overall aptitude (accuracy-focused)
  if (streak >= 3 || (streak >= 2 && accuracy >= 0.80)) {
    return 'mastered';
  }

  // Reviewing: Established word needing reinforcement
  return 'reviewing';
}

/**
 * Calculate progress for a single answer (client-side)
 * @param currentProgress - Current progress state before this answer
 * @param answer - The answer being processed
 * @returns Calculated progress result with status change information
 */
export function calculateProgressClient(
  currentProgress: CurrentProgress,
  answer: SessionAnswer
): ClientProgressResult {
  const newTotalReviews = currentProgress.totalReviews + 1;
  const newCorrectAnswers = currentProgress.correctAnswers + (answer.isCorrect ? 1 : 0);
  const newStreak = answer.isCorrect ? currentProgress.streak + 1 : 0;
  const accuracy = newTotalReviews > 0 ? newCorrectAnswers / newTotalReviews : 0;

  const newStatus = calculateMasteryStatusClient(
    newTotalReviews,
    newCorrectAnswers,
    newStreak
  );

  return {
    wordId: answer.wordId,
    totalReviews: newTotalReviews,
    correctAnswers: newCorrectAnswers,
    streak: newStreak,
    accuracy,
    status: newStatus,
    statusChanged: currentProgress.status !== newStatus,
    previousStatus: currentProgress.status,
  };
}

/**
 * Calculate progress for all session answers (client-side)
 * @param initialProgress - Map of word IDs to their current progress
 * @param answers - All answers in the session
 * @returns Array of calculated progress results
 */
export function calculateSessionProgressClient(
  initialProgress: Map<string, CurrentProgress>,
  answers: SessionAnswer[]
): ClientProgressResult[] {
  const results: ClientProgressResult[] = [];
  const progressCache = new Map(initialProgress);

  for (const answer of answers) {
    const current = progressCache.get(answer.wordId);
    if (!current) {
      console.warn(`No initial progress found for word ${answer.wordId}`);
      continue;
    }

    const result = calculateProgressClient(current, answer);
    results.push(result);

    // Update cache for next calculation (in case same word appears again)
    progressCache.set(answer.wordId, {
      totalReviews: result.totalReviews,
      correctAnswers: result.correctAnswers,
      streak: result.streak,
      status: result.status,
    });
  }

  return results;
}
