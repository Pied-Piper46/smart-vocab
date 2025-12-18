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
import StatusBadge from '@/components/ui/StatusBadge';
import { useAnalyticsData, useStrugglingWords, useLearningHistory } from '@/lib/swr-config';
import { sessionStorageCache } from '@/lib/dashboard-cache';
import { COLORS } from '@/styles/colors';

type MenuType = 'mastery' | 'recent' | 'struggling' | 'history';

function LoginPromptOverlay() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Target style={{ color: COLORS.primary }} size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
            進捗を確認するにはログインが必要です
          </h2>
          <p className="mb-6" style={{ color: COLORS.textLight }}>
            ゲストモードでは学習データが保存されません。
            <br />
            アカウントを作成して進捗を記録しましょう。
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/auth/signin')}
            className="flex-1 py-3 rounded-full font-semibold border-2 transition-all duration-200 hover:scale-102"
            style={{ borderColor: COLORS.primary, color: COLORS.primary }}
          >
            ログイン
          </button>
          <button
            onClick={() => router.push('/auth/signup')}
            className="flex-1 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-102"
            style={{ backgroundColor: COLORS.primary, color: 'white' }}
          >
            新規登録
          </button>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-4 text-sm transition-all duration-200 underline hover:scale-102"
          style={{ color: COLORS.textLight }}
        >
          ゲストとして学習を続ける
        </button>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<MenuType>('mastery');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [currentHistoryMonth, setCurrentHistoryMonth] = useState(new Date());
  const isAuthenticated = !!session;

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  // SWR hooks for efficient data fetching and caching (only for authenticated users)
  const { data: analytics, error: analyticsError, isLoading: isLoadingAnalytics } = useAnalyticsData(isAuthenticated);
  const { data: strugglingWords, error: strugglingError, isLoading: isLoadingStrugglingWords } = useStrugglingWords(isAuthenticated);
  const { data: learningHistory, error: historyError, isLoading: isLoadingHistory } = useLearningHistory(
    isAuthenticated ? currentHistoryMonth.getFullYear() : undefined,
    isAuthenticated ? currentHistoryMonth.getMonth() + 1 : undefined
  );

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

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  // Guest users: Show login prompt
  if (!isAuthenticated) {
    return <LoginPromptOverlay />;
  }

  // Authenticated users: Wait for data
  if (isLoadingAnalytics) {
    return <LoadingSpinner />;
  }

  if (!analytics) {
    return <LoadingSpinner />;
  }

  const totalWords = analytics.masteryStats.learning + analytics.masteryStats.reviewing + analytics.masteryStats.mastered;

  return (
    <div className="flex min-h-screen">
      {/* Fixed Sidebar with white background */}
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const IconComponent = getCurrentMenuIcon();
              return <IconComponent style={{ color: COLORS.primary }} className="w-6 h-6" />;
            })()}
            <h1 className="text-xl font-bold" style={{ color: COLORS.text }}>
              {getCurrentMenuTitle()}
            </h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {isSidebarOpen ? <X size={20} style={{ color: COLORS.text }} /> : <Menu size={20} style={{ color: COLORS.text }} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:sticky lg:top-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}
        lg:translate-x-0

        top-20 bottom-20 left-4 right-auto lg:inset-y-0 lg:inset-x-0
        w-[calc(100%-6rem)] max-w-sm lg:max-w-none lg:w-80

        bg-white rounded-2xl lg:rounded-none
        shadow-2xl lg:shadow-sm
        border border-gray-100 lg:border-r lg:border-y-0 lg:border-l-0

        z-50 lg:z-0
        flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
      `}>
        <div className="px-6 py-8 flex-1 flex flex-col overflow-y-auto">
          <nav className="space-y-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left
                    ${isActive
                      ? 'font-semibold'
                      : 'hover:bg-gray-50'
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? COLORS.accent : 'transparent',
                    color: isActive ? COLORS.primary : COLORS.textLight
                  }}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Buttons */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <button
              onClick={handleHomeClick}
              className="w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 text-left hover:bg-gray-50"
              style={{ color: COLORS.textLight }}
            >
              <Home size={20} />
              <span className="font-medium">ホーム</span>
            </button>

            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-200 text-left hover:bg-red-50"
              style={{ color: COLORS.error }}
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content - Independent scroll area with gradient background */}
      <div
        className="flex-1 min-h-screen p-6 pt-24 lg:pt-8 overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
        }}
      >
        {renderContent()}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300"
            onClick={handleLogoutCancel}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 scale-100 transition-all duration-300">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#fee2e2' }}>
                  <LogOut style={{ color: COLORS.error }} size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
                  ログアウトしますか？
                </h2>
                <p className="text-xs md:text-sm" style={{ color: COLORS.textLight }}>
                  再度ログインして学習を続けることができます
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleLogoutCancel}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-xs md:text-base font-semibold transition-all duration-200 hover:scale-105 border-2 whitespace-nowrap"
                  style={{
                    borderColor: COLORS.textLight,
                    color: COLORS.textLight,
                    backgroundColor: 'transparent'
                  }}
                >
                  <X size={16} />
                  キャンセル
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-xs md:text-base font-semibold transition-all duration-200 hover:scale-105 whitespace-nowrap"
                  style={{
                    backgroundColor: COLORS.error,
                    color: 'white'
                  }}
                >
                  <LogOut size={16} />
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </>
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
      <div className="space-y-6">
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <Target style={{ color: COLORS.primary }} className="w-8 h-8" />
          <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>単語習得状況</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-6">
            {/* Learning */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status="learning" size="sm" />
                  <span className="text-lg font-medium" style={{ color: COLORS.text }}>学習中</span>
                </div>
                <span className="font-bold text-xl" style={{ color: COLORS.text }}>{analytics.masteryStats.learning}語</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{
                    width: totalWords > 0 ? `${(analytics.masteryStats.learning / totalWords) * 100}%` : '0%',
                    backgroundColor: COLORS.statusLearning
                  }}
                ></div>
              </div>
            </div>

            {/* Reviewing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status="reviewing" size="sm" />
                  <span className="text-lg font-medium" style={{ color: COLORS.text }}>復習中</span>
                </div>
                <span className="font-bold text-xl" style={{ color: COLORS.text }}>{analytics.masteryStats.reviewing}語</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{
                    width: totalWords > 0 ? `${(analytics.masteryStats.reviewing / totalWords) * 100}%` : '0%',
                    backgroundColor: COLORS.statusReviewing
                  }}
                ></div>
              </div>
            </div>

            {/* Mastered */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status="mastered" size="sm" />
                  <span className="text-lg font-medium" style={{ color: COLORS.text }}>習得済み</span>
                </div>
                <span className="font-bold text-xl" style={{ color: COLORS.text }}>{analytics.masteryStats.mastered}語</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{
                    width: totalWords > 0 ? `${(analytics.masteryStats.mastered / totalWords) * 100}%` : '0%',
                    backgroundColor: COLORS.statusMastered
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-right">
            <div className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>{totalWords}語</div>
            <div style={{ color: COLORS.textLight }}>総学習単語数</div>
          </div>
        </div>
      </div>
    );
  }

  function renderRecentContent() {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <BookOpen style={{ color: COLORS.primary }} className="w-8 h-8" />
          <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>最近習得した単語</h2>
        </div>

        {analytics.recentlyMastered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {analytics.recentlyMastered.map((item: { word: { english: string; japanese: string }; updatedAt: string }, index: number) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <StatusBadge status="mastered" size="sm" />
                </div>
                <div className="font-bold text-xl mb-2" style={{ color: COLORS.text }}>{item.word.english}</div>
                <div className="mb-4" style={{ color: COLORS.textLight }}>{item.word.japanese}</div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>
                  {new Date(item.updatedAt).toLocaleDateString('ja-JP')} に習得
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <BookOpen style={{ color: COLORS.border }} className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg md:text-xl mb-2" style={{ color: COLORS.text }}>まだ習得した単語がありません</p>
            <p className="text-xs md:text-sm" style={{ color: COLORS.textLight }}>学習を続けて、最初の単語を習得しましょう</p>
          </div>
        )}
      </div>
    );
  }

  function renderStrugglingContent() {
    // Show loading spinner while fetching struggling words data
    if (isLoadingStrugglingWords) {
      return (
        <div className="space-y-6">
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <AlertTriangle style={{ color: COLORS.primary }} className="w-8 h-8" />
            <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>苦手な単語</h2>
          </div>
          <LoadingSpinner fullScreen={false} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <AlertTriangle style={{ color: COLORS.primary }} className="w-8 h-8" />
          <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>苦手な単語</h2>
        </div>

        {strugglingWords && strugglingWords.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {strugglingWords.map((item: { word: { english: string; japanese: string; partOfSpeech: string }; totalReviews: number; correctAnswers: number; accuracy: number }, index: number) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-xl mb-1" style={{ color: COLORS.text }}>{item.word.english}</div>
                    <div className="mb-1" style={{ color: COLORS.textLight }}>{item.word.japanese}</div>
                    <div className="text-xs" style={{ color: COLORS.textMuted }}>{item.word.partOfSpeech}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-2xl" style={{ color: COLORS.warning }}>{item.accuracy}%</div>
                    <div className="text-xs" style={{ color: COLORS.textLight }}>正答率</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-3" style={{ color: COLORS.textLight }}>
                  <span>学習回数: {item.totalReviews}回</span>
                  <span>正解: {item.correctAnswers}回</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${item.accuracy}%`,
                      backgroundColor: COLORS.warning
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <AlertTriangle style={{ color: COLORS.border }} className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg md:text-xl mb-2" style={{ color: COLORS.text }}>苦手な単語はありません</p>
            <p className="text-xs md:text-sm" style={{ color: COLORS.textLight }}>素晴らしい学習成果です！</p>
          </div>
        )}
      </div>
    );
  }

  function renderHistoryContent() {
    if (isLoadingHistory || !learningHistory) {
      return (
        <div className="space-y-6">
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <History style={{ color: COLORS.primary }} className="w-8 h-8" />
            <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>セッション学習記録</h2>
          </div>
          <LoadingSpinner fullScreen={false} />
        </div>
      );
    }

    const now = new Date();
    const isNextMonthDisabled = currentHistoryMonth.getFullYear() === now.getFullYear() &&
                               currentHistoryMonth.getMonth() === now.getMonth();

    return (
      <div className="space-y-6">
        <div className="hidden lg:flex items-center gap-3 mb-6">
          <History style={{ color: COLORS.primary }} className="w-8 h-8" />
          <h2 className="text-3xl font-bold" style={{ color: COLORS.text }}>セッション学習記録</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
              style={{ color: COLORS.textLight }}
            >
              <ChevronLeft size={24} />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-bold mb-1" style={{ color: COLORS.text }}>{learningHistory.month}</h3>
              <div className="text-sm" style={{ color: COLORS.textLight }}>
                {learningHistory.totalSessions}セッション / {learningHistory.activeDays}日
              </div>
            </div>

            <button
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isNextMonthDisabled
                  ? 'cursor-not-allowed opacity-30'
                  : 'hover:bg-gray-100'
              }`}
              style={{ color: COLORS.textLight }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Week headers */}
            {['日', '月', '火', '水', '木', '金', '土'].map((day: string) => (
              <div key={day} className="text-center p-2 font-bold" style={{ color: COLORS.textMuted }}>
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
                  p-2 text-center rounded-lg relative min-h-[3rem] flex flex-col items-center justify-center
                  transition-colors duration-200
                `}
                style={{
                  backgroundColor: day.hasSession ? COLORS.accent : COLORS.bgGray,
                  color: day.hasSession ? COLORS.primary : COLORS.textMuted,
                  border: day.hasSession ? `1px solid ${COLORS.primary}` : '1px solid transparent'
                }}
                title={`${day.date}: ${day.sessionCount}セッション`}
              >
                <div className="text-xs mb-1 font-medium">{day.day}</div>
                {day.sessionCount > 0 && (
                  <div className="text-[10px] sm:text-xs font-bold">
                    {'◆'.repeat(Math.min(day.sessionCount, 3))}
                    {day.sessionCount > 3 && '+'}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-sm" style={{ color: COLORS.textLight }}>
            <p>◆ = 完了したセッション（最大3つまで表示）</p>
          </div>
        </div>
      </div>
    );
  }

}