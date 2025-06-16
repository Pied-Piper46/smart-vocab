import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { calculateMasteryStatus } from '@/lib/mastery';

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
    const userId = currentUser.id;

    // Validate required fields
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error: 'answers is required and must be an array',
        },
        { status: 400 }
      );
    }

    // Process answers in transaction (but don't create session record)
    const result = await prisma.$transaction(async (prisma) => {
      const statusChanges = {
        upgrades: [] as any[],
        downgrades: [] as any[],
        maintained: [] as any[]
      };

      // Fetch word data for all words
      const wordIds = answers.map((answer: any) => answer.wordId);
      const words = await prisma.word.findMany({
        where: { id: { in: wordIds } },
        include: { examples: true }
      });

      const wordMap = new Map(words.map(word => [word.id, word]));

      // Process each answer
      for (const answer of answers) {
        const word = wordMap.get(answer.wordId);
        if (!word) continue;

        // Get or create word progress
        let progress = await prisma.wordProgress.findUnique({
          where: {
            userId_wordId: {
              userId,
              wordId: answer.wordId,
            },
          },
        });

        if (!progress) {
          // Create new progress entry
          progress = await prisma.wordProgress.create({
            data: {
              userId,
              wordId: answer.wordId,
              totalReviews: 0,
              correctAnswers: 0,
              easeFactor: 2.5,
              interval: 1,
              repetitions: 0,
              nextReviewDate: new Date(),
              status: 'new',
            },
          });
        }

        // Update progress based on answer
        const newTotalReviews = progress.totalReviews + 1;
        const newCorrectAnswers = progress.correctAnswers + (answer.isCorrect ? 1 : 0);
        const previousStatus = progress.status;
        
        // Calculate streak (consecutive correct answers)
        let newStreak = progress.streak;
        if (answer.isCorrect) {
          newStreak += 1;
        } else {
          newStreak = 0; // Reset streak on incorrect answer
        }
        
        // Simple spaced repetition logic
        let newEaseFactor = progress.easeFactor;
        let newInterval = progress.interval;
        let newRepetitions = progress.repetitions;
        let newStatus = progress.status;
        
        if (answer.isCorrect) {
          newRepetitions += 1;
          if (newRepetitions === 1) {
            newInterval = 1;
          } else if (newRepetitions === 2) {
            newInterval = 6;
          } else {
            newInterval = Math.round(newInterval * newEaseFactor);
          }
          
          // Calculate mastery status using actual streak
          newStatus = calculateMasteryStatus({
            totalReviews: newTotalReviews,
            correctAnswers: newCorrectAnswers,
            streak: newStreak
          });
        } else {
          newRepetitions = 0;
          newInterval = 1;
          newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
          newStatus = calculateMasteryStatus({
            totalReviews: newTotalReviews,
            correctAnswers: newCorrectAnswers,
            streak: newStreak // This will be 0 for incorrect answers
          });
        }
        
        // Calculate next review date
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
        
        // Update progress
        await prisma.wordProgress.update({
          where: {
            userId_wordId: {
              userId,
              wordId: answer.wordId,
            },
          },
          data: {
            totalReviews: newTotalReviews,
            correctAnswers: newCorrectAnswers,
            streak: newStreak, // Save the updated streak
            easeFactor: newEaseFactor,
            interval: newInterval,
            repetitions: newRepetitions,
            nextReviewDate,
            status: newStatus,
            previousStatus: previousStatus,
            lastAnswerCorrect: answer.isCorrect,
            updatedAt: new Date(),
          },
        });

        // Track status changes
        const statusChanged = previousStatus !== newStatus;
        if (statusChanged) {
          const statusHierarchy: Record<string, number> = { 'new': 0, 'learning': 1, 'reviewing': 2, 'mastered': 3 };
          const isUpgrade = statusHierarchy[newStatus] > statusHierarchy[previousStatus];
          const isDowngrade = statusHierarchy[newStatus] < statusHierarchy[previousStatus];

          const change = {
            wordId: answer.wordId,
            english: word.english,
            japanese: word.japanese,
            from: previousStatus,
            to: newStatus,
            isUpgrade,
            isDowngrade,
          };

          if (isUpgrade) {
            statusChanges.upgrades.push(change);
          } else if (isDowngrade) {
            statusChanges.downgrades.push(change);
          } else {
            statusChanges.maintained.push(change);
          }
        }
      }

      return {
        wordsProcessed: answers.length,
        statusChanges,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error updating batch progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update progress',
      },
      { status: 500 }
    );
  }
}