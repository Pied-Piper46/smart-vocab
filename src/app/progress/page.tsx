'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  BarChart3, 
  Target, 
  Award, 
  TrendingUp, 
  BookOpen, 
  AlertTriangle, 
  Calendar,
  ArrowLeft,
  Star,
  History
} from 'lucide-react';

interface AnalyticsData {
  streaks: {
    current: number;
    longest: number;
  };
  masteryStats: {
    learning: number;
    reviewing: number;
    mastered: number;
  };
  learningProgress: Record<string, number>;
  recentlyMastered: Array<{
    word: {
      english: string;
      japanese: string;
    };
    updatedAt: string;
  }>;
  goalAchievementRate: number;
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
  months: Array<{
    month: string;
    year: number;
    days: Array<{
      day: number;
      date: string;
      sessionCount: number;
      hasSession: boolean;
    }>;
    totalSessions: number;
    activeDays: number;
  }>;
  totalSessions: number;
  activeDays: number;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [strugglingWords, setStrugglingWords] = useState<StrugglingWord[]>([]);
  const [learningHistory, setLearningHistory] = useState<LearningHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showStrugglingWords, setShowStrugglingWords] = useState(false);
  const [showLearningHistory, setShowLearningHistory] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchAnalytics();
  }, [session, status, router]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/progress/analytics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStrugglingWords = async () => {
    try {
      const response = await fetch('/api/progress/struggling-words');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStrugglingWords(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching struggling words:', error);
    }
  };

  const fetchLearningHistory = async () => {
    try {
      const response = await fetch('/api/progress/learning-history?months=3');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLearningHistory(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching learning history:', error);
    }
  };

  const handleShowStrugglingWords = () => {
    setShowStrugglingWords(true);
    fetchStrugglingWords();
  };

  const handleShowLearningHistory = () => {
    setShowLearningHistory(true);
    fetchLearningHistory();
  };

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
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 glass-light p-3 rounded-xl hover:scale-105 transition-all duration-300 mr-4"
          >
            <ArrowLeft className="text-white/70" size={20} />
          </button>
          <div className="flex items-center gap-3">
            <BarChart3 className="text-white/70 w-8 h-8" />
            <h1 className="text-white/70 text-3xl font-bold">学習進捗管理</h1>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Streak */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Target className="text-orange-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{analytics.streaks.current}</div>
            <div className="text-sm text-white/70">現在の連続学習日数</div>
          </div>

          {/* Longest Streak */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Award className="text-yellow-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{analytics.streaks.longest}</div>
            <div className="text-sm text-white/70">最長連続学習記録</div>
          </div>

          {/* Goal Achievement Rate */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <TrendingUp className="text-green-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{analytics.goalAchievementRate}%</div>
            <div className="text-sm text-white/70">週次目標達成率</div>
          </div>

          {/* Mastery Rate */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl mx-auto mb-4 w-fit">
              <Star className="text-purple-300" size={24} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{masteryPercentage}%</div>
            <div className="text-sm text-white/70">習得率</div>
          </div>
        </div>

        {/* Mastery Status Chart */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="text-blue-300" size={24} />
            マスタリー状態
          </h2>
          
          <div className="space-y-4">
            {/* Learning */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-400 rounded"></div>
                <span className="text-white/70">学習中</span>
              </div>
              <span className="text-white font-bold">{analytics.masteryStats.learning}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div 
                className="bg-blue-400 h-3 rounded-full transition-all duration-500" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.learning / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>

            {/* Reviewing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <span className="text-white/70">復習中</span>
              </div>
              <span className="text-white font-bold">{analytics.masteryStats.reviewing}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div 
                className="bg-orange-400 h-3 rounded-full transition-all duration-500" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.reviewing / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>

            {/* Mastered */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-400 rounded"></div>
                <span className="text-white/70">習得済み</span>
              </div>
              <span className="text-white font-bold">{analytics.masteryStats.mastered}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div 
                className="bg-green-400 h-3 rounded-full transition-all duration-500" 
                style={{ width: totalWords > 0 ? `${(analytics.masteryStats.mastered / totalWords) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recently Mastered Words */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="text-green-300" size={24} />
            最近習得した単語
          </h2>
          
          {analytics.recentlyMastered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.recentlyMastered.slice(0, 6).map((item, index) => (
                <div key={index} className="glass-light rounded-xl p-4">
                  <div className="font-bold text-white mb-1">{item.word.english}</div>
                  <div className="text-white/70 text-sm mb-2">{item.word.japanese}</div>
                  <div className="text-xs text-white/50">
                    {new Date(item.updatedAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70 text-center py-8">まだ習得した単語がありません</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Struggling Words Button */}
          <button
            onClick={handleShowStrugglingWords}
            className="glass rounded-2xl p-6 hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-red-300" size={24} />
              <h3 className="text-xl font-bold text-white">苦手な単語</h3>
            </div>
            <p className="text-white/70">学習回数が多いのに正答率の低い単語を確認</p>
          </button>

          {/* Learning History Button */}
          <button
            onClick={handleShowLearningHistory}
            className="glass rounded-2xl p-6 hover:scale-105 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <History className="text-blue-300" size={24} />
              <h3 className="text-xl font-bold text-white">学習記録</h3>
            </div>
            <p className="text-white/70">過去3ヶ月の日ごとの学習履歴を確認</p>
          </button>
        </div>
      </div>

      {/* Struggling Words Modal */}
      {showStrugglingWords && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-300" size={24} />
                苦手な単語
              </h2>
              <button
                onClick={() => setShowStrugglingWords(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {strugglingWords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strugglingWords.map((item, index) => (
                  <div key={index} className="glass-light rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-white">{item.word.english}</div>
                        <div className="text-white/70 text-sm">{item.word.japanese}</div>
                        <div className="text-xs text-white/50">{item.word.partOfSpeech}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-300 font-bold">{item.accuracy}%</div>
                        <div className="text-xs text-white/70">
                          {item.correctAnswers}/{item.totalReviews}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/70 text-center py-8">苦手な単語はありません！</p>
            )}
          </div>
        </div>
      )}

      {/* Learning History Modal */}
      {showLearningHistory && learningHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 max-w-6xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="text-blue-300" size={24} />
                学習記録（過去3ヶ月）
              </h2>
              <button
                onClick={() => setShowLearningHistory(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {learningHistory.months.map((month, monthIndex) => (
                <div key={monthIndex} className="glass-light rounded-xl p-4">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <span>{month.month}</span>
                    <span className="text-sm text-white/70">
                      {month.totalSessions}セッション / {month.activeDays}日
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {/* Week headers */}
                    {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                      <div key={day} className="text-white/50 text-center p-1 font-bold">
                        {day}
                      </div>
                    ))}
                    
                    {/* Empty cells for first week */}
                    {Array.from({ length: new Date(month.year, month.days[0] ? new Date(month.days[0].date).getMonth() : 0, 1).getDay() }, (_, i) => (
                      <div key={i} className="p-1"></div>
                    ))}
                    
                    {/* Days */}
                    {month.days.map((day) => (
                      <div
                        key={day.day}
                        className={`
                          p-1 text-center rounded relative
                          ${day.hasSession 
                            ? 'bg-blue-400/30 text-white' 
                            : 'bg-white/5 text-white/50'
                          }
                        `}
                        title={`${day.date}: ${day.sessionCount}セッション`}
                      >
                        <div className="text-xs">{day.day}</div>
                        {day.sessionCount > 0 && (
                          <div className="absolute -top-1 -right-1">
                            {'◆'.repeat(Math.min(day.sessionCount, 3))}
                            {day.sessionCount > 3 && '+'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center text-white/70">
              <p>◆ = 完了したセッション（最大3つまで表示）</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}