import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/progress - Get user's word progress
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }
    
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');
    const userId = currentUser.id;
    
    if (wordId) {
      // Get specific word progress
      const progress = await prisma.wordProgress.findUnique({
        where: {
          userId_wordId: {
            userId,
            wordId,
          },
        },
        include: {
          word: {
            include: {
              examples: true,
            },
          },
        },
      });
      
      return NextResponse.json({
        success: true,
        data: progress,
      });
    } else {
      // Get all word progress for user
      const progressList = await prisma.wordProgress.findMany({
        where: {
          userId,
        },
        include: {
          word: {
            include: {
              examples: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      
      return NextResponse.json({
        success: true,
        data: progressList,
        count: progressList.length,
      });
    }
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch progress',
      },
      { status: 500 }
    );
  }
}

// POST /api/progress - Update word progress
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }
    
    const body = await request.json();
    const { wordId, isCorrect, learningMode } = body;
    const userId = currentUser.id;
    
    // Validate required fields
    if (!wordId || isCorrect === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: wordId, isCorrect',
        },
        { status: 400 }
      );
    }
    
    // Get or create word progress
    let progress = await prisma.wordProgress.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
    });
    
    if (!progress) {
      // Create new progress entry
      progress = await prisma.wordProgress.create({
        data: {
          userId,
          wordId,
          totalReviews: 0,
          correctAnswers: 0,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          status: 'new',
        },
      });
    }
    
    // Update progress based on answer
    const newTotalReviews = progress.totalReviews + 1;
    const newCorrectAnswers = progress.correctAnswers + (isCorrect ? 1 : 0);
    const accuracy = newCorrectAnswers / newTotalReviews;
    
    // Simple spaced repetition logic
    let newEaseFactor = progress.easeFactor;
    let newInterval = progress.interval;
    let newRepetitions = progress.repetitions;
    let newStatus = progress.status;
    
    if (isCorrect) {
      newRepetitions += 1;
      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(newInterval * newEaseFactor);
      }
      
      // Update status based on accuracy and repetitions
      if (accuracy >= 0.8 && newRepetitions >= 3) {
        newStatus = 'mastered';
      } else if (newRepetitions >= 1) {
        newStatus = 'learning';
      }
    } else {
      newRepetitions = 0;
      newInterval = 1;
      newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
      newStatus = newTotalReviews >= 3 ? 'learning' : 'new';
    }
    
    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    // Update learning mode specific stats
    const modeUpdates: Record<string, { increment: number }> = {};
    if (learningMode === 'eng_to_jpn') {
      modeUpdates.engToJpnTotal = { increment: 1 };
      if (isCorrect) modeUpdates.engToJpnCorrect = { increment: 1 };
    } else if (learningMode === 'jpn_to_eng') {
      modeUpdates.jpnToEngTotal = { increment: 1 };
      if (isCorrect) modeUpdates.jpnToEngCorrect = { increment: 1 };
    } else if (learningMode === 'audio_recognition') {
      modeUpdates.audioTotal = { increment: 1 };
      if (isCorrect) modeUpdates.audioCorrect = { increment: 1 };
    } else if (learningMode === 'context_fill') {
      modeUpdates.contextTotal = { increment: 1 };
      if (isCorrect) modeUpdates.contextCorrect = { increment: 1 };
    }
    
    // Update progress
    const updatedProgress = await prisma.wordProgress.update({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      data: {
        totalReviews: newTotalReviews,
        correctAnswers: newCorrectAnswers,
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewDate,
        status: newStatus,
        lastAnswerCorrect: isCorrect,
        updatedAt: new Date(),
        ...modeUpdates,
      },
      include: {
        word: {
          include: {
            examples: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: updatedProgress,
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update progress',
      },
      { status: 500 }
    );
  }
}