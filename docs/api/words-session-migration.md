# セッション構築API移行ガイド
## `/api/words/session` - 新ロジック適用手順

**対象ファイル**: `src/app/api/words/session/route.ts`
**Phase**: 6-1
**目的**: 複雑な優先度計算から、推奨復習日ベースのシンプルなセッション構築へ移行

---

## 現状分析

### 現在の実装（旧ロジック）

**ファイル**: `src/app/api/words/session/route.ts`

```typescript
import { getOptimalSessionComposition, selectOptimalWords, type MasteryStatus } from '@/lib/mastery';

export async function GET(request: NextRequest) {
  // 1. 全単語を取得してメモリ上で分類
  const allWords = await prisma.word.findMany({
    include: {
      progress: {
        where: { userId },
      },
    },
  });

  // 2. メモリ上でカテゴリ分け（O(n)）
  const categorizedWords: Record<MasteryStatus, Array<...>> = {
    new: [],
    learning: [],
    reviewing: [],
    mastered: []
  };
  allWords.forEach(word => {
    const status = progress?.status || 'new';
    categorizedWords[status].push(wordWithProgress);
  });

  // 3. 旧関数で構成を計算（複雑なロジック）
  const composition = getOptimalSessionComposition(available, limit);

  // 4. 旧関数で単語選択（優先度計算 O(n log n)）
  const selectedWords = selectOptimalWords(categorizedWords, composition);
}
```

### 問題点

| 問題 | 詳細 | パフォーマンス影響 |
|------|------|-------------------|
| **全単語取得** | `findMany()`で全単語をメモリに読み込み | O(n) メモリ使用 |
| **メモリ上分類** | JavaScriptでカテゴリ分け | O(n) 処理 |
| **複雑な優先度計算** | `selectOptimalWords`内で`calculateWordPriority` | O(n log n) |
| **旧関数依存** | `getOptimalSessionComposition`, `selectOptimalWords` | メンテナンス困難 |

**総計**: O(n log n) の時間複雑度、O(n) のメモリ使用

---

## 新ロジック設計

### アルゴリズム概要

```
Step 1: パターン選択（O(1)）
  └─ 5つのパターンからランダムに1つ選択

Step 2: DB直接クエリ（O(1) - インデックス使用）
  ├─ new: ORDER BY createdAt DESC LIMIT n*3
  ├─ learning: ORDER BY recommendedReviewDate ASC LIMIT n*3
  ├─ reviewing: ORDER BY recommendedReviewDate ASC LIMIT n*3
  └─ mastered: ORDER BY recommendedReviewDate ASC LIMIT n*3

Step 3: セッション構築（O(1)）
  └─ パターンに従って必要数を選択
```

**総計**: O(1) の時間複雑度（インデックススキャン）、O(1) のメモリ使用

### パフォーマンス比較

| 指標 | 旧ロジック | 新ロジック | 改善率 |
|------|-----------|-----------|--------|
| **時間複雑度** | O(n log n) | O(1) | ~100倍高速（1000単語時） |
| **メモリ使用** | O(n) | O(1) | ~100倍削減 |
| **DBクエリ** | 1回（全件） | 4回（少量） | データ転送量 1/10 |
| **インデックス** | 未使用 | 使用 | ✅ |

---

## 実装手順（TDDサイクル）

### Phase 1: Red（失敗するテストを書く）

現在のテストはありませんが、API統合テストを追加する場合：

```typescript
// tests/api/words-session.test.ts（オプション）
describe('GET /api/words/session', () => {
  it('should return 10 words with new session logic', async () => {
    const response = await fetch('/api/words/session?limit=10');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(10);
    // パターンに応じた構成チェック
  });
});
```

**Note**: API統合テストは任意。主にユニットテストでカバー済み（session-builder.test.ts）

---

### Phase 2: Green（最小実装で通す）

#### 2-1. インポートを更新

```typescript
// ❌ 削除
import { getOptimalSessionComposition, selectOptimalWords, type MasteryStatus } from '@/lib/mastery';

// ✅ 追加
import { type MasteryStatus } from '@/lib/mastery';
import { selectRandomPattern } from '@/lib/pattern-selector';
import { buildSession, getCandidateQuerySpecs } from '@/lib/session-builder';
```

#### 2-2. パターン選択を追加

```typescript
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createUnauthorizedResponse();
    }

    const userId = currentUser.id;

    // ✅ Step 1: パターン選択
    const pattern = selectRandomPattern();
    const specs = getCandidateQuerySpecs(pattern);
```

#### 2-3. 候補取得クエリを実装

```typescript
    // ✅ Step 2: 各ステータスから候補を取得（並列実行）
    const [newCandidates, learningCandidates, reviewingCandidates, masteredCandidates] =
      await Promise.all([
        // new: ランダム的（新しい順）
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'new'
          },
          orderBy: specs.new.orderBy,
          take: specs.new.count,
          include: { word: true }
        }),

        // learning: 推奨日順（期限が近い/切れている順）
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'learning'
          },
          orderBy: specs.learning.orderBy,
          take: specs.learning.count,
          include: { word: true }
        }),

        // reviewing: 推奨日順
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'reviewing'
          },
          orderBy: specs.reviewing.orderBy,
          take: specs.reviewing.count,
          include: { word: true }
        }),

        // mastered: 推奨日順
        prisma.wordProgress.findMany({
          where: {
            userId,
            status: 'mastered'
          },
          orderBy: specs.mastered.orderBy,
          take: specs.mastered.count,
          include: { word: true }
        })
      ]);
```

