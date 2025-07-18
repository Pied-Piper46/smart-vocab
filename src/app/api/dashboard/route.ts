import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

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
    const [user, wordsStudiedResult, sessionsToday] = await Promise.all([
      // User profile (including pre-calculated totalWordsLearned)
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          dailyGoal: true,
          sessionDuration: true,
          preferredLanguage: true,
          currentStreak: true,
          longestStreak: true,
          totalStudyTime: true,
          totalWordsLearned: true, // Pre-calculated field
        },
      }),
      
      // Words studied today
      prisma.learningSession.aggregate({
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

    const wordsStudiedToday = wordsStudiedResult._sum.wordsStudied || 0;
    
    // Calculate progress percentage
    const progressPercentage = Math.min(
      Math.round((wordsStudiedToday / user.dailyGoal) * 100),
      100
    );

    const dashboardData = {
      profile: {
        ...user,
        // totalWordsLearned is already included from user object
      },
      dailyProgress: {
        dailyGoal: user.dailyGoal,
        wordsStudiedToday,
        sessionsToday,
        progressPercentage,
        isGoalReached: wordsStudiedToday >= user.dailyGoal,
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60', // 5分間キャッシュ、1分間のstale-while-revalidate
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