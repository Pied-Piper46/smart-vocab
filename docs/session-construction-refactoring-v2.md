# Session Construction Refactoring

## Overview
セッション構築ロジックのリファクタリング計画。`mastery.ts`の肥大化した責務を分離し、テスト駆動開発で再構築する。

従来の複雑な優先度計算をセッション構築時に行う方式から、**推奨復習日を解答時に計算し、セッション構築時は推奨日順に取得するだけ**のシンプルな方式に変更。

## 実装状況

✅ **Phase 1 完了**: 推奨復習日計算ロジックの実装
✅ **Phase 2 完了**: セッションパターン定義
✅ **Phase 3 完了**: セッション構築ロジックの実装
✅ **Phase 4 完了**: mastery.tsのリファクタリング
✅ **Phase 5 完了**: DBスキーマの更新
🚧 **Phase 6 進行中**: API統合（次のステップ）

**テスト状況**: 62テスト全てパス（date-utils: 15, mastery: 15, review-scheduler: 16, pattern-selector: 4, session-builder: 12）

---

# 新アルゴリズム設計（確定版）

## セッション構築アルゴリズム

### Step 1: パターン選択

5つのパターンからランダムに1つ選択（セッションサイズ固定10）：

```typescript
export const SESSION_PATTERNS = {
  newFocused: {
    new: 6,
    learning: 2,
    reviewing: 1,
    mastered: 1
  },
  balanced: {
    new: 5,
    learning: 3,
    reviewing: 1,
    mastered: 1
  },
  reviewFocused: {
    new: 3,
    learning: 3,
    reviewing: 3,
    mastered: 1
  },
  consolidationFocused: {
    new: 2,
    learning: 4,
    reviewing: 3,
    mastered: 1
  },
  masteryMaintenance: {
    new: 4,
    learning: 2,
    reviewing: 2,
    mastered: 2
  }
} as const;
```

### Step 2: 候補取得

各ステータスから必要数の3倍を取得：

```typescript
async function fetchCandidates(
  userId: string,
  status: MasteryStatus,
  count: number
): Promise<WordProgress[]> {
  // new状態はランダム、それ以外は推奨日順
  const orderBy = status === 'new'
    ? { createdAt: 'desc' as const }  // 新しい順（実質ランダム的）
    : { recommendedReviewDate: 'asc' as const };  // 期限が近い/切れている順

  return await prisma.wordProgress.findMany({
    where: { userId, status },
    orderBy,
    take: count * 3,  // 必要数の3倍
    include: { word: true }
  });
}
```

### Step 3: 必要数を選択

候補の中から推奨日が最も早いものを選択：

```typescript
const selected = {
  new: newCandidates.slice(0, pattern.new),
  learning: learningCandidates.slice(0, pattern.learning),
  reviewing: reviewingCandidates.slice(0, pattern.reviewing),
  mastered: masteredCandidates.slice(0, pattern.mastered)
};
```

### Step 4: 不足分を補充

候補プール（未選択単語）から推奨日順に補充：

```typescript
// 候補プール作成
const candidatePool = [
  ...newCandidates.slice(pattern.new),
  ...learningCandidates.slice(pattern.learning),
  ...reviewingCandidates.slice(pattern.reviewing),
  ...masteredCandidates.slice(pattern.mastered)
];

// 不足数計算
const totalSelected = selected.new.length + selected.learning.length +
                      selected.reviewing.length + selected.mastered.length;
const shortage = 10 - totalSelected;

// 推奨日順に補充
if (shortage > 0) {
  const fillers = candidatePool
    .sort((a, b) => a.recommendedReviewDate.getTime() - b.recommendedReviewDate.getTime())
    .slice(0, shortage);
  selectedWords.push(...fillers);
}
```

### Step 5: 最終シャッフル

```typescript
return shuffle(selectedWords);
```

---

## 推奨復習日計算ロジック

### アプローチ1: ベース間隔 × 調整係数（採用）

