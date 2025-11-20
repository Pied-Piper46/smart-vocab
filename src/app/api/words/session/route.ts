import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, type Word } from '@prisma/client';
import { getCurrentUser, createUnauthorizedResponse } from '@/lib/auth-utils';
import { SESSION_PATTERNS } from '@/config/session-patterns';
import { selectRandomPattern } from '@/lib/pattern-selector';
import { buildSession, getCandidateQuerySpecs, type WordProgressForSession } from '@/lib/session-builder';

const prisma = new PrismaClient();

// API layer type: WordProgress with Word data (from Prisma include)
type WordProgressWithWord = WordProgressForSession & {
  word: Word;
};

// GET /api/words/session - Get words for learning session
export async function GET(request: NextRequest) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // Step 1: Select random pattern
    const patternName = selectRandomPattern();
    const pattern = SESSION_PATTERNS[patternName];
    const specs = getCandidateQuerySpecs(pattern);

    // Step 2: Fetch candidates from each status (parallel execution)
    const [newCandidates, learningCandidates, reviewingCandidates, masteredCandidates] =
      await Promise.all([
        // new: Random-like (newest first)
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'new'
          },
          orderBy: specs.new.orderBy,
          take: specs.new.count,
          include: { word: true }
        }),

        // learning: Recommended review date order (urgent first)
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'learning'
          },
          orderBy: specs.learning.orderBy,
          take: specs.learning.count,
          include: { word: true }
        }),

        // reviewing: Recommended review date order
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'reviewing'
          },
          orderBy: specs.reviewing.orderBy,
          take: specs.reviewing.count,
          include: { word: true }
        }),

        // mastered: Recommended review date order
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'mastered'
          },
          orderBy: specs.mastered.orderBy,
          take: specs.mastered.count,
          include: { word: true }
        })
      ]);

    // Step 3: Build session from candidates
    // Note: buildSession expects WordProgressForSession[], but we have WordProgressWithWord[]
    // The function only uses WordProgressForSession fields, so we can safely pass the extended type
    const candidates = {
      new: newCandidates as WordProgressForSession[],
      learning: learningCandidates as WordProgressForSession[],
      reviewing: reviewingCandidates as WordProgressForSession[],
      mastered: masteredCandidates as WordProgressForSession[]
    };

    const session = buildSession(pattern, candidates);

    // Cast back to WordProgressWithWord[] to access word data
    const sessionWithWords = session as unknown as WordProgressWithWord[];

    // Log session size for monitoring
    if (session.length < 10) {
      console.warn(`⚠️ Session size: ${session.length}/10 (pattern: ${patternName})`);
    }

    // Transform data to match frontend expectations
    const sessionWords = sessionWithWords.map(wp => ({
      id: wp.word.id,
      english: wp.word.english,
      japanese: wp.word.japanese,
      phonetic: wp.word.phonetic,
      partOfSpeech: wp.word.partOfSpeech,
      exampleEnglish: wp.word.exampleEnglish,
      exampleJapanese: wp.word.exampleJapanese,
      progress: {
        totalReviews: wp.totalReviews,
        correctAnswers: wp.correctAnswers,
        streak: wp.streak,
        lastReviewedAt: wp.lastReviewedAt?.toISOString() || null,
        recommendedReviewDate: wp.recommendedReviewDate.toISOString(),
        status: wp.status,
      }
    }));

    return NextResponse.json({
      success: true,
      data: sessionWords,
      count: sessionWords.length,
    });
  } catch (error) {
    console.error('Error fetching session words:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session words',
      },
      { status: 500 }
    );
  }
}
