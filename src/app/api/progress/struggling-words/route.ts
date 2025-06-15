import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/progress/struggling-words - Get words user is struggling with
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // Find words with 3+ reviews and accuracy <= 33%
    const strugglingWords = await prisma.wordProgress.findMany({
      where: {
        userId,
        totalReviews: {
          gte: 3,
        },
      },
      include: {
        word: {
          select: {
            english: true,
            japanese: true,
            partOfSpeech: true,
          },
        },
      },
    });

    // Filter by accuracy rate
    const filteredWords = strugglingWords
      .filter((progress) => {
        const accuracy = progress.totalReviews > 0 
          ? (progress.correctAnswers / progress.totalReviews) * 100 
          : 0;
        return accuracy <= 33;
      })
      .map((progress) => ({
        word: progress.word,
        totalReviews: progress.totalReviews,
        correctAnswers: progress.correctAnswers,
        accuracy: Math.round((progress.correctAnswers / progress.totalReviews) * 100),
        status: progress.status,
        updatedAt: progress.updatedAt,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Sort by worst accuracy first

    return NextResponse.json({
      success: true,
      data: filteredWords,
      count: filteredWords.length,
    });
  } catch (error) {
    console.error('Error fetching struggling words:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch struggling words',
      },
      { status: 500 }
    );
  }
}