```typescript
function calculateRecommendedReviewDate(
  streak: number,
  accuracy: number,
  totalReviews: number,
  status: MasteryStatus
): Date {
  // Step 1: streakベースの基本間隔
  let baseInterval = getBaseInterval(streak);

  // Step 2: 学習段階による強制調整
  if (status === 'learning' && totalReviews <= 3) {
    baseInterval = Math.min(baseInterval, 3);  // 初期は最大3日
  }

  // Step 3: accuracy調整（±50%）
  let accuracyMultiplier = 1.0;
  if (totalReviews >= 4) {  // データが十分な場合のみ
    if (accuracy < 0.5) {
      accuracyMultiplier = 0.7;  // 30%短縮
    } else if (accuracy < 0.7) {
      accuracyMultiplier = 0.85;  // 15%短縮
    } else if (accuracy > 0.9) {
      accuracyMultiplier = 1.3;  // 30%延長
    }
  }

  // Step 4: totalReviews調整（学習が進むほど緩やか）
  let reviewsMultiplier = 1.0;
  if (totalReviews >= 10) {
    reviewsMultiplier = 1.2;  // 十分学習済み → 20%延長
  }

  // Step 5: 最終計算
  const finalInterval = Math.max(
    1,  // 最短1日
    Math.floor(baseInterval * accuracyMultiplier * reviewsMultiplier)
  );

  return addDays(new Date(), finalInterval);
}

function getBaseInterval(streak: number): number {
  if (streak === 0) return 1;   // 失敗 → 翌日
  if (streak === 1) return 3;   // 1回成功 → 3日後
  if (streak === 2) return 7;   // 2回成功 → 1週間後
  if (streak === 3) return 14;  // 3回成功 → 2週間後
  return 30;                     // 4回以上 → 1ヶ月後
}
```

**設定可能な係数:**
```typescript
// config/review-interval.ts
export const REVIEW_INTERVAL_CONFIG = {
  BASE_INTERVALS: [1, 3, 7, 14, 30],
  ACCURACY_MULTIPLIERS: {
    CRITICAL: 0.7,   // accuracy < 0.5
    LOW: 0.85,       // accuracy < 0.7
    HIGH: 1.3,       // accuracy > 0.9
  },
  ACCURACY_THRESHOLDS: {
    CRITICAL: 0.5,
    LOW: 0.7,
    HIGH: 0.9,
  },
  REVIEWS_THRESHOLD: 10,
  REVIEWS_MULTIPLIER: 1.2,
  LEARNING_MAX_INTERVAL: 3,  // learning段階の最大間隔
  MIN_INTERVAL: 1,
} as const;
```

### アプローチ2: 重み付き線形モデル（参考）

```typescript
function calculateRecommendedReviewDate(
  streak: number,
  accuracy: number,
  totalReviews: number
): Date {
  const WEIGHTS = {
    STREAK_BASE: [1, 3, 7, 14, 30],
    ACCURACY_LOW: -2,    // accuracy < 0.5 → -2日
    ACCURACY_HIGH: +3,   // accuracy > 0.9 → +3日
    REVIEWS_BONUS: 0.5,  // totalReviews 10以上 → +0.5日/10reviews
  };

  let days = WEIGHTS.STREAK_BASE[Math.min(streak, 4)];

  if (totalReviews >= 4) {
    if (accuracy < 0.5) days += WEIGHTS.ACCURACY_LOW;
    else if (accuracy > 0.9) days += WEIGHTS.ACCURACY_HIGH;
  }

  if (totalReviews >= 10) {
    days += Math.floor(totalReviews / 10) * WEIGHTS.REVIEWS_BONUS;
  }

  return addDays(new Date(), Math.max(1, Math.floor(days)));
}
```

**注:** アプローチ2は将来的な調整の選択肢として記録。初期実装はアプローチ1を採用。

---

## 新アルゴリズムのメリット

### パフォーマンス向上
```typescript
// 旧: O(n log n) ソート + 複雑な優先度計算
candidates.map(calculatePriority).sort().slice()

// 新: O(1) インデックススキャン
ORDER BY recommendedReviewDate LIMIT 10
```

### コードの単純化
- 優先度計算のマジックナンバー（20, 50, 30...）が不要
- セッション構築ロジックが明確
- Phase 1-3の複雑な候補収集が不要

### テスト容易性
```typescript
it('should calculate review date based on streak and accuracy', () => {
  const date = calculateRecommendedReviewDate(2, 0.4, 5, 'reviewing');
  const expected = 7 * 0.7;  // 7日 × 0.7 = 4.9 → 4日
  expect(daysBetween(now, date)).toBe(4);
});
```

