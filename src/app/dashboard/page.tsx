'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, Target, Clock, Award, LogOut, User, Play, BarChart3 } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  dailyGoal: number;
  sessionDuration: number;
  preferredLanguage: string;
  totalWordsLearned: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Fetch user profile
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
  if (!session || !profile) {
    return null;
  }

  return (
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
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 glass-button px-4 py-2 rounded-xl text-white hover:scale-101 transition-all duration-300"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>

        {/* Welcome Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 glass rounded-2xl glow pulse-glow">
              <Brain className="text-white" size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            おかえりなさい、{profile.name}さん！
          </h1>
          <p className="text-lg text-white/80">
            今日も科学的英単語学習を続けましょう
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <BookOpen className="text-blue-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{profile.totalWordsLearned}</div>
            <div className="text-sm text-white/70">学習した単語</div>
          </div>
          
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Target className="text-green-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{profile.currentStreak}</div>
            <div className="text-sm text-white/70">連続学習日数</div>
          </div>
          
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Clock className="text-purple-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{Math.floor(profile.totalStudyTime / 60)}</div>
            <div className="text-sm text-white/70">総学習時間（時）</div>
          </div>
          
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Award className="text-yellow-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{profile.longestStreak}</div>
            <div className="text-sm text-white/70">最長連続記録</div>
          </div>
        </div>

        {/* Today's Progress */}
        <div className="glass-strong rounded-3xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">今日の進捗</h2>
            <div className="flex items-center gap-2 glass-light px-4 py-2 rounded-xl">
              <BarChart3 className="text-white" size={16} />
              <span className="text-white text-sm">目標: {profile.dailyGoal}語</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Progress bar placeholder - would be dynamic in real implementation */}
            <div className="flex items-center justify-between">
              <span className="text-white">学習進捗</span>
              <span className="text-white/70">0 / {profile.dailyGoal}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        {/* Learning Action */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <p className="text-white text-xl">
              難易度を選択して学習を開始しましょう
            </p>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Difficulty Selection Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            <button
              onClick={() => router.push('/learning?difficulty=easy')}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-green-400/50 relative overflow-hidden group"
            >
              <div className="absolute top-3 right-3 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Play className="text-white" size={12} />
              </div>
              
              <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-white font-medium">BEGINNER</span>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">初級</div>
              <div className="text-lg text-white/80 mb-4">基本単語・日常会話</div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            
            <button
              onClick={() => router.push('/learning?difficulty=medium')}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-blue-400/50 relative overflow-hidden group"
            >
              <div className="absolute top-3 right-3 w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Play className="text-white" size={12} />
              </div>
              
              <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-white font-medium">INTERMEDIATE</span>
              </div>
              
              <div className="text-2xl font-bold mb-3 text-white">中級</div>
              <div className="text-lg text-white/80 mb-4">応用単語・ビジネス</div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
            
            <button
              onClick={() => router.push('/learning?difficulty=hard')}
              className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-purple-400/50 relative overflow-hidden group"
            >
              <div className="absolute top-3 right-3 w-6 h-6 bg-purple-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Play className="text-white" size={12} />
              </div>
              
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
}