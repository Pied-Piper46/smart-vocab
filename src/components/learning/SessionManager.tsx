'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target } from 'lucide-react';
import WordCard, { LearningMode } from './WordCard';
import { fetchSessionWords, recordSessionCompletion, WordData, SessionAnswer, WordStatusChange } from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SessionFeedbackComponent from './SessionFeedback';
import ExitConfirmationDialog from './ExitConfirmationDialog';
import { mutate } from 'swr';

// Note: Difficulty selection is deprecated (words are selected by mastery status instead)
type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Remove unused interfaces since they're now imported from api-client

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

// Batch processing - collect all answers during session

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
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const completeSession = useCallback(async (finalWordsStudied?: number, finalWordsCorrect?: number) => {
    setSessionState('completed');
    
    const finalStats: SessionStats = {
      wordsStudied: finalWordsStudied ?? sessionStats.wordsStudied,
      wordsCorrect: finalWordsCorrect ?? sessionStats.wordsCorrect,
      sessionType: selectedDifficulty || 'single_difficulty'
    };
    
    setSessionStats(finalStats);
    
    // 🚀 Batch process all answers at session completion
    console.log('🏁 Session completing, processing all answers in batch...');
    console.log('📊 Session answers:', sessionAnswers);
    
    try {
      // Send all answers to backend for batch processing
      const result = await recordSessionCompletion(finalStats.wordsStudied, sessionAnswers);
      console.log('✅ Session completion with batch processing completed:', result);
      
      // Generate session feedback from batch result
      const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, result.statusChanges);
      console.log('📋 Generated feedback from batch result:', feedback);
      setSessionFeedback(feedback);
      
      // 🚀 SWR Cache Invalidation - Refresh dashboard and progress data immediately
      console.log('📋 Invalidating SWR cache for dashboard and progress data...');
      await Promise.all([
        mutate('/api/dashboard'),
        mutate('/api/user/profile'),
        mutate('/api/progress/daily'),
        mutate('/api/progress/analytics'),
        mutate('/api/progress/struggling-words')
      ]);
      console.log('✅ SWR cache invalidated successfully');
      
      onSessionComplete?.(finalStats, feedback);
    } catch (error) {
      console.error('❌ Failed to complete session with batch processing:', error);
      
      // Enhanced error handling with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Retrying session completion (attempt ${retryCount + 1}/${maxRetries})...`);
          const result = await recordSessionCompletion(finalStats.wordsStudied, sessionAnswers);
          
          const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, result.statusChanges);
          setSessionFeedback(feedback);
          
          // Invalidate cache on successful retry
          await Promise.all([
            mutate('/api/dashboard'),
            mutate('/api/user/profile'),
            mutate('/api/progress/daily'),
            mutate('/api/progress/analytics'),
            mutate('/api/progress/struggling-words')
          ]);
          
          onSessionComplete?.(finalStats, feedback);
          return; // Success, exit retry loop
          
        } catch (retryError) {
          console.error(`❌ Retry ${retryCount + 1} failed:`, retryError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }
      }
      
      // All retries failed - show basic feedback but still try to invalidate cache
      console.error('❌ All retry attempts failed, showing basic feedback');
      const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, {
        upgrades: [],
        downgrades: [],
        maintained: []
      });
      setSessionFeedback(feedback);
      
      // Try to invalidate cache even on failure (user might have partial progress)
      try {
        await Promise.all([
          mutate('/api/dashboard'),
          mutate('/api/user/profile'),
          mutate('/api/progress/daily'),
          mutate('/api/progress/analytics'),
          mutate('/api/progress/struggling-words')
        ]);
      } catch (cacheError) {
        console.warn('⚠️ Failed to invalidate cache after session error:', cacheError);
      }
    }
  }, [sessionStats, selectedDifficulty, sessionAnswers, onSessionComplete]);

  // 🔥 NEW: Complete session with final answer passed directly to avoid state race condition
  const completeSessionWithFinalAnswer = useCallback(async (
    finalWordsStudied: number, 
    finalWordsCorrect: number, 
    finalAnswers: SessionAnswer[]
  ) => {
    setSessionState('completed');
    
    const finalStats: SessionStats = {
      wordsStudied: finalWordsStudied,
      wordsCorrect: finalWordsCorrect,
      sessionType: selectedDifficulty || 'single_difficulty'
    };
    
    setSessionStats(finalStats);
    
    // 🚀 Batch process all answers at session completion with final answer included
    console.log('🏁 Session completing with final answer, processing all answers in batch...');
    console.log('📊 Final batch answers:', finalAnswers);
    console.log('🔍 Final answer count verification:', finalAnswers.length, 'vs expected:', finalWordsStudied);
    
    try {
      // Send all answers (including final answer) to backend for batch processing
      const result = await recordSessionCompletion(finalStats.wordsStudied, finalAnswers);
      console.log('✅ Session completion with final answer batch processing completed:', result);
      
      // Generate session feedback from batch result
      const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, result.statusChanges);
      console.log('📋 Generated feedback from batch result:', feedback);
      setSessionFeedback(feedback);
      
      // 🚀 SWR Cache Invalidation - Refresh dashboard and progress data immediately
      console.log('📋 Invalidating SWR cache for dashboard and progress data...');
      await Promise.all([
        mutate('/api/dashboard'),
        mutate('/api/user/profile'),
        mutate('/api/progress/daily'),
        mutate('/api/progress/analytics'),
        mutate('/api/progress/struggling-words')
      ]);
      console.log('✅ SWR cache invalidated successfully');
      
      onSessionComplete?.(finalStats, feedback);
    } catch (error) {
      console.error('❌ Failed to complete session with final answer batch processing:', error);
      
      // Enhanced error handling with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Retrying session completion (attempt ${retryCount + 1}/${maxRetries})...`);
          const result = await recordSessionCompletion(finalStats.wordsStudied, finalAnswers);
          
          const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, result.statusChanges);
          setSessionFeedback(feedback);
          
          // Invalidate cache on successful retry
          await Promise.all([
            mutate('/api/dashboard'),
            mutate('/api/user/profile'),
            mutate('/api/progress/daily'),
            mutate('/api/progress/analytics'),
            mutate('/api/progress/struggling-words')
          ]);
          
          onSessionComplete?.(finalStats, feedback);
          return; // Success, exit retry loop
          
        } catch (retryError) {
          console.error(`❌ Retry ${retryCount + 1} failed:`, retryError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          }
        }
      }
      
      // All retries failed - show basic feedback but still try to invalidate cache
      console.error('❌ All retry attempts failed, showing basic feedback');
      const feedback: SessionFeedback = generateSessionFeedbackFromBatch(finalStats, {
        upgrades: [],
        downgrades: [],
        maintained: []
      });
      setSessionFeedback(feedback);
      
      // Try to invalidate cache even on failure (user might have partial progress)
      try {
        await Promise.all([
          mutate('/api/dashboard'),
          mutate('/api/user/profile'),
          mutate('/api/progress/daily'),
          mutate('/api/progress/analytics'),
          mutate('/api/progress/struggling-words')
        ]);
      } catch (cacheError) {
        console.warn('⚠️ Failed to invalidate cache after session error:', cacheError);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSessionComplete]);

  // Generate session feedback from batch result
  const generateSessionFeedbackFromBatch = (stats: SessionStats, statusChanges: { upgrades: WordStatusChange[]; downgrades: WordStatusChange[]; maintained: WordStatusChange[]; }): SessionFeedback => {
    return {
      totalWords: stats.wordsStudied,
      correctAnswers: stats.wordsCorrect,
      accuracy: stats.wordsStudied > 0 ? (stats.wordsCorrect / stats.wordsStudied) * 100 : 0,
      statusChanges,
      totalUpgrades: statusChanges.upgrades.length,
      totalDowngrades: statusChanges.downgrades.length,
      newWordsLearned: statusChanges.upgrades.filter(c => c.from === 'new' && c.to === 'learning').length,
      wordsReinforced: statusChanges.upgrades.filter(c => c.from === 'learning' && c.to === 'reviewing').length,
    };
  };

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
    setSessionAnswers([]);
    setSessionFeedback(null);
    // Keep the same difficulty for new session and reload data
    if (selectedDifficulty) {
      loadSessionData();
    }
  };

  const handleGoHome = () => {
    if (sessionState === 'active') {
      setShowExitDialog(true);
    } else {
      // Navigate back to dashboard
      window.location.href = '/dashboard';
    }
  };

  const handleConfirmExit = async () => {
    console.log('🚪 User confirmed exit, saving progress for answered words...');
    
    // Save progress for answered words only (no session record)
    if (sessionAnswers.length > 0) {
      try {
        // Create a batch progress update API call (without session completion)
        const response = await fetch('/api/progress/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answers: sessionAnswers,
          }),
        });
        
        if (response.ok) {
          console.log(`✅ Progress saved for ${sessionAnswers.length} answered words`);
        } else {
          console.warn('⚠️ Failed to save progress, but continuing exit');
        }
      } catch (error) {
        console.warn('⚠️ Error saving progress on exit:', error);
      }
    }
    
    setShowExitDialog(false);
    window.location.href = '/dashboard';
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
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


  const handleWordAnswer = (correct: boolean) => {
    const currentWord = sessionWords[currentWordIndex];
    
    // 🚀 BATCH PROCESSING - Collect answer for later processing
    const sessionAnswer: SessionAnswer = {
      wordId: currentWord.id,
      isCorrect: correct,
      timestamp: Date.now(),
      mode: currentMode
    };
    
    // Update session stats instantly for UI
    setSessionStats(prev => ({
      ...prev,
      wordsStudied: prev.wordsStudied + 1,
      wordsCorrect: prev.wordsCorrect + (correct ? 1 : 0)
    }));

    if (currentWordIndex < sessionWords.length - 1) {
      // Not the last word - move to next immediately
      // Add answer to batch collection
      setSessionAnswers(prev => [...prev, sessionAnswer]);
      console.log('📝 Answer collected for batch processing:', sessionAnswer);
      
      setCurrentWordIndex(prev => prev + 1);
      // Randomly select learning mode for variety
      const modes: LearningMode[] = ['eng_to_jpn', 'jpn_to_eng', 'audio_recognition', 'context_fill'];
      const randomMode = modes[Math.floor(Math.random() * modes.length)];
      setCurrentMode(randomMode);
    } else {
      // Last word - complete session with batch processing
      console.log('🏁 Last word answered, completing session with batch processing...');
      
      // Calculate final stats including current word
      const finalWordsStudied = sessionStats.wordsStudied + 1;
      const finalWordsCorrect = sessionStats.wordsCorrect + (correct ? 1 : 0);
      
      // 🔥 CRITICAL: Pass the final answer directly to avoid React state race condition
      const updatedAnswers = [...sessionAnswers, sessionAnswer];
      console.log('📝 Final answer included in batch:', sessionAnswer);
      console.log('📊 Complete batch for processing:', updatedAnswers);
      
      completeSessionWithFinalAnswer(finalWordsStudied, finalWordsCorrect, updatedAnswers);
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
      {/* Header with Return Button */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleGoHome}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
        >
          ×
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between items-center text-sm text-white/80 mb-3">
          <span className="font-medium">学習進捗</span>
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

      {/* Exit Confirmation Dialog */}
      <ExitConfirmationDialog
        isOpen={showExitDialog}
        wordsStudied={currentWordIndex}
        totalWords={sessionWords.length}
        onConfirmExit={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </div>
  );


  const renderCompleted = () => {
    if (!sessionFeedback) {
      // Loading state while feedback is being generated
      return <LoadingSpinner text="結果を集計しています..." absolute />;
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
    return <LoadingSpinner text="学習セッションを準備しています..." absolute />;
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