### 拡張性
- 推奨日計算ロジックのみを改善すればOK
- セッション構築は変更不要

---

## 重要な設計決定

### 1. new状態の単語について
- 出題された時点で`learning`状態に遷移
- `new`状態の単語は推奨日が全て同じ（デフォルト値）のため、ランダム選択する
- 実装: `ORDER BY createdAt DESC` または PostgreSQLの `ORDER BY RANDOM()` を使用

### 2. ランダム性について
- ランダムスロット（0-3）は削除
- パターン選択はランダム
- new状態の単語選択はランダム
- 最終シャッフルあり
- 不足分補充は決定論的（推奨日順）
- **将来的にランダム性を追加する場合、該当部分のテストは省略可**

### 3. 候補取得の倍率
- 必要数の3倍を取得
- 不足時の補充に使用

---

# 実装計画

## ✅ Phase 1: 推奨復習日計算ロジックの実装（完了）

### 実装内容
- ✅ `src/lib/date-utils.ts` - 日付ユーティリティ関数
  - `addDays(date, days)` - 日付加算（不変）
  - `daysBetween(date1, date2)` - 日数差計算
  - `calculateDaysOverdue(reviewDate, now?)` - 期限超過日数計算
  - 15テストケース（うるう年、月境界、不変性など）

- ✅ `src/config/review-interval.ts` - 調整可能な係数設定
  - BASE_INTERVALS: `[1, 3, 7, 14, 30]`
  - ACCURACY_MULTIPLIERS: critical 0.7, low 0.85, high 1.3
  - REVIEWS_MULTIPLIER: 1.2 (10回以上で延長)
  - LEARNING_MAX_INTERVAL: 3日（初期学習段階の上限）

- ✅ `src/lib/review-scheduler.ts` - 推奨復習日計算
  - `calculateRecommendedReviewDate(streak, accuracy, totalReviews, status, now?)`
  - `getBaseInterval(streak)` - streakベースの基本間隔
  - 16テストケース（全調整パターン網羅）

- ✅ `src/lib/mastery.ts` - accuracy計算追加
  - `calculateAccuracy(totalReviews, correctAnswers)` - 正答率計算
  - 5テストケース

**コミット**: `[Phase 1] Implement recommended review date calculation logic`

---

## ✅ Phase 2: セッションパターン定義（完了）

### 実装内容
- ✅ `src/config/session-patterns.ts` - 5つのセッションパターン定義
  - `SESSION_PATTERNS`: newFocused, balanced, reviewFocused, consolidationFocused, masteryMaintenance
  - `SESSION_SIZE = 10`, `CANDIDATE_MULTIPLIER = 3`
  - TypeScript型定義（SessionPattern, PatternName）

- ✅ `src/lib/pattern-selector.ts` - パターン選択ロジック
  - `selectRandomPattern()` - ランダムにパターンを選択
  - `selectPattern(name)` - 決定論的にパターンを選択
  - 4テストケース（ランダム性、有効性検証）

**コミット**: `[Phase 2] Implement session pattern configuration and selection`

---

## ✅ Phase 3: セッション構築ロジックの実装（完了）

### 実装内容
- ✅ `src/lib/session-builder.ts` - セッション構築関数群
  - `getCandidateQuerySpecs(pattern)` - DB クエリ仕様定義
    - new: `ORDER BY createdAt DESC` (ランダム的)
    - learning/reviewing/mastered: `ORDER BY recommendedReviewDate ASC` (優先度順)
  - `buildSession(pattern, candidates)` - セッション構築メイン関数
    - パターンに従って単語選択
    - 最終シャッフルで多様性確保
  - `selectWordsFromCategory(words, count)` - カテゴリから N 個選択
  - 12テストケース（構成、不足処理、エッジケース）

**設計特徴**:
- Pure function設計（DBアクセスはAPI層で実施）
- 候補が不足時は graceful degradation

**コミット**: `[Phase 3] Implement session builder logic`

---

## ✅ Phase 4: mastery.tsのリファクタリング（完了）

