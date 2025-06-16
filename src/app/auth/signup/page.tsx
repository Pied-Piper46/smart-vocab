'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4 smart-vocab-title">Smart Vocab</h1>
          <h2 className="text-2xl text-white mb-2 font-bold">新規登録</h2>
          <p className="text-sm text-white/80">新しいアカウントを作成して下さい</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              お名前
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
              placeholder="山田太郎"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
              placeholder="8文字以上、英字と数字を含む"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
              パスワード確認
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50 mb-4"
            />
          </div>

          {error && (
            <div className="glass rounded-xl p-4 border-red-500/30">
              <p className="text-red-200 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="glass-button w-full py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-white/70">
            すでにアカウントをお持ちですか？{' '}
            <button 
              onClick={handleLoginClick}
              className="text-blue-300 hover:text-blue-200 font-medium underline bg-transparent border-none cursor-pointer"
            >
              ログイン
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}