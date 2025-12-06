'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Target,
  BookOpen,
  AlertTriangle,
  Home,
  Star,
  History,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAnalyticsData, useStrugglingWords, useLearningHistory } from '@/lib/swr-config';
import { sessionStorageCache } from '@/lib/dashboard-cache';

interface AnalyticsData {
  masteryStats: {
    learning: number;
    reviewing: number;
    mastered: number;
  };
  recentlyMastered: Array<{
    word: {
      english: string;
      japanese: string;
    };
    updatedAt: string;
  }>;
}

interface StrugglingWord {
  word: {
    english: string;
    japanese: string;
    partOfSpeech: string;
  };
  totalReviews: number;
  correctAnswers: number;
  accuracy: number;
  status: string;
}

interface LearningHistoryData {
  month: string;
  year: number;
  monthNum: number;
  days: Array<{
    day: number;
    date: string;
    sessionCount: number;
    hasSession: boolean;
  }>;
  totalSessions: number;
  activeDays: number;
}

type MenuType = 'mastery' | 'recent' | 'struggling' | 'history';

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<MenuType>('mastery');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [currentHistoryMonth, setCurrentHistoryMonth] = useState(new Date());

  // SWR hooks for efficient data fetching and caching
  const { data: analytics, error: analyticsError, isLoading: isLoadingAnalytics } = useAnalyticsData();
  const { data: strugglingWords, error: strugglingError, isLoading: isLoadingStrugglingWords } = useStrugglingWords();
  const { data: learningHistory, error: historyError, isLoading: isLoadingHistory } = useLearningHistory(
    currentHistoryMonth.getFullYear(),
    currentHistoryMonth.getMonth() + 1
  );

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  // Handle SWR errors
  useEffect(() => {
    if (analyticsError || strugglingError || historyError) {
      console.error('Progress page data fetch errors:', {
        analytics: analyticsError,
        struggling: strugglingError,
        history: historyError
      });
    }
  }, [analyticsError, strugglingError, historyError]);

  // Cache data in sessionStorage for faster subsequent loads
  useEffect(() => {
    if (analytics) {
      sessionStorageCache.set('progress-analytics', analytics);
    }
  }, [analytics]);

  useEffect(() => {
    if (strugglingWords) {
      sessionStorageCache.set('progress-struggling-words', strugglingWords);
    }
  }, [strugglingWords]);

  useEffect(() => {
    if (learningHistory) {
      sessionStorageCache.set(`progress-history-${currentHistoryMonth.getFullYear()}-${currentHistoryMonth.getMonth() + 1}`, learningHistory);
    }
  }, [learningHistory, currentHistoryMonth]);


  const handleMenuClick = (menu: MenuType) => {
    setActiveMenu(menu);
    setIsSidebarOpen(false);
    // SWR automatically handles data fetching when components mount
  };

  const handleHomeClick = () => {
    router.push('/dashboard');
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  const handlePreviousMonth = () => {
    const prevMonth = new Date(currentHistoryMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentHistoryMonth(prevMonth);
    // SWR will automatically fetch new data when currentHistoryMonth changes
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentHistoryMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    // Don't allow navigation beyond current month
    const now = new Date();
    if (nextMonth <= now) {
      setCurrentHistoryMonth(nextMonth);
      // SWR will automatically fetch new data when currentHistoryMonth changes
    }
  };

  const menuItems = [
    { id: 'mastery' as MenuType, label: '単語習得状況', icon: Target, title: '単語習得状況' },
    { id: 'recent' as MenuType, label: '最近習得した単語', icon: BookOpen, title: '最近習得した単語' },
    { id: 'struggling' as MenuType, label: '苦手な単語', icon: AlertTriangle, title: '苦手な単語' },
    { id: 'history' as MenuType, label: 'セッション学習記録', icon: History, title: 'セッション学習記録' },
  ];

  const getCurrentMenuTitle = () => {
    const currentMenuItem = menuItems.find(item => item.id === activeMenu);
    return currentMenuItem ? currentMenuItem.title : '学習進捗管理';
  };

  const getCurrentMenuIcon = () => {
    const currentMenuItem = menuItems.find(item => item.id === activeMenu);
    return currentMenuItem ? currentMenuItem.icon : Target;
  };

  if (status === 'loading' || isLoadingAnalytics) {
    return <LoadingSpinner />;
  }

  if (!session || !analytics) {
    return null;
  }

  const totalWords = analytics.masteryStats.learning + analytics.masteryStats.reviewing + analytics.masteryStats.mastered;
  const masteryPercentage = totalWords > 0 ? Math.round((analytics.masteryStats.mastered / totalWords) * 100) : 0;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-20 left-4 w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl float-animation"></div>
      <div className="absolute top-40 right-4 w-32 h-32 rounded-full bg-gradient-to-br from-pink-400/30 to-yellow-400/30 blur-xl float-animation" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 blur-xl float-animation" style={{ animationDelay: '2s' }}></div>
      
      <div className="flex min-h-screen relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 ml-3">
              {(() => {
                if (isSidebarOpen) {
                  return <Target className="text-white/80 w-6 h-6" />;
                }
                const IconComponent = getCurrentMenuIcon();
                return <IconComponent className="text-white/80 w-6 h-6" />;
              })()}
              <h1 className="text-white/80 text-xl font-bold">
                {isSidebarOpen ? '学習進捗管理' : getCurrentMenuTitle()}
              </h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="glass-light p-2 rounded-xl"
            >
              {isSidebarOpen ? <X size={20} className="text-white/70" /> : <Menu size={20} className="text-white/70" />}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`
          fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-80 h-full bg-black/20 backdrop-blur-xl border-r border-white/10 z-20
          lg:min-h-screen pt-20 lg:pt-8 flex flex-col
        `}>
          <div className="p-6 flex-1 flex flex-col">
            <nav className="space-y-2 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left
                      border
                      ${isActive 
                        ? 'glass-light border-white/20 text-white' 
                        : 'border-transparent hover:glass-light text-white/70 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom Buttons */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <button
                onClick={handleHomeClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left hover:glass-light text-white/70 hover:text-white"
              >
                <Home size={20} />
                <span className="font-medium">ホーム</span>
              </button>
              
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 text-left hover:glass-light text-red-300 hover:text-red-200"
              >
                <LogOut size={20} />
                <span className="font-medium">ログアウト</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-10"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 p-6 pt-24 lg:pt-8 overflow-y-auto">
          {renderContent()}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="p-4 bg-red-400/20 rounded-full mx-auto mb-4 w-fit">
                <LogOut className="text-red-300" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">ログアウトしますか？</h2>
              <p className="text-white/70">
                再度ログインして学習を続けることができます。
              </p>
            </div>
            
            <div className="flex justify-center gap-6">
              <button
                onClick={handleLogoutCancel}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110"
              >
                <X size={24} />
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-500 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
              >
                <LogOut size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderContent() {
    switch (activeMenu) {
      case 'mastery':
        return renderMasteryContent();
      case 'recent':
        return renderRecentContent();
      case 'struggling':
        return renderStrugglingContent();
      case 'history':
        return renderHistoryContent();
      default:
        return renderMasteryContent();
    }
  }

  function renderMasteryContent() {
    if (!analytics) return null;
    
    return (
      <div className="space-y-8">
        <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
          <Target className="text-white/80 w-8 h-8" />
          <h2 className="text-white/80 text-3xl font-bold">単語習得状況</h2>
        </div>
        <div className="space-y-6 sm:ml-7 sm:mr-7">
          {/* Learning */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500/70 rounded"></div>
                <span className="text-white/70 text-lg">学習中</span>
              </div>
              <span className="text-white/80 font-bold text-xl">{analytics.masteryStats.learning}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4">
              <div 
                className="bg-yellow-500/70 h-4 rounded-full transition-all duration-1000" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.learning / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Reviewing */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-orange-500/70 rounded"></div>
                <span className="text-white/70 text-lg">復習中</span>
              </div>
              <span className="text-white/80 font-bold text-xl">{analytics.masteryStats.reviewing}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4">
              <div 
                className="bg-orange-500/70 h-4 rounded-full transition-all duration-1000" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.reviewing / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Mastered */}
          <div className="space-y-3 mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500/70 rounded"></div>
                <span className="text-white/70 text-lg">習得済み</span>
              </div>
              <span className="text-white/80 font-bold text-xl">{analytics.masteryStats.mastered}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4">
              <div 
                className="bg-green-500/70 h-4 rounded-full transition-all duration-1000" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.mastered / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
        <div className="text-right sm:mr-5">
          <div className="text-3xl font-bold text-white/80 mb-2">{totalWords}語</div>
          <div className="text-white/70">総学習単語数</div>
        </div>
      </div>
    );
  }

  function renderRecentContent() {
    if (!analytics) return null;
    
    return (
      <div className="space-y-8 mb-10">
        <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
          <BookOpen className="text-white/80 w-8 h-8" />
          <h2 className="text-white/80 text-3xl font-bold">最近習得した単語</h2>
        </div>

        {analytics.recentlyMastered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:ml-5 sm:mr-5">
            {analytics.recentlyMastered.map((item: { word: { english: string; japanese: string }; updatedAt: string }, index: number) => (
              <div key={index} className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Star className="text-green-300" size={20} />
                  <span className="text-green-300 text-sm font-medium">習得済み</span>
                </div>
                <div className="font-bold text-white/80 text-xl mb-2">{item.word.english}</div>
                <div className="text-white/70 mb-4">{item.word.japanese}</div>
                <div className="text-xs text-white/50">
                  {new Date(item.updatedAt).toLocaleDateString('ja-JP')} に習得
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-12 text-center">
            <BookOpen className="text-white/30 w-16 h-16 mx-auto mb-4" />
            <p className="text-white/70 text-xl">まだ習得した単語がありません</p>
            <p className="text-white/50 mt-2">学習を続けて、最初の単語を習得しましょう</p>
          </div>
        )}
      </div>
    );
  }

  function renderStrugglingContent() {
    // Show loading spinner while fetching struggling words data
    if (isLoadingStrugglingWords) {
      return (
        <div className="space-y-8">
          <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
            <AlertTriangle className="text-white/80 w-8 h-8" />
            <h2 className="text-white/80 text-3xl font-bold">苦手な単語</h2>
          </div>
          <LoadingSpinner fullScreen={false} />
        </div>
      );
    }

    return (
      <div className="space-y-8 mb-10">
        <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
          <AlertTriangle className="text-white/80 w-8 h-8" />
          <h2 className="text-white/80 text-3xl font-bold">苦手な単語</h2>
        </div>

        {strugglingWords && strugglingWords.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:ml-5 sm:mr-5">
            {strugglingWords.map((item: { word: { english: string; japanese: string; partOfSpeech: string }; totalReviews: number; correctAnswers: number; accuracy: number }, index: number) => (
              <div key={index} className="glass rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-white/80 text-xl">{item.word.english}</div>
                    <div className="text-white/70 mb-1">{item.word.japanese}</div>
                    <div className="text-xs text-white/50">{item.word.partOfSpeech}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-300 font-bold text-xl">{item.accuracy}%</div>
                    <div className="text-xs text-white/70">正答率</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-white/60">
                  <span>学習回数: {item.totalReviews}回</span>
                  <span>正解: {item.correctAnswers}回</span>
                </div>
                <div className="mt-3 w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-red-400 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${item.accuracy}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-12 text-center">
            <AlertTriangle className="text-white/30 w-16 h-16 mx-auto mb-4" />
            <p className="text-white/70 text-xl">苦手な単語はありません</p>
            <p className="text-white/50 mt-2">素晴らしい学習成果です</p>
          </div>
        )}
      </div>
    );
  }

  function renderHistoryContent() {
    if (isLoadingHistory || !learningHistory) {
      return (
        <div className="space-y-8">
          <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
            <History className="text-white/80 w-8 h-8" />
            <h2 className="text-white/80 text-3xl font-bold">セッション学習記録</h2>
          </div>
          <LoadingSpinner fullScreen={false} />
        </div>
      );
    }

    const now = new Date();
    const isNextMonthDisabled = currentHistoryMonth.getFullYear() === now.getFullYear() && 
                               currentHistoryMonth.getMonth() === now.getMonth();

    return (
      <div className="space-y-8">
        <div className="hidden lg:flex items-center gap-3 mb-15 ml-7">
          <History className="text-white/80 w-8 h-8" />
          <h2 className="text-white/80 text-3xl font-bold">セッション学習記録</h2>
        </div>

        <div className="space-y-6 sm:ml-5 sm:mr-5">
          <div className="rounded-2xl p-6">
            {/* Month Navigation Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePreviousMonth}
                className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all duration-300"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-white/80 mb-1">{learningHistory.month}</h3>
                <div className="text-sm text-white/70">
                  {learningHistory.totalSessions}セッション / {learningHistory.activeDays}日
                </div>
              </div>
              
              <button
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  isNextMonthDisabled 
                    ? 'text-white/30 cursor-not-allowed' 
                    : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-xs">
              {/* Week headers */}
              {['日', '月', '火', '水', '木', '金', '土'].map((day: string) => (
                <div key={day} className="text-white/50 text-center p-2 font-bold">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for first week */}
              {Array.from({ length: new Date(learningHistory.year, learningHistory.monthNum - 1, 1).getDay() }, (_, i) => (
                <div key={i} className="p-2"></div>
              ))}
              
              {/* Days */}
              {learningHistory.days.map((day: { day: number; date: string; sessionCount: number; hasSession: boolean }) => (
                <div
                  key={day.day}
                  className={`
                    p-2 text-center rounded relative min-h-[3rem] flex flex-col items-center justify-center
                    ${day.hasSession 
                      ? 'bg-blue-400/30 text-white border border-blue-400/50' 
                      : 'bg-white/5 text-white/50'
                    }
                  `}
                  title={`${day.date}: ${day.sessionCount}セッション`}
                >
                  <div className="text-xs mb-1">{day.day}</div>
                  {day.sessionCount > 0 && (
                    <div className="text-[10px] sm:text-xs">
                      {'◆'.repeat(Math.min(day.sessionCount, 3))}
                      {day.sessionCount > 3 && '+'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-center text-white/70 sm:ml-5 sm:mr-5">
          <p className="text-sm">◆ = 完了したセッション（最大3つまで表示）</p>
        </div>
      </div>
    );
  }

}