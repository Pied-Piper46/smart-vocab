'use client';

import { useState, useEffect, useCallback } from 'react';
import WordCard, { LearningMode } from './WordCard';
import { fetchSessionWords, recordSessionCompletion, WordData, SessionAnswer, WordStatusChange } from '@/lib/api-client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SessionFeedbackComponent from './SessionFeedback';
import ExitConfirmationDialog from './ExitConfirmationDialog';
import { mutate } from 'swr';
import { calculateSessionProgressClient, type CurrentProgress, type ClientProgressResult } from '@/lib/client-progress-calculator';
import type { MasteryStatus } from '@/lib/mastery';

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

interface SessionManagerProps {
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
  onSessionComplete
}: SessionManagerProps) {
  const [sessionState, setSessionState] = useState<'loading' | 'active' | 'completed'>('loading');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentMode, setCurrentMode] = useState<LearningMode>('eng_to_jpn');
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    wordsStudied: 0,
    wordsCorrect: 0,
    sessionType: 'progress_based'
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
      sessionType: 'progress_based'
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
  }, [sessionStats, sessionAnswers, onSessionComplete]);

  // ✨ C-Plan: Complete session with immediate client feedback + background server processing
  const completeSessionWithFinalAnswer = useCallback(async (
    finalWordsStudied: number,
    finalWordsCorrect: number,
    finalAnswers: SessionAnswer[]
  ) => {
    setSessionState('completed');

    const finalStats: SessionStats = {
      wordsStudied: finalWordsStudied,
      wordsCorrect: finalWordsCorrect,
      sessionType: 'progress_based'
    };

    setSessionStats(finalStats);

    console.log('🏁 Session completing - C-Plan: Client calculation + background server processing...');
    console.log('📊 Final batch answers:', finalAnswers);

    // ✨ Step 1: Client-side calculation (instant - 0.1s)
    const initialProgress = new Map<string, CurrentProgress>();
    sessionWords.forEach(word => {
      if (word.progress) {
        initialProgress.set(word.id, {
          totalReviews: word.progress.totalReviews,
          correctAnswers: word.progress.correctAnswers,
          streak: word.progress.streak,
          status: word.progress.status as MasteryStatus
        });
      }
    });

    const clientResults = calculateSessionProgressClient(initialProgress, finalAnswers);
    console.log('📊 Client results calculated:', clientResults);

    // ✨ Step 2: Immediate completion screen display (client calculation result)
    const clientFeedback = generateClientFeedback(finalStats, clientResults);
    setSessionFeedback(clientFeedback);
    console.log('🎉 Completion screen shown immediately with client results (0.1s)');

    // ✨ Step 3: Background server processing (5-10s, non-blocking)
    recordSessionCompletion(finalStats.wordsStudied, finalAnswers)
      .then(async (serverResult) => {
        console.log('✅ Server processing completed:', serverResult);

        // Generate server feedback
        const serverFeedback = generateSessionFeedbackFromBatch(finalStats, serverResult.statusChanges);

        // Check discrepancy and update if needed
        if (hasDiscrepancy(clientFeedback, serverFeedback)) {
          console.log('⚠️ Discrepancy detected between client and server results, updating...');
          console.log('Client upgrades:', clientFeedback.totalUpgrades, 'Server upgrades:', serverFeedback.totalUpgrades);
          console.log('Client downgrades:', clientFeedback.totalDowngrades, 'Server downgrades:', serverFeedback.totalDowngrades);
          setSessionFeedback(serverFeedback);
        } else {
          console.log('✅ Client and server results match perfectly');
        }

        // SWR Cache Invalidation
        console.log('📋 Invalidating SWR cache for dashboard and progress data...');
        await Promise.all([
          mutate('/api/dashboard'),
          mutate('/api/user/profile'),
          mutate('/api/progress/daily'),
          mutate('/api/progress/analytics'),
          mutate('/api/progress/struggling-words')
        ]);
        console.log('✅ SWR cache invalidated successfully');

        onSessionComplete?.(finalStats, serverFeedback);
      })
      .catch(error => {
        console.error('❌ Server processing failed:', error);
        // Client feedback is already displayed, so user experience is not affected
        // Error notification could be shown here (optional)
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionWords, onSessionComplete]);

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

  // ✨ NEW: Generate client feedback from client calculation results
  const generateClientFeedback = (
    stats: SessionStats,
    clientResults: ClientProgressResult[]
  ): SessionFeedback => {
    const upgrades: WordStatusChange[] = [];
    const downgrades: WordStatusChange[] = [];
    const maintained: WordStatusChange[] = [];

    // sessionWords から英語・日本語を取得
    const wordMap = new Map(sessionWords.map(w => [w.id, w]));

    clientResults.forEach(result => {
      const word = wordMap.get(result.wordId);
      if (!word) return;

      if (result.statusChanged) {
        const statusHierarchy: Record<string, number> = {
          'new': 0, 'learning': 1, 'reviewing': 2, 'mastered': 3
        };
        const isUpgrade = statusHierarchy[result.status] > statusHierarchy[result.previousStatus];

        const change: WordStatusChange = {
          wordId: result.wordId,
          english: word.english,
          japanese: word.japanese,
          from: result.previousStatus,
          to: result.status,
          isUpgrade,
          isDowngrade: !isUpgrade
        };

        if (isUpgrade) {
          upgrades.push(change);
        } else {
          downgrades.push(change);
        }
      } else {
        maintained.push({
          wordId: result.wordId,
          english: word.english,
          japanese: word.japanese,
          from: result.previousStatus,
          to: result.status,
          isUpgrade: false,
          isDowngrade: false
        });
      }
    });

    return {
      totalWords: stats.wordsStudied,
      correctAnswers: stats.wordsCorrect,
      accuracy: stats.wordsStudied > 0 ? (stats.wordsCorrect / stats.wordsStudied) * 100 : 0,
      statusChanges: { upgrades, downgrades, maintained },
      totalUpgrades: upgrades.length,
      totalDowngrades: downgrades.length,
      newWordsLearned: upgrades.filter(c => c.from === 'new' && c.to === 'learning').length,
      wordsReinforced: upgrades.filter(c => c.from === 'learning' && c.to === 'reviewing').length,
    };
  };

  // ✨ NEW: Check discrepancy between client and server results
  const hasDiscrepancy = (
    clientFeedback: SessionFeedback,
    serverFeedback: SessionFeedback
  ): boolean => {
    return (
      clientFeedback.totalUpgrades !== serverFeedback.totalUpgrades ||
      clientFeedback.totalDowngrades !== serverFeedback.totalDowngrades
    );
  };

  // Handle feedback actions
  const handleStartNewSession = () => {
    setSessionState('loading');
    setCurrentWordIndex(0);
    setSessionWords([]);
    setSessionStats({
      wordsStudied: 0,
      wordsCorrect: 0,
      sessionType: 'progress_based'
    });
    setSessionAnswers([]);
    setSessionFeedback(null);
    // Reload session data
    loadSessionData();
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
      // Load words from API (no difficulty parameter)
      const words = await fetchSessionWords();
      setSessionWords(words);

      console.log('Loaded session data:', {
        wordsCount: words.length
      });

    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }, []);

  // Load session data on mount
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Auto start session when words are loaded
  useEffect(() => {
    if (sessionWords.length > 0 && sessionState === 'loading') {
      startSession();
    }
  }, [sessionWords, sessionState]);

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
      responseTime: Date.now(),
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

  // Render based on session state
  if (sessionState === 'loading') {
    return <LoadingSpinner text="学習セッションを準備しています..." absolute />;
  }

  if (sessionState === 'active') {
    return renderActive();
  }

  if (sessionState === 'completed') {
    return renderCompleted();
  }

  return null;
}