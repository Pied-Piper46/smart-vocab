import { describe, it, expect } from 'vitest';
import {
  calculateProgressClient,
  calculateSessionProgressClient,
  type CurrentProgress,
} from './client-progress-calculator';
import type { SessionAnswer } from '@/types';

describe('Client Progress Calculator', () => {
  describe('calculateProgressClient', () => {
    it('should increment totalReviews and correctAnswers on correct answer', () => {
      const current: CurrentProgress = {
        totalReviews: 5,
        correctAnswers: 4,
        streak: 2,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      expect(result.totalReviews).toBe(6);
      expect(result.correctAnswers).toBe(5);
      expect(result.streak).toBe(3);
      expect(result.accuracy).toBeCloseTo(5/6, 2);
    });

    it('should reset streak on incorrect answer', () => {
      const current: CurrentProgress = {
        totalReviews: 5,
        correctAnswers: 4,
        streak: 2,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: false,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      expect(result.totalReviews).toBe(6);
      expect(result.correctAnswers).toBe(4);
      expect(result.streak).toBe(0);
      expect(result.accuracy).toBeCloseTo(4/6, 2);
    });

    it('should detect status change from learning to mastered (streak >= 3)', () => {
      const current: CurrentProgress = {
        totalReviews: 4,
        correctAnswers: 3,
        streak: 2,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      expect(result.status).toBe('mastered'); // streak = 3
      expect(result.statusChanged).toBe(true);
      expect(result.previousStatus).toBe('learning');
    });

    it('should detect status change from learning to mastered (streak >= 2 && accuracy >= 0.80)', () => {
      const current: CurrentProgress = {
        totalReviews: 4,
        correctAnswers: 4,
        streak: 1,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      // totalReviews: 5, correctAnswers: 5, streak: 2, accuracy: 1.0 (100%)
      expect(result.totalReviews).toBe(5);
      expect(result.correctAnswers).toBe(5);
      expect(result.streak).toBe(2);
      expect(result.accuracy).toBe(1.0);
      expect(result.status).toBe('mastered'); // streak >= 2 && accuracy >= 0.80
      expect(result.statusChanged).toBe(true);
    });

    it('should keep status as learning for totalReviews <= 3', () => {
      const current: CurrentProgress = {
        totalReviews: 2,
        correctAnswers: 2,
        streak: 2,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      // totalReviews: 3 (still <= 3)
      expect(result.totalReviews).toBe(3);
      expect(result.streak).toBe(3);
      expect(result.status).toBe('learning'); // totalReviews <= 3
      expect(result.statusChanged).toBe(false);
    });

    it('should keep status as new for first review', () => {
      const current: CurrentProgress = {
        totalReviews: 0,
        correctAnswers: 0,
        streak: 0,
        status: 'new'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      // After first review, totalReviews = 1, should be 'learning'
      expect(result.totalReviews).toBe(1);
      expect(result.status).toBe('learning');
      expect(result.statusChanged).toBe(true);
      expect(result.previousStatus).toBe('new');
    });

    it('should transition from learning to reviewing when conditions not met for mastered', () => {
      const current: CurrentProgress = {
        totalReviews: 4,
        correctAnswers: 2,
        streak: 1,
        status: 'learning'
      };

      const answer: SessionAnswer = {
        wordId: 'word_001',
        isCorrect: true,
        responseTime: 1500,
        mode: 'eng_to_jpn'
      };

      const result = calculateProgressClient(current, answer);

      // totalReviews: 5, correctAnswers: 3, streak: 2, accuracy: 0.6
      // Not mastered (streak < 3 && accuracy < 0.80)
      expect(result.totalReviews).toBe(5);
      expect(result.streak).toBe(2);
      expect(result.accuracy).toBe(0.6);
      expect(result.status).toBe('reviewing');
      expect(result.statusChanged).toBe(true);
    });
  });

  describe('calculateSessionProgressClient', () => {
    it('should calculate progress for multiple answers', () => {
      const initialProgress = new Map<string, CurrentProgress>([
        ['word_001', { totalReviews: 2, correctAnswers: 1, streak: 1, status: 'learning' }],
        ['word_002', { totalReviews: 5, correctAnswers: 4, streak: 2, status: 'reviewing' }],
      ]);

      const answers: SessionAnswer[] = [
        { wordId: 'word_001', isCorrect: true, responseTime: 1500, mode: 'eng_to_jpn' },
        { wordId: 'word_002', isCorrect: true, responseTime: 1200, mode: 'jpn_to_eng' },
      ];

      const results = calculateSessionProgressClient(initialProgress, answers);

      expect(results).toHaveLength(2);

      // word_001: totalReviews: 3, streak: 2, status: learning (totalReviews <= 3)
      expect(results[0].wordId).toBe('word_001');
      expect(results[0].totalReviews).toBe(3);
      expect(results[0].streak).toBe(2);
      expect(results[0].status).toBe('learning');

      // word_002: totalReviews: 6, streak: 3, status: mastered (streak >= 3)
      expect(results[1].wordId).toBe('word_002');
      expect(results[1].totalReviews).toBe(6);
      expect(results[1].streak).toBe(3);
      expect(results[1].status).toBe('mastered');
    });

    it('should handle streak reset on incorrect answer in session', () => {
      const initialProgress = new Map<string, CurrentProgress>([
        ['word_001', { totalReviews: 4, correctAnswers: 3, streak: 2, status: 'learning' }],
        ['word_002', { totalReviews: 4, correctAnswers: 3, streak: 2, status: 'learning' }],
      ]);

      const answers: SessionAnswer[] = [
        { wordId: 'word_001', isCorrect: true, responseTime: 1500, mode: 'eng_to_jpn' },
        { wordId: 'word_002', isCorrect: false, responseTime: 3000, mode: 'eng_to_jpn' },
      ];

      const results = calculateSessionProgressClient(initialProgress, answers);

      expect(results).toHaveLength(2);

      // word_001: correct → streak = 3 → mastered
      expect(results[0].streak).toBe(3);
      expect(results[0].status).toBe('mastered');

      // word_002: incorrect → streak = 0 → reviewing
      expect(results[1].streak).toBe(0);
      expect(results[1].status).toBe('reviewing');
    });

    it('should skip words with no initial progress', () => {
      const initialProgress = new Map<string, CurrentProgress>([
        ['word_001', { totalReviews: 2, correctAnswers: 1, streak: 1, status: 'learning' }],
      ]);

      const answers: SessionAnswer[] = [
        { wordId: 'word_001', isCorrect: true, responseTime: 1500, mode: 'eng_to_jpn' },
        { wordId: 'word_002', isCorrect: true, responseTime: 1200, mode: 'jpn_to_eng' }, // No initial progress
      ];

      const results = calculateSessionProgressClient(initialProgress, answers);

      // Only word_001 should be processed
      expect(results).toHaveLength(1);
      expect(results[0].wordId).toBe('word_001');
    });

    it('should handle empty answers array', () => {
      const initialProgress = new Map<string, CurrentProgress>([
        ['word_001', { totalReviews: 2, correctAnswers: 1, streak: 1, status: 'learning' }],
      ]);

      const answers: SessionAnswer[] = [];

      const results = calculateSessionProgressClient(initialProgress, answers);

      expect(results).toHaveLength(0);
    });

    it('should correctly update progress cache for sequential answers', () => {
      const initialProgress = new Map<string, CurrentProgress>([
        ['word_001', { totalReviews: 2, correctAnswers: 1, streak: 0, status: 'learning' }],
      ]);

      const answers: SessionAnswer[] = [
        { wordId: 'word_001', isCorrect: true, responseTime: 1500, mode: 'eng_to_jpn' },
        { wordId: 'word_001', isCorrect: true, responseTime: 1400, mode: 'jpn_to_eng' }, // Same word again
      ];

      const results = calculateSessionProgressClient(initialProgress, answers);

      expect(results).toHaveLength(2);

      // First answer: totalReviews: 3, streak: 1
      expect(results[0].totalReviews).toBe(3);
      expect(results[0].streak).toBe(1);

      // Second answer: totalReviews: 4, streak: 2 (cache updated)
      expect(results[1].totalReviews).toBe(4);
      expect(results[1].streak).toBe(2);
    });
  });
});
