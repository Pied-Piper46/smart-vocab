'use client';

import { useState } from 'react';
import { Target, TrendingUp, TrendingDown, RotateCcw, CheckCircle, Home, RefreshCw } from 'lucide-react';
import { SessionFeedback } from './SessionManager';

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
  const [showDetails, setShowDetails] = useState(false);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-300';
    if (accuracy >= 70) return 'text-yellow-300';
    return 'text-orange-300';
  };

  const getAccuracyEmoji = (accuracy: number) => {
    if (accuracy >= 90) return '🎉';
    if (accuracy >= 70) return '👍';
    return '💪';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-strong rounded-3xl p-8 mb-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getAccuracyEmoji(feedback.accuracy)}</div>
          <h2 className="text-3xl font-bold text-white mb-2">セッション完了！</h2>
          <p className="text-white/70">素晴らしい学習でした！</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Words */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl inline-block mb-4">
              <Target className="text-blue-300" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{feedback.totalWords}</h3>
            <p className="text-white/70">学習した単語</p>
          </div>

          {/* Accuracy */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl inline-block mb-4">
              <CheckCircle className={`${getAccuracyColor(feedback.accuracy)}`} size={32} />
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${getAccuracyColor(feedback.accuracy)}`}>
              {Math.round(feedback.accuracy)}%
            </h3>
            <p className="text-white/70">正解率</p>
          </div>

          {/* Correct Answers */}
          <div className="glass rounded-2xl p-6 text-center">
            <div className="p-3 glass-light rounded-xl inline-block mb-4">
              <CheckCircle className="text-green-300" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {feedback.correctAnswers} / {feedback.totalWords}
            </h3>
            <p className="text-white/70">正解数</p>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upgrades */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 glass-light rounded-xl">
                <TrendingUp className="text-green-300" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">レベルアップ</h4>
                <p className="text-white/70">習熟度が向上した単語</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-300 mb-2">{feedback.totalUpgrades}</div>
              <div className="text-sm text-white/60">
                新規学習: {feedback.newWordsLearned} | 強化: {feedback.wordsReinforced}
              </div>
            </div>
          </div>

          {/* Downgrades */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 glass-light rounded-xl">
                <TrendingDown className="text-orange-300" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">要復習</h4>
                <p className="text-white/70">習熟度が低下した単語</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-300 mb-2">{feedback.totalDowngrades}</div>
              <div className="text-sm text-white/60">
                {feedback.totalDowngrades > 0 ? '復習が必要です' : '全て順調です！'}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Details Button */}
        {(feedback.statusChanges.upgrades.length > 0 || feedback.statusChanges.downgrades.length > 0) && (
          <div className="text-center mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="glass-button px-6 py-3 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300"
            >
              <RotateCcw size={16} className="mr-2" />
              {showDetails ? '詳細を非表示' : '詳細を表示'}
            </button>
          </div>
        )}

        {/* Detailed Status Changes */}
        {showDetails && (
          <div className="space-y-6">
            {/* Upgrades Detail */}
            {feedback.statusChanges.upgrades.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-300" size={20} />
                  レベルアップした単語
                </h4>
                <div className="space-y-3">
                  {feedback.statusChanges.upgrades.map((change, index) => (
                    <div key={index} className="glass-light rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{change.english}</div>
                          <div className="text-sm text-white/70">{change.japanese}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-300 font-medium">
                            {change.from} → {change.to}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downgrades Detail */}
            {feedback.statusChanges.downgrades.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingDown className="text-orange-300" size={20} />
                  復習が必要な単語
                </h4>
                <div className="space-y-3">
                  {feedback.statusChanges.downgrades.map((change, index) => (
                    <div key={index} className="glass-light rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{change.english}</div>
                          <div className="text-sm text-white/70">{change.japanese}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-orange-300 font-medium">
                            {change.from} → {change.to}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={onStartNewSession}
            className="glass-button flex-1 py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300"
          >
            <RefreshCw size={20} className="mr-2" />
            新しいセッション
          </button>
          <button
            onClick={onGoHome}
            className="glass-light flex-1 py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300"
          >
            <Home size={20} className="mr-2" />
            ホームに戻る
          </button>
        </div>
      </div>

      {/* Encouragement Message */}
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-white/80">
          {feedback.accuracy >= 90 
            ? '完璧です！この調子で続けていきましょう 🌟'
            : feedback.accuracy >= 70
            ? 'よく頑張りました！継続が力になります 💪'
            : '学習は積み重ねです。一歩ずつ前進していきましょう 🚀'
          }
        </p>
      </div>
    </div>
  );
}