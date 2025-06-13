'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, TrendingUp, Target, Clock, Award, LogOut, User } from 'lucide-react';
import SessionManager from '@/components/learning/SessionManager';
import { DifficultyLevel } from '@/types/word-data';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'learning'>('home');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="glass-strong rounded-3xl p-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!session) {
    return null;
  }

  const renderHome = () => (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl float-animation"></div>
      <div className="absolute top-40 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/30 to-yellow-400/30 blur-xl float-animation" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 blur-xl float-animation" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* User Bar */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 glass-light p-3 rounded-xl hover:scale-101 transition-all duration-300 text-left"
          >
            <div className="p-2 glass-light rounded-xl">
              <User className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white font-medium">{session.user?.name}</p>
              <p className="text-white/70 text-sm">{session.user?.email}</p>
            </div>
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 glass-button px-4 py-2 rounded-xl text-white hover:scale-101 transition-all duration-300"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>

        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 glass rounded-2xl glow pulse-glow">
              <Brain className="text-white" size={56} />
            </div>
            <h1 className="text-5xl font-bold" style={{ 
              color: 'white',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 30px rgba(102, 126, 234, 0.3), 0 2px 4px rgba(118, 75, 162, 0.2)',
              WebkitTextStroke: '1px rgba(102, 126, 234, 0.2)'
            }}>Smart Vocab</h1>
          </div>
          <p className="text-2xl text-white font-medium mt-8 mb-4">
            科学的根拠に基づくTOEIC & IELTS対策英単語アプリ
          </p>
          <p className="text-lg text-white/80">
            適応的間隔反復・能動的想起・マルチモーダル学習で効率的にマスター
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <Brain className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">適応的間隔反復</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              個人の忘却曲線に基づいて最適なタイミングで復習。95%の保持率を実現します。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-1/6 rounded-full"></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <Target className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">能動的想起</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              受動的な学習を排除し、思い出す力を鍛えて記憶定着率を51%向上させます。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-1/3 rounded-full"></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <BookOpen className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">マルチモーダル学習</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              視覚・聴覚・運動記憶を統合した学習で、学習効率を22.6ポイント向上させます。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-1/2 rounded-full"></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <Clock className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">10分間集中学習</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              科学的に設計された10分間セッションで集中力を最大化し、継続的な学習を支援します。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-2/3 rounded-full"></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <TrendingUp className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">AIパーソナライゼーション</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              個人の学習パターンを分析し、最適な難易度と学習順序を自動調整します。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-5/6 rounded-full"></div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 hover:glass-strong transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 glass-light rounded-xl group-hover:glow transition-all duration-300">
                <Award className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">科学的根拠</h3>
            </div>
            <p className="text-white/80 leading-relaxed">
              エビングハウス忘却曲線、SuperMemoアルゴリズム等の研究に基づいた学習システム。
            </p>
            <div className="mt-4 h-1 glass-progress rounded-full overflow-hidden">
              <div className="glass-progress-fill h-full w-full rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="glass-strong rounded-3xl p-12 mb-16 relative overflow-hidden">
          <div className="absolute inset-0 shimmer opacity-20"></div>
          <h2 className="text-3xl font-bold text-center mb-12 text-white">期待される学習効果</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center glass-light rounded-2xl p-6 hover:glass transition-all duration-300">
              <div className="text-4xl font-bold text-gradient mb-3">18-22語</div>
              <div className="text-lg text-white font-medium">時間あたり学習語数</div>
              <div className="text-sm text-white/60 mt-2">従来の3倍</div>
            </div>
            <div className="text-center glass-light rounded-2xl p-6 hover:glass transition-all duration-300">
              <div className="text-4xl font-bold text-gradient mb-3">80-90%</div>
              <div className="text-lg text-white font-medium">1週間後保持率</div>
              <div className="text-sm text-white/60 mt-2">従来の2倍</div>
            </div>
            <div className="text-center glass-light rounded-2xl p-6 hover:glass transition-all duration-300">
              <div className="text-4xl font-bold text-gradient mb-3">70-80%</div>
              <div className="text-lg text-white font-medium">1ヶ月後保持率</div>
              <div className="text-sm text-white/60 mt-2">従来の4倍</div>
            </div>
            <div className="text-center glass-light rounded-2xl p-6 hover:glass transition-all duration-300">
              <div className="text-4xl font-bold text-gradient mb-3">60%+</div>
              <div className="text-lg text-white font-medium">ユーザー継続率</div>
              <div className="text-sm text-white/60 mt-2">従来の35倍</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <p className="text-white text-xl">
              難易度を選択して科学的英単語学習を体験してみましょう
            </p>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Difficulty Selection Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <button
              onClick={() => { setSelectedDifficulty('easy'); setCurrentView('learning'); }}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-green-400/50 relative overflow-hidden group"
            >
              {/* Action Indicator */}
              <div className="absolute top-3 right-3 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-xs font-bold">▶</div>
              </div>
              
              {/* Level Badge */}
              <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-white font-medium">BEGINNER</span>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">初級</div>
              <div className="text-lg text-white/80 mb-4">基本単語・日常会話</div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            
            <button
              onClick={() => { setSelectedDifficulty('medium'); setCurrentView('learning'); }}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-blue-400/50 relative overflow-hidden group"
            >
              {/* Action Indicator */}
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-xs font-bold">▶</div>
              </div>
              
              {/* Level Badge */}
              <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-white font-medium">INTERMEDIATE</span>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">中級</div>
              <div className="text-lg text-white/80 mb-4">応用単語・ビジネス</div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            
            <button
              onClick={() => { setSelectedDifficulty('hard'); setCurrentView('learning'); }}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-purple-400/50 relative overflow-hidden group"
            >
              {/* Action Indicator */}
              <div className="absolute top-3 right-3 w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-xs font-bold">▶</div>
              </div>
              
              {/* Level Badge */}
              <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-sm text-white font-medium">ADVANCED</span>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">上級</div>
              <div className="text-lg text-white/80 mb-4">高度単語・学術的</div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLearning = () => (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-10 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-lg float-animation"></div>
      <div className="absolute bottom-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-green-400/20 to-cyan-400/20 blur-lg float-animation" style={{ animationDelay: '1.5s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <button
            onClick={() => setCurrentView('home')}
            className="glass-button flex items-center gap-3 px-6 py-3 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
          >
            ← ホームに戻る
          </button>
        </div>
        <SessionManager 
          initialDifficulty={selectedDifficulty}
          onSessionComplete={(stats) => {
            console.log('Session completed:', stats);
          }}
        />
      </div>
    </div>
  );

  return currentView === 'home' ? renderHome() : renderLearning();
}
