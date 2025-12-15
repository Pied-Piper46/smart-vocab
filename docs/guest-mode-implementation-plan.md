# Guest Mode Implementation Plan

**作成日**: 2025-12-15
**ステータス**: 設計完了、実装準備中

## 目次

1. [概要](#概要)
2. [背景と目的](#背景と目的)
3. [アーキテクチャ設計](#アーキテクチャ設計)
4. [実装仕様](#実装仕様)
5. [実装フェーズ](#実装フェーズ)
6. [セキュリティ考慮事項](#セキュリティ考慮事項)
7. [今後の検討事項](#今後の検討事項)

---

## 概要

ログインなしでアプリケーションを体験できるゲストモードを実装し、ユーザーのコンバージョン（会員登録）を促進する。

### 主要な変更点

- ✅ ルート `/` からのアクセス時、`/dashboard` にリダイレクト
- ✅ ログイン不要でセッション学習が可能
- ✅ ゲストモードでは進捗保存なし（localStorage のみ）
- ✅ 認証済みユーザーは従来通り進捗管理が可能
- ✅ ゲスト→登録時のシームレスなデータ移行

---

## 背景と目的

### 現状の課題

1. 新規ユーザーが登録前にアプリを体験できない
2. LP（ランディングページ）が古いデザインで魅力に欠ける
3. コンバージョン率が不明確

### 目的

1. **ユーザー体験の向上**: 登録前に学習機能を体験可能にする
2. **コンバージョン最適化**: セッション完了後に登録を促進
3. **アーキテクチャ整理**: 認証状態に応じた明確な処理フロー

---

## アーキテクチャ設計

### ユーザー状態の分類

```
ユーザー状態 = Guest | Authenticated

Guest (ゲスト)
  - アカウントなし
  - ログインなし
  - localStorage のみ使用

Authenticated (認証済み)
  - アカウントあり
  - ログイン状態
  - データベース + localStorage 使用
```

**重要**: `Signed Out`（登録済み未ログイン）は `Guest` と同じ扱い

### 機能アクセス制御

| 機能 | Guest | Authenticated |
|------|-------|---------------|
| セッション学習 | ✅ 可能 | ✅ 可能 |
| 進捗保存 | ❌ 不可 | ✅ 可能 |
| 学習履歴閲覧 | ❌ 不可（ログインプロンプト表示） | ✅ 可能 |
| 習得状況管理 | ❌ 不可（ログインプロンプト表示） | ✅ 可能 |
| セッション回数 | ♾️ 無制限 | ♾️ 無制限 |
| 途中再開 | ❌ 不可 | ✅ 可能 |

**重要**: セッション回数制限は設けない（学習体験を妨げない）

### ルーティング設計

```
/ (root)
  └─> /dashboard にリダイレクト（認証状態に関わらず）

/dashboard
  ├─ Guest → ゲストモードUI（バナー表示）
  └─ Authenticated → 通常UI

/session
  ├─ Guest → 学習可能（進捗保存なし、途中再開不可）
  └─ Authenticated → 学習可能（進捗保存あり、途中再開可能）

/progress
  ├─ Guest → ログインプロンプト（インラインモーダル）
  └─ Authenticated → 進捗データ表示

/auth/signin, /auth/signup
  └─ 常にアクセス可能
```

---

## 実装仕様

### 1. セッションストレージ戦略

#### localStorage キー設計

```typescript
// 認証済みユーザー
const AUTH_SESSION_KEY = 'smart-vocab-session-resume';

// ゲストユーザー
const GUEST_SESSION_KEY = 'smart-vocab-guest-session';

// 保存内容（既存の SavedSession 型を使用）
interface SavedSession {
  sessionId: string;
  startedAt: string;
  words: WordData[];
  currentWordIndex: number;
  answers: SessionAnswer[];
  stats: {
    wordsStudied: number;
    wordsCorrect: number;
  };
}
```

#### セッションライフサイクル

**認証済みユーザー**

```
1. セッション開始
   └─> localStorage に保存（AUTH_SESSION_KEY）

2. セッション進行
   └─> 回答ごとに更新

3. 中断
   └─> localStorage 保持（次回再開可能）

4. 完了
   └─> サーバーに保存 → localStorage 削除
```

**ゲストユーザー**

```
1. セッション開始
   ├─ 前回の保存セッションあり → 破棄
   └─> 新規セッションを localStorage に保存（GUEST_SESSION_KEY）

2. セッション進行
   └─> 回答ごとに更新

3. 中断
   ├─ 警告ダイアログ表示（途中再開不可の旨）
   └─> localStorage 破棄 → Dashboard へ

4. 完了
   └─> localStorage 保持（登録促進のため）

5. 登録完了後
   └─> localStorage → サーバー保存 → localStorage 削除
```

### 2. UI/UX 設計

#### Dashboard のゲストモードUI

```tsx
// ゲストバナー（上部に表示）
<GuestModeBanner>
  ⚠️ ゲストモードで学習中（学習データは保存されません）
  [登録して保存]
</GuestModeBanner>

// ウェルカムメッセージ
おかえりなさい、ゲストさん

// セッション開始ボタン（両方アクセス可）
[セッションを始める]
```

#### Progress ページのログインプロンプト

```tsx
<LoginPromptOverlay>
  進捗を確認するにはログインが必要です

  ゲストモードでは学習データが保存されません。
  アカウントを作成して進捗を記録しましょう。

  [ログイン] [新規登録]

  ← ゲストとして学習を続ける
</LoginPromptOverlay>
```

#### ExitConfirmationDialog の変更

**認証済み**
```
セッションを中断しますか？

中断した単語から再開することが可能です

[継続] [中断]
```

**ゲスト**
```
セッションを中断しますか？

⚠️ ゲストモードでは途中再開できません
セッションを完了すると、登録して進捗を保存できます

[継続] [中断]
```

### 3. データ移行フロー

#### ゲスト → 新規登録 → ログイン

```typescript
// 1. 新規登録時（signup/page.tsx）
const handleSubmit = async () => {
  // アカウント作成
  await fetch('/api/auth/register', { ... });

  // ✨ localStorage のゲストセッションを認証キーに移行
  await migrateGuestSession();

  // ログインページへ
  router.push('/auth/signin');
};

// 2. ログイン時（signin/page.tsx）
const handleSubmit = async () => {
  // 認証
  const result = await signIn('credentials', { ... });

  if (result?.ok) {
    // ✨ 移行済みセッションがあればサーバーに保存
    const session = loadSession(true); // 認証キー

    if (session && session.answers.length > 0) {
      await recordSessionCompletion(
        session.stats.wordsStudied,
        session.answers
      );
      clearSession(true);
    }

    router.push('/dashboard?migrated=true');
  }
};
```

### 4. API 変更

#### セッション取得 API

```typescript
// GET /api/words/session

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // ✨ ゲスト: ランダムな単語を返す（進捗なし）
    const randomWords = await db.word.findMany({
      take: 10,
      orderBy: { id: 'asc' }, // または random()
    });

    return NextResponse.json({
      success: true,
      data: randomWords.map(w => ({ ...w, progress: null }))
    });
  }

  // 認証済み: 既存のロジック（進捗ベース）
  // ...
}
```

#### セッション完了 API

```typescript
// POST /api/sessions/complete

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // ✨ ゲスト: 401 エラー（フロントエンドで呼ばない想定）
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 認証済み: 既存のロジック
  // ...
}
```

---

## 実装フェーズ

### Phase 1: 基盤整備（1-2日） ✅ 完了

**目標**: セッションストレージのゲスト対応

- [x] `src/lib/session-storage.ts` 作成
  - [x] `session-resume.ts` をリネーム・拡張
  - [x] `isAuthenticated` パラメータ追加
  - [x] `migrateGuestSession()` 実装
  - [x] `discardGuestSessionIfNeeded()` 実装
- [x] SessionManager のゲスト対応
  - [x] `useSession()` フック追加
  - [x] `isAuthenticated` 判定ロジック
  - [x] セッション完了時の処理分岐（認証済み: DB保存、ゲスト: localStorage保持）
  - [x] セッション開始時のゲストセッション破棄処理
  - [x] 全ての localStorage 操作に `isAuthenticated` を渡す
- [x] ExitConfirmationDialog の変更
  - [x] `isAuthenticated` prop 追加
  - [x] ゲスト用警告メッセージ表示
- [ ] API のゲスト対応（Phase 2以降に実装）
  - [ ] `/api/words/session` でゲスト用単語取得
  - [ ] Middleware での認証チェック強化

**成果物**:
- ✅ ゲスト/認証済み両方でセッション学習が可能（localStorage ベース）
- ✅ データ保存は認証済みのみ（DB保存）
- ✅ ゲストは途中再開不可（UI で明示）

**実装ファイル**:
- `src/lib/session-storage.ts` - 認証状態に応じた localStorage 管理
- `src/components/learning/SessionManager.tsx` - ゲスト対応ロジック
- `src/components/learning/ExitConfirmationDialog.tsx` - ゲスト用メッセージ

---

### Phase 2: UI実装（2-3日） ✅ 完了

**目標**: ユーザーに認証状態を明示

- [x] Dashboard のゲストUI
  - [x] `GuestModeBanner` コンポーネント作成
  - [x] ゲスト時のウェルカムメッセージ変更（`おかえりなさい、ゲストさん`）
  - [x] セッション進捗チェックマークを認証済みのみ表示
  - [x] ゲスト時にセッション破棄処理（新規セッション開始前）
- [x] Progress ページ
  - [x] `LoginPromptOverlay` コンポーネント作成
  - [x] ゲスト時は即座に表示（ログイン/登録/学習継続の選択肢）
- [x] ExitConfirmationDialog
  - [x] `isAuthenticated` prop 追加
  - [x] ゲスト用メッセージ表示（Phase 1 で完了）
- [ ] SessionFeedback（Phase 3以降に実装）
  - [ ] ゲスト完了時の登録促進CTA追加

**成果物**:
- ✅ ゲストモードが視覚的に明確（黄色バナー、ゲスト表示）
- ✅ 登録促進の導線が整備（Progress ページのログインプロンプト）
- ✅ 認証状態に応じた UI の出し分け完了

**実装ファイル**:
- `src/components/ui/GuestModeBanner.tsx` - ゲストモードバナーコンポーネント
- `src/app/dashboard/page.tsx` - ゲストモード対応UI（バナー、メッセージ、条件付きデータ取得）
- `src/app/progress/page.tsx` - LoginPromptOverlay 実装（ゲスト用インラインプロンプト）
- `src/lib/swr-config.ts` - SWRフック条件付きフェッチ対応（`shouldFetch` パラメータ追加）

---

### Phase 3: データ移行実装（1日） ✅ 完了

**目標**: シームレスな登録体験

- [x] 新規登録時の処理
  - [x] `migrateGuestSession()` 呼び出し（signup/page.tsx）
  - [x] エラーハンドリング（try-catch, 失敗時も正常フローへ）
- [x] ログイン時の処理
  - [x] 移行済みセッションのサーバー保存（signin/page.tsx）
  - [x] `/api/sessions/complete` へのPOST処理
  - [x] 成功後にlocalStorage削除とリダイレクト
- [x] Dashboard での移行完了通知
  - [x] クエリパラメータ `?migrated=true` のハンドリング
  - [x] 緑色の成功バナー表示（5秒間自動消去）
  - [x] Suspense境界でラップ（useSearchParams対応）

**成果物**:
- ✅ ゲスト→登録→ログイン時にデータが自動保存される
- ✅ ユーザー体験がスムーズ（移行完了の通知あり）
- ✅ エラー時も正常動作（フォールバック処理）

**実装ファイル**:
- `src/app/auth/signup/page.tsx` - ゲストセッション移行処理
- `src/app/auth/signin/page.tsx` - 移行済みセッションのサーバー保存
- `src/app/dashboard/page.tsx` - 移行成功通知とSuspense対応

---

### Phase 4: ルーティング変更（1日） ✅ 完了

**目標**: アプリの入り口を Dashboard に統一

- [x] ルートページ変更
  - [x] `/` → `/dashboard` リダイレクト実装（useEffect + router.push）
  - [x] 既存 LP コンテンツ削除（LoadingSpinner のみ表示）
- [x] ミドルウェア調整
  - [x] ミドルウェア不使用を確認（各ページで認証チェック実施）
  - [x] 認証不要ページ（/dashboard, /session）の動作確認
- [x] ビルドテスト
  - [x] 本番ビルド成功確認
  - [x] ルーティング設定の検証

**成果物**:
- ✅ すべてのユーザー（ゲスト/認証済み）が `/` アクセス時に `/dashboard` へリダイレクト
- ✅ 古いLPページは削除（将来的に新LPを `/lp` で作成予定）
- ✅ シンプルなエントリーポイント（リダイレクト専用ページ）

**実装ファイル**:
- `src/app/page.tsx` - ルートページをダッシュボードリダイレクトに変更

---

### Phase 5: 最適化とテスト（1-2日）

**目標**: バグ修正とパフォーマンス改善

- [ ] エラーハンドリング強化
  - [ ] localStorage エラー時の fallback
  - [ ] API エラー時の UI フィードバック
- [ ] パフォーマンス
  - [ ] 不要な API コール削減
  - [ ] SWR キャッシュ最適化
- [ ] セキュリティ監査
  - [ ] 個人情報の localStorage 保存確認
  - [ ] API 認証チェック網羅確認
- [ ] テストケース作成
  - [ ] ゲストセッション完了
  - [ ] ゲスト→登録→ログイン
  - [ ] セッション中断（ゲスト/認証済み）

**成果物**:
- 安定したゲストモード機能
- 包括的なテストカバレッジ

---

## セキュリティ考慮事項

### 1. localStorage に保存可能なデータ

```typescript
// ✅ OK: 公開データのみ
- wordId (公開単語データ)
- answers (isCorrect, responseTime)
- stats (集計値)
- sessionId (ランダムUUID)

// ❌ NG: 個人情報は保存しない
- email, password, name
- userId
- 他のユーザーのデータ
```

### 2. バックエンド認証チェック

**原則**: フロントエンドの認証チェックは UX のためのみ。セキュリティはバックエンドで担保。

```typescript
// すべてのデータアクセス API
export async function GET/POST(req: Request) {
  const session = await getServerSession(authOptions);

  // 🔒 必須: 認証チェック
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // データアクセス
  const data = await db.userProgress.findMany({
    where: { userId: session.user.id } // 🔒 ユーザー自身のデータのみ
  });
}
```

### 3. レート制限

```typescript
// 将来的な実装（オプション）
const guestRateLimits = {
  sessionsPerIP: 10, // IP ごとの制限
  maxConcurrentGuests: 1000, // メモリ保護
};
```

---

## 今後の検討事項

### 短期（1-2週間以内）

- [ ] ゲストモードの分析
  - [ ] コンバージョン率計測
  - [ ] セッション完了率
  - [ ] 離脱ポイント分析
- [ ] UI/UX 改善
  - [ ] A/B テスト（登録促進メッセージ）
  - [ ] トースト通知の追加

### 中期（1-2ヶ月以内）

- [ ] 新 LP の作成
  - [ ] `/lp` ページの設計・実装
  - [ ] SEO 最適化
- [ ] ゲストデータの活用
  - [ ] 匿名データ分析（プライバシー配慮）
  - [ ] 学習パターン分析

### 長期（3ヶ月以降）

- [ ] ソーシャルログイン
  - [ ] Google, Apple ログイン
  - [ ] ゲストデータの自動移行
- [ ] オフライン対応
  - [ ] Service Worker
  - [ ] IndexedDB 活用

---

## 参考資料

### 既存ドキュメント

- `docs/session-completion-optimization-c-plan.md` - セッション完了処理の最適化
- `CLAUDE.md` - プロジェクト全体の開発ルール

### 外部リンク

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [SWR Documentation](https://swr.vercel.app/)
- [Web Storage API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-12-15 | 初版作成 | Claude |
| 2025-12-15 | Phase 1 完了（基盤整備） | Claude |
| 2025-12-15 | Phase 2 完了（UI実装） | Claude |
| 2025-12-15 | Phase 3 完了（データ移行実装） | Claude |
| 2025-12-15 | Phase 4 完了（ルーティング変更） | Claude |

---

**次のアクション**: Phase 5 の実装（最適化とテスト - オプション）または実装完了の確認
