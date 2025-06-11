/**
 * Word Data Types
 * Used for JSON data files and database integration
 */

export interface WordExample {
  id: string;
  english: string;
  japanese: string;
  difficulty: number; // 1-5 scale
  context: string; // e.g., "daily life", "business", "academic"
}

export interface WordData {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string; // IPA notation
  partOfSpeech: string; // noun, verb, adjective, etc.
  frequency: number; // Usage frequency ranking (higher = more common)
  examples: WordExample[];
}

export interface WordDataFile {
  words: WordData[];
  difficulty: 'easy' | 'medium' | 'hard';
  fileNumber: number;
}

// Difficulty levels mapping
export const DIFFICULTY_LEVELS = {
  easy: 1,
  medium: 2,
  hard: 3
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;

// Available word data files
export const WORD_DATA_FILES = {
  easy: ['easy1'],
  medium: ['medium1'], 
  hard: ['hard1']
} as const;

// For compatibility with existing SessionManager interface
export interface SessionWord extends WordData {
  progress?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: Date;
    streak: number;
    totalReviews: number;
    correctAnswers: number;
  };
}