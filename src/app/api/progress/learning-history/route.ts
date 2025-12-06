import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/progress/learning-history - Get daily learning history
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const userId = currentUser.id;

    // Calculate date range for the specific month
    const startDate = new Date(year, month - 1, 1); // month - 1 because JS months are 0-indexed
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(year, month, 0); // Last day of the month
    endDate.setHours(23, 59, 59, 999);

    // Get all sessions in the date range
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Group sessions by date (convert UTC to JST)
    const sessionsByDate = sessions.reduce((acc, session) => {
      // Convert UTC to JST (UTC+9)
      const jstDate = new Date(session.completedAt.getTime() + 9 * 60 * 60 * 1000);
      const date = jstDate.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          sessionCount: 0,
        };
      }
      acc[date].sessionCount += 1;
      return acc;
    }, {} as Record<string, { sessionCount: number }>);

    // Generate data for the specific month
    const monthName = startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      // Format date as YYYY-MM-DD without timezone conversion
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const sessionData = sessionsByDate[dateStr];

      dailyData.push({
        day,
        date: dateStr,
        sessionCount: sessionData?.sessionCount || 0,
        hasSession: (sessionData?.sessionCount || 0) > 0,
      });
    }

    const monthData = {
      month: monthName,
      year,
      monthNum: month,
      days: dailyData,
      totalSessions: dailyData.reduce((sum, day) => sum + day.sessionCount, 0),
      activeDays: dailyData.filter(day => day.hasSession).length,
    };

    return NextResponse.json({
      success: true,
      data: monthData,
    });
  } catch (error) {
    console.error('Error fetching learning history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch learning history',
      },
      { status: 500 }
    );
  }
}