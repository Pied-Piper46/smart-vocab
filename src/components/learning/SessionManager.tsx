'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target } from 'lucide-react';
import WordCard, { LearningMode } from './WordCard';
import { fetchSessionWords, updateWordProgress, recordSessionCompletion, WordData } from '@/lib/api-client';
import SessionFeedbackComponent from './SessionFeedback';
import { DifficultyLevel } from '@/types/word-data';

// Queue for failed progress updates
interface ProgressUpdate {
  wordId: string;
  correct: boolean;
  timestamp: number;
}

// Status change tracking
interface WordStatusChange {
  wordId: string;
  english: string;
  japanese: string;
  from: string;
  to: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
}

export interface SessionFeedback {
  totalWords: number;
  correctAnswers: number;
  accuracy: number;
  statusChanges: {
    upgrades: WordStatusChange[];
    downgrades: WordStatusChange[];
    maintained: WordStatusChange[];
  };
  totalUpgrades: number;
  totalDowngrades: number;
  newWordsLearned: number;
  wordsReinforced: number;
}

let progressUpdateQueue: ProgressUpdate[] = [];

/**
 * Advanced async progress update with retry mechanism
 */
async function updateWordProgressWithRetry(
  update: ProgressUpdate, 
  onStatusChange?: (change: WordStatusChange) => void,
  word?: WordData,
  retryCount: number = 0
): Promise<WordStatusChange | null> {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
  
  try {
    const result = await updateWordProgress(update.wordId, update.correct);
    console.log('✅ Word progress updated:', { 
      wordId: update.wordId, 
      correct: update.correct,
      retryCount 
    });
    
    // Track status changes if callback provided
    if (onStatusChange && word && result.statusChange?.changed) {
      const statusChange: WordStatusChange = {
        wordId: update.wordId,
        english: word.english,
        japanese: word.japanese,
        from: result.statusChange.from,
        to: result.statusChange.to,
        isUpgrade: result.statusChange.isUpgrade,
        isDowngrade: result.statusChange.isDowngrade,
      };
      onStatusChange(statusChange);
      return statusChange;
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Progress update failed (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
    
    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await updateWordProgressWithRetry(update, onStatusChange, word, retryCount + 1);
          resolve(result);
        }, retryDelay);
      });
    } else {
      // Final failure - add to queue for batch processing
      console.error('❌ Progress update failed permanently, adding to queue:', update);
      progressUpdateQueue.push(update);
      return null;
    }
  }
}

/**
 * Process queued progress updates in batch
 */
