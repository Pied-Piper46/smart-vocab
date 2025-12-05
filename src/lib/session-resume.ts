/**
 * Session Resume Utilities
 * Manages localStorage for session resume feature
 */

import type { SessionAnswer } from '@/types';
import type { WordData } from '@/lib/api-client';

const STORAGE_KEY = 'smart-vocab-session-resume';

export interface SavedSession {
  sessionId: string;
  startedAt: string;
  words: WordData[]; // Complete WordData including progress
  currentWordIndex: number;
  answers: SessionAnswer[];
  stats: {
    wordsStudied: number;
    wordsCorrect: number;
  };
}

/**
 * Save current session state to localStorage
 */
export function saveSession(session: SavedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Load saved session from localStorage
 */
export function loadSession(): SavedSession | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as SavedSession;
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved session from localStorage
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Check if there's a saved session
 */
export function hasSavedSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error('Failed to check for saved session:', error);
    return false;
  }
}

/**
 * Add a new answer to the current session and update progress
 * This function:
 * 1. Loads the current session from localStorage
 * 2. Appends the new answer to the answers array
 * 3. Increments currentWordIndex
 * 4. Updates stats
 * 5. Saves the updated session back to localStorage
 *
 * Note: words data is preserved from session start (not updated)
 */
export function addSessionAnswer(
  answer: SessionAnswer,
  stats: { wordsStudied: number; wordsCorrect: number }
): void {
  try {
    const session = loadSession();
    if (!session) {
      console.warn('No session found - cannot add answer');
      return;
    }

    // Update session with new answer and incremented index
    const updatedSession: SavedSession = {
      ...session,
      currentWordIndex: session.currentWordIndex + 1,
      answers: [...session.answers, answer],
      stats,
    };

    saveSession(updatedSession);
  } catch (error) {
    console.error('Failed to add session answer:', error);
  }
}
