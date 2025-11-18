# Session Construction Refactoring

## Overview
セッション構築ロジックのリファクタリング計画。`mastery.ts`の肥大化した責務を分離し、テスト駆動開発で再構築する。

従来の複雑な優先度計算をセッション構築時に行う方式から、**推奨復習日を解答時に計算し、セッション構築時は推奨日順に取得するだけ**のシンプルな方式に変更。

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

## Phase 1: 推奨復習日計算ロジックの実装

### 1-1. date-utils.ts の作成
**内容:**
- `addDays(date: Date, days: number): Date`
- `daysBetween(date1: Date, date2: Date): number`
- テスト作成（TDD）

### 1-2. config/review-interval.ts の作成
**内容:**
- `REVIEW_INTERVAL_CONFIG` 定数定義
- 係数の外部化

### 1-3. calculateRecommendedReviewDate() の実装
**場所:** `src/lib/mastery.ts` または新規 `src/lib/review-scheduler.ts`
**内容:**
- アプローチ1の実装
- `getBaseInterval()` 実装
- テスト作成（TDD）

**テストケース:**
- streakごとの基本間隔
- accuracy調整（低/高）
- totalReviews調整
- learning段階の強制調整
- 境界値テスト

### 1-4. calculateAccuracy() ユーティリティ
**内容:**
- `calculateAccuracy(totalReviews: number, correctAnswers: number): number`
- テスト作成

---

## Phase 2: セッションパターン定義

### 2-1. config/session-patterns.ts の作成
**内容:**
```typescript
export const SESSION_PATTERNS = {
  newFocused: { new: 6, learning: 2, reviewing: 1, mastered: 1 },
  balanced: { new: 5, learning: 3, reviewing: 1, mastered: 1 },
  reviewFocused: { new: 3, learning: 3, reviewing: 3, mastered: 1 },
  consolidationFocused: { new: 2, learning: 4, reviewing: 3, mastered: 1 },
  masteryMaintenance: { new: 4, learning: 2, reviewing: 2, mastered: 2 }
} as const;

export type SessionPattern = typeof SESSION_PATTERNS[keyof typeof SESSION_PATTERNS];
export type PatternName = keyof typeof SESSION_PATTERNS;
```

### 2-2. パターン選択ロジック
**内容:**
- `selectRandomPattern(): PatternName`
- テスト作成（依存性注入でテスト可能に）

---

## Phase 3: セッション構築ロジックの実装

### 3-1. session-builder.ts の作成
**内容:**
- `fetchCandidates()` - 候補取得
- `buildSession()` - メイン関数
- テスト作成（TDD）

**実装順序（TDD）:**

**Step 1: fetchCandidates() のテスト**
```typescript
describe('fetchCandidates', () => {
  it('should fetch new words randomly', async () => {
    // new状態は createdAt DESC
  });

  it('should fetch non-new words by recommendedReviewDate', async () => {
    // learning/reviewing/mastered は推奨日順
  });

  it('should fetch 3x the required count', async () => {
    // count * 3
  });
});
```

**Step 2: buildSession() のテスト**
```typescript
describe('buildSession', () => {
  it('should return 10 words', async () => {
    // 常に10単語
  });

  it('should follow pattern composition', async () => {
    // パターン通りの構成
  });

  it('should fill shortage from candidate pool', async () => {
    // 不足分補充
  });

  it('should shuffle final result', async () => {
    // 最終シャッフル
  });
});
```

---

## Phase 4: mastery.ts のリファクタリング

### 4-1. 不要な関数の削除
**削除対象:**
- `calculateWordPriority()` → 不要（推奨日で代替）
- `getOptimalSessionComposition()` → session-builder.tsへ移動
- `selectOptimalWords()` → session-builder.tsへ移動
- `calculateDaysOverdue()` → date-utils.tsへ移動
- `calculateDaysSinceReview()` → date-utils.tsへ移動

### 4-2. 残す関数
**コアロジックのみ:**
- `calculateMasteryStatus()`
- `getRecommendedReviewInterval()`
- `calculateRecommendedReviewDate()` （新規実装）
- `calculateAccuracy()` （新規追加）

### 4-3. 移動する関数
- `getReviewStatistics()` → `src/lib/stats.ts`
- `getMasteryDisplayInfo()` → `src/lib/mastery-display.ts`

---

## Phase 5: DBスキーマの更新

### 5-1. lastAnswerCorrect の削除
**作業:**
1. schema.prismaから削除
2. `npx prisma db push`
3. 関連コード修正（もしあれば）

### 5-2. インデックス確認
**確認項目:**
```prisma
@@index([userId, status, recommendedReviewDate])
@@index([userId, status])
@@index([recommendedReviewDate])
```

---

## Phase 6: API統合

### 6-1. 解答時の推奨日計算
**場所:** `src/app/api/sessions/complete/route.ts`

**変更:**
```typescript
// 解答時に推奨日を計算して保存
const accuracy = calculateAccuracy(totalReviews + 1, newCorrectAnswers);
const recommendedReviewDate = calculateRecommendedReviewDate(
  newStreak,
  accuracy,
  totalReviews + 1,
  newStatus
);

await prisma.wordProgress.update({
  where: { id: wordProgressId },
  data: {
    streak: newStreak,
    correctAnswers: newCorrectAnswers,
    totalReviews: totalReviews + 1,
    status: newStatus,
    recommendedReviewDate,  // ← 追加
    lastReviewedAt: new Date()
  }
});
```

### 6-2. セッション構築APIの更新
**場所:** `src/app/api/words/session/route.ts`

**変更:**
- 旧: 複雑な優先度計算ロジック
- 新: `buildSession(userId)` を呼び出すだけ

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

**次のステップ:** Phase 1-1から TDDサイクルで実装を開始
