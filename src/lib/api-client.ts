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
 * Session answer data
 */
export interface SessionAnswer {
  wordId: string;
  isCorrect: boolean;
  timestamp: number;
  mode: string;
}

/**
 * Word status change data
 */
export interface WordStatusChange {
  wordId: string;
  english: string;
  japanese: string;
  from: string;
  to: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
}

/**
 * Session completion response
 */
export interface SessionCompletionData {
  sessionId: string;
  completedAt: Date;
  wordsStudied: number;
  statusChanges: {
    upgrades: WordStatusChange[];
    downgrades: WordStatusChange[];
    maintained: WordStatusChange[];
  };
  updatedStats: {
    currentStreak: number;
    longestStreak: number;
    totalWordsLearned: number;
  };
}

/**
 * Record session completion with batch processing
 */
export async function recordSessionCompletion(
  wordsStudied: number,
  answers: SessionAnswer[]
): Promise<SessionCompletionData> {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Recording session completion (attempt ${attempt}/${maxRetries})...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE}/sessions/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordsStudied,
          answers,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle specific HTTP status codes
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.');
        } else if (response.status === 409) {
          throw new Error('Session conflict. Please try again.');
        } else if (response.status >= 500) {
          throw new Error(`Server error (${response.status}). Please try again later.`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const result: ApiResponse<SessionCompletionData> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to record session completion');
      }
      
      console.log(`✅ Session completion recorded successfully on attempt ${attempt}`);
      return result.data;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Attempt ${attempt} failed:`, error);
      
      // Don't retry on authentication or client errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication') || 
            error.message.includes('Access denied') ||
            error.message.includes('401') ||
            error.message.includes('403')) {
          throw error;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError!;
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