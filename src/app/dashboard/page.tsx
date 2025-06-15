'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, Target, Clock, Award, User, Play, BarChart3 } from 'lucide-react';

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

interface DailyProgress {
  dailyGoal: number;
  wordsStudiedToday: number;
  sessionsToday: number;
  progressPercentage: number;
  isGoalReached: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Fetch user profile and daily progress
  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profile and daily progress in parallel
      const [profileResponse, progressResponse] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/progress/daily')
      ]);
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      if (!progressResponse.ok) {
        throw new Error('Failed to fetch daily progress');
      }
      
      const [profileData, progressData] = await Promise.all([
        profileResponse.json(),
        progressResponse.json()
      ]);
      
      if (profileData.success) {
        setProfile(profileData.data);
      }
      
      if (progressData.success) {
        setDailyProgress(progressData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
  if (!session || !profile || !dailyProgress) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl float-animation"></div>
      <div className="absolute top-40 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/30 to-yellow-400/30 blur-xl float-animation" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 blur-xl float-animation" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center mb-30 sm:mb-50">
          {/* Left spacer - invisible but takes same space as profile button on desktop */}
          <div className="hidden sm:flex flex-1 justify-start">
            <div className="invisible flex items-center gap-3 p-3">
              <div className="p-2 rounded-xl">
                <User size={20} />
              </div>
              <div>
                <p className="font-medium">placeholder</p>
                <p className="text-sm">placeholder@email.com</p>
              </div>
            </div>
          </div>
          
          {/* Title - centered on desktop, right-aligned on mobile */}
          <div className="flex-1 sm:flex-none flex items-center justify-end sm:justify-center gap-2 sm:gap-2">
            <Brain className="text-white/70 w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-white/70 text-3xl sm:text-4xl font-bold smart-vocab-title whitespace-nowrap ml-2">Smart Vocab</h1>
          </div>
          
          {/* Right profile button */}
          <div className="flex-1 sm:flex-1 flex justify-end ml-4">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-3 glass-light p-3 rounded-xl hover:scale-101 transition-all duration-300 text-left"
            >
              <User className="text-white/70" size={30} />
              <div className="hidden sm:block">
                <p className="text-white/70 font-bold">{session.user?.name}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Welcome Header */}
        <header className="text-center mb-15 sm:mb-5">
          <h1 className="text-xl sm:text-2xl text-white/70 mb-2 whitespace-nowrap">
            {/* Animated welcome text */}
            <span className="inline-block">
              {'おかえりなさい、'.split('').map((char, index) => (
                <span
                  key={index}
                  className="inline-block animate-fade-in-up opacity-0"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {char}
                </span>
              ))}
              <span
                className="inline-block animate-fade-in-up opacity-0"
                style={{
                  animationDelay: `${'おかえりなさい、'.length * 0.1}s`,
                  animationFillMode: 'forwards'
                }}
              >
                {profile.name}
              </span>
              {'さん'.split('').map((char, index) => (
                <span
                  key={index + 100}
                  className="inline-block animate-fade-in-up opacity-0"
                  style={{
                    animationDelay: `${('おかえりなさい、'.length + 1 + index) * 0.1}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h1>
        </header>

        {/* Quick Stats */}
        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        </div> */}

        {/* Today's Progress */}
        <div className="mb-30 sm:mb-40">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">今日の進捗</span>
              <span className="text-white/70">
                {dailyProgress.wordsStudiedToday} / {dailyProgress.dailyGoal}語
                {dailyProgress.isGoalReached && <span className="ml-2 text-green-400">🎉 達成!</span>}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${dailyProgress.progressPercentage}%` }}
              ></div>
            </div>
            {dailyProgress.sessionsToday > 0 && (
              <div className="text-center text-white/60 text-sm">
                完了セッション数: {dailyProgress.sessionsToday} 回
              </div>
            )}
          </div>
        </div>

        {/* Learning Action */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <p className="text-white/70 text-lg sm:text-xl">
              さっそく学習を開始しましょう
            </p>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Difficulty Selection Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-2xl mx-auto mb-12">
            <button
              onClick={() => router.push('/learning?difficulty=easy')}
              className="w-50 inline-flex items-center justify-center gap-3 glass-light rounded-full px-8 py-4 hover:scale-105 hover:bg-white/15 transition-all duration-300 border border-white/20 hover:border-blue-400/50"
            >
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm text-white/70 font-medium">ELEMENTARY</span>
            </button>

            <button
              onClick={() => router.push('/learning?difficulty=medium')}
              className="w-50 inline-flex items-center justify-center gap-3 glass-light rounded-full px-8 py-4 hover:scale-105 hover:bg-white/15 transition-all duration-300 border border-white/20 hover:border-blue-400/50"
            >
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-white/70 font-medium">INTERMEDIATE</span>
            </button>

            <button
              onClick={() => router.push('/learning?difficulty=hard')}
              className="w-50 inline-flex items-center justify-center gap-3 glass-light rounded-full px-8 py-4 hover:scale-105 hover:bg-white/15 transition-all duration-300 border border-white/20 hover:border-blue-400/50"
            >
              <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              <span className="text-sm text-white/70 font-medium">ADVANCED</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}