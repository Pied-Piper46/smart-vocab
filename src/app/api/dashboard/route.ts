import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { SESSION_SIZE } from '@/config/session-patterns';

const prisma = new PrismaClient();

// GET /api/dashboard - Get dashboard data (profile + daily progress)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // Calculate today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch user profile and daily progress data in parallel
    const [user, sessionsToday] = await Promise.all([
      // User profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),

      // Sessions completed today
      prisma.learningSession.count({
        where: {
          userId,
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate words studied today: sessions × SESSION_SIZE
    const wordsStudiedToday = sessionsToday * SESSION_SIZE;

    // Calculate progress percentage
    const progressPercentage = Math.min(
      Math.round((wordsStudiedToday / SESSION_SIZE) * 100),
      100
    );

    const dashboardData = {
      profile: {
        ...user,
      },
      dailyProgress: {
        dailyGoal: SESSION_SIZE,
        wordsStudiedToday,
        sessionsToday,
        progressPercentage,
        isGoalReached: wordsStudiedToday >= SESSION_SIZE,
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}