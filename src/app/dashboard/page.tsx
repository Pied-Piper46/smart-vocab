'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useDashboardData } from '@/lib/swr-config';
import { sessionStorageCache } from '@/lib/dashboard-cache';


export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProgressAnimation, setShowProgressAnimation] = useState(false);
  
  // Use SWR for data fetching with caching
  const { data: dashboardData, error, isLoading } = useDashboardData();
  
  const profile = dashboardData?.profile;
  const dailyProgress = dashboardData?.dailyProgress;

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Handle SWR errors (e.g., authentication issues, user not found)
  useEffect(() => {
    if (error && session) {
      console.error('Dashboard data fetch error:', error);

      // Check if it's an authentication or user-not-found error
      const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
                         error.message?.toLowerCase().includes('not found');
      const isStatusError = (error as { status?: number }).status === 401 ||
                           (error as { status?: number }).status === 403 ||
                           (error as { status?: number }).status === 404;

      // Sign out if user doesn't exist or is unauthorized
      if (isAuthError || isStatusError) {
        console.warn('User session invalid or user not found - signing out');
        signOut({ callbackUrl: '/auth/signin?error=account_not_found' });
      }
    }
  }, [error, session]);

  // Start progress bar animation after component mounts and data is loaded
  useEffect(() => {
    if (profile && dailyProgress && !isLoading) {
      const welcomeTextLength = ('おかえりなさい、' + profile.name + 'さん').length;
      const progressBarDelay = welcomeTextLength * 0.05 + 0.1 + 0.5; // Progress bar fade-in delay + extra time for animation start
      
      const timer = setTimeout(() => {
        setShowProgressAnimation(true);
      }, progressBarDelay * 1000);

      return () => clearTimeout(timer);
    }
  }, [profile, dailyProgress, isLoading]);

  // Cache data in sessionStorage for faster subsequent loads
  useEffect(() => {
    if (dashboardData && !error) {
      sessionStorageCache.set('dashboard-data', dashboardData);
    }
  }, [dashboardData, error]);


  // Show loading while checking authentication or fetching data
  if (status === 'loading' || isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to signin if not authenticated
  if (!session) {
    return null;
  }

  // If data is still loading or not available, show loading
  if (!profile || !dailyProgress) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl float-animation"></div>
      <div className="absolute top-40 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/30 to-yellow-400/30 blur-xl float-animation" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 blur-xl float-animation" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center mb-20 sm:mb-40">
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
            {/* <Brain className="text-white/80 w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-white/80 text-3xl sm:text-4xl font-bold smart-vocab-title whitespace-nowrap ml-2">Smart Vocab</h1> */}
          </div>
          
          {/* Right profile button */}
          <div className="flex-1 sm:flex-1 flex justify-end ml-4">
            <button
              onClick={() => router.push('/progress')}
              className="flex items-center gap-3 p-3 rounded-xl hover:scale-104 transition-all duration-300 text-left"
            >
              <User className="text-white/70 hover:text-white/80" size={30} />
              <div className="hidden sm:block">
                <p className="text-white/70 hover:text-white/80 font-bold">{session.user?.name}</p>
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
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {char}
                </span>
              ))}
              <span
                className="inline-block animate-fade-in-up opacity-0"
                style={{
                  animationDelay: `${'おかえりなさい、'.length * 0.05}s`,
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
                    animationDelay: `${('おかえりなさい、'.length + 1 + index) * 0.05}s`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          </h1>
        </header>

        {/* Today's Progress */}
        <div 
          className="mb-10 sm:mb-15 opacity-0 animate-fade-in-up"
          style={{
            animationDelay: `${('おかえりなさい、' + profile.name + 'さん').length * 0.05 + 0.3}s`,
            animationFillMode: 'forwards'
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">今日の進捗</span>
              <span className="text-white/70">
                {dailyProgress.wordsStudiedToday} / {dailyProgress.dailyGoal}語
                {dailyProgress.isGoalReached && <span className="ml-2 text-green-400">✔︎</span>}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full transition-all duration-1000 ease-out" 
                style={{ 
                  width: showProgressAnimation ? `${dailyProgress.progressPercentage}%` : '0%' 
                }}
              ></div>
            </div>
            {dailyProgress.sessionsToday > 0 && (
              <div className="text-center text-white/60 text-sm">
                完了セッション数: {dailyProgress.sessionsToday} 回
              </div>
            )}
          </div>
        </div>

        {/* Start Learning Button */}
        <div className="flex justify-center items-center">
          <button
            onClick={() => router.push('/session')}
            className="inline-flex items-center justify-center gap-3 glass-light rounded-full px-12 py-5 hover:scale-105 hover:bg-white/15 transition-all duration-300 border border-white/20 hover:border-blue-400/50 shadow-lg hover:shadow-blue-400/20 opacity-0 animate-fade-in-up"
            style={{
              animationDelay: `${('おかえりなさい、' + profile.name + 'さん').length * 0.05 + 0.7}s`,
              animationFillMode: 'forwards'
            }}
          >
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            <span className="text-lg text-white/80 font-medium">学習を開始する</span>
            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </button>
        </div>
      </div>
    </div>
  );
}