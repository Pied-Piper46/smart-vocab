import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { calculateMasteryStatus } from '@/lib/mastery';

const prisma = new PrismaClient();

// POST /api/sessions/complete - Record session completion
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { wordsStudied, answers } = body;
    const userId = currentUser.id;

    // 🔍 Debug: Log received data for final word investigation
    console.log('🔍 Session completion API received:', {
      wordsStudied,
      answersCount: answers?.length,
      expectedMatch: wordsStudied === answers?.length
    });

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

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error: 'answers is required and must be an array',
        },
        { status: 400 }
      );
    }

    // Transaction to create session and update user statistics
    const result = await prisma.$transaction(async (prisma) => {
      // Create session record
      const session = await prisma.learningSession.create({
        data: {
          userId,
          wordsStudied,
          completedAt: new Date(),
        },
      });

      // Process all answers in batch
      const statusChanges = {
        upgrades: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string}>,
        downgrades: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string}>,
        maintained: [] as Array<{wordId: string; english: string; japanese: string; from: string; to: string}>
      };

      // Fetch word data for all words in the session
      const wordIds = answers.map((answer: {wordId: string; isCorrect: boolean}) => answer.wordId);
      const words = await prisma.word.findMany({
        where: { id: { in: wordIds } },
        include: { examples: true }
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

        console.log(`✅ Progress updated for word ${answer.wordId}:`, {
          status: `${previousStatus} → ${newStatus}`,
          streak: newStreak,
          totalReviews: newTotalReviews,
          correctAnswers: newCorrectAnswers
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

      // Calculate new streak based on consecutive daily sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get recent sessions to calculate streak
      const recentSessions = await prisma.learningSession.findMany({
        where: {
          userId,
          completedAt: {
            gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          completedAt: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      // Group sessions by date to calculate streak
      const sessionDates = new Set();
      recentSessions.forEach(session => {
        if (session.completedAt) {
          const date = new Date(session.completedAt);
          date.setHours(0, 0, 0, 0);
          sessionDates.add(date.getTime());
        }
      });

      // Calculate current streak
      let currentStreak = 0;
      const currentDate = new Date(today);
      
      while (sessionDates.has(currentDate.getTime())) {
        currentStreak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }

      // Calculate total words learned (words with progress)
      const totalWordsLearned = await prisma.wordProgress.count({
        where: {
          userId,
          correctAnswers: {
            gt: 0,
          },
        },
      });

      // Get current user stats to compare with longest streak
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { longestStreak: true },
      });

      const longestStreak = Math.max(currentStreak, currentUser?.longestStreak || 0);

      // Update user statistics
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak,
          longestStreak,
          totalWordsLearned,
        },
      });

      return {
        session,
        statusChanges,
        stats: {
          currentStreak,
          longestStreak,
          totalWordsLearned,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.session.id,
        completedAt: result.session.completedAt,
        wordsStudied: result.session.wordsStudied,
        statusChanges: result.statusChanges,
        updatedStats: result.stats,
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