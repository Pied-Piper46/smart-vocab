/**
 * Word progress initialization logic
 * Handles initial WordProgress setup for new users
 */

import { PrismaClient } from '@prisma/client';

export interface InitializationResult {
  success: boolean;
  count?: number;
  error?: string;
}

/**
 * Initialize WordProgress for a new user
 * Creates progress records for all available words with status 'new'
 *
 * @param userId - User ID to initialize progress for
 * @param prismaClient - Optional Prisma client instance (for dependency injection)
 * @returns Result object with success status and count
 */
export async function initializeUserWordProgress(
  userId: string,
  prismaClient?: PrismaClient
): Promise<InitializationResult> {
  const prisma = prismaClient || new PrismaClient();

  try {
    // Fetch all word IDs
    const words = await prisma.word.findMany({
      select: { id: true },
    });

    // Create WordProgress records for all words
    const result = await prisma.wordProgress.createMany({
      data: words.map(word => ({
        userId,
        wordId: word.id,
        status: 'new',
        recommendedReviewDate: new Date(),
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      count: result.count,
    };
  } catch (error) {
    console.error('Error initializing user word progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Clean up Prisma client if we created it
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}
