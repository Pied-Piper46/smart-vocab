'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Target } from 'lucide-react';
import WordCard, { LearningMode } from './WordCard';
import { getSessionWords } from '@/lib/word-data-loader';
import { SessionWord, DifficultyLevel } from '@/types/word-data';

interface SessionManagerProps {
  sessionDuration?: number; // minutes
  initialDifficulty?: DifficultyLevel | null;
  onSessionComplete?: (stats: SessionStats) => void;
}

interface SessionStats {
  wordsStudied: number;
  wordsCorrect: number;
  sessionType: string;
}

// Use SessionWord type from word-data.ts
type Word = SessionWord;

export default function SessionManager({ 
  sessionDuration = 10,
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

  const completeSession = useCallback(() => {
    setSessionState('completed');
    
    const finalStats: SessionStats = {
      wordsStudied: sessionStats.wordsStudied,
      wordsCorrect: sessionStats.wordsCorrect,
      sessionType: selectedDifficulty || 'single_difficulty'
    };
    
    setSessionStats(finalStats);
    onSessionComplete?.(finalStats);
  }, [sessionStats, selectedDifficulty, onSessionComplete]);


  const loadSessionData = useCallback(async () => {
    try {
      // Load words from JSON data files
      const words = getSessionWords(selectedDifficulty!, 15);
      setSessionWords(words);
      
      console.log('Loaded session data:', {
        difficulty: selectedDifficulty,
        wordsCount: words.length
      });
      
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }, [sessionDuration, selectedDifficulty]);

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
  };


  const handleWordAnswer = async (correct: boolean, userDifficulty: number, responseTime: number, hintsUsed: number) => {
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      wordsStudied: prev.wordsStudied + 1,
      wordsCorrect: prev.wordsCorrect + (correct ? 1 : 0)
    }));

    // Move to next word or complete session
    if (currentWordIndex < sessionWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      // Rotate learning modes for variety
      const modes: LearningMode[] = ['eng_to_jpn', 'jpn_to_eng', 'audio_recognition', 'context_fill'];
      setCurrentMode(modes[(currentWordIndex + 1) % modes.length]);
    } else {
      completeSession();
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


  const renderCompleted = () => (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-8">🎉 セッション完了！</h2>
          <p className="text-xl text-white/80">お疲れさまでした。</p>
        </div>

        {/* Accuracy Result */}
        <div className="text-center mb-10">
          <div className="glass rounded-2xl p-8 inline-block">
            <div className="text-6xl font-bold text-gradient mb-4">
              {Math.round((sessionStats.wordsCorrect / sessionStats.wordsStudied) * 100)}%
            </div>
            <div className="text-4xl font-bold text-white">
              {sessionStats.wordsCorrect} / {sessionStats.wordsStudied}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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