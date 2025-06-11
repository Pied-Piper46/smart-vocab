'use client';

import { useState } from 'react';
import { Brain, BookOpen, TrendingUp, Target, Clock, Award } from 'lucide-react';
import SessionManager from '@/components/learning/SessionManager';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'learning'>('home');

  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="text-blue-600" size={48} />
            <h1 className="text-4xl font-bold text-gray-800">VocabMaster</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            科学的根拠に基づく英単語学習アプリ
          </p>
          <p className="text-gray-500 mt-2">
            適応的間隔反復・能動的想起・マルチモーダル学習で効率的にマスター
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">適応的間隔反復</h3>
            </div>
            <p className="text-gray-600 text-sm">
              個人の忘却曲線に基づいて最適なタイミングで復習。95%の保持率を実現します。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="text-green-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">能動的想起</h3>
            </div>
            <p className="text-gray-600 text-sm">
              受動的な学習を排除し、思い出す力を鍛えて記憶定着率を51%向上させます。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">マルチモーダル学習</h3>
            </div>
            <p className="text-gray-600 text-sm">
              視覚・聴覚・運動記憶を統合した学習で、学習効率を22.6ポイント向上させます。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="text-orange-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">10分間集中学習</h3>
            </div>
            <p className="text-gray-600 text-sm">
              科学的に設計された10分間セッションで集中力を最大化し、継続的な学習を支援します。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">AIパーソナライゼーション</h3>
            </div>
            <p className="text-gray-600 text-sm">
              個人の学習パターンを分析し、最適な難易度と学習順序を自動調整します。
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="text-yellow-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold">科学的根拠</h3>
            </div>
            <p className="text-gray-600 text-sm">
              エビングハウス忘却曲線、SuperMemoアルゴリズム等の研究に基づいた学習システム。
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">期待される学習効果</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">18-22語</div>
              <div className="text-sm text-gray-600">時間あたり学習語数</div>
              <div className="text-xs text-gray-500 mt-1">従来の3倍</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">80-90%</div>
              <div className="text-sm text-gray-600">1週間後保持率</div>
              <div className="text-xs text-gray-500 mt-1">従来の2倍</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">70-80%</div>
              <div className="text-sm text-gray-600">1ヶ月後保持率</div>
              <div className="text-xs text-gray-500 mt-1">従来の4倍</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">60%+</div>
              <div className="text-sm text-gray-600">ユーザー継続率</div>
              <div className="text-xs text-gray-500 mt-1">従来の35倍</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <button
            onClick={() => setCurrentView('learning')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            <Brain size={24} />
            学習を開始する
          </button>
          <p className="text-gray-500 text-sm mt-4">
            今すぐ科学的英単語学習を体験しましょう
          </p>
        </div>
      </div>
    </div>
  );

  const renderLearning = () => (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← ホームに戻る
          </button>
        </div>
        <SessionManager 
          userId="demo-user" 
          sessionDuration={10}
          onSessionComplete={(stats) => {
            console.log('Session completed:', stats);
          }}
        />
      </div>
    </div>
  );

  return currentView === 'home' ? renderHome() : renderLearning();
}
