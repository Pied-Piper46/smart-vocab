'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Timer, Target, TrendingUp } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">学習セッション</h2>
        <p className="text-gray-600">科学的根拠に基づく効率的な10分間学習</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <Timer className="mx-auto mb-2 text-blue-600" size={24} />
          <div className="font-bold text-blue-800">{sessionDuration}分</div>
          <div className="text-sm text-blue-600">集中学習時間</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <Target className="mx-auto mb-2 text-green-600" size={24} />
          <div className="font-bold text-green-800">{sessionComposition.totalWords}語</div>
          <div className="text-sm text-green-600">予定学習語数</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <TrendingUp className="mx-auto mb-2 text-purple-600" size={24} />
          <div className="font-bold text-purple-800">混合モード</div>
          <div className="text-sm text-purple-600">学習パターン</div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-bold mb-2">今回のセッション構成</h3>
        <div className="text-sm text-gray-600">
          <div>• 新しい単語: {sessionComposition.newWords}語</div>
          <div>• 復習単語: {sessionComposition.reviews}語</div>
          <div>• 学習モード: 英→日、日→英、音声認識、文脈推測</div>
        </div>
      </div>

      <button
        onClick={startSession}
        disabled={sessionWords.length === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium"
      >
        <Play size={20} />
        学習開始
      </button>
    </div>
  );

  const renderActive = () => (
    <div className="max-w-4xl mx-auto">
      {/* Session Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-600">
              {currentWordIndex + 1} / {sessionWords.length}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={pauseSession}
              className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <Pause size={16} />
            </button>
            <button
              onClick={completeSession}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Square size={16} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>進捗</span>
            <span>{Math.round((currentWordIndex / sessionWords.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg text-center">
      <h2 className="text-2xl font-bold mb-4">セッション一時停止</h2>
      <div className="text-lg mb-6">残り時間: {formatTime(timeRemaining)}</div>
      <div className="flex justify-center gap-4">
        <button
          onClick={resumeSession}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Play size={20} />
          再開
        </button>
        <button
          onClick={completeSession}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Square size={20} />
          終了
        </button>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-green-600">セッション完了！</h2>
        <p className="text-gray-600">お疲れさまでした</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-800">{sessionStats.wordsStudied}</div>
          <div className="text-sm text-blue-600">学習語数</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-800">
            {Math.round((sessionStats.wordsCorrect / sessionStats.wordsStudied) * 100)}%
          </div>
          <div className="text-sm text-green-600">正答率</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-800">
            {Math.round(sessionStats.averageResponseTime / 1000)}s
          </div>
          <div className="text-sm text-purple-600">平均回答時間</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-800">{Math.round(sessionStats.focusScore)}</div>
          <div className="text-sm text-yellow-600">集中度スコア</div>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        新しいセッションを開始
      </button>
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