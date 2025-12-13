'use client';

import React, { useState } from 'react';
import { Volume2, ArrowRight } from 'lucide-react';

const DEMO_COLORS = {
  primary: '#10b981',
  primaryDark: '#047857',
  text: '#2C3538',
  textLight: '#6B7280',
  bg: '#ffffff',
  accent: '#f0f8f5',
  border: '#e5e7eb',
};

// Mock word data matching the actual WordData structure
const DEMO_WORDS = [
  {
    id: '1',
    english: 'accomplish',
    japanese: '達成する、成し遂げる',
    phonetic: '/əˈkʌmplɪʃ/',
    partOfSpeech: 'verb',
    exampleEnglish: 'I want to accomplish my goals this year.',
    exampleJapanese: '今年は目標を達成したいです。',
    progress: {
      totalReviews: 8,
      correctAnswers: 6,
      streak: 3,
      status: 'learning',
      lastReviewedAt: '2024-01-15',
      recommendedReviewDate: '2024-01-20'
    }
  },
  {
    id: '2', 
    english: 'magnificent',
    japanese: '素晴らしい、壮大な',
    phonetic: '/mæɡˈnɪfɪsənt/',
    partOfSpeech: 'adjective',
    exampleEnglish: 'The view from the mountain was magnificent.',
    exampleJapanese: '山からの景色は素晴らしかった。',
    progress: {
      totalReviews: 15,
      correctAnswers: 14,
      streak: 8,
      status: 'mastered',
      lastReviewedAt: '2024-01-10',
      recommendedReviewDate: '2024-01-25'
    }
  },
  {
    id: '3',
    english: 'perseverance', 
    japanese: '忍耐力、根気',
    phonetic: '/ˌpɜːrsəˈvɪrəns/',
    partOfSpeech: 'noun',
    exampleEnglish: 'Success requires perseverance and hard work.',
    exampleJapanese: '成功には忍耐力と努力が必要です。',
    progress: {
      totalReviews: 3,
      correctAnswers: 1,
      streak: 0,
      status: 'new',
      lastReviewedAt: '2024-01-16',
      recommendedReviewDate: '2024-01-17'
    }
  }
];

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'new':
        return { label: '新規', color: '#3b82f6' };
      case 'learning':
        return { label: '学習中', color: '#eab308' };
      case 'reviewing':
        return { label: '復習中', color: '#8b5cf6' };
      case 'mastered':
        return { label: '習得済', color: DEMO_COLORS.primary };
      default:
        return { label: '不明', color: '#6b7280' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <span 
      className={`px-3 py-1 rounded-full text-xs font-bold text-white`}
      style={{ backgroundColor: statusInfo.color }}
    >
      {statusInfo.label}
    </span>
  );
};


