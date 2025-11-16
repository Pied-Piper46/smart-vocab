import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { getOptimalSessionComposition, selectOptimalWords, type MasteryStatus } from '@/lib/mastery';

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
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = currentUser.id;

    // Get all words with progress data (no difficulty filtering)
    const allWords = await prisma.word.findMany({
      include: {
        progress: {
          where: {
            userId,
          },
        },
      },
    });

    // Categorize words by mastery status
    const categorizedWords: Record<MasteryStatus, Array<{
      id: string;
      english: string;
      japanese: string;
      phonetic: string | null;
      partOfSpeech: string;
      exampleEnglish: string;
      exampleJapanese: string;
      createdAt: Date;
      updatedAt: Date;
      progress: Array<{
        id: string;
        userId: string;
        wordId: string;
        totalReviews: number;
        correctAnswers: number;
        streak: number;
        lastAnswerCorrect: boolean;
        lastReviewedAt: Date | null;
        recommendedReviewDate: Date;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
      // Extended properties for selection
      recommendedReviewDate: Date;
      lastReviewedAt: Date | null;
      streak: number;
      totalReviews: number;
      correctAnswers: number;
      status: string;
    }>> = {
      new: [],
      learning: [],
      reviewing: [],
      mastered: []
    };

    allWords.forEach(word => {
      const progress = word.progress[0]; // Get user's progress for this word

      // Prepare word with extended properties for selection algorithm
      const wordWithProgress = {
        ...word,
        recommendedReviewDate: progress?.recommendedReviewDate || new Date(),
        lastReviewedAt: progress?.lastReviewedAt || null,
        streak: progress?.streak || 0,
        totalReviews: progress?.totalReviews || 0,
        correctAnswers: progress?.correctAnswers || 0,
        status: progress?.status || 'new'
      };

      if (!progress) {
        // No progress = new word
        categorizedWords.new.push(wordWithProgress);
      } else {
        const status = progress.status as MasteryStatus || 'new';
        categorizedWords[status].push(wordWithProgress);
      }
    });

    // Get optimal composition
    const available = {
      new: categorizedWords.new.length,
      learning: categorizedWords.learning.length,
      reviewing: categorizedWords.reviewing.length,
      mastered: categorizedWords.mastered.length
    };

    const composition = getOptimalSessionComposition(available, limit);

    // Use advanced selection algorithm
    const selectedWords = selectOptimalWords(categorizedWords, composition);

    // Transform data to match frontend expectations
    const sessionWords = selectedWords.map(word => ({
      id: word.id,
      english: word.english,
      japanese: word.japanese,
      phonetic: word.phonetic,
      partOfSpeech: word.partOfSpeech,
      exampleEnglish: word.exampleEnglish,
      exampleJapanese: word.exampleJapanese,
      // Add progress info if exists
      progress: word.progress[0] ? {
        totalReviews: word.progress[0].totalReviews,
        correctAnswers: word.progress[0].correctAnswers,
        streak: word.progress[0].streak,
        lastAnswerCorrect: word.progress[0].lastAnswerCorrect,
        lastReviewedAt: word.progress[0].lastReviewedAt?.toISOString() || null,
        recommendedReviewDate: word.progress[0].recommendedReviewDate.toISOString(),
        status: word.progress[0].status,
      } : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: sessionWords,
      count: sessionWords.length,
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
