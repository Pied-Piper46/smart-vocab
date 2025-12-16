'use client';

import React, { useState, useEffect } from 'react';
import { COLORS } from '@/styles/colors';

const CheckMark = ({ 
  isCompleted, 
  animationDelay = 0,
  size = 'md',
  onClick 
}: {
  isCompleted: boolean;
  animationDelay?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, animationDelay);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimate(false);
    }
  }, [isCompleted, animationDelay]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const strokeWidth = {
    sm: '3',
    md: '4',
    lg: '5'
  };

  return (
    <div 
      className={`${sizeClasses[size]} cursor-pointer transition-all duration-300 hover:scale-110`}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        {/* Background Circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={isCompleted ? COLORS.primary : COLORS.uncompleted}
          strokeWidth="2"
          fill={isCompleted ? COLORS.primary : 'transparent'}
          className="transition-all duration-500"
        />
        
        {/* Checkmark Path */}
        <path
          d="M8 12l2.5 2.5L16 9"
          stroke="white"
          strokeWidth={strokeWidth[size]}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="20"
          strokeDashoffset={shouldAnimate ? "0" : "20"}
          className="transition-all duration-700 ease-out"
          style={{ transitionDelay: isCompleted ? `${animationDelay + 200}ms` : '0ms' }}
        />
        
      </svg>
    </div>
  );
};

const SessionProgressDemo = () => {
  const [completedSessions, setCompletedSessions] = useState(0);
  const [targetSessions] = useState(5);

  const handleCheckmarkClick = (index: number) => {
    setCompletedSessions(index + 1);
  };

  const resetProgress = () => {
    setCompletedSessions(0);
  };

  const addSession = () => {
    setCompletedSessions(prev => prev + 1);
  };

  // Calculate how many checkmarks to show
  const totalCheckmarks = Math.max(targetSessions, completedSessions);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
          今日のセッション進捗
        </h3>
        <p className="text-sm" style={{ color: COLORS.textLight }}>
          完了: {completedSessions} / 目標: {targetSessions}
        </p>
      </div>

      {/* Progress Checkmarks */}
      <div className="flex justify-center items-center gap-3 flex-wrap">
        {Array.from({ length: totalCheckmarks }, (_, index) => (
          <CheckMark
            key={index}
            isCompleted={index < completedSessions}
            animationDelay={index * 100}
            size="md"
            onClick={() => handleCheckmarkClick(index)}
          />
        ))}
      </div>

      {/* Controls for demo */}
      <div className="flex justify-center gap-4">
        <button
          onClick={addSession}
          className="px-4 py-2 rounded-lg text-white font-semibold transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: COLORS.primary }}
        >
          セッション完了
        </button>
        <button
          onClick={resetProgress}
          className="px-4 py-2 rounded-lg border font-semibold transition-all duration-200 hover:scale-105"
          style={{ 
            borderColor: COLORS.primary,
            color: COLORS.primary
          }}
        >
          リセット
        </button>
      </div>
    </div>
  );
};

const CheckmarkVariationsDemo = () => {
  const [demoStates, setDemoStates] = useState({
    small: false,
    medium: false,
    large: false
  });

  const toggleState = (size: keyof typeof demoStates) => {
    setDemoStates(prev => ({
      ...prev,
      [size]: !prev[size]
    }));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center" style={{ color: COLORS.text }}>
        チェックマークバリエーション
      </h3>
      
      <div className="flex justify-center items-end gap-8">
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: COLORS.textLight }}>Small</p>
          <CheckMark
            isCompleted={demoStates.small}
            size="sm"
            onClick={() => toggleState('small')}
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: COLORS.textLight }}>Medium</p>
          <CheckMark
            isCompleted={demoStates.medium}
            size="md"
            onClick={() => toggleState('medium')}
          />
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: COLORS.textLight }}>Large</p>
          <CheckMark
            isCompleted={demoStates.large}
            size="lg"
            onClick={() => toggleState('large')}
          />
        </div>
      </div>
      
      <p className="text-center text-sm" style={{ color: COLORS.textLight }}>
        クリックして状態を切り替え
      </p>
    </div>
  );
};

export default function CheckmarksDemo() {
  return (
    <div 
      className="min-h-screen p-8"
      style={{ 
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4" style={{ color: COLORS.text }}>
            📋 チェックマーク進捗デモ
          </h1>
          <p className="text-lg" style={{ color: COLORS.textLight }}>
            セッション進捗をチェックマークで視覚化
          </p>
        </div>

        <div className="space-y-16">
          {/* Main Session Progress Demo */}
          <div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <SessionProgressDemo />
          </div>

          {/* Checkmark Variations */}
          <div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <CheckmarkVariationsDemo />
          </div>

          {/* Features List */}
          <div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <h3 className="text-xl font-bold mb-6" style={{ color: COLORS.text }}>
              ✨ 実装機能
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>スムーズな完了アニメーション</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>動的カラー変更</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>目標超過時の自動拡張</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>ホバー・クリックインタラクション</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>グロー効果とアニメーション</span>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                ></div>
                <span>レスポンシブ対応</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}