**ポイント**:
- `Promise.all()`で並列実行（パフォーマンス最適化）
- `recommendedReviewDate`にインデックスあり → 高速クエリ
- 必要数の3倍取得（候補プール確保）

#### 2-4. セッション構築

```typescript
    // ✅ Step 3: セッション構築
    const candidates = {
      new: newCandidates,
      learning: learningCandidates,
      reviewing: reviewingCandidates,
      mastered: masteredCandidates
    };

    const session = buildSession(pattern, candidates);
```

#### 2-5. レスポンス整形

```typescript
    // フロントエンド用にデータ整形
    const sessionWords = session.map(wp => ({
      id: wp.word.id,
      english: wp.word.english,
      japanese: wp.word.japanese,
      phonetic: wp.word.phonetic,
      partOfSpeech: wp.word.partOfSpeech,
      exampleEnglish: wp.word.exampleEnglish,
      exampleJapanese: wp.word.exampleJapanese,
      progress: {
        totalReviews: wp.totalReviews,
        correctAnswers: wp.correctAnswers,
        streak: wp.streak,
        lastReviewedAt: wp.lastReviewedAt?.toISOString() || null,
        recommendedReviewDate: wp.recommendedReviewDate.toISOString(),
        status: wp.status,
      }
    }));

    return NextResponse.json({
      success: true,
      data: sessionWords,
      count: sessionWords.length,
    });
  } catch (error) {
    console.error('Error fetching session words:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session words' },
      { status: 500 }
    );
  }
}
```

---

### Phase 3: Refactor（リファクタリング）

#### 3-1. 型安全性の向上

```typescript
import type { Word, WordProgress } from '@prisma/client';

type WordProgressWithWord = WordProgress & {
  word: Word;
};
```

#### 3-2. エラーハンドリング強化

```typescript
// 候補不足時のログ追加
if (session.length < 10) {
  console.warn(`⚠️ Session size: ${session.length}/10 (pattern: ${pattern})`);
}
```

#### 3-3. パフォーマンスログ（開発環境のみ）

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log(`✅ Session built: pattern=${pattern}, words=${session.length}`);
}
```

---

### Phase 4: Commit

```bash
git add src/app/api/words/session/route.ts
git commit -m "[Phase 6-1] Migrate session API to new session builder logic

## Changes

- Replace getOptimalSessionComposition() with selectRandomPattern()
- Replace selectOptimalWords() with buildSession()
- Use DB-level ordering (recommendedReviewDate index) instead of in-memory priority calculation
- Fetch candidates in parallel with Promise.all()

## Performance Improvements

- Time complexity: O(n log n) → O(1) (index scan)
- Memory usage: O(n) → O(1)
- Database queries: 1 full scan → 4 indexed queries

## Testing

- Existing unit tests in session-builder.test.ts (12 tests) cover core logic
- Manual API testing recommended

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 検証手順

### 1. TypeScriptエラーチェック

```bash
npx tsc --noEmit
```

**期待**: `src/app/api/words/session/route.ts`のエラーが消えること

### 2. ユニットテスト実行

```bash
npm test
```

**期待**: 全62テストがパス

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. 手動APIテスト

```bash
# ログイン後、ブラウザで確認
# または curlでテスト
curl -X GET 'http://localhost:3000/api/words/session?limit=10' \
  -H 'Cookie: next-auth.session-token=YOUR_TOKEN'
```

**期待**:
- ステータスコード: 200
- レスポンス: `{ success: true, data: [...], count: 10 }`
- データ構造: WordData配列

---

## トラブルシューティング

### エラー: "Module not found: @/lib/session-builder"

**原因**: インポートパスが間違っている

**解決**:
```typescript
import { buildSession, getCandidateQuerySpecs } from '@/lib/session-builder';
```

### エラー: "Property 'word' does not exist"

**原因**: `include: { word: true }`が抜けている

**解決**: クエリに`include`を追加

### 警告: "Session size: 3/10"

**原因**: ユーザーの単語数が不足

**対応**: 正常動作（候補不足時はgraceful degradation）

---

## パフォーマンス測定

### 測定方法

```typescript
// 開発環境で計測
const startTime = Date.now();
const session = buildSession(pattern, candidates);
console.log(`Session built in ${Date.now() - startTime}ms`);
```

### 期待値

| 単語数 | 旧ロジック | 新ロジック |
|-------|-----------|-----------|
| 100語 | ~50ms | ~5ms |
| 1000語 | ~500ms | ~5ms |
| 10000語 | ~5000ms | ~5ms |

---

## Next Steps

このAPIの移行が完了したら：

1. **Phase 6-2**: `/api/progress` の修正（WordExample削除対応）
2. **Phase 6-3**: その他APIの型エラー修正
3. **Phase 6-4**: フロントエンド統合テスト

---

## 参考資料

- **新ロジック詳細**: [session-construction-refactoring-v2.md](../session-construction-refactoring-v2.md)
- **型システム**: [type-system-refactoring.md](../type-system-refactoring.md)
- **ユニットテスト**: `src/lib/session-builder.test.ts`
- **パターン定義**: `src/lib/session-patterns.ts`
