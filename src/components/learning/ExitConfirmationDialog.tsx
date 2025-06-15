'use client';

import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle, XCircle } from 'lucide-react';

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  wordsStudied: number;
  totalWords: number;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export default function ExitConfirmationDialog({
  isOpen,
  wordsStudied,
  totalWords,
  onConfirmExit,
  onCancel
}: ExitConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="glass-strong rounded-3xl p-8 max-w-md w-full mx-4 scale-100 transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 glass-light rounded-full mb-4">
              <AlertTriangle className="text-yellow-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              セッションを終了しますか？
            </h2>
            <p className="text-white/70 text-sm">
              進行中の学習セッションから離脱します
            </p>
          </div>

          {/* Progress Summary */}
          <div className="glass-light rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">現在の進捗</span>
              <span className="text-white/70">{wordsStudied} / {totalWords}語</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.round((wordsStudied / totalWords) * 100)}%` }}
              />
            </div>
            
            {/* Data保存状況 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-400 flex-shrink-0" size={16} />
                <span className="text-white/80 text-sm">
                  学習した単語の進捗データは保存されます
                </span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="text-red-400 flex-shrink-0" size={16} />
                <span className="text-white/80 text-sm">
                  セッション完了記録は保存されません
                </span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="text-red-400 flex-shrink-0" size={16} />
                <span className="text-white/80 text-sm">
                  今日の学習目標にカウントされません
                </span>
              </div>
            </div>
          </div>

          {/* 推奨アクション */}
          {/* {wordsStudied > 0 && wordsStudied < totalWords && (
            <div className="glass rounded-xl p-4 mb-6 border border-blue-400/30">
              <div className="flex items-start gap-3">
                <BookOpen className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">
                    学習効果を最大化するために
                  </p>
                  <p className="text-blue-200/80 text-xs">
                    可能であればセッションを完了することをお勧めします。完了すると学習記録として保存され、成果が反映されます。
                  </p>
                </div>
              </div>
            </div>
          )} */}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 glass-button py-3 px-4 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300 flex items-center justify-center gap-2"
            >
              学習を続ける
            </button>
            <button
              onClick={onConfirmExit}
              className="flex-1 bg-red-500/20 backdrop-blur border border-red-400/30 py-3 px-4 rounded-xl text-red-200 font-medium hover:bg-red-500/30 hover:scale-101 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              終了する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}