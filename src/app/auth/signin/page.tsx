'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch {
      setError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-10 w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white/80 mb-4 smart-vocab-title">Smart Vocab</h1>
          <h2 className="text-2xl text-white/80 mb-2 font-bold">ログイン</h2>
          <p className="text-sm text-white/80">アカウントにサインインしてください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="glass-input w-full p-4 rounded-xl text-white mb-4"
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
            className="glass-light w-full py-4 rounded-xl text-white font-bold text-lg hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-white/70">
            アカウントをお持ちでないですか？{' '}
            <Link href="/auth/signup" className="text-blue-300 hover:text-blue-200 font-medium">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}