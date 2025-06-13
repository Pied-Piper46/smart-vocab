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
 */
export function calculateMasteryStatus(progress: WordProgressData): MasteryStatus {
  const { totalReviews, correctAnswers, streak } = progress;
  
  // New words (less than 3 reviews)
  if (totalReviews < 3) {
    return 'new';
  }
  
  const accuracy = correctAnswers / totalReviews;
  
  // Mastered: High accuracy + consistent performance
  if (accuracy >= 0.85 && streak >= 4) {
    return 'mastered';
  }
  
  // Learning: Good progress with some consistency
  if (accuracy >= 0.7 && streak >= 2) {
    return 'learning';
  }
  
  // Reviewing: Needs more practice
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
  // Ideal ratios for effective learning
  const idealRatios = {
    new: 0.20,        // 20% - New vocabulary introduction
    reviewing: 0.50,  // 50% - Reinforcement of difficult words
    learning: 0.25,   // 25% - Progressive improvement
    mastered: 0.05    // 5% - Retention maintenance
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
    // Prioritize reviewing > learning > new > mastered
    const remainingSlots = Math.min(remaining, 
      (available.reviewing - composition.reviewing) +
      (available.learning - composition.learning) +
      (available.new - composition.new) +
      (available.mastered - composition.mastered)
    );
    
    // Add extra reviewing words first
    const extraReviewing = Math.min(remainingSlots, available.reviewing - composition.reviewing);
    composition.reviewing += extraReviewing;
    
    const stillRemaining = remainingSlots - extraReviewing;
    if (stillRemaining > 0) {
      const extraLearning = Math.min(stillRemaining, available.learning - composition.learning);
      composition.learning += extraLearning;
      
      const finalRemaining = stillRemaining - extraLearning;
      if (finalRemaining > 0) {
        composition.new += Math.min(finalRemaining, available.new - composition.new);
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
 * Calculate word priority for session selection
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
  
  let statusMultiplier = 1;
  switch (word.status) {
    case 'reviewing':
      statusMultiplier = 3; // Highest priority
      break;
    case 'learning':
      statusMultiplier = 2;
      break;
    case 'new':
      statusMultiplier = 1.5;
      break;
    case 'mastered':
      statusMultiplier = 0.5; // Lowest priority
      break;
  }
  
  // Priority formula: debt weight + difficulty + status importance
  return (reviewDebt * 10) + difficultyScore + statusMultiplier;
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
  
  // Helper function to select words with priority sorting
  const selectFromCategory = (words: T[], count: number): T[] => {
    return words
      .map(word => ({
        word,
        priority: calculateWordPriority(word)
      }))
      .sort((a, b) => b.priority - a.priority) // Higher priority first
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
        color: 'bg-blue-500',
        description: '初回学習'
      };
    case 'learning':
      return {
        label: '学習中',
        color: 'bg-yellow-500', 
        description: '習得進行中'
      };
    case 'reviewing':
      return {
        label: '復習中',
        color: 'bg-orange-500',
        description: '要復習強化'
      };
    case 'mastered':
      return {
        label: '習得済',
        color: 'bg-green-500',
        description: '習得完了'
      };
  }
}