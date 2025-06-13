import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/words/session - Get words for learning session
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }
    
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '15');
    const userId = currentUser.id;
    
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid difficulty. Must be: easy, medium, or hard',
        },
        { status: 400 }
      );
    }
    
    // Map difficulty to number
    const difficultyMap: Record<string, number> = {
      easy: 1,
      medium: 2,
      hard: 3,
    };
    
    // Get words for the specified difficulty
    const words = await prisma.word.findMany({
      where: {
        difficulty: difficultyMap[difficulty],
      },
      include: {
        examples: true,
        progress: {
          where: {
            userId,
          },
        },
      },
      take: limit,
      orderBy: {
        frequency: 'desc',
      },
    });
    
    // Transform data to match frontend expectations
    const sessionWords = words.map(word => ({
      id: word.id,
      english: word.english,
      japanese: word.japanese,
      phonetic: word.phonetic,
      partOfSpeech: word.partOfSpeech,
      frequency: word.frequency,
      examples: word.examples,
      // Add progress info if exists
      progress: word.progress[0] ? {
        easeFactor: word.progress[0].easeFactor,
        interval: word.progress[0].interval,
        repetitions: word.progress[0].repetitions,
        nextReviewDate: word.progress[0].nextReviewDate,
        streak: word.progress[0].streak,
        totalReviews: word.progress[0].totalReviews,
        correctAnswers: word.progress[0].correctAnswers,
      } : undefined,
    }));
    
    return NextResponse.json({
      success: true,
      data: sessionWords,
      count: sessionWords.length,
      difficulty,
    });
  } catch (error) {
    console.error('Error fetching session words:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session words',
      },
      { status: 500 }
    );
  }
}