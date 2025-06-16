import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { 
  batchUpdateProgress, 
  SessionAnswer,
  createSuccessResponse,
  createErrorResponse 
} from '@/lib/progress-utils';

const prisma = new PrismaClient();

// POST /api/progress/batch - Update multiple word progress (without session record)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { answers } = body;

    // Validate required fields
    if (!answers || !Array.isArray(answers)) {
      return createErrorResponse('answers is required and must be an array', 400);
    }

    // Use the optimized batch update function
    const result = await batchUpdateProgress(prisma, currentUser.id, answers as SessionAnswer[]);

    return createSuccessResponse(result);
  } catch (error) {
    console.error('Error updating batch progress:', error);
    return createErrorResponse('Failed to update progress');
  }
}