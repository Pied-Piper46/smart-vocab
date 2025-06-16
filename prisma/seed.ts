import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Command line options
const args = process.argv.slice(2);
const forceUpdate = args.includes('--force');
const verbose = args.includes('--verbose');
const clearAll = args.includes('--clear');

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
  console.log('📚 Starting word data management...');
  
  if (clearAll) {
    console.log('🚨 Clear mode: Will delete ALL existing word data and start fresh');
  } else if (forceUpdate) {
    console.log('⚠️  Force update mode: Will update existing word data');
  }
  
  try {
    // Load JSON data
    const jsonWords = await loadJsonData();
    console.log(`📖 Loaded ${jsonWords.length} words from JSON files`);
    
    if (jsonWords.length === 0) {
      console.log('ℹ️  No word data found in JSON files. Nothing to process.');
      return;
    }
    
    // Handle clear mode - delete all existing data
    if (clearAll) {
      console.log('🧹 Clearing all existing word data...');
      await clearAllWordData();
      console.log('✨ All existing word data has been cleared');
      
      // Add all words as new
      console.log('📝 Adding all words as new data...');
      await addAllWordsAsNew(jsonWords);
      console.log('✅ Word data management completed successfully!');
      console.log(`📊 Summary:`);
      console.log(`   - All previous data: CLEARED`);
      console.log(`   - New words added: ${jsonWords.length}`);
      console.log(`   - New examples added: ${jsonWords.reduce((sum, word) => sum + word.examples.length, 0)}`);
      console.log(`   - Total words in database: ${jsonWords.length}`);
      return;
    }
    
    // Check existing words in database (for normal mode)
    const existingWords = await prisma.word.findMany({
      select: { id: true, english: true }
    });
    const existingWordIds = new Set(existingWords.map(w => w.id));
    
    if (verbose) {
      console.log(`📋 Found ${existingWords.length} existing words in database`);
    }
    
    // Filter new words (not yet in database)
    const newWords = jsonWords.filter(word => !existingWordIds.has(word.id));
    const existingNewWords = jsonWords.filter(word => existingWordIds.has(word.id));
    
    console.log(`✨ New words to add: ${newWords.length}`);
    console.log(`♻️  Existing words (will skip): ${existingNewWords.length}`);
    
    if (forceUpdate && existingNewWords.length > 0) {
      console.log('🔄 Force update mode: Updating existing words...');
      await updateExistingWords(existingNewWords);
    }
    
    if (newWords.length === 0 && !forceUpdate) {
      console.log('✅ All words already exist in database. Nothing to add.');
      return;
    }
    
    // Add new words and examples
    console.log('📝 Adding new words and examples...');
    let addedWords = 0;
    let addedExamples = 0;
    
    for (const jsonWord of newWords) {
      try {
        // Create word
        await prisma.word.create({
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
        addedWords++;
        
        // Create examples (all examples, not just first one)
        for (const example of jsonWord.examples) {
          await prisma.wordExample.create({
            data: {
              id: example.id,
              wordId: jsonWord.id,
              english: example.english,
              japanese: example.japanese,
              difficulty: example.difficulty,
              context: example.context,
            },
          });
          addedExamples++;
        }
        
        if (verbose) {
          console.log(`  ✓ Added word: ${jsonWord.english} (${jsonWord.examples.length} examples)`);
        }
        
      } catch (error) {
        console.error(`❌ Error adding word ${jsonWord.english}:`, error);
      }
    }
    
    console.log('✅ Word data management completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - New words added: ${addedWords}`);
    console.log(`   - New examples added: ${addedExamples}`);
    console.log(`   - Total words in database: ${existingWords.length + addedWords}`);
    
    if (forceUpdate) {
      const updatedWords = existingNewWords.length;
      console.log(`   - Updated existing words: ${updatedWords}`);
    }
    
  } catch (error) {
    console.error('❌ Error during word data management:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function updateExistingWords(words: JsonWord[]) {
  let updatedWords = 0;
  let updatedExamples = 0;
  
  for (const jsonWord of words) {
    try {
      // Update word data
      await prisma.word.update({
        where: { id: jsonWord.id },
        data: {
          english: jsonWord.english,
          japanese: jsonWord.japanese,
          phonetic: jsonWord.phonetic,
          partOfSpeech: jsonWord.partOfSpeech,
          difficulty: getDifficultyFromId(jsonWord.id),
          frequency: jsonWord.frequency,
        },
      });
      updatedWords++;
      
      // Delete existing examples and recreate
      await prisma.wordExample.deleteMany({
        where: { wordId: jsonWord.id }
      });
      
      // Create new examples
      for (const example of jsonWord.examples) {
        await prisma.wordExample.create({
          data: {
            id: example.id,
            wordId: jsonWord.id,
            english: example.english,
            japanese: example.japanese,
            difficulty: example.difficulty,
            context: example.context,
          },
        });
        updatedExamples++;
      }
      
      if (verbose) {
        console.log(`  🔄 Updated word: ${jsonWord.english} (${jsonWord.examples.length} examples)`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating word ${jsonWord.english}:`, error);
    }
  }
  
  console.log(`🔄 Updated ${updatedWords} existing words with ${updatedExamples} examples`);
}

async function clearAllWordData() {
  // Delete in order to respect foreign key constraints
  console.log('  🗑️  Deleting word examples...');
  await prisma.wordExample.deleteMany();
  
  console.log('  🗑️  Deleting word progress data...');
  await prisma.wordProgress.deleteMany();
  
  console.log('  🗑️  Deleting learning sessions...');
  await prisma.learningSession.deleteMany();
  
  console.log('  🗑️  Deleting words...');
  await prisma.word.deleteMany();
  
  console.log('  ✅ All word-related data cleared');
}

async function addAllWordsAsNew(jsonWords: JsonWord[]) {
  let addedWords = 0;
  let addedExamples = 0;
  
  for (const jsonWord of jsonWords) {
    try {
      // Create word
      await prisma.word.create({
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
      addedWords++;
      
      // Create examples
      for (const example of jsonWord.examples) {
        await prisma.wordExample.create({
          data: {
            id: example.id,
            wordId: jsonWord.id,
            english: example.english,
            japanese: example.japanese,
            difficulty: example.difficulty,
            context: example.context,
          },
        });
        addedExamples++;
      }
      
      if (verbose) {
        console.log(`  ✓ Added word: ${jsonWord.english} (${jsonWord.examples.length} examples)`);
      }
      
    } catch (error) {
      console.error(`❌ Error adding word ${jsonWord.english}:`, error);
    }
  }
  
  console.log(`✅ Added ${addedWords} words with ${addedExamples} examples`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });