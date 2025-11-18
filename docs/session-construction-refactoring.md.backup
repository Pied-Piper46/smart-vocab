# Session Construction Refactoring

## Overview
セッション構築ロジックのリファクタリング計画。`mastery.ts`の肥大化した責務を分離し、テスト駆動開発で再構築する。

---

# Issue 1: mastery.tsの責務過多

## Issue 内容
`mastery.ts`が複数の異なる責務を持っており、Single Responsibility Principleに違反している。

## 現状分析

**現在のmastery.ts（312行）に含まれる機能:**

1. **学習状態計算（本来の責務）**
   - `calculateMasteryStatus()` - 学習状態判定
   - `getRecommendedReviewInterval()` - 復習間隔計算
   - `calculateRecommendedReviewDate()` - 次回復習日計算

2. **セッション構築ロジック（分離すべき）**
   - `calculateWordPriority()` - 優先度計算
   - `getOptimalSessionComposition()` - セッション構成決定
   - `selectOptimalWords()` - 単語選択アルゴリズム

3. **日付ユーティリティ（分離すべき）**
   - `calculateDaysOverdue()` - 期限超過日数計算
   - `calculateDaysSinceReview()` - 最終復習からの日数計算

4. **統計・UI関連（分離すべき）**
   - `getReviewStatistics()` - ダッシュボード統計
   - `getMasteryDisplayInfo()` - UI表示情報

## アプローチ、提案方法

**提案: ドメイン別にファイルを分割**

```
src/lib/
  mastery.ts           # 学習状態計算のみ（~70行）
  session-builder.ts   # セッション構築ロジック（~200行）
  date-utils.ts        # 日付計算ユーティリティ（~40行）
  stats.ts             # 統計計算（~50行）
  mastery-display.ts   # UI表示情報（~30行）
```

**議論ポイント:**
- ファイル分割の粒度は適切か？
- session-builder.tsをさらに細分化すべきか？

---

# Issue 2: WordProgressDataインターフェースの不完全さ

## Issue 内容
`WordProgressData`インターフェースに`accuracy`フィールドがなく、毎回計算が必要。

## 現状分析

**現在の定義（mastery.ts:6-10）:**
```typescript
export interface WordProgressData {
  totalReviews: number;
  correctAnswers: number;
  streak: number;
}
```

**accuracyの計算箇所（重複）:**
- `calculateMasteryStatus()` - L30: `const accuracy = correctAnswers / totalReviews;`
- `calculateWordPriority()` - L103: `const accuracy = word.totalReviews > 0 ? word.correctAnswers / word.totalReviews : 0;`
- `selectOptimalWords()` - L217-218: 同様の計算

## アプローチ、提案方法

**決定: accuracyはDBに保存せず、必要時に計算する**

DBスキーマには`accuracy`フィールドは存在しない（totalReviewsとcorrectAnswersから算出可能）。
計算ロジックの重複を避けるためユーティリティ関数を作成：

```typescript
export function calculateAccuracy(totalReviews: number, correctAnswers: number): number {
  return totalReviews > 0 ? correctAnswers / totalReviews : 0;
}
```

- メリット: 単一責任、テストしやすい、データ整合性問題なし
- TypeScript型定義も現状維持（accuracyフィールドなし）

**議論ポイント:**
- ~~DBスキーマにaccuracyが存在するか？~~ → 存在しない（解決済み）
- 計算ロジックの一元化が重要

---

# Issue 3: getOptimalSessionCompositionのハードコード

## Issue 内容
セッションパターンと比率がハードコードされており、設定変更が困難。

## 現状分析

**現在の実装（mastery.ts:148-153）:**
```typescript
const patterns = {
  newFocused: { new: 0.60, learning: 0.10, reviewing: 0.10, mastered: 0.10 },
  balanced: { new: 0.50, learning: 0.20, reviewing: 0.10, mastered: 0.10 },
  reviewFocused: { new: 0.40, learning: 0.20, reviewing: 0.20, mastered: 0.10 }
};
```

**問題点:**
1. パターンの比率がmagic number
2. 合計が1.0にならない（0.90）- 残りはfillロジックで補完
3. テスト時に`Math.random()`の影響を受ける

## アプローチ、提案方法

**提案: 設定を外部化し、依存性注入を導入**

```typescript
// config/session-patterns.ts
export const SESSION_PATTERNS = {
  newFocused: { new: 6, learning: 1, reviewing: 1, mastered: 1 },
  balanced: { new: 5, learning: 2, reviewing: 1, mastered: 1 },
  reviewFocused: { new: 4, learning: 2, reviewing: 2, mastered: 1 }
} as const;

// session-builder.ts
export function getOptimalSessionComposition(
  available: StatusCounts,
  sessionSize: number = 10,
  patternSelector: () => PatternKey = randomPatternSelector
): Composition {
  // ...
}
```

**議論ポイント:**
- ~~比率(0.6)と固定数(6)のどちらが直感的か？~~ → セッションサイズ固定（10）なので重要ではない
- ~~ユーザーごとのパターン学習機能は必要か？~~ → 現時点では不要
- **ランダムスロット（0-3）の必要性** → 複雑性が増すため、削除も検討

---

# Issue 4: selectOptimalWordsの複雑さ

## Issue 内容
単語選択ロジックが複雑で、複数の責務が混在している。

## 現状分析

**現在の実装（mastery.ts:188-237）:**
1. カテゴリごとにループ
2. 優先度計算
3. ソート（優先度 → 精度 → ランダム）
4. スライス
5. 最終シャッフル

**問題点:**
- `Math.random()`が複数箇所で使用されテスト困難
- ソートロジックが複雑（3段階の基準）
- 50行の関数は長すぎる

## アプローチ、提案方法

**提案: 小さな関数に分割**

```typescript
// 1. 優先度計算（純粋関数）
export function sortByPriority<T extends WordProgressData>(words: T[]): T[] {
  return words.sort((a, b) => {
    const priorityDiff = calculateWordPriority(b) - calculateWordPriority(a);
    if (Math.abs(priorityDiff) > 0.1) return priorityDiff;

    const accuracyDiff = calculateAccuracy(a) - calculateAccuracy(b);
    if (Math.abs(accuracyDiff) > 0.1) return accuracyDiff;

    return 0; // 安定ソート
  });
}

// 2. ランダム性を注入可能に
export function selectOptimalWords<T>(
  categorizedWords: Record<MasteryStatus, T[]>,
  composition: Composition,
  shuffler: <U>(arr: U[]) => U[] = defaultShuffler
): T[] {
  // ...
}
```

**議論ポイント:**
- **ランダム性の必要性** → data-architecture-improvements.mdでは「Random Slots: 0-3」が提案されているが、複雑性を考慮して削除も検討
- ランダム性を削除する場合、テストが大幅に簡単になる
- 決定論的なロジックのみにすることで、予測可能性とデバッグ性が向上

---

# Issue 5: calculateWordPriorityのマジックナンバー

## Issue 内容
優先度計算に使用される係数がハードコードされている。

## 現状分析

**現在の実装（mastery.ts:107-125）:**
```typescript
// 1. Days overdue (most important)
priority += daysOverdue * 20;  // なぜ20？

// 2. Streak = 0 (recently failed) - high priority
if (word.streak === 0 && word.totalReviews >= 2) {
  priority += 50;  // なぜ50？
}

// 3. Low accuracy - needs more practice
if (word.totalReviews >= 4) {
  if (accuracy < 0.5) {
    priority += 30;  // なぜ30？
  } else if (accuracy < 0.7) {
    priority += 15;  // なぜ15？
  }
}

// 4. Days since last review
priority += daysSinceReview * 5;  // なぜ5？
```

## アプローチ、提案方法

**提案: 定数を名前付きで定義**

```typescript
// config/priority-weights.ts
export const PRIORITY_WEIGHTS = {
  DAYS_OVERDUE_MULTIPLIER: 20,
  FAILED_STREAK_BONUS: 50,
  LOW_ACCURACY_BONUS: {
    CRITICAL: 30,  // accuracy < 0.5
    WARNING: 15    // accuracy < 0.7
  },
  DAYS_SINCE_REVIEW_MULTIPLIER: 5,
  MIN_REVIEWS_FOR_STREAK_CHECK: 2,
  MIN_REVIEWS_FOR_ACCURACY_CHECK: 4,
  ACCURACY_THRESHOLDS: {
    CRITICAL: 0.5,
    WARNING: 0.7
  }
} as const;
```

**議論ポイント:**
- これらの係数の根拠は何か？（学習科学的根拠）
- 係数のチューニング機能は必要か？

---

# Issue 6: 日付計算のテスト困難性

## Issue 内容
`new Date()`を直接使用しているため、テストが困難。

## 現状分析

**問題のある実装:**
```typescript
// calculateRecommendedReviewDate (L63-68)
export function calculateRecommendedReviewDate(streak: number): Date {
  const interval = getRecommendedReviewInterval(streak);
  const date = new Date();  // テスト時に制御不能
  date.setDate(date.getDate() + interval);
  return date;
}

// calculateDaysOverdue (L73-78)
export function calculateDaysOverdue(recommendedReviewDate: Date): number {
  const now = new Date();  // テスト時に制御不能
  // ...
}
```

## アプローチ、提案方法

**提案: 現在時刻を注入可能に**

```typescript
export function calculateRecommendedReviewDate(
  streak: number,
  now: Date = new Date()
): Date {
  const interval = getRecommendedReviewInterval(streak);
  const date = new Date(now);
  date.setDate(date.getDate() + interval);
  return date;
}

export function calculateDaysOverdue(
  recommendedReviewDate: Date,
  now: Date = new Date()
): number {
  const timeDiff = now.getTime() - recommendedReviewDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff);
}
```

**テスト例:**
```typescript
it('should calculate days overdue correctly', () => {
  const reviewDate = new Date('2024-01-01');
  const now = new Date('2024-01-05');
  expect(calculateDaysOverdue(reviewDate, now)).toBe(4);
});
```

---

# Issue 7: getMasteryDisplayInfoの日本語ハードコード

## Issue 内容
UI表示文字列がハードコードされており、国際化に対応していない。

## 現状分析

**現在の実装（mastery.ts:280-311）:**
```typescript
case 'new':
  return {
    label: '新規',
    color: 'bg-blue-500/70',
    description: '初回学習'
  };
```

## アプローチ、提案方法

**提案: ロケールファイルに移動**

```typescript
// locales/ja.ts
export const ja = {
  mastery: {
    new: { label: '新規', description: '初回学習' },
    learning: { label: '学習中', description: '初期学習段階' },
    reviewing: { label: '復習中', description: '定着段階' },
    mastered: { label: '習得済', description: '習得完了' }
  }
};

// mastery-display.ts
export function getMasteryDisplayInfo(
  status: MasteryStatus,
  locale: Locale = ja
): DisplayInfo {
  const text = locale.mastery[status];
  return {
    ...text,
    color: MASTERY_COLORS[status]
  };
}
```

**議論ポイント:**
- 現時点で国際化は必要か？
- 将来的な拡張性を考慮すべきか？

---

# 新アルゴリズム設計（確定版）

## 概要

従来の複雑な優先度計算をセッション構築時に行う方式から、**推奨復習日を解答時に計算し、セッション構築時は推奨日順に取得するだけ**のシンプルな方式に変更。

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

各ステータスから必要数の3倍を推奨日順に取得：

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
// テストが簡単
it('should calculate review date based on streak and accuracy', () => {
  const date = calculateRecommendedReviewDate(2, 0.4, 5, 'reviewing');
  const expected = 7 * 0.7;  // 7日 × 0.7 = 4.9 → 4日
  expect(daysBetween(now, date)).toBe(4);
});
```

### 拡張性
- 推奨日計算ロジックのみを改善すればOK
- セッション構築は変更不要

## 重要な設計決定

### 1. new状態の単語について
- 出題された時点で`learning`状態に遷移
- `new`状態の単語は推奨日が全て同じ（デフォルト値）のため、ランダム選択する
- 実装: `ORDER BY RANDOM()` を使用してDBレベルでランダム化

### 2. ランダム性について
- ランダムスロット（0-3）は削除
- パターン選択はランダム
- 最終シャッフルあり
- 不足分補充は決定論的（推奨日順）
- **将来的にランダム性を追加する場合、該当部分のテストは省略可**

### 3. 候補取得の倍率
- 必要数の3倍を取得
- 不足時の補充に使用

---

# Issue 8: lastAnswerCorrectフィールドの冗長性

## Issue 内容
`WordProgress.lastAnswerCorrect`フィールドが冗長で、streakから判断可能。

## 現状分析

**現在のDBスキーマ（schema.prisma L108）:**
```prisma
model WordProgress {
  streak            Int      @default(0)
  lastAnswerCorrect Boolean  @default(false)  // 冗長
}
```

**冗長性の理由:**
- `streak > 0` → 最後の回答は正解
- `streak === 0` → 最後の回答は不正解（または未回答）

## アプローチ、提案方法

**決定: lastAnswerCorrectフィールドを削除**

```prisma
model WordProgress {
  streak            Int      @default(0)
  // lastAnswerCorrect を削除
}
```

**移行手順:**
1. スキーマからフィールド削除
2. `npx prisma db push`
3. 関連コードの修正（もしあれば）

---

# 実装計画

## Phase 1: 基盤整備（TDD環境は完了済み）
1. ~~Vitest環境セットアップ~~ ✅ 完了
2. 既存機能のテスト作成
3. リファクタリング安全性の確保

## Phase 2: ファイル分割（Issue 1対応）
1. `date-utils.ts` 作成（Issue 6も同時対応）
2. `mastery-display.ts` 作成
3. `stats.ts` 作成
4. `session-builder.ts` 作成
5. `mastery.ts` をコアロジックのみに削減

## Phase 3: データ構造改善（Issue 2対応）
1. `calculateAccuracy()` ユーティリティ関数作成
2. インターフェース統一

## Phase 4: 設定外部化（Issue 3, 5対応）
1. `config/session-patterns.ts` 作成
2. `config/priority-weights.ts` 作成
3. 定数の名前付け

## Phase 5: 複雑性削減（Issue 4対応）
1. `selectOptimalWords()` の分割
2. 依存性注入の導入
3. ランダム性の制御

## Phase 6: 国際化準備（Issue 7対応）
1. ロケールファイル構造の検討
2. 表示文字列の外部化

---

**次のステップ:**
各Issueについて優先度と実装順序を決定し、TDDサイクルで実装を開始する。
