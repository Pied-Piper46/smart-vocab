/**
 * Word Data Loader
 * Handles loading and management of word data from JSON files
 */

import { WordData, SessionWord, DifficultyLevel, WORD_DATA_FILES } from '@/types/word-data';

// Static imports for word data files
import easy1Data from '../../data/words/easy1.json';
import medium1Data from '../../data/words/medium1.json';
import hard1Data from '../../data/words/hard1.json';

// Type assertion for imported JSON data
const wordDataFiles = {
  easy1: easy1Data as WordData[],
  medium1: medium1Data as WordData[],
  hard1: hard1Data as WordData[]
};

/**
 * Get all words from a specific difficulty level
 */
export function getWordsByDifficulty(difficulty: DifficultyLevel): WordData[] {
  const files = WORD_DATA_FILES[difficulty];
  const allWords: WordData[] = [];
  
  for (const fileName of files) {
    const fileKey = fileName as keyof typeof wordDataFiles;
    if (wordDataFiles[fileKey]) {
      allWords.push(...wordDataFiles[fileKey]);
    }
  }
  
  return allWords;
}

/**
 * Get words from a specific file
 */
export function getWordsFromFile(fileName: string): WordData[] {
  const fileKey = fileName as keyof typeof wordDataFiles;
  return wordDataFiles[fileKey] || [];
}

/**
 * Get a mixed selection of words across all difficulty levels
 */
export function getMixedWords(count: number = 10): WordData[] {
  const easyWords = getWordsByDifficulty('easy');
  const mediumWords = getWordsByDifficulty('medium');
  const hardWords = getWordsByDifficulty('hard');
  
  // Mix ratio: 50% easy, 30% medium, 20% hard
  const easyCount = Math.floor(count * 0.5);
  const mediumCount = Math.floor(count * 0.3);
  const hardCount = count - easyCount - mediumCount;
  
  const selectedWords: WordData[] = [
    ...shuffleArray(easyWords).slice(0, easyCount),
    ...shuffleArray(mediumWords).slice(0, mediumCount),
    ...shuffleArray(hardWords).slice(0, hardCount)
  ];
  
  return shuffleArray(selectedWords);
}

/**
 * Get words for a learning session
 * Converts WordData to SessionWord format for compatibility
 */
export function getSessionWords(
  difficulty?: DifficultyLevel,
  count: number = 10
): SessionWord[] {
  let words: WordData[];
  
  if (difficulty) {
    words = getWordsByDifficulty(difficulty);
  } else {
    words = getMixedWords(count);
  }
  
  // Shuffle and limit to requested count
  const selectedWords = shuffleArray(words).slice(0, count);
  
  // Convert to SessionWord format (add empty progress for now)
  return selectedWords.map(word => ({
    ...word,
    progress: undefined // Will be populated from database in future
  }));
}

/**
 * Get word by ID across all files
 */
export function getWordById(id: string): WordData | null {
  for (const fileData of Object.values(wordDataFiles)) {
    const word = fileData.find(w => w.id === id);
    if (word) return word;
  }
  return null;
}

/**
 * Get all available words across all files
 */
export function getAllWords(): WordData[] {
  return Object.values(wordDataFiles).flat();
}

/**
 * Get statistics about available word data
 */
export function getWordDataStats() {
  const easy = getWordsByDifficulty('easy');
  const medium = getWordsByDifficulty('medium');
  const hard = getWordsByDifficulty('hard');
  const total = easy.length + medium.length + hard.length;
  
  return {
    total,
    easy: easy.length,
    medium: medium.length,
    hard: hard.length,
    files: Object.keys(wordDataFiles).length
  };
}

/**
 * Utility function to shuffle array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Search words by English or Japanese text
 */
export function searchWords(
  query: string,
  difficulty?: DifficultyLevel
): WordData[] {
  const words = difficulty ? getWordsByDifficulty(difficulty) : getAllWords();
  const lowerQuery = query.toLowerCase();
  
  return words.filter(word => 
    word.english.toLowerCase().includes(lowerQuery) ||
    word.japanese.includes(query)
  );
}