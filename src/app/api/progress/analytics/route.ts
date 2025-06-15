import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/progress/analytics - Get learning analytics for progress dashboard
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // Get user data with streak information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        dailyGoal: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get mastery status counts
    const masteryStats = await prisma.wordProgress.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        status: true,
      },
    });

    const masteryData = {
      learning: 0,
      reviewing: 0,
      mastered: 0,
    };

    masteryStats.forEach((stat) => {
      if (stat.status === 'learning') masteryData.learning = stat._count.status;
      if (stat.status === 'reviewing') masteryData.reviewing = stat._count.status;
      if (stat.status === 'mastered') masteryData.mastered = stat._count.status;
    });

    // Get learning progress over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const learningProgress = await prisma.learningSession.groupBy({
      by: ['completedAt'],
      where: {
        userId,
        completedAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        wordsStudied: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Format progress data by date
    const progressByDate = learningProgress.reduce((acc, session) => {
      const date = session.completedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (session._sum.wordsStudied || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get recently mastered words (last 30 days)
    const recentlyMastered = await prisma.wordProgress.findMany({
      where: {
        userId,
        status: 'mastered',
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        word: {
          select: {
            english: true,
            japanese: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    });

    // Calculate goal achievement rate (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const goalAchievements = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');
        
        const wordsStudied = await prisma.learningSession.aggregate({
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

        return {
          date,
          wordsStudied: wordsStudied._sum.wordsStudied || 0,
          goalAchieved: (wordsStudied._sum.wordsStudied || 0) >= user.dailyGoal,
        };
      })
    );

    const achievedDays = goalAchievements.filter(day => day.goalAchieved).length;
    const goalAchievementRate = Math.round((achievedDays / 7) * 100);

    return NextResponse.json({
      success: true,
      data: {
        streaks: {
          current: user.currentStreak,
          longest: user.longestStreak,
        },
        masteryStats: masteryData,
        learningProgress: progressByDate,
        recentlyMastered,
        goalAchievementRate,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}