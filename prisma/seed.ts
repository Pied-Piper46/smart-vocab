import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

interface JsonWordExample {
  id: string;
  english: string;
  japanese: string;
  difficulty: number;
  context: string;
}

interface JsonWord {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string;
  partOfSpeech: string;
  frequency: number;
  examples: JsonWordExample[];
}

async function loadJsonData(): Promise<JsonWord[]> {
  const allWords: JsonWord[] = [];
  const dataDir = path.join(process.cwd(), 'data', 'words');
  
  // Load data from all JSON files
  const files = ['easy1.json', 'medium1.json', 'hard1.json'];
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const words: JsonWord[] = JSON.parse(fileContent);
      allWords.push(...words);
    }
  }
  
  return allWords;
}

function getDifficultyFromId(id: string): number {
  if (id.startsWith('easy')) return 1;
  if (id.startsWith('medium')) return 2;
  if (id.startsWith('hard')) return 3;
  return 1; // default
}

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Load JSON data
    const jsonWords = await loadJsonData();
    console.log(`📚 Loaded ${jsonWords.length} words from JSON files`);
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.wordExample.deleteMany();
    await prisma.wordProgress.deleteMany();
    await prisma.sessionReview.deleteMany();
    await prisma.learningSession.deleteMany();
    await prisma.userAchievement.deleteMany();
    await prisma.word.deleteMany();
    await prisma.user.deleteMany();
    await prisma.achievement.deleteMany();
    
    // Create demo user
    console.log('👤 Creating demo user...');
    const demoUser = await prisma.user.create({
      data: {
        id: 'demo-user',
        dailyGoal: 20,
        sessionDuration: 10,
        preferredLanguage: 'ja',
        totalWordsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalStudyTime: 0,
      },
    });
    
    // Seed words and examples
    console.log('📝 Seeding words and examples...');
    for (const jsonWord of jsonWords) {
      // Create word
      const word = await prisma.word.create({
        data: {
          id: jsonWord.id,
          english: jsonWord.english,
          japanese: jsonWord.japanese,
          phonetic: jsonWord.phonetic,
          partOfSpeech: jsonWord.partOfSpeech,
          difficulty: getDifficultyFromId(jsonWord.id),
          frequency: jsonWord.frequency,
        },
      });
      
      // Create single example (first one only)
      if (jsonWord.examples.length > 0) {
        const example = jsonWord.examples[0];
        await prisma.wordExample.create({
          data: {
            id: example.id,
            wordId: word.id,
            english: example.english,
            japanese: example.japanese,
            difficulty: example.difficulty,
            context: example.context,
          },
        });
      }
      
      // Initialize word progress for demo user
      await prisma.wordProgress.create({
        data: {
          userId: demoUser.id,
          wordId: word.id,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          totalReviews: 0,
          correctAnswers: 0,
          streak: 0,
          lastAnswerCorrect: false,
          status: 'new',
        },
      });
    }
    
    // Create some basic achievements
    console.log('🏆 Creating achievements...');
    const achievements = [
      {
        name: 'First Steps',
        description: 'Complete your first learning session',
        icon: '🎯',
        category: 'milestone',
        requirement: 1,
      },
      {
        name: 'Quick Learner',
        description: 'Learn 10 words correctly',
        icon: '⚡',
        category: 'accuracy',
        requirement: 10,
      },
      {
        name: 'Dedicated Student',
        description: 'Maintain a 7-day learning streak',
        icon: '🔥',
        category: 'streak',
        requirement: 7,
      },
    ];
    
    for (const achievement of achievements) {
      await prisma.achievement.create({
        data: achievement,
      });
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: 1 (demo user)`);
    console.log(`   - Words: ${jsonWords.length}`);
    console.log(`   - Examples: ${jsonWords.reduce((sum, word) => sum + word.examples.length, 0)}`);
    console.log(`   - Word Progress: ${jsonWords.length} (initialized for demo user)`);
    console.log(`   - Achievements: ${achievements.length}`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });