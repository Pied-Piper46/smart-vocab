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

    // Get recently mastered words (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

    return NextResponse.json({
      success: true,
      data: {
        masteryStats: masteryData,
        recentlyMastered,
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