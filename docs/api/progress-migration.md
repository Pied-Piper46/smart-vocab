# 進捗更新API移行ガイド
## `/api/progress` - 削除済みフィールド対応

**対象ファイル**: `src/app/api/progress/route.ts`
**Phase**: 6-2
**目的**: 削除済みDBフィールド（WordExample, 旧SM-2）への参照を削除

---

## 現状分析

### 現在の実装（問題あり）

**ファイル**: `src/app/api/progress/route.ts`

#### GET /api/progress - 進捗取得

```typescript
// Line 30-36, 49-55: WordExample参照（削除済み）
include: {
  word: {
    include: {
      examples: true,  // ❌ WordExampleテーブルは削除済み
    },
  },
}
```

#### POST /api/progress - 進捗更新

```typescript
// Line 115-127: 旧SM-2フィールド使用（削除済み）
progress = await prisma.wordProgress.create({
  data: {
    easeFactor: 2.5,      // ❌ 削除済み
    interval: 1,          // ❌ 削除済み
    repetitions: 0,       // ❌ 削除済み
    nextReviewDate: new Date(),  // ❌ recommendedReviewDateに変更
    // ...
  },
});

// Line 143-174: 旧SM-2計算ロジック（削除済み）
let newEaseFactor = progress.easeFactor;  // ❌
let newInterval = progress.interval;      // ❌
let newRepetitions = progress.repetitions; // ❌

// SM-2アルゴリズム計算
if (isCorrect) {
  newRepetitions += 1;
  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(newInterval * newEaseFactor);
  }
}

// Line 176-178: 古いnextReviewDate計算
const nextReviewDate = new Date();
nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

// Line 190-200: 旧フィールド更新
data: {
  easeFactor: newEaseFactor,    // ❌
  interval: newInterval,        // ❌
  repetitions: newRepetitions,  // ❌
  nextReviewDate,               // ❌
  previousStatus: previousStatus, // ❌ 削除済み
}
```

---

### 問題点

| 問題 | 詳細 | TypeScriptエラー |
|------|------|------------------|
| **WordExample参照** | `include: { examples: true }` | 3箇所 |
| **旧SM-2フィールド** | `easeFactor`, `interval`, `repetitions` | 4箇所 |
| **previousStatus** | 冗長フィールド（削除済み） | 1箇所 |
| **nextReviewDate** | `recommendedReviewDate`に変更済み | 1箇所 |

**総計**: 8個のTypeScriptエラー

---

## 新ロジック設計

### APIの役割分担

このAPIは**単一単語の進捗更新**を担当（非推奨）：

- ✅ **推奨**: `/api/sessions/complete` - バッチ更新（セッション完了時）
- ⚠️ **このAPI**: 単発更新（レガシー、互換性のため残す）

**Note**: 新実装では`/api/sessions/complete`を使用すべき。このAPIは段階的に廃止予定。

---

## 実装手順（TDDサイクル）

### Phase 1: Red（失敗するテストを書く）

現在8個のTypeScriptエラーが失敗テストの役割を果たしています。

---

### Phase 2: Green（最小実装で通す）

#### 2-1. WordExample参照を削除

**GET /api/progress - 単一進捗取得**:
```typescript
// ❌ Before (Line 30-36)
include: {
  word: {
    include: {
      examples: true,  // WordExampleテーブル削除済み
    },
  },
}

// ✅ After
include: {
  word: true,  // Wordのみ取得（examplesなし）
}
```

**GET /api/progress - 全進捗取得**:
```typescript
// ❌ Before (Line 49-55)
include: {
  word: {
    include: {
      examples: true,
    },
  },
}

// ✅ After
include: {
  word: true,
}
```

**POST /api/progress - 進捗更新後のレスポンス**:
```typescript
// ❌ Before (Line 202-208)
include: {
  word: {
    include: {
      examples: true,
    },
  },
}

// ✅ After
include: {
  word: true,
}
```

---

#### 2-2. 旧SM-2フィールドを削除

