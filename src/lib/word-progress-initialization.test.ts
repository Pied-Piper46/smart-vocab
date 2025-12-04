/**
 * Tests for word progress initialization logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeUserWordProgress } from './word-progress-initialization';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrismaClient = {
  word: {
    findMany: vi.fn(),
  },
  wordProgress: {
    createMany: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(function(this: any) {
      return mockPrismaClient;
    }),
  };
});

describe('initializeUserWordProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create WordProgress for all words when user has no progress', async () => {
    const userId = 'test-user-id';
    const mockWords = [
      { id: 'word-1' },
      { id: 'word-2' },
      { id: 'word-3' },
    ];

    // Mock word.findMany to return test words
    vi.mocked(mockPrismaClient.word.findMany).mockResolvedValue(mockWords as any);

    // Mock wordProgress.createMany to return success
    vi.mocked(mockPrismaClient.wordProgress.createMany).mockResolvedValue({ count: 3 });

    const result = await initializeUserWordProgress(userId);

    // Verify word.findMany was called
    expect(mockPrismaClient.word.findMany).toHaveBeenCalledWith({
      select: { id: true },
    });

    // Verify wordProgress.createMany was called with correct data
    expect(mockPrismaClient.wordProgress.createMany).toHaveBeenCalledWith({
      data: mockWords.map(word => ({
        userId,
        wordId: word.id,
        status: 'new',
        recommendedReviewDate: expect.any(Date),
      })),
      skipDuplicates: true,
    });

    // Verify result
    expect(result).toEqual({
      success: true,
      count: 3,
    });
  });

  it('should handle empty word list gracefully', async () => {
    const userId = 'test-user-id';

    // Mock word.findMany to return empty array
    vi.mocked(mockPrismaClient.word.findMany).mockResolvedValue([]);

    // Mock wordProgress.createMany
    vi.mocked(mockPrismaClient.wordProgress.createMany).mockResolvedValue({ count: 0 });

    const result = await initializeUserWordProgress(userId);

    // Verify wordProgress.createMany was called with empty array
    expect(mockPrismaClient.wordProgress.createMany).toHaveBeenCalledWith({
      data: [],
      skipDuplicates: true,
    });

    // Verify result
    expect(result).toEqual({
      success: true,
      count: 0,
    });
  });

  it('should handle database errors and return failure result', async () => {
    const userId = 'test-user-id';
    const dbError = new Error('Database connection failed');

    // Mock word.findMany to throw error
    vi.mocked(mockPrismaClient.word.findMany).mockRejectedValue(dbError);

    const result = await initializeUserWordProgress(userId);

    // Verify error handling
    expect(result).toEqual({
      success: false,
      error: 'Database connection failed',
    });
  });
});
