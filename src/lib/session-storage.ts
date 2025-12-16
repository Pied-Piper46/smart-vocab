/**
 * Session Storage Utilities
 * Manages localStorage for session resume feature (Authenticated & Guest)
 */

import type { SessionAnswer } from '@/types';
import type { WordData } from '@/lib/api-client';

// Storage key prefixes for authenticated and guest sessions
const AUTH_SESSION_PREFIX = 'smart-vocab-session-resume';
const GUEST_SESSION_KEY = 'smart-vocab-guest-session';

// Guest session expiry time (24 hours in milliseconds)
const GUEST_SESSION_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Get storage key based on authentication status and user ID
 * For authenticated users, include userId to prevent cross-user data leakage
 * For guest users, use a shared key (one guest per browser)
 */
const getStorageKey = (isAuthenticated: boolean, userId?: string): string => {
  if (isAuthenticated && userId) {
    return `${AUTH_SESSION_PREFIX}-${userId}`;
  }
  return isAuthenticated ? AUTH_SESSION_PREFIX : GUEST_SESSION_KEY;
};

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
export function saveSession(session: SavedSession, isAuthenticated: boolean = true, userId?: string): void {
  try {
    const key = getStorageKey(isAuthenticated, userId);
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
}

/**
 * Load saved session from localStorage
 * For guest sessions, check expiry and delete if expired
 */
export function loadSession(isAuthenticated: boolean = true, userId?: string): SavedSession | null {
  try {
    const key = getStorageKey(isAuthenticated, userId);
    const saved = localStorage.getItem(key);
    if (!saved) return null;

    const session = JSON.parse(saved) as SavedSession;

    // Check expiry for guest sessions only
    if (!isAuthenticated) {
      const sessionStartTime = new Date(session.startedAt).getTime();
      const now = Date.now();
      const sessionAge = now - sessionStartTime;

      if (sessionAge > GUEST_SESSION_EXPIRY) {
        console.log('🗑️ Guest session expired (older than 24 hours), removing...');
        clearSession(false);
        return null;
      }
    }

    return session;
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved session from localStorage
 */
export function clearSession(isAuthenticated: boolean = true, userId?: string): void {
  try {
    const key = getStorageKey(isAuthenticated, userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
}

/**
 * Check if there's a saved session
 */
export function hasSavedSession(isAuthenticated: boolean = true, userId?: string): boolean {
  try {
    const key = getStorageKey(isAuthenticated, userId);
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
  isAuthenticated: boolean = true,
  userId?: string
): void {
  try {
    const session = loadSession(isAuthenticated, userId);
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

    saveSession(updatedSession, isAuthenticated, userId);
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