async function processProgressQueue(): Promise<void> {
  if (progressUpdateQueue.length === 0) return;
  
  console.log(`🔄 Processing ${progressUpdateQueue.length} queued progress updates...`);
  
  const updates = [...progressUpdateQueue];
  progressUpdateQueue = []; // Clear queue
  
  // Process updates sequentially to avoid overwhelming the server
  for (const update of updates) {
    try {
      await updateWordProgress(update.wordId, update.correct);
      console.log('✅ Queued progress update completed:', update.wordId);
    } catch (error) {
      console.error('❌ Queued progress update failed:', error);
      // Could implement more sophisticated failure handling here
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

interface SessionManagerProps {
  initialDifficulty?: DifficultyLevel | null;
  onSessionComplete?: (stats: SessionStats, feedback?: SessionFeedback) => void;
}

interface SessionStats {
  wordsStudied: number;
  wordsCorrect: number;
  sessionType: string;
}

// Use WordData type from API client
type Word = WordData;

export default function SessionManager({ 
  initialDifficulty = null,
  onSessionComplete 
}: SessionManagerProps) {
  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'completed'>('setup');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentMode, setCurrentMode] = useState<LearningMode>('eng_to_jpn');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(initialDifficulty);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    wordsStudied: 0,
    wordsCorrect: 0,
    sessionType: 'single_difficulty'
  });
  const [statusChanges, setStatusChanges] = useState<WordStatusChange[]>([]);
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null);

  const completeSession = useCallback(async (finalWordsStudied?: number, finalWordsCorrect?: number) => {
    setSessionState('completed');
    
    const finalStats: SessionStats = {
      wordsStudied: finalWordsStudied ?? sessionStats.wordsStudied,
      wordsCorrect: finalWordsCorrect ?? sessionStats.wordsCorrect,
      sessionType: selectedDifficulty || 'single_difficulty'
    };
    
    setSessionStats(finalStats);
    
    // 🔄 Process any remaining progress updates before session completion
    console.log('🏁 Session completing, processing remaining progress updates...');
    await processProgressQueue();
    
    // Record session completion in backend
    try {
      await recordSessionCompletion(finalStats.wordsStudied);
      console.log('✅ Session completion recorded');
    } catch (error) {
      console.error('❌ Failed to record session completion:', error);
    }
    
    // Generate session feedback
    console.log('📊 Status changes at session completion:', statusChanges);
    const feedback: SessionFeedback = generateSessionFeedback(finalStats, statusChanges);
    console.log('📋 Generated feedback:', feedback);
    setSessionFeedback(feedback);
    
    onSessionComplete?.(finalStats, feedback);
  }, [sessionStats, selectedDifficulty, statusChanges, onSessionComplete]);

  // Handle feedback actions
  const handleStartNewSession = () => {
    setSessionState('setup');
    setCurrentWordIndex(0);
    setSessionWords([]);
    setSessionStats({
      wordsStudied: 0,
      wordsCorrect: 0,
      sessionType: 'single_difficulty'
    });
    setStatusChanges([]);
    setSessionFeedback(null);
    setSelectedDifficulty(null);
  };

  const handleGoHome = () => {
    // Navigate back to dashboard
    window.location.href = '/dashboard';
  };

  // Generate session feedback from collected data
  const generateSessionFeedback = (stats: SessionStats, changes: WordStatusChange[]): SessionFeedback => {
    const upgrades = changes.filter(c => c.isUpgrade);
    const downgrades = changes.filter(c => c.isDowngrade);
    const maintained = changes.filter(c => !c.isUpgrade && !c.isDowngrade);
    
    return {
      totalWords: stats.wordsStudied,
      correctAnswers: stats.wordsCorrect,
      accuracy: stats.wordsStudied > 0 ? (stats.wordsCorrect / stats.wordsStudied) * 100 : 0,
      statusChanges: {
        upgrades,
        downgrades,
        maintained,
      },
      totalUpgrades: upgrades.length,
      totalDowngrades: downgrades.length,
      newWordsLearned: upgrades.filter(c => c.from === 'new' && c.to === 'learning').length,
      wordsReinforced: upgrades.filter(c => c.from === 'learning' && c.to === 'reviewing').length,
    };
  };

  const loadSessionData = useCallback(async () => {
    try {
      // Load words from API
      const words = await fetchSessionWords(selectedDifficulty!, 15);
      setSessionWords(words);
      
      console.log('Loaded session data:', {
        difficulty: selectedDifficulty,
        wordsCount: words.length
      });
      
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }, [selectedDifficulty]);

  // Load session data when difficulty is selected
  useEffect(() => {
    if (selectedDifficulty) {
      loadSessionData();
    }
  }, [selectedDifficulty, loadSessionData]);

  // Auto start session if initial difficulty is provided
  useEffect(() => {
    if (initialDifficulty && sessionWords.length > 0) {
      startSession();
    }
  }, [sessionWords, initialDifficulty]);

  const startSession = () => {
    setSessionState('active');
    setCurrentWordIndex(0);
    // Set random initial learning mode
    const modes: LearningMode[] = ['eng_to_jpn', 'jpn_to_eng', 'audio_recognition', 'context_fill'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    setCurrentMode(randomMode);
  };


  const handleWordAnswer = async (correct: boolean) => {
    const currentWord = sessionWords[currentWordIndex];
    
    // 🚀 IMMEDIATE UI UPDATE - No waiting for API
    // Update session stats instantly
    setSessionStats(prev => ({
      ...prev,
      wordsStudied: prev.wordsStudied + 1,
      wordsCorrect: prev.wordsCorrect + (correct ? 1 : 0)
    }));

    // 🔄 API UPDATE - Different behavior for last word vs others
    const progressUpdate: ProgressUpdate = {
      wordId: currentWord.id,
      correct,
      timestamp: Date.now()
    };

    if (currentWordIndex < sessionWords.length - 1) {
      // Not the last word - move to next immediately, update progress in background
      setCurrentWordIndex(prev => prev + 1);
      // Randomly select learning mode for variety
      const modes: LearningMode[] = ['eng_to_jpn', 'jpn_to_eng', 'audio_recognition', 'context_fill'];
      const randomMode = modes[Math.floor(Math.random() * modes.length)];
      setCurrentMode(randomMode);

      // Background API update
      updateWordProgressWithRetry(
        progressUpdate, 
        (change) => {
          setStatusChanges(prev => [...prev, change]);
        },
        currentWord
      );
    } else {
      // Last word - wait for API response to get status change, then complete session
      console.log('🏁 Processing last word, waiting for status change...');
      
      const statusChange = await updateWordProgressWithRetry(
        progressUpdate, 
        (change) => {
          setStatusChanges(prev => [...prev, change]);
        },
        currentWord
      );
      
      if (statusChange) {
        console.log('📊 Status change received for last word:', statusChange);
      }

      // Calculate final stats including current word
      const finalWordsStudied = sessionStats.wordsStudied + 1;
      const finalWordsCorrect = sessionStats.wordsCorrect + (correct ? 1 : 0);
      await completeSession(finalWordsStudied, finalWordsCorrect);
    }
  };


  const renderSetup = () => (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-10 mb-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-4 text-white">学習セッション</h2>
          <p className="text-xl text-white/80">科学的根拠に基づく効率的な10分間学習</p>
        </div>

        {/* Difficulty Selection */}
        <div className="glass-light rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-6 text-white text-center">学習難易度を選択</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => { setSelectedDifficulty('easy'); startSession(); }}
              className="p-6 rounded-xl text-center transition-all duration-300 hover:scale-105 glass text-white/80 hover:glass-strong"
            >
              <div className="text-2xl font-bold mb-2">初級</div>
              <div className="text-sm text-white/70">基本単語・日常会話</div>
            </button>
            <button
              onClick={() => { setSelectedDifficulty('medium'); startSession(); }}
              className="p-6 rounded-xl text-center transition-all duration-300 hover:scale-105 glass text-white/80 hover:glass-strong"
            >
              <div className="text-2xl font-bold mb-2">中級</div>
              <div className="text-sm text-white/70">応用単語・ビジネス</div>
            </button>
            <button
              onClick={() => { setSelectedDifficulty('hard'); startSession(); }}
              className="p-6 rounded-xl text-center transition-all duration-300 hover:scale-105 glass text-white/80 hover:glass-strong"
            >
              <div className="text-2xl font-bold mb-2">上級</div>
              <div className="text-sm text-white/70">高度単語・学術的</div>
            </button>
          </div>
        </div>

        <div className="glass-light rounded-2xl p-6 text-center">
          <div className="text-white/80">
            <div className="flex items-center justify-center gap-3">
              <Target className="text-white" size={20} />
              <span>学習モード: 英→日、日→英、音声認識、文脈推測</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActive = () => (
    <div className="max-w-5xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between text-sm text-white/80 mb-3">
          <span className="font-medium">学習進捗</span>
          {/* <span className="font-bold">{Math.round((currentWordIndex / sessionWords.length) * 100)}%</span> */}
          <span className="text-bold">{currentWordIndex + 1} / {sessionWords.length}</span>
        </div>
        <div className="glass-progress rounded-full h-4">
          <div 
            className="glass-progress-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentWordIndex / sessionWords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Word Card */}
      {sessionWords[currentWordIndex] && (
        <WordCard
          word={sessionWords[currentWordIndex]}
          mode={currentMode}
          onAnswer={handleWordAnswer}
        />
      )}
    </div>
  );


  const renderCompleted = () => {
    if (!sessionFeedback) {
      // Loading state while feedback is being generated
      return (
        <div className="max-w-3xl mx-auto">
          <div className="glass-strong rounded-3xl p-12 text-center">
            <div className="text-2xl font-bold text-white mb-4">結果を集計中...</div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      );
    }

    return (
      <SessionFeedbackComponent
        feedback={sessionFeedback}
        onStartNewSession={handleStartNewSession}
        onGoHome={handleGoHome}
      />
    );
  };

  // Skip setup if initial difficulty is provided
  if (initialDifficulty && sessionState === 'setup') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="glass-strong rounded-3xl p-10 text-center">
          <div className="text-2xl font-bold text-white mb-4">学習セッションを準備中...</div>
          <div className="glass-light rounded-xl p-4 inline-block">
            <div className="text-lg text-white">
              難易度: {selectedDifficulty === 'easy' ? '初級' : selectedDifficulty === 'medium' ? '中級' : '上級'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  switch (sessionState) {
    case 'setup':
      return renderSetup();
    case 'active':
      return renderActive();
    case 'completed':
      return renderCompleted();
    default:
      return null;
  }
}