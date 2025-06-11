'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Timer, Target, TrendingUp, BookOpen } from 'lucide-react';
import WordCard, { LearningMode } from './WordCard';
import { calculateOptimalSessionComposition } from '@/lib/spaced-repetition';

interface SessionManagerProps {
  userId: string;
  sessionDuration?: number; // minutes
  onSessionComplete?: (stats: SessionStats) => void;
}

interface SessionStats {
  duration: number; // seconds
  wordsStudied: number;
  wordsCorrect: number;
  averageResponseTime: number;
  focusScore: number;
  sessionType: string;
}

interface Word {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string;
  partOfSpeech: string;
  examples: Array<{
    id: string;
    english: string;
    japanese: string;
    difficulty: number;
  }>;
  progress?: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: Date;
    streak: number;
    totalReviews: number;
    correctAnswers: number;
  };
}

export default function SessionManager({ 
  userId, 
  sessionDuration = 10, 
  onSessionComplete 
}: SessionManagerProps) {
  const [sessionState, setSessionState] = useState<'setup' | 'active' | 'paused' | 'completed'>('setup');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentMode, setCurrentMode] = useState<LearningMode>('eng_to_jpn');
  const [timeRemaining, setTimeRemaining] = useState(sessionDuration * 60); // seconds
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    duration: 0,
    wordsStudied: 0,
    wordsCorrect: 0,
    averageResponseTime: 0,
    focusScore: 100,
    sessionType: 'mixed'
  });
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [sessionComposition, setSessionComposition] = useState({ newWords: 0, reviews: 0, totalWords: 0 });

  const completeSession = useCallback(() => {
    setSessionState('completed');
    
    const finalStats: SessionStats = {
      duration: sessionDuration * 60 - timeRemaining,
      wordsStudied: sessionStats.wordsStudied,
      wordsCorrect: sessionStats.wordsCorrect,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      focusScore: sessionStats.focusScore,
      sessionType: 'mixed'
    };
    
    setSessionStats(finalStats);
    onSessionComplete?.(finalStats);
  }, [sessionDuration, timeRemaining, sessionStats, responseTimes, onSessionComplete]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionState === 'active' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState, timeRemaining, completeSession]);

  const loadSessionData = useCallback(async () => {
    try {
      // Mock data for now - in real app, fetch from API
      const mockWords: Word[] = [
        {
          id: '1',
          english: 'serendipity',
          japanese: '偶然の幸運',
          phonetic: 'ˌserənˈdipədē',
          partOfSpeech: 'noun',
          examples: [
            {
              id: '1',
              english: 'Finding that book was pure serendipity.',
              japanese: 'その本を見つけたのは純粋に偶然の幸運でした。',
              difficulty: 2
            }
          ]
        },
        {
          id: '2',
          english: 'ephemeral',
          japanese: '短命な、はかない',
          phonetic: 'əˈfem(ə)rəl',
          partOfSpeech: 'adjective',
          examples: [
            {
              id: '2',
              english: 'The beauty of cherry blossoms is ephemeral.',
              japanese: '桜の美しさははかないものです。',
              difficulty: 3
            }
          ]
        },
        {
          id: '3',
          english: 'ubiquitous',
          japanese: '至る所にある、遍在する',
          phonetic: 'yo͞oˈbikwədəs',
          partOfSpeech: 'adjective',
          examples: [
            {
              id: '3',
              english: 'Smartphones have become ubiquitous in modern society.',
              japanese: 'スマートフォンは現代社会において至る所にあるものとなった。',
              difficulty: 2
            }
          ]
        }
      ];

      setSessionWords(mockWords);
      
      // Calculate optimal session composition
      const composition = calculateOptimalSessionComposition(
        10, // available new words
        15, // due reviews
        3, // user level
        sessionDuration
      );
      setSessionComposition(composition);
      
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }, [sessionDuration]);

  // Load session data on mount
  useEffect(() => {
    loadSessionData();
  }, [userId, loadSessionData]);

  const startSession = () => {
    setSessionState('active');
    setCurrentWordIndex(0);
    setTimeRemaining(sessionDuration * 60);
  };

  const pauseSession = () => {
    setSessionState('paused');
  };

  const resumeSession = () => {
    setSessionState('active');
  };

  const handleWordAnswer = async (correct: boolean, difficulty: number, responseTime: number, hintsUsed: number) => {
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      wordsStudied: prev.wordsStudied + 1,
      wordsCorrect: prev.wordsCorrect + (correct ? 1 : 0)
    }));

    setResponseTimes(prev => [...prev, responseTime]);

    // Calculate focus score based on response time and hints
    const expectedTime = 5000; // 5 seconds expected
    const timeScore = Math.max(0, 100 - (responseTime - expectedTime) / 100);
    const hintPenalty = hintsUsed * 10;
    const focusAdjustment = Math.max(0, timeScore - hintPenalty) / 100;
    
    setSessionStats(prev => ({
      ...prev,
      focusScore: Math.max(0, prev.focusScore - (100 - focusAdjustment))
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSetup = () => (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-10 mb-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-4 text-white">学習セッション</h2>
          <p className="text-xl text-white/80">科学的根拠に基づく効率的な10分間学習</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Timer className="text-white" size={32} />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{sessionDuration}分</div>
            <div className="text-sm text-white/80">集中学習時間</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Target className="text-white" size={32} />
            </div>
            <div className="text-2xl font-bold text-white mb-2">{sessionComposition.totalWords}語</div>
            <div className="text-sm text-white/80">予定学習語数</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <TrendingUp className="text-white" size={32} />
            </div>
            <div className="text-2xl font-bold text-white mb-2">混合モード</div>
            <div className="text-sm text-white/80">学習パターン</div>
          </div>
        </div>

        <div className="glass-light rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 text-white">今回のセッション構成</h3>
          <div className="text-white/80 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              <span>新しい単語: {sessionComposition.newWords}語</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400"></div>
              <span>復習単語: {sessionComposition.reviews}語</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400"></div>
              <span>学習モード: 英→日、日→英、音声認識、文脈推測</span>
            </div>
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={sessionWords.length === 0}
          className="w-full glass-button flex items-center justify-center gap-4 px-8 py-6 rounded-2xl text-xl font-bold text-white glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={28} />
          学習開始
        </button>
      </div>
    </div>
  );

  const renderActive = () => (
    <div className="max-w-5xl mx-auto">
      {/* Session Header */}
      <div className="glass-strong rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="glass rounded-xl p-4">
              <div className="text-3xl font-bold text-white">
                {formatTime(timeRemaining)}
              </div>
            </div>
            <div className="glass-light rounded-xl p-3">
              <div className="text-lg text-white font-medium">
                {currentWordIndex + 1} / {sessionWords.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={pauseSession}
              className="glass-button p-3 rounded-xl text-white hover:scale-105 transition-all duration-300"
            >
              <Pause size={20} />
            </button>
            <button
              onClick={completeSession}
              className="glass-button p-3 rounded-xl text-white hover:scale-105 transition-all duration-300"
            >
              <Square size={20} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-white/80 mb-3">
            <span className="font-medium">進捗</span>
            <span className="font-bold">{Math.round((currentWordIndex / sessionWords.length) * 100)}%</span>
          </div>
          <div className="glass-progress rounded-full h-3">
            <div 
              className="glass-progress-fill h-full rounded-full transition-all duration-500"
              style={{ width: `${(currentWordIndex / sessionWords.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Word Card */}
      {sessionWords[currentWordIndex] && (
        <WordCard
          word={sessionWords[currentWordIndex]}
          mode={currentMode}
          onAnswer={handleWordAnswer}
          showHint={true}
        />
      )}
    </div>
  );

  const renderPaused = () => (
    <div className="max-w-2xl mx-auto">
      <div className="glass-strong rounded-3xl p-10 text-center">
        <h2 className="text-3xl font-bold mb-6 text-white">セッション一時停止</h2>
        <div className="glass rounded-2xl p-6 mb-8 inline-block">
          <div className="text-2xl font-bold text-white">残り時間: {formatTime(timeRemaining)}</div>
        </div>
        <div className="flex justify-center gap-6">
          <button
            onClick={resumeSession}
            className="glass-button flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold text-white hover:scale-105 transition-all duration-300"
          >
            <Play size={24} />
            再開
          </button>
          <button
            onClick={completeSession}
            className="glass-button flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold text-white hover:scale-105 transition-all duration-300"
          >
            <Square size={24} />
            終了
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-4xl mx-auto">
      <div className="glass-strong rounded-3xl p-12">
        <div className="text-center mb-12">
          <div className="glass rounded-2xl p-6 mb-6 inline-block glow">
            <h2 className="text-4xl font-bold text-white">🎉 セッション完了！</h2>
          </div>
          <p className="text-xl text-white/80">お疲れさまでした</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <BookOpen className="text-white" size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{sessionStats.wordsStudied}</div>
            <div className="text-sm text-white/80">学習語数</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Target className="text-white" size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {Math.round((sessionStats.wordsCorrect / sessionStats.wordsStudied) * 100)}%
            </div>
            <div className="text-sm text-white/80">正答率</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Timer className="text-white" size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {Math.round(sessionStats.averageResponseTime / 1000)}s
            </div>
            <div className="text-sm text-white/80">平均回答時間</div>
          </div>
          <div className="glass rounded-2xl p-6 text-center hover:glass-strong transition-all duration-300">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{Math.round(sessionStats.focusScore)}</div>
            <div className="text-sm text-white/80">集中度スコア</div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="glass-button px-12 py-6 rounded-2xl text-xl font-bold text-white glow hover:scale-105 transition-all duration-300"
          >
            新しいセッションを開始
          </button>
        </div>
      </div>
    </div>
  );

  switch (sessionState) {
    case 'setup':
      return renderSetup();
    case 'active':
      return renderActive();
    case 'paused':
      return renderPaused();
    case 'completed':
      return renderCompleted();
    default:
      return null;
  }
}