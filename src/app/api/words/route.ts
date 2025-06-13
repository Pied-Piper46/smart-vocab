import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/words - Get words by difficulty or all words
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const limit = searchParams.get('limit');
    
    const where = difficulty ? { difficulty: parseInt(difficulty) } : {};
    const take = limit ? parseInt(limit) : undefined;
    
    const words = await prisma.word.findMany({
      where,
      take,
      include: {
        examples: true, // Include word examples
      },
      orderBy: {
        frequency: 'desc', // Order by frequency (most common first)
      },
    });
    
    return NextResponse.json({
      success: true,
      data: words,
      count: words.length,
    });
  } catch (error) {
    console.error('Error fetching words:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch words',
      },
      { status: 500 }
    );
  }
}

// POST /api/words - Create a new word (for future admin functionality)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { english, japanese, phonetic, partOfSpeech, difficulty, frequency, example } = body;
    
    // Validate required fields
    if (!english || !japanese || !partOfSpeech) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: english, japanese, partOfSpeech',
        },
        { status: 400 }
      );
    }
    
    // Create word with example
    const word = await prisma.word.create({
      data: {
        english,
        japanese,
        phonetic,
        partOfSpeech,
        difficulty: difficulty || 1,
        frequency: frequency || 1,
        examples: example ? {
          create: {
            english: example.english,
            japanese: example.japanese,
            difficulty: example.difficulty || difficulty || 1,
            context: example.context || 'general',
          },
        } : undefined,
      },
      include: {
        examples: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: word,
    });
  } catch (error) {
    console.error('Error creating word:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create word',
      },
      { status: 500 }
    );
  }
}