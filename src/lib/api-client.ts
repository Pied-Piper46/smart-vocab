/**
 * API Client for VocabMaster
 * Handles all API communications with the backend
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface WordData {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string;
  partOfSpeech: string;
  frequency: number;
  examples: WordExample[];
  progress?: WordProgress;
}

export interface WordExample {
  id: string;
  english: string;
  japanese: string;
  difficulty: number;
  context: string;
}

export interface WordProgress {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  streak: number;
  totalReviews: number;
  correctAnswers: number;
}

export interface SessionData {
  id: string;
  userId: string;
  createdAt: string;
  wordsStudied: number;
  wordsCorrect: number;
  difficulty: string;
  completedAt?: string;
}

// Base URL for API calls
const API_BASE = '/api';

/**
 * Fetch words for learning session
 */
export async function fetchSessionWords(
  difficulty: 'easy' | 'medium' | 'hard',
  limit: number = 15
): Promise<WordData[]> {
  try {
    const response = await fetch(
      `${API_BASE}/words/session?difficulty=${difficulty}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<WordData[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch session words');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching session words:', error);
    throw error;
  }
}

/**
 * Create a new learning session
 */
export async function createSession(
  wordsStudied: number,
  wordsCorrect: number,
  difficulty: string
): Promise<SessionData> {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wordsStudied,
        wordsCorrect,
        difficulty,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<SessionData> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create session');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Update word progress
 */
export async function updateWordProgress(
  wordId: string,
  isCorrect: boolean,
  learningMode: string
): Promise<WordProgress> {
  try {
    const response = await fetch(`${API_BASE}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wordId,
        isCorrect,
        learningMode,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<WordProgress> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update progress');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error updating word progress:', error);
    throw error;
  }
}

/**
 * Fetch user's learning sessions
 */
export async function fetchUserSessions(
  limit?: number
): Promise<SessionData[]> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE}/sessions?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<SessionData[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch sessions');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

/**
 * Fetch user's word progress
 */
export interface UserProgressData {
  id: string;
  word: WordData;
  totalReviews: number;
  correctAnswers: number;
  status: string;
  updatedAt: string;
}

export async function fetchUserProgress(): Promise<UserProgressData[]> {
  try {
    const response = await fetch(`${API_BASE}/progress`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<UserProgressData[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch progress');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching progress:', error);
    throw error;
  }
}

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/user/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<null> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to change password');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}