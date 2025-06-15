import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/progress/daily - Get today's learning progress
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // Get user's daily goal
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyGoal: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Count words studied today (from completed sessions)
    const wordsStudiedResult = await prisma.learningSession.aggregate({
      where: {
        userId,
        completedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        wordsStudied: true,
      },
    });

    const wordsStudiedToday = wordsStudiedResult._sum.wordsStudied || 0;

    // Count sessions completed today
    const sessionsToday = await prisma.learningSession.count({
      where: {
        userId,
        completedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate progress percentage
    const progressPercentage = Math.min(
      Math.round((wordsStudiedToday / user.dailyGoal) * 100),
      100
    );

    return NextResponse.json({
      success: true,
      data: {
        dailyGoal: user.dailyGoal,
        wordsStudiedToday,
        sessionsToday,
        progressPercentage,
        isGoalReached: wordsStudiedToday >= user.dailyGoal,
      },
    });
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch daily progress',
      },
      { status: 500 }
    );
  }
}