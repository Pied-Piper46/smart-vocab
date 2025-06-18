'use client';

import { TrendingUp, TrendingDown, Home, RefreshCw } from 'lucide-react';
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

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-300/70';
    if (accuracy >= 70) return 'text-blue-300/70';
    return 'text-orange-300/70';
  };

  return (
    <div className="max-w-3xl mx-auto pt-10 sm:pt-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white/70 mb-4">セッション完了です</h2>
        
        {/* Main Stats */}
        <div className="mb-8">
          <div className={`text-6xl font-medium mb-2 ${getAccuracyColor(feedback.accuracy)}`}>
            {Math.round(feedback.accuracy)}%
          </div>
          <div className="text-xl text-white/60 mb-1">
            ( {feedback.correctAnswers} / {feedback.totalWords} )
          </div>
          <div className="text-white/60">
            {feedback.accuracy >= 90 
              ? '素晴らしい結果です'
              : feedback.accuracy >= 70
              ? 'よく頑張りました'
              : '継続が大切です'
            }
          </div>
        </div>
      </div>

      {/* Status Changes - Always show */}
      <div className="mb-10">
        <div className="space-y-8">
          {/* レベルアップした単語 */}
          <div>
            <h4 className="text-lg font-bold text-white/70 mb-4 flex items-center justify-center gap-2">
              <TrendingUp className="text-green-400" size={20} />
              レベルアップした単語
            </h4>
            {feedback.statusChanges.upgrades.length > 0 ? (
              <div className="space-y-2">
                {feedback.statusChanges.upgrades.map((change, index) => (
                  <div key={index} className="flex items-center justify-between py-3 px-3 border-b border-white/10 last:border-b-0">
                    <div>
                      <div className="font-medium text-white/80">{change.english}</div>
                      <div className="text-sm text-white/70">{change.japanese}</div>
                    </div>
                    <div className="text-green-400/80 text-sm font-bold">
                      {change.from} → {change.to}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-white/50">レベルアップした単語はありません</div>
              </div>
            )}
          </div>

          {/* 復習が必要な単語 */}
          <div>
            <h4 className="text-lg font-bold text-white/70 mb-4 flex items-center justify-center gap-2">
              <TrendingDown className="text-orange-400" size={20} />
              レベルダウンした単語
            </h4>
            {feedback.statusChanges.downgrades.length > 0 ? (
              <div className="space-y-2">
                {feedback.statusChanges.downgrades.map((change, index) => (
                  <div key={index} className="flex items-center justify-between py-3 px-3 border-b border-white/10 last:border-b-0">
                    <div>
                      <div className="font-medium text-white/80">{change.english}</div>
                      <div className="text-sm text-white/70">{change.japanese}</div>
                    </div>
                    <div className="text-orange-400/80 text-sm font-bold">
                      {change.from} → {change.to}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-white/50">レベルダウンした単語はありません</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-6 mb-20">
        <button
          onClick={onGoHome}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
        >
          <Home size={24} />
        </button>
        <button
          onClick={onStartNewSession}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110"
        >
          <RefreshCw size={24} />
        </button>
      </div>
    </div>
  );
}