**新規進捗作成時**:
```typescript
// ❌ Before (Line 115-127)
progress = await prisma.wordProgress.create({
  data: {
    userId,
    wordId,
    totalReviews: 0,
    correctAnswers: 0,
    easeFactor: 2.5,          // ❌ 削除
    interval: 1,              // ❌ 削除
    repetitions: 0,           // ❌ 削除
    nextReviewDate: new Date(), // ❌ 変更
    status: 'new',
  },
});

// ✅ After
progress = await prisma.wordProgress.create({
  data: {
    userId,
    wordId,
    totalReviews: 0,
    correctAnswers: 0,
    streak: 0,
    lastReviewedAt: null,
    recommendedReviewDate: new Date(),  // ✅ 新フィールド
    status: 'new',
  },
});
```

---

#### 2-3. SM-2計算ロジックを新ロジックに置き換え

**インポート追加**:
```typescript
import { calculateMasteryStatus, calculateRecommendedReviewDate } from '@/lib/mastery';
```

**Note**: `calculateRecommendedReviewDate`は`review-scheduler.ts`にあるため：
```typescript
import { calculateMasteryStatus } from '@/lib/mastery';
import { calculateRecommendedReviewDate } from '@/lib/review-scheduler';
```

**進捗更新ロジック**:
```typescript
// ❌ Before (Line 130-178): 複雑なSM-2計算（47行）
const newTotalReviews = progress.totalReviews + 1;
const newCorrectAnswers = progress.correctAnswers + (isCorrect ? 1 : 0);
const previousStatus = progress.status;

let newStreak = progress.streak;
if (isCorrect) {
  newStreak += 1;
} else {
  newStreak = 0;
}

let newEaseFactor = progress.easeFactor;
let newInterval = progress.interval;
let newRepetitions = progress.repetitions;
let newStatus = progress.status;

if (isCorrect) {
  newRepetitions += 1;
  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(newInterval * newEaseFactor);
  }
  newStatus = calculateMasteryStatus({...});
} else {
  newRepetitions = 0;
  newInterval = 1;
  newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
  newStatus = calculateMasteryStatus({...});
}

const nextReviewDate = new Date();
nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

// ✅ After: シンプルな計算（10行）
const newTotalReviews = progress.totalReviews + 1;
const newCorrectAnswers = progress.correctAnswers + (isCorrect ? 1 : 0);
const previousStatus = progress.status;

// Calculate streak
const newStreak = isCorrect ? progress.streak + 1 : 0;

// Calculate new status
const newStatus = calculateMasteryStatus({
  totalReviews: newTotalReviews,
  correctAnswers: newCorrectAnswers,
  streak: newStreak
});

// Calculate recommended review date based on streak
const newRecommendedReviewDate = calculateRecommendedReviewDate(newStreak);
```

---

#### 2-4. 進捗更新データを修正

```typescript
// ❌ Before (Line 183-209)
const updatedProgress = await prisma.wordProgress.update({
  where: {
    userId_wordId: { userId, wordId },
  },
  data: {
    totalReviews: newTotalReviews,
    correctAnswers: newCorrectAnswers,
    streak: newStreak,
    easeFactor: newEaseFactor,        // ❌ 削除
    interval: newInterval,            // ❌ 削除
    repetitions: newRepetitions,      // ❌ 削除
    nextReviewDate,                   // ❌ 削除
    status: newStatus,
    previousStatus: previousStatus,   // ❌ 削除
    updatedAt: new Date(),            // ❌ 自動更新
  },
  include: {
    word: {
      include: { examples: true },    // ❌ 削除
    },
  },
});

// ✅ After
const updatedProgress = await prisma.wordProgress.update({
  where: {
    userId_wordId: { userId, wordId },
  },
  data: {
    totalReviews: newTotalReviews,
    correctAnswers: newCorrectAnswers,
    streak: newStreak,
    lastReviewedAt: new Date(),
    recommendedReviewDate: newRecommendedReviewDate,  // ✅ 新フィールド
    status: newStatus,
  },
  include: {
    word: true,  // ✅ examplesなし
  },
});
```

---

### Phase 3: Refactor（リファクタリング）

#### 3-1. 重複コード削除

`/api/sessions/complete`と重複するロジックなので、段階的に廃止を検討：

**オプション1: 非推奨警告を追加**
```typescript
export async function POST(request: NextRequest) {
  console.warn('⚠️ /api/progress POST is deprecated. Use /api/sessions/complete instead.');
  // 既存ロジック...
}
```

**オプション2: そのまま維持**（現段階では推奨）
- フロントエンドで使用中の可能性
- 段階的な移行を可能にする

#### 3-2. エラーハンドリング強化

