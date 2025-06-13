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
    
    // Get all words for the specified difficulty with progress data
    const allWords = await prisma.word.findMany({
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
      orderBy: {
        frequency: 'desc',
      },
    });

    // Categorize words by mastery status
    const categorizedWords: Record<MasteryStatus, typeof allWords> = {
      new: [],
      reviewing: [],
      learning: [],
      mastered: []
    };

    allWords.forEach(word => {
      const progress = word.progress[0]; // Get user's progress for this word
      
      if (!progress) {
        // No progress = new word
        categorizedWords.new.push(word);
      } else {
        const status = progress.status as MasteryStatus || 'new';
        categorizedWords[status].push(word);
      }
    });

    // Get optimal composition
    const available = {
      new: categorizedWords.new.length,
      reviewing: categorizedWords.reviewing.length,
      learning: categorizedWords.learning.length,
      mastered: categorizedWords.mastered.length
    };

    const composition = getOptimalSessionComposition(available, limit);

    // Select words using advanced priority-based algorithm
    const wordsWithProgress = Object.entries(categorizedWords).flatMap(([status, words]) =>
      words.map(word => ({
        ...word,
        status,
        nextReviewDate: word.progress[0]?.nextReviewDate || new Date(),
        easeFactor: word.progress[0]?.easeFactor || 2.5
      }))
    );

    // Re-categorize with typed data
    const typedCategorizedWords: Record<MasteryStatus, typeof wordsWithProgress> = {
      new: [],
      reviewing: [],
      learning: [],
      mastered: []
    };

    wordsWithProgress.forEach(word => {
      const status = word.status as MasteryStatus;
      typedCategorizedWords[status].push(word);
    });

    // Use advanced selection algorithm
    const shuffledWords = selectOptimalWords(typedCategorizedWords, composition);
    
    // Transform data to match frontend expectations
    const sessionWords = shuffledWords.map(word => ({
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
        status: word.progress[0].status,
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