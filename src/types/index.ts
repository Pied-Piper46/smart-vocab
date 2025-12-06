/**
 * Central Type Definitions for VocabMaster
 *
 * This file serves as the single source of truth for:
 * 1. Prisma database types (re-exported for convenience)
 * 2. Cross-cutting concerns (API, UI common types)
 *
 * Domain-specific types should be co-located with their logic:
 * - MasteryStatus → lib/mastery.ts
 * - Review scheduling → lib/review-scheduler.ts
 */

import type { MasteryStatus } from '@/lib/mastery';

// === Database Models (from Prisma) ===
// Re-export Prisma-generated types as the single source of truth
export type { User, Word, WordProgress, LearningSession } from '@prisma/client';

// Re-export domain-specific types for convenience
export type { MasteryStatus } from '@/lib/mastery';

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