'use client';

import { useState, useEffect } from 'react';
import { Volume2, ArrowRight } from 'lucide-react';
import { COLORS } from '@/styles/colors';
import StatusBadge from '@/components/ui/StatusBadge';

export type LearningMode = 'eng_to_jpn' | 'jpn_to_eng' | 'audio_recognition';

import { WordData } from '@/lib/api-client';

interface WordCardProps {
  word: WordData;
  mode: LearningMode;
  onAnswer: (correct: boolean) => void;
}

export default function WordCard({ word, mode, onAnswer }: WordCardProps) {
  const [phase, setPhase] = useState<'question' | 'thinking' | 'answer'>('question');
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    setPhase('question');
    setUserAnswer('');
  }, [word, mode]);

  const handleShowAnswer = () => {
    setPhase('answer');
  };

  const handleAnswer = (correct: boolean) => {
    onAnswer(correct);
  };


  const playAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const renderStatusBadge = () => {
    const status = word.progress?.status || 'new';
    return <StatusBadge status={status} />;
  };
  
  const formatLastReview = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const lastAnswerCorrect = (word.progress?.streak || 0) > 0;
  const accuracy = word.progress?.totalReviews 
    ? Math.round((word.progress.correctAnswers / word.progress.totalReviews) * 100)
    : 0;

  const renderQuestion = () => {
    switch (mode) {
      case 'eng_to_jpn':
        return (
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2" style={{ color: COLORS.text }}>
              {word.english}
            </h2>
            <p className="text-lg" style={{ color: COLORS.textLight }}>
              {word.phonetic}
            </p>
            <p className="text-sm" style={{ color: COLORS.textLight }}>
              ({word.partOfSpeech})
            </p>
          </div>
        );
      
      case 'jpn_to_eng':
        return (
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-2" style={{ color: COLORS.text }}>
              {word.japanese}
            </h2>
            <p className="text-lg" style={{ color: COLORS.textLight }}>
              ({word.partOfSpeech})
            </p>
          </div>
        );
      
      case 'audio_recognition':
        return (
          <div className="mb-10">
            <div className="text-xl mb-8" style={{ color: COLORS.text }}>
              音声を聞いてください
            </div>
            <div className="max-w-lg mx-auto">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full border-0 border-b-2 outline-none px-2 py-3 text-lg font-medium text-center transition-colors duration-300"
                style={{ 
                  borderColor: COLORS.border, 
                  color: COLORS.text,
                  backgroundColor: 'transparent'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleShowAnswer()}
                placeholder="入力する"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderAnswer = () => {
    return (
      <div className="text-center space-y-4">
        <div className="space-y-3 mb-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: COLORS.text }}>
            {word.english}
          </h2>
          <p className="text-sm md:text-base lg:text-lg mb-3" style={{ color: COLORS.textLight }}>
            {word.phonetic}
          </p>
          <p className="text-sm md:text-base lg:text-lg" style={{ color: COLORS.textLight }}>
            ({word.partOfSpeech})
          </p>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: COLORS.primary }}>
            {word.japanese}
          </p>
        </div>

        {word.exampleEnglish && (
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: COLORS.accent }}
          >
            <div className="space-y-2">
              <p className="text-base md:text-lg font-bold" style={{ color: COLORS.text }}>
                {word.exampleEnglish}
              </p>
              <p className="text-base md:text-lg" style={{ color: COLORS.textLight }}>
                {word.exampleJapanese}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActionButtons = () => {
    if (phase === 'question') {
      const isAudioDisabled = mode === 'jpn_to_eng';
      
      return (
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={playAudio}
            disabled={isAudioDisabled}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 border-2 ${
              isAudioDisabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105'
            }`}
            style={{
              borderColor: COLORS.primary,
              color: COLORS.primary,
              backgroundColor: 'transparent'
            }}
          >
            <Volume2 size={16} />
            音声
          </button>
          <button
            onClick={handleShowAnswer}
            className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: COLORS.primary,
              color: 'white'
            }}
          >
            答えを見る
            <ArrowRight size={16} />
          </button>
        </div>
      );
    }

    // Answer phase buttons
    return (
      <div className="flex gap-4 justify-center mt-6">
        <button
          onClick={() => handleAnswer(false)}
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
          onClick={() => handleAnswer(true)}
          className="px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: COLORS.primary,
            color: 'white'
          }}
        >
          正解
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* White Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          {/* 左上 */}
          <div className="text-xs" style={{ color: COLORS.textLight }}>
            {phase === 'answer' && (
              // Answerモード: 音声ボタン
              <button
                onClick={playAudio}
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: COLORS.primary }}
              >
                <Volume2 size={30} />
              </button>
            )}
          </div>
          
          {/* 右上: ステータスバッジ */}
          {renderStatusBadge()}
        </div>

        {/* Main Content */}
        <div className="space-y-4 mb-3">
          {phase === 'question' && (
            <div className="text-center space-y-3">
              {renderQuestion()}
            </div>
          )}

          {phase === 'answer' && (
            <div className="space-y-4">
              {renderAnswer()}
            </div>
          )}
        </div>

        {/* Progress Section - questionモードのみ表示 */}
        {phase === 'question' && word.progress && (
          <div className="border-t pt-4" style={{ borderColor: COLORS.border }}>
            <div className="flex justify-between items-center">
              {/* 左下: 前回の正誤 + 復習日 (new状態では非表示) */}
              {word.progress.status !== 'new' && word.progress.lastReviewedAt ? (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    lastAnswerCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm" style={{ color: COLORS.textLight }}>
                    {lastAnswerCorrect ? '正解' : '不正解'}（{formatLastReview(word.progress.lastReviewedAt)} 前回）
                  </span>
                </div>
              ) : (
                <div></div>
              )}
              
              {/* 右下: 正答率 */}
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: COLORS.primary }}>
                  {accuracy}%
                </p>
                <p className="text-xs" style={{ color: COLORS.textLight }}>
                  {word.progress.correctAnswers}/{word.progress.totalReviews}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {renderActionButtons()}
    </div>
  );
}