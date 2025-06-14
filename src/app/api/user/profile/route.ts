import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/user/profile - Get user profile
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
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
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate totalWordsLearned from WordProgress
    const wordProgressCount = await prisma.wordProgress.count({
      where: {
        userId: currentUser.id,
        correctAnswers: {
          gt: 0
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        totalWordsLearned: wordProgressCount
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, dailyGoal, sessionDuration, preferredLanguage } = body;

    // Validate input
    if (dailyGoal && (dailyGoal < 1 || dailyGoal > 100)) {
      return NextResponse.json(
        { success: false, error: 'Daily goal must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (sessionDuration && (sessionDuration < 5 || sessionDuration > 60)) {
      return NextResponse.json(
        { success: false, error: 'Session duration must be between 5 and 60 minutes' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(name && { name }),
        ...(dailyGoal && { dailyGoal: parseInt(dailyGoal) }),
        ...(sessionDuration && { sessionDuration: parseInt(sessionDuration) }),
        ...(preferredLanguage && { preferredLanguage }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        dailyGoal: true,
        sessionDuration: true,
        preferredLanguage: true,
        currentStreak: true,
        longestStreak: true,
        totalStudyTime: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}