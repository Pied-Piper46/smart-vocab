'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TypewriterText from '@/components/ui/TypewriterText';
import GuestModeBanner from '@/components/ui/GuestModeBanner';
import { useDashboardData } from '@/lib/swr-config';
import { sessionStorageCache } from '@/lib/dashboard-cache';

const CheckMark = ({ 
  isCompleted, 
  animationDelay = 0,
  size = 'md'
}: {
  isCompleted: boolean;
  animationDelay?: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [shouldFill, setShouldFill] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      // First animate the fill
      const fillTimer = setTimeout(() => {
        setShouldFill(true);
      }, animationDelay);
      
      // Then animate the checkmark
      const checkTimer = setTimeout(() => {
        setShouldAnimate(true);
      }, animationDelay + 200);
      
      return () => {
        clearTimeout(fillTimer);
        clearTimeout(checkTimer);
      };
    } else {
      setShouldAnimate(false);
      setShouldFill(false);
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

  const PRIMARY_COLOR = '#10b981';
  const UNCOMPLETED_COLOR = '#e5e7eb';

  return (
    <div className={`${sizeClasses[size]} transition-all duration-300`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        {/* Background Circle - only show when completed */}
        {shouldFill && (
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke={PRIMARY_COLOR}
            strokeWidth="2"
            fill={PRIMARY_COLOR}
            className="transition-all duration-500"
          />
        )}
        
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
        />
      </svg>
    </div>
  );
};


function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [showMigrationSuccess, setShowMigrationSuccess] = useState(false);
  const isAuthenticated = !!session;

  // Use SWR for data fetching with caching (only for authenticated users)
  const { data: dashboardData, error, isLoading } = useDashboardData(isAuthenticated);

  const profile = dashboardData?.profile;
  const dailyProgress = dashboardData?.dailyProgress;

  // Check for migration success parameter
  useEffect(() => {
    const migrated = searchParams.get('migrated');
    if (migrated === 'true') {
      setShowMigrationSuccess(true);
      // Clear the query parameter after showing notification
      const timer = setTimeout(() => {
        setShowMigrationSuccess(false);
        router.replace('/dashboard');
      }, 10000); // Show for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

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


  // Cache data in sessionStorage for faster subsequent loads
  useEffect(() => {
    if (dashboardData && !error && session?.user?.id) {
      sessionStorageCache.set('dashboard-data', dashboardData, undefined, session.user.id);
    }
  }, [dashboardData, error, session]);

  // Show completion message after all checkmarks have been animated
  useEffect(() => {
    if (dailyProgress && dailyProgress.sessionsToday >= 1) {
      // Calculate when the last checkmark animation will complete
      const lastCheckmarkIndex = dailyProgress.sessionsToday - 1;
      const lastAnimationDelay = (lastCheckmarkIndex + 0.1) * 300; // matches the animationDelay in render
      const animationDuration = 300 + 700; // fill animation (300ms) + checkmark animation (700ms)
      const totalDelay = lastAnimationDelay + animationDuration + 200; // extra 200ms buffer
      
      const timer = setTimeout(() => {
        setShowCompletionMessage(true);
      }, totalDelay);

      return () => clearTimeout(timer);
    } else {
      setShowCompletionMessage(false);
    }
  }, [dailyProgress?.sessionsToday]);


  // Show loading while checking authentication status
  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // Show loading while fetching data (authenticated users only)
  if (isAuthenticated && isLoading) {
    return <LoadingSpinner />;
  }

  // For authenticated users, wait for data
  if (isAuthenticated && (!profile || !dailyProgress)) {
    return <LoadingSpinner />;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Migration Success Notification */}
        {showMigrationSuccess && (
          <div
            className="mb-6 p-4 rounded-xl border-2"
            style={{
              backgroundColor: '#d1fae5',
              borderColor: '#10b981',
              animation: 'slideInFromTop 0.6s ease-out, slideOutToTop 0.5s ease-in 10.0s forwards',
              opacity: 0,
              animationFillMode: 'forwards'
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <div
                className="flex w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: '#10b981' }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-center test-xs md:text-base" style={{ color: '#059669' }}>
                ゲストセッションのデータが<br className="sm:hidden" />正常に保存されました
              </p>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes slideInFromTop {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideOutToTop {
            from {
              transform: translateY(0);
              opacity: 1;
            }
            to {
              transform: translateY(-100%);
              opacity: 0;
            }
          }
        `}</style>

        {/* Guest Mode Banner */}
        {!isAuthenticated && <GuestModeBanner />}

        {/* Header */}
        <div className="flex items-center justify-between mb-36">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#2C3538' }}>
            Smart Vocab
          </h1>
          <button
            onClick={() => router.push('/progress')}
            className="flex items-center gap-3 p-3 rounded-sm hover:scale-104 transition-all duration-200"
            style={{
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            <User className="w-6 h-6 md:w-9 md:h-9" />
            {isAuthenticated && (
              <div className="hidden sm:block">
                <p className="font-bold text-left text-xl">{session.user.name}</p>
                <p className="font-bold text-sm">{session.user?.email}</p>
              </div>
            )}
          </button>
        </div>

        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2
            className="text-2xl md:text-4xl font-bold mb-4"
            style={{ color: '#686b70ff' }}
          >
            おかえりなさい、{isAuthenticated ? session.user.name : 'ゲスト'}さん
          </h2>
        </div>

        {/* Session Progress with Checkmarks (authenticated only) */}
        {isAuthenticated && dailyProgress && (
          <div className="text-center mb-8">
            <div className="space-y-4">
              {/* Checkmarks Progress */}
              <div className="flex justify-center items-center gap-3 flex-wrap">
                {Array.from({ length: Math.max(1, dailyProgress.sessionsToday) }, (_, index) => (
                  <CheckMark
                    key={index}
                    isCompleted={index < dailyProgress.sessionsToday}
                    animationDelay={(index + 0.1) * 450}
                    size="md"
                  />
                ))}
              </div>

              {/* Message area - always reserve space */}
              <div className="h-8 flex items-center justify-center">
                <TypewriterText
                  text="今日の目標は完了です...!"
                  show={showCompletionMessage}
                  speed={80}
                  className="font-bold"
                  style={{ color: '#10b981' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Start Learning Button */}
        <div className="flex justify-center mb-24">
          <button
            onClick={() => router.push('/session')}
            className="px-8 py-4 rounded-full font-bold transition-all duration-200 hover:scale-105 active:scale-95 text-lg"
            style={{
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            セッションを始める
          </button>
        </div>

        {/* Flowing Word Cards */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: '#2C3538' }}>
            今日の単語
          </h3>
          <div className="relative h-32 overflow-hidden">
            <div className="flex animate-seamless-scroll space-x-4 absolute">
              {(() => {
                // Define base word list
                const words = [
                  { english: "accomplish", japanese: "達成する", phonetic: "/əˈkʌmplɪʃ/" },
                  { english: "magnificent", japanese: "素晴らしい", phonetic: "/mæɡˈnɪfɪsənt/" },
                  { english: "perseverance", japanese: "忍耐力", phonetic: "/ˌpɜːrsəˈvɪrəns/" },
                  { english: "brilliant", japanese: "優秀な", phonetic: "/ˈbrɪljənt/" },
                  { english: "curiosity", japanese: "好奇心", phonetic: "/ˌkjʊriˈɒsɪti/" },
                  { english: "adventure", japanese: "冒険", phonetic: "/ədˈventʃər/" },
                  { english: "knowledge", japanese: "知識", phonetic: "/ˈnɒlɪdʒ/" },
                  { english: "discover", japanese: "発見する", phonetic: "/dɪˈskʌvər/" },
                ];
                
                // Duplicate for seamless scrolling - this is a standard technique
                const doubledWords = [...words, ...words];
                
                return doubledWords.map((word, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 w-48 border flex-shrink-0"
                    style={{ borderColor: '#f0f8f5' }}
                  >
                    <div className="text-center space-y-2">
                      <h4 className="font-bold text-lg" style={{ color: '#2C3538' }}>
                        {word.english}
                      </h4>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        {word.phonetic}
                      </p>
                      <p className="font-bold" style={{ color: '#10b981' }}>
                        {word.japanese}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  );
}
