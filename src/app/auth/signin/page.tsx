'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COLORS } from '@/styles/colors';
import { loadSession, clearSession } from '@/lib/session-storage';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error parameter in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'account_not_found') {
      setError('アカウントが見つかりません。再度ログインしてください。');
    }
  }, [searchParams]);

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
        // Check if there's a migrated session from signup
        const migratedSession = loadSession(true); // Load from authenticated key

        if (migratedSession && migratedSession.answers.length > 0) {
          console.log('✅ Found migrated session, saving to server...');

          try {
            // Save the migrated session to the server
            const saveResponse = await fetch('/api/sessions/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wordsStudied: migratedSession.stats.wordsStudied,
                answers: migratedSession.answers,
              }),
            });

            if (saveResponse.ok) {
              console.log('✅ Migrated session saved successfully');
              clearSession(true); // Clear the migrated session
              router.push('/dashboard?migrated=true');
            } else {
              console.error('❌ Failed to save migrated session');
              router.push('/dashboard');
            }
          } catch (error) {
            console.error('❌ Error saving migrated session:', error);
            router.push('/dashboard');
          }
        } else {
          // No migrated session, proceed normally
          router.push('/dashboard');
        }
      }
    } catch {
      setError('ログインに失敗しました');
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
            LOGIN
          </h2>
          <p
            className="text-sm"
            style={{ color: COLORS.textLight }}
          >
            アカウントにログインしてください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p style={{ color: COLORS.textLight }}>
            アカウントをお持ちでないですか？{' '}
            <Link
              href="/auth/signup"
              className="font-medium hover:underline"
              style={{ color: COLORS.primary }}
            >
              SIGNUP→
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/80">Loading...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}