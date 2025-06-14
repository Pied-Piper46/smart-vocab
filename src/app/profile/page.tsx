'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Settings, Target, Clock, BookOpen, ArrowLeft, Save, Lock } from 'lucide-react';
import { changePassword } from '@/lib/api-client';

interface UserProfile {
  name: string;
  email: string;
  dailyGoal: number;
  sessionDuration: number;
  preferredLanguage: string;
  totalWordsLearned: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Fetch user profile
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('プロフィールの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      setIsSaving(true);
      setError('');
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
          dailyGoal: profile.dailyGoal,
          sessionDuration: profile.sessionDuration,
          preferredLanguage: profile.preferredLanguage,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsEditing(false);
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string | number) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError('すべてのフィールドを入力してください');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('パスワードは8文字以上である必要があります');
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError('');
      setPasswordSuccess('');

      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      setPasswordSuccess('パスワードが正常に変更されました');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'パスワードの変更に失敗しました';
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  // Show loading while checking authentication or fetching data
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="glass-strong rounded-3xl p-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="glass-button p-3 rounded-xl text-white hover:scale-101 transition-all duration-300"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-white">プロフィール設定</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <div className="glass-strong rounded-3xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 glass-light rounded-xl">
                    <User className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">基本情報</h2>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="glass-button px-4 py-2 rounded-xl text-white font-medium hover:scale-101 transition-all duration-300"
                >
                  <Settings size={16} className="mr-2" />
                  {isEditing ? 'キャンセル' : '編集'}
                </button>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    お名前
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
                    />
                  ) : (
                    <div className="glass rounded-xl p-4 text-white">{profile.name}</div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    メールアドレス
                  </label>
                  <div className="glass rounded-xl p-4 text-white/70">{profile.email}</div>
                  <p className="text-xs text-white/50 mt-1">メールアドレスは変更できません</p>
                </div>

                {/* Daily Goal */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    1日の学習目標（単語数）
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={profile.dailyGoal}
                      onChange={(e) => handleInputChange('dailyGoal', parseInt(e.target.value))}
                      className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
                    />
                  ) : (
                    <div className="glass rounded-xl p-4 text-white">{profile.dailyGoal}語</div>
                  )}
                </div>

                {/* Session Duration */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    セッション時間（分）
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.sessionDuration}
                      onChange={(e) => handleInputChange('sessionDuration', parseInt(e.target.value))}
                      className="glass-input w-full p-4 rounded-xl text-white"
                    >
                      <option value={5}>5分</option>
                      <option value={10}>10分</option>
                      <option value={15}>15分</option>
                      <option value={20}>20分</option>
                      <option value={30}>30分</option>
                    </select>
                  ) : (
                    <div className="glass rounded-xl p-4 text-white">{profile.sessionDuration}分</div>
                  )}
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    インターフェース言語
                  </label>
                  {isEditing ? (
                    <select
                      value={profile.preferredLanguage}
                      onChange={(e) => handleInputChange('preferredLanguage', e.target.value)}
                      className="glass-input w-full p-4 rounded-xl text-white"
                    >
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                    </select>
                  ) : (
                    <div className="glass rounded-xl p-4 text-white">
                      {profile.preferredLanguage === 'ja' ? '日本語' : 'English'}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="glass rounded-xl p-4 border-red-500/30">
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                {isEditing && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="glass-button w-full py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300 disabled:opacity-50"
                  >
                    <Save size={20} className="mr-2" />
                    {isSaving ? '保存中...' : '変更を保存'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="glass-strong rounded-3xl p-8 mb-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 glass-light rounded-xl">
                <Lock className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">パスワード変更</h2>
            </div>

            <div className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  現在のパスワード
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                  className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
                  placeholder="現在のパスワードを入力"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                  className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
                  placeholder="新しいパスワードを入力（8文字以上）"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  パスワード確認
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                  className="glass-input w-full p-4 rounded-xl text-white placeholder-white/50"
                  placeholder="新しいパスワードを再入力"
                />
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="glass rounded-xl p-4 border-red-500/30">
                  <p className="text-red-200 text-sm">{passwordError}</p>
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div className="glass rounded-xl p-4 border-green-500/30">
                  <p className="text-green-200 text-sm">{passwordSuccess}</p>
                </div>
              )}

              {/* Change Password Button */}
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="glass-button w-full py-4 rounded-xl text-white font-bold text-lg hover:scale-101 transition-all duration-300 disabled:opacity-50"
              >
                <Lock size={20} className="mr-2" />
                {isChangingPassword ? 'パスワード変更中...' : 'パスワードを変更'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            {/* Learning Stats */}
            <div className="glass-strong rounded-3xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">学習統計</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 glass-light rounded-xl">
                    <BookOpen className="text-blue-300" size={20} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">学習した単語数</p>
                    <p className="text-white font-bold text-lg">{profile.totalWordsLearned}語</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 glass-light rounded-xl">
                    <Target className="text-green-300" size={20} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">現在の連続日数</p>
                    <p className="text-white font-bold text-lg">{profile.currentStreak}日</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 glass-light rounded-xl">
                    <Target className="text-yellow-300" size={20} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">最長連続日数</p>
                    <p className="text-white font-bold text-lg">{profile.longestStreak}日</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 glass-light rounded-xl">
                    <Clock className="text-purple-300" size={20} />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">総学習時間</p>
                    <p className="text-white font-bold text-lg">{Math.floor(profile.totalStudyTime / 60)}時間{profile.totalStudyTime % 60}分</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}