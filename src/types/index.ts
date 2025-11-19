// Central type definitions for VocabMaster

// === Database Models ===
export interface User {
  id: string;
  email: string;
  emailVerified?: Date | null;
  hashedPassword?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string | null;
  partOfSpeech: string;
  exampleEnglish: string;
  exampleJapanese: string;
  createdAt: Date;
  updatedAt: Date;
  progress?: WordProgress;
}

export interface WordProgress {
  id: string;
  userId: string;
  wordId: string;
  totalReviews: number;
  correctAnswers: number;
  streak: number;
  lastReviewedAt?: Date | null;
  recommendedReviewDate: Date;
  status: MasteryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningSession {
  id: string;
  userId: string;
  completedAt: Date;
}

// === Learning System Types ===
export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

export type LearningMode = 'eng_to_jpn' | 'jpn_to_eng' | 'audio_recognition' | 'context_fill';

export interface SessionAnswer {
  wordId: string;
  isCorrect: boolean;
  responseTime: number;
  mode: LearningMode;
}

export interface SessionStats {
  wordsStudied: number;
  wordsCorrect: number;
  sessionType: string;
}

export interface WordStatusChange {
  wordId: string;
  english: string;
  japanese: string;
  from: MasteryStatus;
  to: MasteryStatus;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
}

export interface SessionFeedback {
  totalWords: number;
  correctAnswers: number;
  accuracy: number;
  streak: number;
  levelUps: WordStatusChange[];
  levelDowns: WordStatusChange[];
  newWords: WordStatusChange[];
  duration: number;
}

// === API Response Types ===
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProgressUpdateResult {
  wordId: string;
  statusChanged: boolean;
  newStatus: MasteryStatus;
  previousStatus: MasteryStatus;
  isUpgrade: boolean;
}

export interface BatchUpdateResult {
  wordsProcessed: number;
  statusChanges: {
    upgrades: ProgressUpdateResult[];
    downgrades: ProgressUpdateResult[];
    maintained: ProgressUpdateResult[];
  };
}

export interface AnalyticsData {
  streaks: {
    current: number;
    longest: number;
  };
  masteryStats: {
    learning: number;
    reviewing: number;
    mastered: number;
  };
  learningProgress: Record<string, number>;
  recentlyMastered: Word[];
  goalAchievementRate: number;
}

export interface DailyProgress {
  dailyGoal: number;
  wordsStudiedToday: number;
  sessionsToday: number;
  progressPercentage: number;
  isGoalReached: boolean;
}

export interface LearningHistory {
  month: string;
  year: number;
  days: Array<{
    day: number;
    sessionCount: number;
    totalWords: number;
  }>;
  totalSessions: number;
  totalWords: number;
  activeDays: number;
}

export interface StrugglingWord {
  word: Word;
  totalReviews: number;
  correctAnswers: number;
  accuracy: number;
  status: MasteryStatus;
}

export interface SessionHistory {
  totalSessions: number;
  recentSessions: LearningSession[];
  thisWeek: number;
  thisMonth: number;
  streak: number;
}

// === UI Component Types ===
export interface UserProfile {
  email: string;
  createdAt: Date;
  // Computed fields (calculated from other tables)
  currentStreak?: number;
  longestStreak?: number;
  totalWordsLearned?: number;
  totalStudyTime?: number;
}

export interface DifficultyOption {
  value: string;
  label: string;
  description: string;
  color: string;
}

// === Utility Types ===
export type SessionState = 'setup' | 'active' | 'completed';

export interface WordProgressData {
  totalReviews: number;
  correctAnswers: number;
  streak: number;
}

export interface SessionComposition {
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
}

export interface ReviewStatistics {
  dueToday: number;
  overdue: number;
  maxDebt: number;
  totalWords: number;
}

export interface MasteryDisplayInfo {
  label: string;
  color: string;
  description: string;
}