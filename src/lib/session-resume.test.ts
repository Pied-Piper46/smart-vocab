import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveSession,
  loadSession,
  clearSession,
  hasSavedSession,
  addSessionAnswer,
  type SavedSession,
} from './session-resume';
import type { SessionAnswer } from '@/types';
import type { WordData } from './api-client';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Setup global localStorage mock
beforeEach(() => {
  global.localStorage = localStorageMock as Storage;
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe('session-resume utilities', () => {
  const mockWord: WordData = {
    id: 'word_001',
    english: 'apple',
    japanese: 'りんご',
    phonetic: '/ˈæpəl/',
    partOfSpeech: 'noun',
    difficulty: 1,
    frequency: 100,
    examples: [],
    progress: {
      totalReviews: 0,
      correctAnswers: 0,
      streak: 0,
      status: 'new',
      lastReviewedAt: null,
      recommendedReviewDate: new Date().toISOString(),
    },
  };

  const mockSession: SavedSession = {
    sessionId: 'session-123',
    startedAt: new Date().toISOString(),
    words: [mockWord],
    currentWordIndex: 0,
    answers: [],
    stats: {
      wordsStudied: 0,
      wordsCorrect: 0,
    },
  };

  describe('saveSession', () => {
    it('should save session to localStorage', () => {
      saveSession(mockSession);

      const saved = localStorage.getItem('smart-vocab-session-resume');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.words).toHaveLength(1);
      expect(parsed.currentWordIndex).toBe(0);
    });
  });

  describe('loadSession', () => {
    it('should load session from localStorage', () => {
      saveSession(mockSession);

      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe('session-123');
      expect(loaded?.words).toHaveLength(1);
      expect(loaded?.currentWordIndex).toBe(0);
    });

    it('should return null when no session exists', () => {
      const loaded = loadSession();
      expect(loaded).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should remove session from localStorage', () => {
      saveSession(mockSession);
      expect(hasSavedSession()).toBe(true);

      clearSession();
      expect(hasSavedSession()).toBe(false);
    });
  });

  describe('hasSavedSession', () => {
    it('should return true when session exists', () => {
      saveSession(mockSession);
      expect(hasSavedSession()).toBe(true);
    });

    it('should return false when no session exists', () => {
      expect(hasSavedSession()).toBe(false);
    });
  });

  describe('addSessionAnswer', () => {
    it('should add answer to session and increment currentWordIndex', () => {
      // Setup: Save initial session
      saveSession(mockSession);

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: Date.now(),
        mode: 'eng_to_jpn',
      };

      const updatedStats = {
        wordsStudied: 1,
        wordsCorrect: 1,
      };

      // Execute: Add answer
      addSessionAnswer(answer, updatedStats);

      // Verify: Session updated correctly
      const loaded = loadSession();
      expect(loaded).not.toBeNull();
      expect(loaded?.answers).toHaveLength(1);
      expect(loaded?.answers[0].wordId).toBe('word_001');
      expect(loaded?.answers[0].isCorrect).toBe(true);
      expect(loaded?.currentWordIndex).toBe(1);
      expect(loaded?.stats.wordsStudied).toBe(1);
      expect(loaded?.stats.wordsCorrect).toBe(1);
    });

    it('should preserve words data when adding answers', () => {
      // Setup: Save initial session
      saveSession(mockSession);

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: false,
        responseTime: Date.now(),
        mode: 'jpn_to_eng',
      };

      const updatedStats = {
        wordsStudied: 1,
        wordsCorrect: 0,
      };

      // Execute: Add answer
      addSessionAnswer(answer, updatedStats);

      // Verify: Words data unchanged
      const loaded = loadSession();
      expect(loaded?.words).toHaveLength(1);
      expect(loaded?.words[0].id).toBe('word_001');
      expect(loaded?.words[0].english).toBe('apple');
    });

    it('should handle multiple answers correctly', () => {
      // Setup: Save initial session
      saveSession(mockSession);

      // Add first answer
      const answer1: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: Date.now(),
        mode: 'eng_to_jpn',
      };
      addSessionAnswer(answer1, { wordsStudied: 1, wordsCorrect: 1 });

      // Add second answer
      const answer2: SessionAnswer = {
        wordId: 'word_002',
        isCorrect: false,
        responseTime: Date.now(),
        mode: 'audio_recognition',
      };
      addSessionAnswer(answer2, { wordsStudied: 2, wordsCorrect: 1 });

      // Verify: Both answers saved
      const loaded = loadSession();
      expect(loaded?.answers).toHaveLength(2);
      expect(loaded?.currentWordIndex).toBe(2);
      expect(loaded?.stats.wordsStudied).toBe(2);
      expect(loaded?.stats.wordsCorrect).toBe(1);
    });

    it('should do nothing when no session exists', () => {
      // No session saved
      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: Date.now(),
        mode: 'eng_to_jpn',
      };

      // Execute: Try to add answer
      addSessionAnswer(answer, { wordsStudied: 1, wordsCorrect: 1 });

      // Verify: No session created
      expect(hasSavedSession()).toBe(false);
    });
  });
});
