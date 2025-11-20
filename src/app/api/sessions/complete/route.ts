import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { calculateMasteryStatus } from '@/lib/mastery';
import { calculateRecommendedReviewDate } from '@/lib/review-scheduler';

const prisma = new PrismaClient();

// POST /api/sessions/complete - Record session completion
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

    if (answers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'answers array cannot be empty',
        },
        { status: 400 }
      );
    }

    // Transaction to create session and update progress
    const result = await prisma.$transaction(async (tx) => {
      // Create session record (without wordsStudied)
      const session = await tx.learningSession.create({
        data: {
          userId,
          completedAt: new Date(),
        },
      });

      // Process all answers in batch
      const statusChanges = {
        upgrades: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string; isUpgrade: boolean; isDowngrade: boolean}>,
        downgrades: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string; isUpgrade: boolean; isDowngrade: boolean}>,
        maintained: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string; isUpgrade: boolean; isDowngrade: boolean}>
      };

      // Fetch word data for all words in the session
      const wordIds = answers.map((answer: {wordId: string; isCorrect: boolean}) => answer.wordId);
      const words = await tx.word.findMany({
        where: { id: { in: wordIds } },
      });

      const wordMap = new Map(words.map(word => [word.id, word]));

      // Process each answer
      console.log('🔄 Processing answers in batch:', answers.length);
      for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        console.log(`🔍 Processing answer ${i + 1}/${answers.length}:`, {
          wordId: answer.wordId,
          isCorrect: answer.isCorrect,
          mode: answer.mode
        });

        const word = wordMap.get(answer.wordId);
        if (!word) {
          console.warn(`⚠️ Word not found for ID: ${answer.wordId}`);
          continue;
        }

        // Get or create word progress
        let progress = await tx.wordProgress.findUnique({
          where: {
            userId_wordId: {
              userId,
              wordId: answer.wordId,
            },
          },
        });

        if (!progress) {
          // Create new progress entry with new schema
          progress = await tx.wordProgress.create({
            data: {
              userId,
              wordId: answer.wordId,
              totalReviews: 0,
              correctAnswers: 0,
              streak: 0,
              lastReviewedAt: null,
              recommendedReviewDate: new Date(),
              status: 'new',
            },
          });
        }

        // Update progress based on answer
        const newTotalReviews = progress.totalReviews + 1;
        const newCorrectAnswers = progress.correctAnswers + (answer.isCorrect ? 1 : 0);
        const previousStatus = progress.status;

        // Calculate streak (consecutive correct answers)
        const newStreak = answer.isCorrect ? progress.streak + 1 : 0;

        // Calculate accuracy
        const accuracy = newTotalReviews > 0 ? newCorrectAnswers / newTotalReviews : 0;

        // Calculate new status using simplified logic
        const newStatus = calculateMasteryStatus({
          totalReviews: newTotalReviews,
          correctAnswers: newCorrectAnswers,
          streak: newStreak
        });

        // Calculate recommended review date with all required parameters
        const newRecommendedReviewDate = calculateRecommendedReviewDate(
          newStreak,
          accuracy,
          newTotalReviews,
          newStatus as 'new' | 'learning' | 'reviewing' | 'mastered',
          new Date()
        );

        // Update progress with new schema fields
        await tx.wordProgress.update({
          where: {
            userId_wordId: {
              userId,
              wordId: answer.wordId,
            },
          },
          data: {
            totalReviews: newTotalReviews,
            correctAnswers: newCorrectAnswers,
            streak: newStreak,
            lastReviewedAt: new Date(),
            recommendedReviewDate: newRecommendedReviewDate,
            status: newStatus,
          },
        });

        console.log(`✅ Progress updated for word ${answer.wordId}:`, {
          status: `${previousStatus} → ${newStatus}`,
          streak: newStreak,
          totalReviews: newTotalReviews,
          correctAnswers: newCorrectAnswers,
          nextReview: newRecommendedReviewDate.toISOString().split('T')[0]
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
        session,
        statusChanges,
      };
    }, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        completedAt: result.session.completedAt.toISOString(),
        statusChanges: result.statusChanges,
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
