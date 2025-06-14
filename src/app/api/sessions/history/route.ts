import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/sessions/history - Get user's session history and stats
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const userId = currentUser.id;

    // Get recent sessions
    const recentSessions = await prisma.learningSession.findMany({
      where: { userId },
      take: limit ? parseInt(limit) : 10,
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        completedAt: true,
        wordsStudied: true,
      },
    });

    // Get total session count
    const totalSessions = await prisma.learningSession.count({
      where: { userId },
    });

    // Calculate this week's sessions
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = await prisma.learningSession.count({
      where: {
        userId,
        completedAt: {
          gte: weekStart,
        },
      },
    });

    // Calculate this month's sessions
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonth = await prisma.learningSession.count({
      where: {
        userId,
        completedAt: {
          gte: monthStart,
        },
      },
    });

    // Calculate learning streak (consecutive days with sessions)
    let streak = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    for (let i = 0; i < 365; i++) { // Check up to 1 year back
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(today);
      dayEnd.setDate(today.getDate() - i);
      dayEnd.setHours(23, 59, 59, 999);

      const sessionsThisDay = await prisma.learningSession.count({
        where: {
          userId,
          completedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      if (sessionsThisDay > 0) {
        streak++;
      } else {
        break; // Break the streak
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalSessions,
        recentSessions,
        thisWeek,
        thisMonth,
        streak,
      },
    });
  } catch (error) {
    console.error('Error fetching session history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session history',
      },
      { status: 500 }
    );
  }
}