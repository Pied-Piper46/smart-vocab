'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { COLORS } from '@/styles/colors';

export default function GuestModeBanner() {
  const router = useRouter();

  return (
    <div
      className="rounded-2xl p-4 mb-6 border"
      style={{
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7'
      }}
    >
      <div className="flex items-center gap-3">
        <AlertCircle size={20} style={{ color: COLORS.warning }} />
        <div className="flex-1">
          <p className="font-medium" style={{ color: COLORS.text }}>
            ゲストモードで学習中
          </p>
          <p className="text-sm" style={{ color: COLORS.textLight }}>
            学習データは保存されません
          </p>
        </div>
        <button
          onClick={() => router.push('/auth/signup')}
          className="px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: '#f59e0b',
            color: 'white'
          }}
        >
          <span className="hidden sm:inline">登録して保存する</span>
          <span className="inline sm:hidden">保存</span>
        </button>
      </div>
    </div>
  );
}
