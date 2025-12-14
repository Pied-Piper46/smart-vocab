'use client';

import { AlertTriangle, LogOut, Play } from 'lucide-react';
import { COLORS } from '@/styles/colors';

interface ExitConfirmationDialogProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export default function ExitConfirmationDialog({
  isOpen,
  onConfirmExit,
  onCancel
}: ExitConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 scale-100 transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: COLORS.accent }}>
              <AlertTriangle style={{ color: COLORS.primary }} size={32} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: COLORS.text }}>
              セッションを中断しますか？
            </h2>
            <p className="text-sm" style={{ color: COLORS.textLight }}>
              中断した単語から再開することが可能です
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: COLORS.primary,
                color: 'white'
              }}
            >
              <Play size={16} />
              継続
            </button>
            <button
              onClick={onConfirmExit}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 border-2"
              style={{
                borderColor: '#ef4444',
                color: '#ef4444',
                backgroundColor: 'transparent'
              }}
            >
              <LogOut size={16} />
              中断
            </button>
          </div>
        </div>
      </div>
    </>
  );
}