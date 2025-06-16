'use client';

import { AlertTriangle, CheckCircle, XCircle, LogOut, Play } from 'lucide-react';

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
            <h2 className="text-2xl font-bold text-white/80 mb-2">
              セッションを終了しますか？
            </h2>
            <p className="text-white/70 text-sm">
              進行中の学習セッションから離脱します
            </p>
          </div>

          {/* Progress Summary */}
          <div className="rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 font-medium">現在の進捗</span>
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

          {/* Action Buttons */}
          <div className="flex justify-center gap-6">
            <button
              onClick={onCancel}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-green-500/50 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110"
            >
              <Play size={24} />
            </button>
            <button
              onClick={onConfirmExit}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center text-white/80 hover:text-white transition-all duration-300 hover:scale-110"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}