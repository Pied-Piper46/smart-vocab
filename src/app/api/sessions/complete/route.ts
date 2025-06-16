import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// POST /api/sessions/complete - Record session completion
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { wordsStudied } = body;
    const userId = currentUser.id;

    // Validate required fields
    if (wordsStudied === undefined || wordsStudied <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wordsStudied value',
        },
        { status: 400 }
      );
    }

    // Transaction to create session and update user statistics
    const result = await prisma.$transaction(async (prisma) => {
      // Create session record
      const session = await prisma.learningSession.create({
        data: {
          userId,
          wordsStudied,
          completedAt: new Date(),
        },
      });

      // Calculate new streak based on consecutive daily sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get recent sessions to calculate streak
      const recentSessions = await prisma.learningSession.findMany({
        where: {
          userId,
          completedAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          completedAt: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      // Group sessions by date to calculate streak
      const sessionDates = new Set();
      recentSessions.forEach(session => {
        const date = new Date(session.completedAt);
        date.setHours(0, 0, 0, 0);
        sessionDates.add(date.getTime());
      });

      // Calculate current streak
      let currentStreak = 0;
      const currentDate = new Date(today);
      
      while (sessionDates.has(currentDate.getTime())) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      // Calculate total words learned (words with progress)
      const totalWordsLearned = await prisma.wordProgress.count({
        where: {
          userId,
          correctAnswers: {
            gt: 0,
          },
        },
      });

      // Get current user stats to compare with longest streak
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { longestStreak: true },
      });

      const longestStreak = Math.max(currentStreak, currentUser?.longestStreak || 0);

      // Update user statistics
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak,
          longestStreak,
          totalWordsLearned,
        },
      });

      return {
        session,
        stats: {
          currentStreak,
          longestStreak,
          totalWordsLearned,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        completedAt: result.session.completedAt,
        wordsStudied: result.session.wordsStudied,
        updatedStats: result.stats,
      },
    });
  } catch (error) {
    console.error('Error recording session completion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record session completion',
      },
      { status: 500 }
    );
  }
}