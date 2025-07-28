/**
 * Simplified Mastery Status Calculation
 * Optimized for performance and user experience
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
  
  // Mastered: High accuracy + consistent performance (streak is critical)
  if (accuracy >= 0.80 && streak >= 3) {
    return 'mastered';
  }
  
  // Reviewing: Established word needing reinforcement
  // This catches all cases where streak < 3 OR accuracy < 0.80
  return 'reviewing';
}

/**
 * Get optimal session composition based on mastery distribution
 */
export function getOptimalSessionComposition(
  available: {
    new: number;
    reviewing: number; 
    learning: number;
    mastered: number;
  },
  sessionSize: number = 15
): {
  new: number;
  reviewing: number;
  learning: number;
  mastered: number;
} {
  // Ideal ratios for effective learning (optimized for new flow)
  const idealRatios = {
    new: 0.68,
    learning: 0.15,
    reviewing: 0.10,
    mastered: 0.07
  };
  
  const composition = {
    new: Math.min(Math.floor(sessionSize * idealRatios.new), available.new),
    reviewing: Math.min(Math.floor(sessionSize * idealRatios.reviewing), available.reviewing),
    learning: Math.min(Math.floor(sessionSize * idealRatios.learning), available.learning),
    mastered: Math.min(Math.floor(sessionSize * idealRatios.mastered), available.mastered)
  };
  
  // Fill remaining slots with available words
  const totalAllocated = composition.new + composition.reviewing + composition.learning + composition.mastered;
  const remaining = sessionSize - totalAllocated;
  
  if (remaining > 0) {
    // Prioritize learning > reviewing > new > mastered (optimized for new flow)
    const remainingSlots = Math.min(remaining, 
      (available.learning - composition.learning) +
      (available.reviewing - composition.reviewing) +
      (available.new - composition.new) +
      (available.mastered - composition.mastered)
    );
    
    // Add extra learning words first (highest priority)
    const extraLearning = Math.min(remainingSlots, available.learning - composition.learning);
    composition.learning += extraLearning;
    
    const stillRemaining = remainingSlots - extraLearning;
    if (stillRemaining > 0) {
      const extraReviewing = Math.min(stillRemaining, available.reviewing - composition.reviewing);
      composition.reviewing += extraReviewing;
      
      const finalRemaining = stillRemaining - extraReviewing;
      if (finalRemaining > 0) {
        const extraNew = Math.min(finalRemaining, available.new - composition.new);
        composition.new += extraNew;
        
        const veryFinalRemaining = finalRemaining - extraNew;
        if (veryFinalRemaining > 0) {
          composition.mastered += Math.min(veryFinalRemaining, available.mastered - composition.mastered);
        }
      }
    }
  }
  
  return composition;
}

/**
 * Calculate review debt (overdue days)
 */
export function calculateReviewDebt(nextReviewDate: Date): number {
  const today = new Date();
  const timeDiff = today.getTime() - nextReviewDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  // Return debt days, capped at 7 for manageable load
  return Math.max(0, Math.min(daysDiff, 7));
}

/**
 * Calculate word priority for session selection within same mastery status
 */
export function calculateWordPriority(
  word: {
    nextReviewDate: Date;
    easeFactor: number;
    status: string;
  }
): number {
  const reviewDebt = calculateReviewDebt(word.nextReviewDate);
  const difficultyScore = (1 / word.easeFactor) * 5; // Higher = more difficult
  
  // Priority formula: debt weight + difficulty (status multiplier removed as unnecessary)
  return (reviewDebt * 10) + difficultyScore;
}

/**
 * Select optimal words based on priority and composition
 */
export function selectOptimalWords<T extends {
  nextReviewDate: Date;
  easeFactor: number;
  status: string;
}>(
  categorizedWords: Record<MasteryStatus, T[]>,
  composition: { new: number; reviewing: number; learning: number; mastered: number }
): T[] {
  const selectedWords: T[] = [];
  
  // Helper function to select words with priority sorting and randomization for equal priorities
  const selectFromCategory = (words: T[], count: number): T[] => {
    return words
      .map(word => ({
        word,
        priority: calculateWordPriority(word),
        randomTieBreaker: Math.random() // Add random value for tie-breaking
      }))
      .sort((a, b) => {
        // First sort by priority (higher first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // If priorities are equal, use random tie-breaker
        return b.randomTieBreaker - a.randomTieBreaker;
      })
      .slice(0, count)
      .map(item => item.word);
  };
  
  // Select words from each category
  selectedWords.push(...selectFromCategory(categorizedWords.new, composition.new));
  selectedWords.push(...selectFromCategory(categorizedWords.reviewing, composition.reviewing));
  selectedWords.push(...selectFromCategory(categorizedWords.learning, composition.learning));
  selectedWords.push(...selectFromCategory(categorizedWords.mastered, composition.mastered));
  
  // Final shuffle for variety (but maintain priority within types)
  return selectedWords.sort(() => Math.random() - 0.5);
}

/**
 * Get review statistics for user dashboard
 */
export function getReviewStatistics(words: Array<{
  nextReviewDate: Date;
  status: string;
}>): {
  dueToday: number;
  overdue: number;
  maxDebt: number;
  totalWords: number;
} {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  let dueToday = 0;
  let overdue = 0;
  let maxDebt = 0;
  
  words.forEach(word => {
    const debt = calculateReviewDebt(word.nextReviewDate);
    
    if (word.nextReviewDate <= today && debt === 0) {
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