### 削除した旧関数
- ❌ `getRecommendedReviewInterval()` → review-scheduler.ts の `getBaseInterval()` に置き換え
- ❌ `calculateRecommendedReviewDate()` → review-scheduler.ts の同名関数に置き換え
- ❌ `calculateWordPriority()` → 不要（推奨日ソートで代替）
- ❌ `getOptimalSessionComposition()` → session-patterns.ts に置き換え
- ❌ `selectOptimalWords()` → session-builder.ts に置き換え
- ❌ `calculateDaysSinceReview()` → 未使用のため削除

### 移動した関数
- 📦 `calculateDaysOverdue()` → date-utils.ts へ移動（再利用性向上）

### 残存関数（コアロジックのみ）
- ✅ `calculateMasteryStatus()` - 学習状態判定
- ✅ `calculateAccuracy()` - 正答率計算（新規追加）
- ✅ `getReviewStatistics()` - 統計情報（calculateDaysOverdueをimport）
- ✅ `getMasteryDisplayInfo()` - UI表示情報

### テスト更新
- mastery.test.ts: `getRecommendedReviewInterval` → `getBaseInterval` (from review-scheduler)
- date-utils.test.ts: `calculateDaysOverdue` の4テスト追加

**コミット**: `[Phase 4] Refactor mastery.ts - remove deprecated functions`

---

## ✅ Phase 5: DBスキーマの更新（完了）

### 実装内容
- ✅ `prisma/schema.prisma` - `lastAnswerCorrect` フィールド削除
  - 理由: streakから導出可能（streak > 0 なら最後は正解）
  - `npx prisma db push` でDB反映完了

### コード修正
- ✅ `src/types/index.ts` - WordProgress型から削除
- ✅ `src/lib/api-client.ts` - WordProgress型から削除
- ✅ `src/lib/progress-utils.ts` - 返り値から削除
- ✅ `src/app/api/words/session/route.ts` - 型定義と返却データから削除
- ✅ `src/app/api/progress/route.ts` - update dataから削除
- ✅ `src/app/api/sessions/complete/route.ts` - create/update dataから削除

**コミット**: `[Phase 5] Remove lastAnswerCorrect field from schema and codebase`

---

## 🚧 Phase 6: API統合（進行中）

### 6-1. セッション構築APIの更新
**場所:** `src/app/api/words/session/route.ts`

**現状の問題:**
- ❌ 旧関数を使用: `getOptimalSessionComposition()`, `selectOptimalWords()`
- ❌ 複雑な優先度計算ロジック（O(n log n)）

**必要な変更:**
```typescript
// 旧実装（削除予定）
const composition = getOptimalSessionComposition(available, limit);
const selectedWords = selectOptimalWords(categorizedWords, composition);

// ↓

// 新実装
import { selectRandomPattern } from '@/lib/pattern-selector';
import { buildSession, getCandidateQuerySpecs } from '@/lib/session-builder';

const pattern = selectRandomPattern();
const specs = getCandidateQuerySpecs(pattern);

// 各ステータスから候補を取得
const candidates = {
  new: await prisma.wordProgress.findMany({
    where: { userId, status: 'new' },
    orderBy: specs.new.orderBy,
    take: specs.new.count,
    include: { word: true }
  }),
  // learning, reviewing, mastered も同様...
};

// セッション構築
const session = buildSession(pattern, candidates);
```

### 6-2. 解答処理APIの更新（sessions/complete, progress）
**場所:**
- `src/app/api/sessions/complete/route.ts`
- `src/app/api/progress/route.ts`

**現状の問題:**
- ❌ 旧SM-2アルゴリズム使用（easeFactor, interval, repetitionsなど）
- ❌ 推奨復習日計算が旧方式

