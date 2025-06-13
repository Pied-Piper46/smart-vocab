import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';

const prisma = new PrismaClient();

// GET /api/sessions - Get user's learning sessions
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }
    
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const userId = currentUser.id;
    
    const sessions = await prisma.learningSession.findMany({
      where: {
        userId,
      },
      take: limit ? parseInt(limit) : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sessions',
      },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new learning session
export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }
    
    const body = await request.json();
    const { wordsStudied, wordsCorrect, difficulty } = body;
    const userId = currentUser.id;
    
    // Validate required fields
    if (wordsStudied === undefined || wordsCorrect === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: wordsStudied, wordsCorrect',
        },
        { status: 400 }
      );
    }
    
    // Create learning session
    const session = await prisma.learningSession.create({
      data: {
        userId,
        wordsStudied,
        wordsCorrect,
        sessionType: difficulty || 'mixed',
        completedAt: new Date(),
      },
    });
    
    // Update user's total words learned
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalWordsLearned: {
          increment: wordsCorrect,
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
      },
      { status: 500 }
    );
  }
}