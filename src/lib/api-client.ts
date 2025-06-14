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
  status?: string; // Mastery status
  statusChange?: {
    changed: boolean;
    from: string;
    to: string;
    isUpgrade: boolean;
    isDowngrade: boolean;
  };
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
 * Update word progress
 */
export async function updateWordProgress(
  wordId: string,
  isCorrect: boolean
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
 * Record session completion
 */
export async function recordSessionCompletion(
  wordsStudied: number
): Promise<{ sessionId: string; completedAt: Date; wordsStudied: number }> {
  try {
    const response = await fetch(`${API_BASE}/sessions/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wordsStudied,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<{ sessionId: string; completedAt: Date; wordsStudied: number }> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to record session completion');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error recording session completion:', error);
    throw error;
  }
}

/**
 * Fetch session history and statistics
 */
export interface SessionHistoryData {
  totalSessions: number;
  recentSessions: Array<{
    id: string;
    completedAt: Date;
    wordsStudied: number;
  }>;
  thisWeek: number;
  thisMonth: number;
  streak: number;
}

export async function fetchSessionHistory(
  limit?: number
): Promise<SessionHistoryData> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE}/sessions/history?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<SessionHistoryData> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch session history');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching session history:', error);
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