const WordCard = ({ 
  word, 
  mode = 'question',
  className = ''
}: {
  word: any;
  mode?: 'question' | 'answer';
  className?: string;
}) => {
  const accuracy = word.progress.totalReviews > 0 
    ? Math.round((word.progress.correctAnswers / word.progress.totalReviews) * 100)
    : 0;

  // 前回の正誤を判定（streak > 0なら前回正解、0なら前回不正解）
  const lastAnswerCorrect = word.progress.streak > 0;
  
  // 前回復習日をフォーマット
  const formatLastReview = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        {/* 左上：前回復習日 */}
        <div className="text-xs" style={{ color: DEMO_COLORS.textLight }}>
          {word.progress.lastReviewedAt && (
            <div>
              前回: {formatLastReview(word.progress.lastReviewedAt)}
            </div>
          )}
        </div>
        
        {/* 右上：ステータスバッジ */}
        <StatusBadge status={word.progress.status} />
      </div>

      {/* Main Content */}
      <div className="space-y-4 mb-6">
        {mode === 'question' ? (
          // Question Mode
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold" style={{ color: DEMO_COLORS.text }}>
              {word.english}
            </h2>
            <p className="text-lg" style={{ color: DEMO_COLORS.textLight }}>
              {word.phonetic}
            </p>
            <p className="text-sm" style={{ color: DEMO_COLORS.textLight }}>
              {word.partOfSpeech}
            </p>
          </div>
        ) : (
          // Answer Mode
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold" style={{ color: DEMO_COLORS.text }}>
                {word.english}
              </h2>
              <p className="text-lg" style={{ color: DEMO_COLORS.textLight }}>
                {word.phonetic}
              </p>
              <p className="text-xl font-semibold" style={{ color: DEMO_COLORS.primary }}>
                {word.japanese}
              </p>
              <p className="text-sm" style={{ color: DEMO_COLORS.textLight }}>
                {word.partOfSpeech}
              </p>
            </div>

            {/* Example */}
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: DEMO_COLORS.accent }}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: DEMO_COLORS.text }}>
                  例文:
                </p>
                <p className="text-sm" style={{ color: DEMO_COLORS.text }}>
                  {word.exampleEnglish}
                </p>
                <p className="text-sm" style={{ color: DEMO_COLORS.textLight }}>
                  {word.exampleJapanese}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Section - questionモードのみ表示 */}
      {mode === 'question' && (
        <div className="border-t pt-4" style={{ borderColor: DEMO_COLORS.border }}>
          <div className="flex justify-between items-center">
            {/* 左下：前回の正誤 */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                lastAnswerCorrect ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs" style={{ color: DEMO_COLORS.textLight }}>
                前回{lastAnswerCorrect ? '正解' : '不正解'}
              </span>
            </div>
            
            {/* 右下：正答率 */}
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: DEMO_COLORS.primary }}>
                {accuracy}%
              </p>
              <p className="text-xs" style={{ color: DEMO_COLORS.textLight }}>
                {word.progress.correctAnswers}/{word.progress.totalReviews}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButtons = ({ 
  mode,
  onShowAnswer,
  onAnswer,
  className = ''
}: {
  mode: 'question' | 'answer';
  onShowAnswer?: () => void;
  onAnswer?: (correct: boolean) => void;
  className?: string;
}) => {
  const playAudio = () => {
    if ('speechSynthesis' in window) {
      // デモ用の音声再生
      const utterance = new SpeechSynthesisUtterance('accomplish');
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  if (mode === 'question') {
    return (
      <div className={`flex gap-4 justify-center ${className}`}>
        <button
          onClick={playAudio}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 border-2"
          style={{
            borderColor: DEMO_COLORS.primary,
            color: DEMO_COLORS.primary,
            backgroundColor: 'transparent'
          }}
        >
          <Volume2 size={16} />
          音声
        </button>
        <button
          onClick={onShowAnswer}
          className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: DEMO_COLORS.primary,
            color: 'white'
          }}
        >
          答えを見る
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  // Answer mode
  return (
    <div className={`flex gap-4 justify-center ${className}`}>
      <button
        onClick={() => onAnswer?.(false)}
        className="px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 border-2"
        style={{
          borderColor: '#ef4444',
          color: '#ef4444',
          backgroundColor: 'transparent'
        }}
      >
        不正解
      </button>
      <button
        onClick={() => onAnswer?.(true)}
        className="px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: DEMO_COLORS.primary,
          color: 'white'
        }}
      >
        正解
      </button>
    </div>
  );
};

export default function WordCardsDemo() {
  const [selectedCard, setSelectedCard] = useState(0);
  const [cardMode, setCardMode] = useState<'question' | 'answer'>('question');

  const handleShowAnswer = () => {
    setCardMode('answer');
  };

  const handleAnswer = (correct: boolean) => {
    console.log('Answer:', correct);
    // Reset for next card
    setCardMode('question');
    setSelectedCard((prev) => (prev + 1) % DEMO_WORDS.length);
  };

  return (
    <div 
      className="min-h-screen p-8"
      style={{ 
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4" style={{ color: DEMO_COLORS.text }}>
            📚 新しい単語カードデザイン
          </h1>
          <p className="text-lg" style={{ color: DEMO_COLORS.textLight }}>
            白背景カード + 進捗表示 + 分離された解答ボタン
          </p>
        </div>

        {/* Card Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {DEMO_WORDS.map((word, index) => (
            <button
              key={word.id}
              onClick={() => {
                setSelectedCard(index);
                setCardMode('question');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCard === index 
                  ? 'text-white' 
                  : 'text-gray-600 bg-white hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: selectedCard === index ? DEMO_COLORS.primary : undefined
              }}
            >
              {word.english}
            </button>
          ))}
        </div>

        {/* Main Card Display */}
        <div className="max-w-2xl mx-auto space-y-6">
          <WordCard
            word={DEMO_WORDS[selectedCard]}
            mode={cardMode}
          />

          {/* Action Buttons */}
          <ActionButtons 
            mode={cardMode}
            onShowAnswer={handleShowAnswer}
            onAnswer={handleAnswer}
          />
        </div>

        {/* Features */}
        <div className="mt-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-xl font-bold mb-6" style={{ color: DEMO_COLORS.text }}>
              ✨ 新デザインの特徴
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3" style={{ color: DEMO_COLORS.text }}>
                  📱 UI改善
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: DEMO_COLORS.textLight }}>
                  <li>• 白背景で読みやすさ向上</li>
                  <li>• カードと解答ボタンを分離</li>
                  <li>• ステータスバッジで一目で把握</li>
                  <li>• 統一された緑色アクセント</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3" style={{ color: DEMO_COLORS.text }}>
                  📊 進捗表示
                </h4>
                <ul className="space-y-2 text-sm" style={{ color: DEMO_COLORS.textLight }}>
                  <li>• 前回の復習日表示</li>
                  <li>• 前回の正誤表示</li>
                  <li>• 正解率の可視化</li>
                  <li>• ステータス別色分け</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}