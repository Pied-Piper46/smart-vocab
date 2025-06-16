'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SessionManager from '@/components/learning/SessionManager';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DifficultyLevel } from '@/types/word-data';

export default function LearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Get difficulty from URL params or show selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const difficultyParam = params.get('difficulty') as DifficultyLevel;
    if (difficultyParam && ['easy', 'medium', 'hard'].includes(difficultyParam)) {
      setDifficulty(difficultyParam);
    }
  }, []);

  // Show loading while checking authentication
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // Redirect to signin if not authenticated
  if (!session) {
    return null;
  }

  // If no difficulty selected, show difficulty selection
  if (!difficulty) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="glass-button flex items-center gap-3 px-6 py-3 rounded-xl text-white font-medium hover:scale-105 transition-all duration-300"
            >
              ← ダッシュボードに戻る
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-8">学習難易度を選択してください</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button
                onClick={() => setDifficulty('easy')}
                className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-green-400/50 relative overflow-hidden group"
              >
                <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-white font-medium">BEGINNER</span>
                </div>
                
                <div className="text-2xl font-bold mb-3 text-white">初級</div>
                <div className="text-lg text-white/80 mb-4">基本単語・日常会話</div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
              
              <button
                onClick={() => setDifficulty('medium')}
                className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-blue-400/50 relative overflow-hidden group"
              >
                <div className="inline-flex items-center gap-2 glass-light rounded-full px-4 py-2 mb-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-white font-medium">INTERMEDIATE</span>
                </div>
                
                <div className="text-2xl font-bold mb-3 text-white">中級</div>
                <div className="text-lg text-white/80 mb-4">応用単語・ビジネス</div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
              
              <button
                onClick={() => setDifficulty('hard')}
                className="glass-button p-8 rounded-2xl text-center transition-all duration-300 hover:scale-110 hover:glow border-2 border-transparent hover:border-purple-400/50 relative overflow-hidden group"
              >
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

  // Show learning session
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-10 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-lg float-animation"></div>
      <div className="absolute bottom-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-green-400/20 to-cyan-400/20 blur-lg float-animation" style={{ animationDelay: '1.5s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-20" />
        <SessionManager 
          initialDifficulty={difficulty}
          onSessionComplete={(stats, feedback) => {
            console.log('Session completed:', stats);
            if (feedback) {
              console.log('Session feedback:', feedback);
            }
            // Note: Don't redirect immediately to allow completion screen to show
            // User can manually navigate back using the feedback component buttons
          }}
        />
      </div>
    </div>
  );
}