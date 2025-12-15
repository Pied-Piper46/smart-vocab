/**
 * Session Storage Utilities
 * Manages localStorage for session resume feature (Authenticated & Guest)
 */

import type { SessionAnswer } from '@/types';
import type { WordData } from '@/lib/api-client';

// Storage keys for authenticated and guest sessions
const AUTH_SESSION_KEY = 'smart-vocab-session-resume';
const GUEST_SESSION_KEY = 'smart-vocab-guest-session';

/**
 * Get storage key based on authentication status
 */
const getStorageKey = (isAuthenticated: boolean): string =>
  isAuthenticated ? AUTH_SESSION_KEY : GUEST_SESSION_KEY;

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
export function saveSession(session: SavedSession, isAuthenticated: boolean = true): void {
  try {
    const key = getStorageKey(isAuthenticated);
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Load saved session from localStorage
 */
export function loadSession(isAuthenticated: boolean = true): SavedSession | null {
  try {
    const key = getStorageKey(isAuthenticated);
    const saved = localStorage.getItem(key);
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
export function clearSession(isAuthenticated: boolean = true): void {
  try {
    const key = getStorageKey(isAuthenticated);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Check if there's a saved session
 */
export function hasSavedSession(isAuthenticated: boolean = true): boolean {
  try {
    const key = getStorageKey(isAuthenticated);
    return localStorage.getItem(key) !== null;
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
  stats: { wordsStudied: number; wordsCorrect: number },
  isAuthenticated: boolean = true
): void {
  try {
    const session = loadSession(isAuthenticated);
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

    saveSession(updatedSession, isAuthenticated);
  } catch (error) {
    console.error('Failed to add session answer:', error);
  }
}

/**
 * Migrate guest session to authenticated user
 * Called after signup/signin to preserve guest's session data
 */
export async function migrateGuestSession(): Promise<boolean> {
  try {
    const guestSession = loadSession(false);

    if (!guestSession) {
      console.log('No guest session to migrate');
      return false;
    }

    // Move guest session to authenticated key
    saveSession(guestSession, true);

    // Clear guest session
    clearSession(false);

    console.log('✅ Guest session migrated successfully');
    return true;
  } catch (error) {
    console.error('Failed to migrate guest session:', error);
    return false;
  }
}

/**
 * Discard guest session if user doesn't register
 * Called when starting new session or returning to dashboard without auth
 */
export function discardGuestSessionIfNeeded(isAuthenticated: boolean): void {
  if (isAuthenticated) return; // Only discard for guests

  const guestSession = loadSession(false);

  if (guestSession) {
    console.log('🗑️ Discarding previous guest session (not registered)');
    clearSession(false);
  }
}
