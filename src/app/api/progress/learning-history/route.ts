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
    const months = parseInt(searchParams.get('months') || '3');
    const maxMonths = Math.min(months, 6); // Limit to 6 months for performance

    const userId = currentUser.id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - maxMonths);
    startDate.setDate(1); // Start from beginning of month
    startDate.setHours(0, 0, 0, 0);

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
        wordsStudied: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Group sessions by date
    const sessionsByDate = sessions.reduce((acc, session) => {
      const date = session.completedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          sessionCount: 0,
          totalWords: 0,
        };
      }
      acc[date].sessionCount += 1;
      acc[date].totalWords += session.wordsStudied;
      return acc;
    }, {} as Record<string, { sessionCount: number; totalWords: number }>);

    // Generate month-by-month data
    const monthlyData = [];
    for (let i = 0; i < maxMonths; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      month.setDate(1);
      
      const year = month.getFullYear();
      const monthNum = month.getMonth();
      const monthName = month.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      
      // Get days in this month
      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
      const dailyData = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum, day);
        const dateStr = date.toISOString().split('T')[0];
        const sessionData = sessionsByDate[dateStr];
        
        dailyData.push({
          day,
          date: dateStr,
          sessionCount: sessionData?.sessionCount || 0,
          totalWords: sessionData?.totalWords || 0,
          hasSession: (sessionData?.sessionCount || 0) > 0,
        });
      }
      
      monthlyData.unshift({
        month: monthName,
        year,
        monthNum: monthNum + 1,
        days: dailyData,
        totalSessions: dailyData.reduce((sum, day) => sum + day.sessionCount, 0),
        totalWords: dailyData.reduce((sum, day) => sum + day.totalWords, 0),
        activeDays: dailyData.filter(day => day.hasSession).length,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        months: monthlyData,
        totalSessions: Object.values(sessionsByDate).reduce((sum, data) => sum + data.sessionCount, 0),
        totalWords: Object.values(sessionsByDate).reduce((sum, data) => sum + data.totalWords, 0),
        activeDays: Object.keys(sessionsByDate).length,
      },
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