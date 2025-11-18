/**
 * Simplified Mastery Status Calculation
 * Streak-based spaced repetition system
 */

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
 * Get recommended review interval based on streak
 * Streak-based spacing: higher streak = longer interval
 */
export function getRecommendedReviewInterval(streak: number): number {
  if (streak === 0) return 1;   // Failed → Next day
  if (streak === 1) return 3;   // 1 correct → 3 days
  if (streak === 2) return 7;   // 2 correct → 1 week
  if (streak === 3) return 14;  // 3 correct → 2 weeks
  return 30;                     // 4+ correct → 1 month
}

/**
 * Calculate recommended review date based on streak
 */
export function calculateRecommendedReviewDate(streak: number): Date {
  const interval = getRecommendedReviewInterval(streak);
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date;
}

/**
 * Calculate days overdue from recommended review date
 */
export function calculateDaysOverdue(recommendedReviewDate: Date): number {
  const now = new Date();
  const timeDiff = now.getTime() - recommendedReviewDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff);
}

/**
 * Calculate days since last review
 */
export function calculateDaysSinceReview(lastReviewedAt: Date | null): number {
  if (!lastReviewedAt) return 0;
  const now = new Date();
  const timeDiff = now.getTime() - lastReviewedAt.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate word priority for session selection
 * Higher priority = should be reviewed sooner
 */
export function calculateWordPriority(word: {
  recommendedReviewDate: Date;
  lastReviewedAt: Date | null;
  streak: number;
  totalReviews: number;
  correctAnswers: number;
}): number {
  const daysOverdue = calculateDaysOverdue(word.recommendedReviewDate);
  const daysSinceReview = calculateDaysSinceReview(word.lastReviewedAt);
  const accuracy = word.totalReviews > 0 ? word.correctAnswers / word.totalReviews : 0;

  let priority = 0;

  // 1. Days overdue (most important)
  priority += daysOverdue * 20;

  // 2. Streak = 0 (recently failed) - high priority
  if (word.streak === 0 && word.totalReviews >= 2) {
    priority += 50;
  }

  // 3. Low accuracy - needs more practice
  if (word.totalReviews >= 4) {
    if (accuracy < 0.5) {
      priority += 30;
    } else if (accuracy < 0.7) {
      priority += 15;
    }
  }

  // 4. Days since last review
  priority += daysSinceReview * 5;

  return priority;
}

/**
 * Get optimal session composition based on mastery distribution
 * Session patterns for variety
 */
export function getOptimalSessionComposition(
  available: {
    new: number;
    reviewing: number;
    learning: number;
    mastered: number;
  },
  sessionSize: number = 10
): {
  new: number;
  reviewing: number;
  learning: number;
  mastered: number;
} {
  // Session patterns for variety
  const patterns = {
    newFocused: { new: 0.60, learning: 0.10, reviewing: 0.10, mastered: 0.10 },
    balanced: { new: 0.50, learning: 0.20, reviewing: 0.10, mastered: 0.10 },
    reviewFocused: { new: 0.40, learning: 0.20, reviewing: 0.20, mastered: 0.10 }
  };

  // Select pattern randomly for variety
  const patternKeys = Object.keys(patterns) as (keyof typeof patterns)[];
  const selectedPattern = patterns[patternKeys[Math.floor(Math.random() * patternKeys.length)]];

  const composition = {
    new: Math.min(Math.floor(sessionSize * selectedPattern.new), available.new),
    learning: Math.min(Math.floor(sessionSize * selectedPattern.learning), available.learning),
    reviewing: Math.min(Math.floor(sessionSize * selectedPattern.reviewing), available.reviewing),
    mastered: Math.min(Math.floor(sessionSize * selectedPattern.mastered), available.mastered)
  };

  // Fill remaining slots with available words
  const totalAllocated = composition.new + composition.reviewing + composition.learning + composition.mastered;
  let remaining = sessionSize - totalAllocated;

  if (remaining > 0) {
    // Prioritize: learning > reviewing > new > mastered
    const priorities: (keyof typeof composition)[] = ['learning', 'reviewing', 'new', 'mastered'];

    for (const category of priorities) {
      if (remaining <= 0) break;
      const extra = Math.min(remaining, available[category] - composition[category]);
      composition[category] += extra;
      remaining -= extra;
    }
  }

  return composition;
}

/**
 * Select optimal words based on priority and composition
 */
export function selectOptimalWords<T extends {
  recommendedReviewDate: Date;
  lastReviewedAt: Date | null;
  streak: number;
  totalReviews: number;
  correctAnswers: number;
  status: string;
}>(
  categorizedWords: Record<MasteryStatus, T[]>,
  composition: { new: number; reviewing: number; learning: number; mastered: number }
): T[] {
  const selectedWords: T[] = [];

  // Helper function to select words with priority sorting
  const selectFromCategory = (words: T[], count: number): T[] => {
    if (count === 0 || words.length === 0) return [];

    return words
      .map(word => ({
        word,
        priority: calculateWordPriority(word),
        randomTieBreaker: Math.random()
      }))
      .sort((a, b) => {
        // First sort by priority (higher first)
        if (Math.abs(a.priority - b.priority) > 0.1) {
          return b.priority - a.priority;
        }
        // Same priority: lower accuracy first
        const aAccuracy = a.word.totalReviews > 0 ? a.word.correctAnswers / a.word.totalReviews : 0;
        const bAccuracy = b.word.totalReviews > 0 ? b.word.correctAnswers / b.word.totalReviews : 0;
        if (Math.abs(aAccuracy - bAccuracy) > 0.1) {
          return aAccuracy - bAccuracy;
        }
        // Same streak: use random tie-breaker
        return b.randomTieBreaker - a.randomTieBreaker;
      })
      .slice(0, count)
      .map(item => item.word);
  };

  // Select words from each category
  selectedWords.push(...selectFromCategory(categorizedWords.new, composition.new));
  selectedWords.push(...selectFromCategory(categorizedWords.learning, composition.learning));
  selectedWords.push(...selectFromCategory(categorizedWords.reviewing, composition.reviewing));
  selectedWords.push(...selectFromCategory(categorizedWords.mastered, composition.mastered));

  // Final shuffle for variety
  return selectedWords.sort(() => Math.random() - 0.5);
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
