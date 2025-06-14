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

    // Create minimal session record
    const session = await prisma.learningSession.create({
      data: {
        userId,
        wordsStudied,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        completedAt: session.completedAt,
        wordsStudied: session.wordsStudied,
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