```typescript
// 存在しない単語IDのチェック
const word = await prisma.word.findUnique({
  where: { id: wordId }
});

if (!word) {
  return NextResponse.json(
    { success: false, error: 'Word not found' },
    { status: 404 }
  );
}
```

---

### Phase 4: Commit

```bash
git add src/app/api/progress/route.ts
git commit -m "[Phase 6-2] Fix progress API - remove WordExample and SM-2 fields

## Changes

### Remove deleted field references
- ❌ WordExample: Remove \`include: { examples: true }\` (3 occurrences)
- ❌ SM-2 fields: easeFactor, interval, repetitions (deleted from schema)
- ❌ previousStatus: Deleted redundant field
- ❌ nextReviewDate: Changed to recommendedReviewDate

### Replace SM-2 algorithm with new logic
- Use \`calculateRecommendedReviewDate()\` from review-scheduler.ts
- Simplified calculation: 47 lines → 10 lines
- Consistent with /api/sessions/complete implementation

### Database operations
- Create: Use new schema fields (streak, recommendedReviewDate)
- Update: Use new schema fields only
- Read: Remove WordExample include

## Testing

- ✅ TypeScript errors: 8 → 0 (this file)
- ✅ Unit tests: 62/62 passed (business logic unchanged)

## Notes

This API is maintained for backward compatibility.
New implementations should use /api/sessions/complete for batch updates.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 検証手順

### 1. TypeScriptエラーチェック

```bash
npx tsc --noEmit | grep "src/app/api/progress/route.ts"
```

**期待**: エラー 8 → 0

### 2. ユニットテスト実行

```bash
npm test
```

**期待**: 全62テストがパス

### 3. 手動APIテスト

```bash
# 進捗更新テスト
curl -X POST 'http://localhost:3000/api/progress' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=YOUR_TOKEN' \
  -d '{
    "wordId": "word_id_here",
    "isCorrect": true
  }'

# 進捗取得テスト
curl -X GET 'http://localhost:3000/api/progress?wordId=word_id_here' \
  -H 'Cookie: next-auth.session-token=YOUR_TOKEN'
```

**期待**:
- ステータスコード: 200
- レスポンスに`examples`フィールドなし
- `recommendedReviewDate`フィールドあり

---

## トラブルシューティング

### エラー: "Property 'examples' does not exist"

**原因**: include構文が残っている

**解決**:
```typescript
// ❌ Bad
include: {
  word: {
    include: { examples: true }
  }
}

// ✅ Good
include: {
  word: true
}
```

### エラー: "easeFactor does not exist"

**原因**: 旧SM-2フィールドへの参照が残っている

**解決**: 該当行を削除（create/update両方確認）

### エラー: "Module has no exported member 'calculateRecommendedReviewDate'"

**原因**: インポート元が間違っている

**解決**:
```typescript
// ❌ Bad
import { calculateRecommendedReviewDate } from '@/lib/mastery';

// ✅ Good
import { calculateRecommendedReviewDate } from '@/lib/review-scheduler';
```

---

## コード差分サマリー

| セクション | Before | After | 削減 |
|-----------|--------|-------|------|
| **インポート** | 1行 | 2行 | +1 |
| **GET (単一)** | 8行 (include) | 3行 | -5 |
| **GET (全体)** | 10行 (include) | 3行 | -7 |
| **POST create** | 13行 | 10行 | -3 |
| **POST 計算** | 47行 (SM-2) | 10行 | -37 |
| **POST update** | 27行 | 12行 | -15 |
| **合計** | 240行 | ~175行 | **-65行** |

---

## 段階的廃止計画（将来）

### Phase 1: 非推奨警告
```typescript
console.warn('⚠️ /api/progress POST is deprecated. Use /api/sessions/complete instead.');
```

### Phase 2: ドキュメント更新
```markdown
## /api/progress (Deprecated)

⚠️ **This endpoint is deprecated.** Use `/api/sessions/complete` for batch updates.

Maintained for backward compatibility only.
```

### Phase 3: 削除
フロントエンド移行完了後、APIを削除

---

## 関連ドキュメント

- **新セッション完了API**: `/api/sessions/complete` (既に新ロジック使用)
- **復習スケジューラー**: `src/lib/review-scheduler.ts`
- **マスタリー計算**: `src/lib/mastery.ts`
- **Phase 1-5詳細**: [session-construction-refactoring-v2.md](../session-construction-refactoring-v2.md)
