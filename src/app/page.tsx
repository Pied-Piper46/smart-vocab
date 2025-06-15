'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, TrendingUp, Target, Clock, Award, UserPlus, LogIn } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // No auto-redirect - let users stay on LP page even when logged in

  // Handle login button click
  const handleLoginClick = () => {
    if (session) {
      // User is already logged in, go directly to dashboard
      router.push('/dashboard');
    } else {
      // User not logged in, go to login page
      router.push('/auth/signin');
    }
  };

  // Allow LP page to be shown regardless of session status

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl float-animation"></div>
      <div className="absolute top-40 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/30 to-yellow-400/30 blur-xl float-animation" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 blur-xl float-animation" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Auth Navigation */}
        <div className="flex justify-end items-center mb-8 gap-4">
          <button
            onClick={handleLoginClick}
            className="flex items-center gap-2 glass-light px-4 py-2 rounded-xl text-white hover:scale-105 transition-all duration-300 font-bold"
          >
            <LogIn size={16} />
            ログイン
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-700/70 to-indigo-700/70 hover:from-purple-600/80 hover:to-indigo-600/80 px-4 py-2 rounded-xl text-white hover:scale-105 transition-all duration-300 font-bold"
          >
            <UserPlus size={16} />
            新規登録
          </button>
        </div>

        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Brain className="text-white" size={56} />
            <h1 className="text-5xl font-bold smart-vocab-title" style={{ 
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
              今すぐ無料登録して、科学的英単語学習を体験してみましょう
            </p>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto mb-12">
            <button
              onClick={handleLoginClick}
              className="inline-flex items-center gap-3 glass-light rounded-full px-8 py-4 hover:scale-105 hover:bg-white/15 transition-all duration-300 border border-white/20 hover:border-blue-400/50"
            >
              <LogIn className="text-white" size={20} />
              <span className="text-xl text-white font-semibold">ログイン</span>
            </button>

            <button
              onClick={() => router.push('/auth/signup')}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-700/70 to-indigo-700/70 rounded-full px-8 py-4 hover:scale-105 hover:from-purple-600/80 hover:to-indigo-600/80 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <UserPlus className="text-white" size={20} />
              <span className="text-xl text-white font-bold">新規登録</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
