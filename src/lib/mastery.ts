/**
 * Simplified Mastery Status Calculation
 * Streak-based spaced repetition system
 */

import { calculateDaysOverdue } from './date-utils'

export interface WordProgressData {
  totalReviews: number;
  correctAnswers: number;
  streak: number;
}

export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

/**
 * Calculate mastery status based on performance metrics
 * Flow: new → learning → reviewing → mastered
 *
 * Two paths to mastery for better motivation:
 * - Path A: Recent mastery (streak-focused) - streak >= 3
 * - Path B: Overall aptitude (accuracy-focused) - streak >= 2 && accuracy >= 0.80
 */
export function calculateMasteryStatus(progress: WordProgressData): MasteryStatus {
  const { totalReviews, correctAnswers, streak } = progress;

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
 * Calculate accuracy from total reviews and correct answers
 * @param totalReviews - Total number of reviews
 * @param correctAnswers - Number of correct answers
 * @returns Accuracy as a decimal (0.0 - 1.0)
 */
export function calculateAccuracy(totalReviews: number, correctAnswers: number): number {
  return totalReviews > 0 ? correctAnswers / totalReviews : 0
}


/**
 * Get review statistics for user dashboard
 */
export function getReviewStatistics(words: Array<{
  recommendedReviewDate: Date;
  status: string;
}>): {
  dueToday: number;
  overdue: number;
  maxDebt: number;
  totalWords: number;
} {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let dueToday = 0;
  let overdue = 0;
  let maxDebt = 0;

  words.forEach(word => {
    const debt = calculateDaysOverdue(word.recommendedReviewDate);

    if (word.recommendedReviewDate <= today && debt === 0) {
      dueToday++;
    } else if (debt > 0) {
      overdue++;
      maxDebt = Math.max(maxDebt, debt);
    }
  });

  return {
    dueToday,
    overdue,
    maxDebt,
    totalWords: words.length
  };
}

/**
 * Get mastery status display information
 */
export function getMasteryDisplayInfo(status: MasteryStatus): {
  label: string;
  color: string;
  description: string;
} {
  switch (status) {
    case 'new':
      return {
        label: '新規',
        color: 'bg-blue-500/70',
        description: '初回学習'
      };
    case 'learning':
      return {
        label: '学習中',
        color: 'bg-yellow-500/70',
        description: '初期学習段階'
      };
    case 'reviewing':
      return {
        label: '復習中',
        color: 'bg-orange-500/70',
        description: '定着段階'
      };
    case 'mastered':
      return {
        label: '習得済',
        color: 'bg-green-500/70',
        description: '習得完了'
      };
  }
}
