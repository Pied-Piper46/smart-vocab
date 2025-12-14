'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { COLORS } from '@/styles/colors';

export default function SignUpPage() {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Handle login link click
  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (session) {
      // User is already logged in, go directly to dashboard
      router.push('/dashboard');
    } else {
      // User not logged in, go to login page
      router.push('/auth/signin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    // Check if password contains both letters and numbers
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      setError('パスワードは英字と数字の両方を含む必要があります');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/auth/signin?message=アカウントが作成されました。ログインしてください。');
      } else {
        setError(data.error || 'アカウントの作成に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ color: COLORS.text }}
          >
            Smart Vocab
          </h1>
          <h2
            className="text-2xl mb-2 font-bold"
            style={{ color: COLORS.text }}
          >
            SIGNUP
          </h2>
          <p
            className="text-sm"
            style={{ color: COLORS.textLight }}
          >
            新しいアカウントを作成して下さい
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.text }}
            >
              お名前
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none transition-all"
              style={{
                color: COLORS.text,
                backgroundColor: COLORS.bgGray,
                borderColor: COLORS.border
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="山田太郎"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.text }}
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none transition-all"
              style={{
                color: COLORS.text,
                backgroundColor: COLORS.bgGray,
                borderColor: COLORS.border
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.text }}
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none transition-all"
              style={{
                color: COLORS.text,
                backgroundColor: COLORS.bgGray,
                borderColor: COLORS.border
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="8文字以上、英字と数字を含む"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
              style={{ color: COLORS.text }}
            >
              パスワード確認
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none transition-all"
              style={{
                color: COLORS.text,
                backgroundColor: COLORS.bgGray,
                borderColor: COLORS.border
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px ${COLORS.primary}33`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div
              className="rounded-xl p-4 border"
              style={{
                backgroundColor: '#fee2e2',
                borderColor: '#fecaca'
              }}
            >
              <p
                className="text-sm text-center"
                style={{ color: COLORS.error }}
              >
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-full font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: COLORS.primary,
              color: 'white'
            }}
          >
            {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p style={{ color: COLORS.textLight }}>
            すでにアカウントをお持ちですか？{' '}
            <button
              onClick={handleLoginClick}
              className="font-medium hover:underline bg-transparent border-none cursor-pointer"
              style={{ color: COLORS.primary }}
            >
              LOGIN→
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}