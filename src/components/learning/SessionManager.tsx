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
import { saveSession, loadSession, clearSession, hasSavedSession, addSessionAnswer } from '@/lib/session-resume';

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
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);

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

  const handleConfirmExit = () => {
    console.log('🚪 User confirmed exit without saving');

    // Note: Progress is NOT saved to maintain data consistency
    // Reason: 1 session = 10 words fixed structure
    // Partial progress would break this constraint
    // Session data is saved to localStorage for resume feature

    setShowExitDialog(false);
    window.location.href = '/dashboard';
  };

  const handleCancelExit = () => {
    setShowExitDialog(false);
  };

  const handleResumeSession = () => {
    console.log('▶️ User chose to resume session');
    const saved = loadSession();
    if (!saved) {
      console.error('❌ Failed to load saved session');
      setShowResumeDialog(false);
      loadSessionData(); // Start new session
      return;
    }

    // Restore session state (answers are in localStorage, not in memory)
    setSessionWords(saved.words);
    setCurrentWordIndex(saved.currentWordIndex);
    setSessionStats({
      ...saved.stats,
      sessionType: 'progress_based'
    });
    setSessionState('active');
    setShowResumeDialog(false);

    console.log('✅ Session resumed from localStorage:', {
      currentWordIndex: saved.currentWordIndex,
      totalWords: saved.words.length,
      answersCount: saved.answers.length
    });
  };

  const handleDeclineResume = async () => {
    console.log('🆕 User chose to start new session');
    clearSession();
    setShowResumeDialog(false);

    // Load fresh session
    try {
      const words = await fetchSessionWords();
      setSessionWords(words);
      console.log('Loaded fresh session data:', {
        wordsCount: words.length
      });
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };


  const loadSessionData = useCallback(async () => {
    try {
      // Check if there's a saved session in localStorage
      if (hasSavedSession()) {
        console.log('💾 Found saved session in localStorage');
        setShowResumeDialog(true);
        return; // Wait for user decision
      }

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

  const startSession = useCallback(() => {
    setSessionState('active');
    setCurrentWordIndex(0);

    // 💾 Save initial session to localStorage (one-time save of words data)
    saveSession({
      sessionId,
      startedAt: new Date().toISOString(),
      words: sessionWords,
      currentWordIndex: 0,
      answers: [],
      stats: {
        wordsStudied: 0,
        wordsCorrect: 0,
      }
    });
    console.log('💾 Initial session saved to localStorage');

    // Set random initial learning mode
    const modes: LearningMode[] = ['eng_to_jpn', 'jpn_to_eng', 'audio_recognition', 'context_fill'];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    setCurrentMode(randomMode);
  }, [sessionId, sessionWords]);

  // Auto start session when words are loaded
  useEffect(() => {
    if (sessionWords.length > 0 && sessionState === 'loading') {
      startSession();
    }
  }, [sessionWords, sessionState, startSession]);


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
    const updatedStats = {
      wordsStudied: sessionStats.wordsStudied + 1,
      wordsCorrect: sessionStats.wordsCorrect + (correct ? 1 : 0),
      sessionType: sessionStats.sessionType
    };
    setSessionStats(updatedStats);

    if (currentWordIndex < sessionWords.length - 1) {
      // Not the last word - move to next immediately
      console.log('📝 Answer collected for batch processing:', sessionAnswer);

      // 💾 AUTO-SAVE to localStorage after each answer
      // Uses addSessionAnswer() - only updates progress, not words data
      addSessionAnswer(sessionAnswer, {
        wordsStudied: updatedStats.wordsStudied,
        wordsCorrect: updatedStats.wordsCorrect
      });
      console.log('💾 Session progress auto-saved to localStorage');

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

      // Add final answer to localStorage
      addSessionAnswer(sessionAnswer, {
        wordsStudied: finalWordsStudied,
        wordsCorrect: finalWordsCorrect
      });

      // Load all answers from localStorage
      const session = loadSession();
      const allAnswers = session?.answers || [];
      console.log('📝 Final answer included in batch:', sessionAnswer);
      console.log('📊 Complete batch for processing:', allAnswers);

      // 🗑️ Clear localStorage as session is completing
      clearSession();
      console.log('🗑️ Cleared session from localStorage (session completing)');

      completeSessionWithFinalAnswer(finalWordsStudied, finalWordsCorrect, allAnswers);
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

  // Resume confirmation dialog
  const renderResumeDialog = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 max-w-md mx-4 rounded-2xl shadow-2xl">
        <h3 className="text-2xl font-bold mb-4 text-white">セッション再開</h3>
        <p className="text-white/80 mb-6">
          前回のセッションが途中で終了しています。続きから再開しますか？
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleResumeSession}
            className="flex-1 glass-button py-3 px-6 rounded-xl font-semibold text-white hover:scale-105 transition-all duration-300"
          >
            続きから再開
          </button>
          <button
            onClick={handleDeclineResume}
            className="flex-1 bg-white/10 hover:bg-white/20 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300"
          >
            新しいセッション
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on session state
  if (showResumeDialog) {
    return renderResumeDialog();
  }

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