**必要な変更:**
```typescript
// 旧実装（削除予定）
const newEaseFactor = calculateEaseFactor(...);
const newInterval = calculateInterval(...);
const newRepetitions = ...;

// ↓

// 新実装
import { calculateRecommendedReviewDate } from '@/lib/review-scheduler';
import { calculateAccuracy, calculateMasteryStatus } from '@/lib/mastery';

const newStreak = answer.isCorrect ? progress.streak + 1 : 0;
const newCorrectAnswers = progress.correctAnswers + (answer.isCorrect ? 1 : 0);
const newTotalReviews = progress.totalReviews + 1;

const accuracy = calculateAccuracy(newTotalReviews, newCorrectAnswers);
const newStatus = calculateMasteryStatus({
  totalReviews: newTotalReviews,
  correctAnswers: newCorrectAnswers,
  streak: newStreak
});

const recommendedReviewDate = calculateRecommendedReviewDate(
  newStreak,
  accuracy,
  newTotalReviews,
  newStatus
);

await prisma.wordProgress.update({
  where: { userId_wordId: { userId, wordId } },
  data: {
    streak: newStreak,
    correctAnswers: newCorrectAnswers,
    totalReviews: newTotalReviews,
    status: newStatus,
    recommendedReviewDate,  // ← 新アルゴリズムで計算
    lastReviewedAt: new Date()
  }
});
```

### 6-3. 不要なフィールド削除
**削除対象:**
- ❌ `easeFactor` (SM-2専用)
- ❌ `interval` (SM-2専用)
- ❌ `repetitions` (SM-2専用)
- ❌ `nextReviewDate` → `recommendedReviewDate` に統一済み

**注意:** これらのフィールドがDBスキーマに存在する場合、マイグレーション必要

---

## Phase 7: テスト実行とデバッグ

### 7-1. ユニットテスト
```bash
npm run test:run
```

### 7-2. 統合テスト
- 実際にセッション構築
- 推奨日計算の確認
- パフォーマンス測定

### 7-3. 係数調整
- 実際の使用感に基づいて係数を調整
- `REVIEW_INTERVAL_CONFIG` の値を変更

---

## Phase 8: クリーンアップ

### 8-1. 不要なファイル削除
- 旧実装のバックアップ削除

### 8-2. ドキュメント更新
- README更新
- CLAUDE.md更新

### 8-3. コミット
```bash
git add .
# TDDサイクルに従って適切なタイミングでコミット
```

---

# 旧Issue分析（参考資料）

<details>
<summary>Issue 1-8の詳細分析（クリックで展開）</summary>

## Issue 1: mastery.tsの責務過多
[元の内容を保持]

## Issue 2: WordProgressDataインターフェースの不完全さ
[元の内容を保持]

... (Issue 3-8も同様)

</details>

---

# 実装サマリー

## 完了した作業（Phase 1-5）

### 作成ファイル
1. **`src/lib/date-utils.ts`** (15 tests) - 日付計算ユーティリティ
2. **`src/config/review-interval.ts`** - 調整可能な復習間隔係数
3. **`src/lib/review-scheduler.ts`** (16 tests) - 推奨復習日計算ロジック
4. **`src/config/session-patterns.ts`** - 5つのセッションパターン定義
5. **`src/lib/pattern-selector.ts`** (4 tests) - パターン選択ロジック
6. **`src/lib/session-builder.ts`** (12 tests) - セッション構築ロジック

### 変更ファイル
1. **`src/lib/mastery.ts`** - 旧関数削除、calculateAccuracy追加 (15 tests)
2. **`prisma/schema.prisma`** - lastAnswerCorrect削除
3. **`src/types/index.ts`** - WordProgress型更新
4. **`src/lib/api-client.ts`** - WordProgress型更新
5. **`src/lib/progress-utils.ts`** - lastAnswerCorrect削除
6. **API routes** - lastAnswerCorrect削除（session, progress, sessions/complete）

### テスト状況
- **総テスト数**: 62 tests
- **パス率**: 100%
- **カバレッジ**: date-utils (15), mastery (15), review-scheduler (16), pattern-selector (4), session-builder (12)

### Git コミット履歴
1. `[Phase 1] Implement recommended review date calculation logic`
2. `[Phase 2] Implement session pattern configuration and selection`
3. `[Phase 3] Implement session builder logic`
4. `[Phase 4] Refactor mastery.ts - remove deprecated functions`
5. `[Phase 5] Remove lastAnswerCorrect field from schema and codebase`

## 次のステップ: Phase 6 - API統合

**優先順位:**
1. セッション構築API更新 (`/api/words/session`)
2. 解答処理API更新 (`/api/sessions/complete`, `/api/progress`)
3. 旧SM-2フィールド削除（easeFactor, interval, repetitions）

**推定作業時間:** 2-3時間（TDDサイクル含む）

---

**現在の状態:** Phase 1-5完了、Phase 6準備完了
