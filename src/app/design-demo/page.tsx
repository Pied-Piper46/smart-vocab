'use client';

import React from 'react';
import { COLORS } from '@/styles/colors';

const VocabCard = ({ 
  english, 
  japanese, 
  phonetic, 
  example,
  className = '' 
}: {
  english: string;
  japanese: string;
  phonetic?: string;
  example?: string;
  className?: string;
}) => (
  <div 
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 ${className}`}
    style={{ backgroundColor: COLORS.cardBg }}
  >
    <div className="text-center space-y-3">
      <h3 
        className="text-2xl font-bold"
        style={{ color: COLORS.text }}
      >
        {english}
      </h3>
      {phonetic && (
        <p 
          className="text-sm"
          style={{ color: COLORS.textLight }}
        >
          {phonetic}
        </p>
      )}
      <p 
        className="text-lg"
        style={{ color: COLORS.text }}
      >
        {japanese}
      </p>
      {example && (
        <div 
          className="mt-4 p-3 rounded-lg text-sm"
          style={{ 
            backgroundColor: COLORS.accent,
            color: COLORS.text 
          }}
        >
          <strong>例文:</strong> {example}
        </div>
      )}
    </div>
  </div>
);

const ActionButton = ({ 
  children, 
  variant = 'primary',
  className = '',
  ...props 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  [key: string]: any;
}) => {
  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: COLORS.primary,
          color: 'white',
          border: 'none'
        };
      case 'secondary':
        return {
          backgroundColor: COLORS.accent,
          color: COLORS.text,
          border: `1px solid ${COLORS.border}`
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: COLORS.primary,
          border: `2px solid ${COLORS.primary}`
        };
      default:
        return {};
    }
  };

  return (
    <button
      className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
      style={getButtonStyles()}
      {...props}
    >
      {children}
    </button>
  );
};

const LearningProgressCard = ({ 
  title, 
  count, 
  description, 
  icon 
}: {
  title: string;
  count: number;
  description: string;
  icon: string;
}) => (
  <div 
    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
    style={{ backgroundColor: COLORS.cardBg }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p 
          className="text-sm font-medium"
          style={{ color: COLORS.textLight }}
        >
          {title}
        </p>
        <p 
          className="text-3xl font-bold mt-1"
          style={{ color: COLORS.text }}
        >
          {count}
        </p>
        <p 
          className="text-xs mt-1"
          style={{ color: COLORS.textLight }}
        >
          {description}
        </p>
      </div>
      <div 
        className="text-4xl"
        style={{ color: COLORS.primary }}
      >
        {icon}
      </div>
    </div>
  </div>
);

export default function DesignDemoPage() {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: COLORS.bg,
        backgroundImage: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-2xl font-bold"
              style={{ color: COLORS.text }}
            >
              📚 VocabMaster
            </h1>
            <nav className="hidden md:flex space-x-6">
              <a 
                href="#" 
                className="font-medium hover:underline"
                style={{ color: COLORS.textLight }}
              >
                学習
              </a>
              <a 
                href="#" 
                className="font-medium hover:underline"
                style={{ color: COLORS.textLight }}
              >
                進捗
              </a>
              <a 
                href="#" 
                className="font-medium hover:underline"
                style={{ color: COLORS.textLight }}
              >
                設定
              </a>
            </nav>
            <ActionButton variant="primary">
              学習開始
            </ActionButton>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ color: COLORS.text }}
          >
            科学的な手法で
            <span style={{ color: COLORS.primary }}>英単語学習</span>
          </h2>
          <p 
            className="text-xl mb-8"
            style={{ color: COLORS.textLight }}
          >
            スペースド・リピティション法で効率的な記憶定着を実現
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ActionButton variant="primary" className="text-lg px-8 py-4">
              無料で始める
            </ActionButton>
            <ActionButton variant="outline" className="text-lg px-8 py-4">
              デモを見る
            </ActionButton>
          </div>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <LearningProgressCard
            title="学習済み"
            count={247}
            description="今日新しく覚えた単語"
            icon="🎯"
          />
          <LearningProgressCard
            title="復習予定"
            count={12}
            description="今日復習する単語"
            icon="🔄"
          />
          <LearningProgressCard
            title="マスター済み"
            count={189}
            description="完全に覚えた単語"
            icon="⭐"
          />
        </div>

        {/* Vocabulary Cards Demo */}
        <section className="mb-12">
          <h3 
            className="text-2xl font-bold mb-6"
            style={{ color: COLORS.text }}
          >
            📖 単語カードデモ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VocabCard
              english="accomplish"
              japanese="達成する、成し遂げる"
              phonetic="/əˈkʌmplɪʃ/"
              example="I accomplished my goal of learning 50 new words this week."
            />
            <VocabCard
              english="magnificent"
              japanese="素晴らしい、壮大な"
              phonetic="/mæɡˈnɪfɪsənt/"
              example="The view from the mountain top was magnificent."
            />
            <VocabCard
              english="perseverance"
              japanese="忍耐力、根気"
              phonetic="/ˌpɜːrsəˈvɪrəns/"
              example="Success in language learning requires perseverance."
            />
          </div>
        </section>

        {/* Learning Modes */}
        <section className="mb-12">
          <h3 
            className="text-2xl font-bold mb-6"
            style={{ color: COLORS.text }}
          >
            🎮 学習モード
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <div className="text-center">
                <div 
                  className="text-6xl mb-4"
                  style={{ color: COLORS.primary }}
                >
                  🇬🇧
                </div>
                <h4 
                  className="text-xl font-semibold mb-2"
                  style={{ color: COLORS.text }}
                >
                  英→日モード
                </h4>
                <p 
                  className="text-sm mb-4"
                  style={{ color: COLORS.textLight }}
                >
                  英単語を見て日本語意味を答える
                </p>
                <ActionButton variant="secondary">
                  開始する
                </ActionButton>
              </div>
            </div>
            
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <div className="text-center">
                <div 
                  className="text-6xl mb-4"
                  style={{ color: COLORS.primary }}
                >
                  🇯🇵
                </div>
                <h4 
                  className="text-xl font-semibold mb-2"
                  style={{ color: COLORS.text }}
                >
                  日→英モード
                </h4>
                <p 
                  className="text-sm mb-4"
                  style={{ color: COLORS.textLight }}
                >
                  日本語意味を見て英単語を答える
                </p>
                <ActionButton variant="secondary">
                  開始する
                </ActionButton>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section>
          <h3 
            className="text-2xl font-bold mb-6"
            style={{ color: COLORS.text }}
          >
            ✨ 主な機能
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <div 
                className="text-4xl mb-4"
                style={{ color: COLORS.primary }}
              >
                🧠
              </div>
              <h4 
                className="text-lg font-semibold mb-2"
                style={{ color: COLORS.text }}
              >
                スペースド・リピティション
              </h4>
              <p 
                className="text-sm"
                style={{ color: COLORS.textLight }}
              >
                科学的に証明された間隔反復法で記憶定着率を最大化
              </p>
            </div>
            
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <div 
                className="text-4xl mb-4"
                style={{ color: COLORS.primary }}
              >
                📊
              </div>
              <h4 
                className="text-lg font-semibold mb-2"
                style={{ color: COLORS.text }}
              >
                詳細な進捗追跡
              </h4>
              <p 
                className="text-sm"
                style={{ color: COLORS.textLight }}
              >
                学習進捗を可視化し、モチベーション維持をサポート
              </p>
            </div>
            
            <div 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              style={{ backgroundColor: COLORS.cardBg }}
            >
              <div 
                className="text-4xl mb-4"
                style={{ color: COLORS.primary }}
              >
                🎯
              </div>
              <h4 
                className="text-lg font-semibold mb-2"
                style={{ color: COLORS.text }}
              >
                適応的難易度調整
              </h4>
              <p 
                className="text-sm"
                style={{ color: COLORS.textLight }}
              >
                個人の習熟度に合わせて最適な学習体験を提供
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}