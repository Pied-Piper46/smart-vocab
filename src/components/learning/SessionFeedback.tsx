'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Home, RefreshCw, ArrowRight, LogIn, X } from 'lucide-react';
import { SessionFeedback } from './SessionManager';
import { COLORS } from '@/styles/colors';
import StatusBadge from '@/components/ui/StatusBadge';
import TypewriterText from '@/components/ui/TypewriterText';
import { clearSession } from '@/lib/session-storage';
import { getMasteryDisplayInfo } from '@/lib/mastery';

interface SessionFeedbackProps {
  feedback: SessionFeedback;
  onStartNewSession: () => void;
  onGoHome: () => void;
}

export default function SessionFeedbackComponent({
  feedback,
  onStartNewSession,
  onGoHome
}: SessionFeedbackProps) {
  const [showMessage, setShowMessage] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const isGuest = !session;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return COLORS.primary;
    if (accuracy >= 70) return COLORS.info;
    return COLORS.warning;
  };

  const getMessage = (accuracy: number) => {
    if (accuracy >= 90) return '素晴らしい結果です！';
    if (accuracy >= 70) return 'よく頑張りました！';
    return '継続が大切です！';
  };

  // Show message with delay after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, 500); // Show message after accuracy is displayed
    return () => clearTimeout(timer);
  }, []);

  const handleLoginAndSave = () => {
    // Redirect to signin page, guest session will be migrated there
    router.push('/auth/signin');
  };

  const handleContinueWithoutSaving = () => {
    // Delete guest session immediately
    clearSession(false);
    // Go back to home
    onGoHome();
  };

  return (
    <div className="max-w-3xl mx-auto pt-10 sm:pt-20 px-4">
      {/* Header*/}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-6" style={{ color: COLORS.text }}>
          セッション完了です
        </h2>

        {/* Main Stats */}
        <div className="mb-6">
          <div className="text-7xl font-bold mb-3" style={{ color: getAccuracyColor(feedback.accuracy) }}>
            {Math.round(feedback.accuracy)}%
          </div>
          <div className="text-lg mb-2" style={{ color: COLORS.textLight }}>
            （{feedback.correctAnswers} / {feedback.totalWords}）
          </div>
          <div className="h-8 flex items-center justify-center">
            <TypewriterText
              text={getMessage(feedback.accuracy)}
              show={showMessage}
              speed={80}
              className="text-lg font-medium"
              style={{ color: COLORS.primary }}
            />
          </div>
        </div>
      </div>

      {/* Conditional Content: Guest Prompt or Status Changes */}
      {isGuest ? (
        /* Guest User: Login Prompt Banner */
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${COLORS.primary}20` }}
              >
                <LogIn size={32} style={{ color: COLORS.primary }} />
              </div>
              <h3 className="text-lg md:text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
                学習結果を保存しますか？
              </h3>
              <p className="text-sm" style={{ color: COLORS.textLight }}>
                ログインすると、今回の学習結果を保存して進捗を管理できます
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated User: Status Changes */
        <div className="space-y-4 mb-8">
          {/* レベルアップした単語 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
              <TrendingUp style={{ color: COLORS.primary }} size={20} />
              レベルアップした単語
            </h4>
            {feedback.statusChanges.upgrades.length > 0 ? (
              <div className="space-y-3">
                {feedback.statusChanges.upgrades.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 px-4 rounded-lg"
                    style={{ backgroundColor: COLORS.accent }}
                  >
                    <div className="flex-1">
                      <div className="font-bold" style={{ color: COLORS.text }}>
                        {change.english}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.textLight }}>
                        {change.japanese}
                      </div>
                    </div>

                    {/* Mobile: Color dot + text */}
                    <div className="flex sm:hidden items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getMasteryDisplayInfo(change.to).color }}
                      />
                      <span className="text-xs font-bold" style={{ color: getMasteryDisplayInfo(change.to).color }}>
                        {getMasteryDisplayInfo(change.to).label}
                      </span>
                    </div>

                    {/* Desktop: Status badges */}
                    <div className="hidden sm:flex items-center gap-2">
                      <StatusBadge status={change.from} size="sm" />
                      <ArrowRight size={16} style={{ color: COLORS.textLight }} />
                      <StatusBadge status={change.to} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div style={{ color: COLORS.textMuted }}>
                  レベルアップした単語はありません
                </div>
              </div>
            )}
          </div>

          {/* レベルダウンした単語 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
              <TrendingDown style={{ color: COLORS.warning }} size={20} />
              レベルダウンした単語
            </h4>
            {feedback.statusChanges.downgrades.length > 0 ? (
              <div className="space-y-3">
                {feedback.statusChanges.downgrades.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 px-4 rounded-lg"
                    style={{ backgroundColor: COLORS.accent }}
                  >
                    <div className="flex-1">
                      <div className="font-bold" style={{ color: COLORS.text }}>
                        {change.english}
                      </div>
                      <div className="text-sm" style={{ color: COLORS.textLight }}>
                        {change.japanese}
                      </div>
                    </div>

                    {/* Mobile: Color dot + text */}
                    <div className="flex sm:hidden items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getMasteryDisplayInfo(change.to).color }}
                      />
                      <span className="text-xs font-semibold" style={{ color: COLORS.text }}>
                        {getMasteryDisplayInfo(change.to).label}
                      </span>
                    </div>

                    {/* Desktop: Status badges */}
                    <div className="hidden sm:flex items-center gap-2">
                      <StatusBadge status={change.from} size="sm" />
                      <ArrowRight size={16} style={{ color: COLORS.textLight }} />
                      <StatusBadge status={change.to} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div style={{ color: COLORS.textMuted }}>
                  レベルダウンした単語はありません
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isGuest ? (
        /* Guest User: Login Prompt Buttons */
        <div className="flex justify-center gap-4 mb-20">
          <button
            onClick={handleContinueWithoutSaving}
            className="flex items-center gap-2 p-3 sm:px-6 sm:py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 border-2"
            style={{
              borderColor: COLORS.border,
              color: COLORS.textLight,
              backgroundColor: 'transparent'
            }}
          >
            <X size={20} />
            <span className="hidden sm:inline">保存せずに続ける</span>
          </button>
          <button
            onClick={handleLoginAndSave}
            className="flex items-center gap-2 p-3 sm:px-8 sm:py-3 rounded-full font-bold transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: COLORS.primary,
              color: 'white'
            }}
          >
            <LogIn size={20} />
            <span className="hidden sm:inline">ログインして保存</span>
          </button>
        </div>
      ) : (
        /* Authenticated User: Standard Buttons */
        <div className="flex justify-center gap-4 mb-20">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 p-3 sm:px-8 sm:py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 border-2"
            style={{
              borderColor: COLORS.primary,
              color: COLORS.primary,
              backgroundColor: 'transparent'
            }}
          >
            <Home size={20} />
            <span className="hidden sm:inline">ホームへ</span>
          </button>
          <button
            onClick={onStartNewSession}
            className="flex items-center gap-2 p-3 sm:px-8 sm:py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: COLORS.primary,
              color: 'white'
            }}
          >
            <RefreshCw size={20} />
            <span className="hidden sm:inline">もう一度</span>
          </button>
        </div>
      )}
    </div>
  );
}