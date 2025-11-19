import { PrismaClient } from '@prisma/client';
import { calculateMasteryStatus } from '@/lib/mastery';

export type SessionAnswer = {
  wordId: string;
  isCorrect: boolean;
  responseTime: number;
  mode: string;
};

export type ProgressUpdateResult = {
  wordId: string;
  statusChanged: boolean;
  newStatus: string;
  previousStatus: string;
  isUpgrade: boolean;
};

export type BatchUpdateResult = {
  wordsProcessed: number;
  statusChanges: {
    upgrades: ProgressUpdateResult[];
    downgrades: ProgressUpdateResult[];
    maintained: ProgressUpdateResult[];
  };
};

export async function updateWordProgress(
  prisma: PrismaClient,
  userId: string,
  wordId: string,
  isCorrect: boolean
): Promise<ProgressUpdateResult> {
  const existingProgress = await prisma.wordProgress.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  if (!existingProgress) {
    throw new Error(`Progress not found for user ${userId} and word ${wordId}`);
  }

  const updates = calculateProgressUpdate(existingProgress, isCorrect);
  
  const updatedProgress = await prisma.wordProgress.update({
    where: { userId_wordId: { userId, wordId } },
    data: updates,
  });

  return {
    wordId,
    statusChanged: existingProgress.status !== updatedProgress.status,
    newStatus: updatedProgress.status,
    previousStatus: existingProgress.status,
    isUpgrade: isStatusUpgrade(existingProgress.status, updatedProgress.status),
  };
}

export async function batchUpdateProgress(
  prisma: PrismaClient,
  userId: string,
  answers: SessionAnswer[]
): Promise<BatchUpdateResult> {
  return await prisma.$transaction(async (tx) => {
    const results: ProgressUpdateResult[] = [];
    
    // Fetch word data for all words
    const wordIds = answers.map(answer => answer.wordId);
    const words = await tx.word.findMany({
      where: { id: { in: wordIds } },
      include: { examples: true }
    });
    const wordMap = new Map(words.map(word => [word.id, word]));

    for (const answer of answers) {
      const word = wordMap.get(answer.wordId);
      if (!word) continue;

      // Get or create progress
      let progress = await tx.wordProgress.findUnique({
        where: { userId_wordId: { userId, wordId: answer.wordId } },
      });

      if (!progress) {
        progress = await tx.wordProgress.create({
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

      const previousStatus = progress.status;
      const updates = calculateProgressUpdate(progress, answer.isCorrect);
      
      await tx.wordProgress.update({
        where: { userId_wordId: { userId, wordId: answer.wordId } },
        data: updates,
      });

      const newStatus = updates.status || progress.status;
      results.push({
        wordId: answer.wordId,
        statusChanged: previousStatus !== newStatus,
        newStatus,
        previousStatus,
        isUpgrade: isStatusUpgrade(previousStatus, newStatus),
      });
    }

    return categorizeStatusChanges(results);
  });
}

function calculateProgressUpdate(
  progress: {
    totalReviews: number;
    correctAnswers: number;
    streak: number;
    easeFactor: number;
    interval: number;
    repetitions: number;
    status: string;
  },
  isCorrect: boolean
) {
  const newTotalReviews = progress.totalReviews + 1;
  const newCorrectAnswers = progress.correctAnswers + (isCorrect ? 1 : 0);
  
  // Calculate streak (consecutive correct answers)
  let newStreak = progress.streak;
  if (isCorrect) {
    newStreak += 1;
  } else {
    newStreak = 0; // Reset streak on incorrect answer
  }
  
  // Simple spaced repetition logic
  let newEaseFactor = progress.easeFactor;
  let newInterval = progress.interval;
  let newRepetitions = progress.repetitions;
  
  if (isCorrect) {
    newRepetitions += 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
  } else {
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
  }
  
  // Calculate mastery status using existing function
  const newStatus = calculateMasteryStatus({
    totalReviews: newTotalReviews,
    correctAnswers: newCorrectAnswers,
    streak: newStreak
  });
  
  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  
  return {
    totalReviews: newTotalReviews,
    correctAnswers: newCorrectAnswers,
    streak: newStreak,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
    status: newStatus,
    previousStatus: progress.status,
    updatedAt: new Date(),
  };
}

function isStatusUpgrade(oldStatus: string, newStatus: string): boolean {
  const statusOrder = ['new', 'learning', 'reviewing', 'mastered'];
  const oldIndex = statusOrder.indexOf(oldStatus);
  const newIndex = statusOrder.indexOf(newStatus);
  return newIndex > oldIndex;
}

function categorizeStatusChanges(results: ProgressUpdateResult[]): BatchUpdateResult {
  const upgrades = results.filter(r => r.statusChanged && r.isUpgrade);
  const downgrades = results.filter(r => r.statusChanged && !r.isUpgrade);
  const maintained = results.filter(r => !r.statusChanged);

  return {
    wordsProcessed: results.length,
    statusChanges: {
      upgrades,
      downgrades,
      maintained,
    },
  };
}

export async function getCurrentUserFromSession(): Promise<{ id: string } | null> {
  // This is a placeholder - implement actual session verification
  // For now, return demo user
  return { id: 'demo-user' };
}

export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

export function createSuccessResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export function createErrorResponse(message: string, status: number = 500) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}