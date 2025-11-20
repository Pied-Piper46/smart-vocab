# Type System Refactoring - Phase 7 完了レポート

## 概要

型定義の3重重複問題を解消し、Co-location原則を適用したリファクタリング。

**実施日**: 2025-11-20
**コミット**: `7ccfb7d` - [Phase 7] Refactor: Eliminate type definition duplication and apply Co-location principle
**削減**: 65行の純減（131削除、66追加）

---

## 問題分析

### 1. 深刻な3重定義問題

同じ型が複数箇所で定義され、Single Source of Truth原則に違反していた：

| 型名 | ① Prisma生成 | ② types/index.ts | ③ lib/api-client.ts | ④ types/word-data.ts |
|-----|-------------|-----------------|---------------------|---------------------|
| **Word** | ✅ 自動生成 | ❌ 手動重複 | ❌ 手動重複 (WordData) | ❌ 手動重複 (WordData) |
| **WordProgress** | ✅ 自動生成 | ❌ 手動重複 | ❌ 手動重複 | ❌ 手動重複（旧SM-2含む） |
| **User** | ✅ 自動生成 | ❌ 手動重複 | - | - |
| **WordExample** | ❌ 削除済み | - | - | ⚠️ **定義が残存** |
| **MasteryStatus** | - | ⚠️ 定義あり | - | - |

#### 具体的な問題点

**types/index.ts の問題**:
```typescript
// ❌ Before: Prisma型と完全重複
export interface User {
  id: string;
  email: string;
  emailVerified?: Date | null;
  hashedPassword?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  id: string;
  english: string;
  japanese: string;
  // ... Prisma型と同じフィールド定義
}
```

**lib/api-client.ts の問題**:
```typescript
// ❌ Before: types/index.tsと重複
export interface WordData {
  id: string;
  english: string;
  japanese: string;
  // ... 同じ定義を再度記述
}

export interface WordProgress {
  totalReviews: number;
  correctAnswers: number;
  // ... 同じ定義を再度記述
}
```

**types/word-data.ts の問題**:
```typescript
// ❌ Before: 削除済みWordExampleが残存
export interface WordExample {
  id: string;
  english: string;
  japanese: string;
  difficulty: number; // テーブル削除済みなのに定義が残存
  context: string;
}

// ❌ 旧SM-2フィールドを含む古い定義
export interface SessionWord extends WordData {
  progress?: {
    easeFactor: number;     // 削除済み
    interval: number;       // 削除済み
    repetitions: number;    // 削除済み
    nextReviewDate: Date;   // recommendedReviewDateに変更済み
    // ...
  };
}
```

### 2. ドメイン型の配置問題

`MasteryStatus`が`types/index.ts`に定義されていたが、本来は`lib/mastery.ts`（マスタリーロジック）に共配置すべき：

```typescript
// ❌ Before: types/index.ts
export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';

// ✅ After: lib/mastery.ts (ロジックと共配置)
export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export function calculateMasteryStatus(...): MasteryStatus { ... }
```

---

## 解決策

### 設計原則

#### 1. **Single Source of Truth**
Prisma生成型を信頼できる唯一の情報源とする

#### 2. **Co-location Principle（共配置の原則）**
ドメイン型はロジックの近くに配置する

#### 3. **API Boundary Types**
API境界（Date → ISO string変換）のみ別定義

---

## 実施内容

### 1. types/index.ts の簡略化 (-41行)

**Before**:
```typescript
// 手動で全てのDB型を定義（41行）
export interface User { ... }
export interface Word { ... }
export interface WordProgress { ... }
export interface LearningSession { ... }
export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
```

**After**:
```typescript
/**
 * Central Type Definitions for VocabMaster
 *
 * This file serves as the single source of truth for:
 * 1. Prisma database types (re-exported for convenience)
 * 2. Cross-cutting concerns (API, UI common types)
 *
 * Domain-specific types should be co-located with their logic:
 * - MasteryStatus → lib/mastery.ts
 * - Review scheduling → lib/review-scheduler.ts
 */

import type { MasteryStatus } from '@/lib/mastery';

// === Database Models (from Prisma) ===
// Re-export Prisma-generated types as the single source of truth
export type { User, Word, WordProgress, LearningSession } from '@prisma/client';

// Re-export domain-specific types for convenience
export type { MasteryStatus } from '@/lib/mastery';

// 以下、API/UI共通型のみ残す
export type LearningMode = 'eng_to_jpn' | 'jpn_to_eng' | 'audio_recognition' | 'context_fill';
export interface SessionAnswer { ... }
export interface ApiResponse<T> { ... }
// ...
```

**変更点**:
- ✅ Prisma型の再エクスポートに変更（DB型の一元管理）
- ✅ MasteryStatusを`lib/mastery.ts`から再エクスポート
- ✅ API/UI共通型のみ残す
- ✅ 明確なドキュメントコメント追加

---

### 2. lib/api-client.ts の重複削除 (-25行)

**Before**:
```typescript
// ❌ 重複定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

export interface WordData {
  id: string;
  english: string;
  japanese: string;
  // ... types/index.tsと同じ定義
}

export interface WordProgress { ... }
export interface SessionAnswer { ... }
export interface WordStatusChange { ... }
```

**After**:
```typescript
/**
 * API Client for VocabMaster
 *
 * Note: Types here represent API boundary contracts (Date → ISO string)
 * For database types, see @/types or @prisma/client
 */

import type { Word, WordProgress as DbWordProgress, SessionAnswer, WordStatusChange } from '@/types';

// Re-export common types from central location
export type { ApiResponse, SessionAnswer, WordStatusChange } from '@/types';

// API-specific types (with Date fields as ISO strings for serialization)
export interface WordData extends Omit<Word, 'createdAt' | 'updatedAt'> {
  progress?: WordProgressApi;
}

export interface WordProgressApi extends Omit<DbWordProgress, 'id' | 'userId' | 'wordId' | 'createdAt' | 'updatedAt' | 'lastReviewedAt' | 'recommendedReviewDate'> {
  lastReviewedAt?: string | null; // ISO string from API
  recommendedReviewDate: string; // ISO string from API
}
```

**変更点**:
- ✅ 重複型を削除し、`@/types`からインポート
- ✅ API境界型（Date → ISO string）のみ残す
- ✅ 役割を明確化するコメント追加

---

### 3. types/word-data.ts の大幅簡略化 (-14行)

**Before**:
```typescript
// ❌ 削除済みテーブルの型が残存
export interface WordExample {
  id: string;
  english: string;
  japanese: string;
  difficulty: number; // 削除済みフィールド
  context: string;    // 削除済みフィールド
}

export interface WordData {
  id: string;
  english: string;
  japanese: string;
  phonetic?: string;
  partOfSpeech: string;
  frequency: number; // 削除済みフィールド
  examples: WordExample[]; // 削除済みリレーション
}

// ❌ 旧SM-2フィールドを含む定義
export interface SessionWord extends WordData {
  progress?: {
    easeFactor: number;     // 削除済み
    interval: number;       // 削除済み
    repetitions: number;    // 削除済み
    nextReviewDate: Date;
    // ...
  };
}

// ❌ 不要になった定義
export const DIFFICULTY_LEVELS = { ... };
export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;
```

**After**:
```typescript
/**
 * Word Data Import Types
 * Used exclusively for JSON data files import (prisma/seed.ts)
 *
 * Note: These types match the structure of JSON files in data/words/
 * They may contain fields that are not stored in the database (e.g., frequency, difficulty)
 */

/**
 * Example sentence structure in JSON files
 */
export interface WordExampleJson {
  id: string;
  english: string;
  japanese: string;
  difficulty?: number; // Optional - not used in current schema
  context?: string; // Optional - not used in current schema
}

/**
 * Word data structure in JSON files
 */
export interface WordDataJson {
  id?: string; // Optional - auto-generated by Prisma
  english: string;
  japanese: string;
  phonetic?: string;
  partOfSpeech: string;
  frequency?: number; // Optional - not used in current schema
  examples: WordExampleJson[]; // First example will be used
}

/**
 * Word data file structure
 */
export interface WordDataFile {
  words: WordDataJson[];
  difficulty?: 'easy' | 'medium' | 'hard'; // Optional - for organization only
  fileNumber?: number; // Optional - for organization only
}

// Available word data files (for reference)
export const WORD_DATA_FILES = {
  easy: ['easy1'],
  medium: ['medium1'],
  hard: ['hard1']
} as const;
```

**変更点**:
- ✅ 役割を明確化: **JSONインポート専用**
- ✅ SessionWord削除（API層でPrisma型使用）
- ✅ DifficultyLevel削除（機能廃止予定）
- ✅ JSON構造とDB構造の違いを明記

---

### 4. app/learning/page.tsx & components/learning/SessionManager.tsx

DifficultyLevelのインポートをローカル定義に変更（機能廃止予定のため暫定対応）：

**Before**:
```typescript
import { DifficultyLevel } from '@/types/word-data';
```

**After**:
```typescript
// Note: Difficulty selection is deprecated (words are selected by mastery status instead)
type DifficultyLevel = 'easy' | 'medium' | 'hard';
```

---

## 効果

### 1. コード削減

```
5 files changed, 66 insertions(+), 131 deletions(-)
```

**純減: 65行**

### 2. メンテナンス性向上

#### Before: 型変更時の修正箇所
```
1. prisma/schema.prisma を変更
2. npx prisma generate を実行
3. src/types/index.ts を手動修正 ❌
4. src/lib/api-client.ts を手動修正 ❌
5. src/types/word-data.ts を手動修正 ❌
```

#### After: 型変更時の修正箇所
```
1. prisma/schema.prisma を変更
2. npx prisma generate を実行
→ 自動的に全ての型が更新される ✅
```

### 3. 設計原則の明確化

| ファイル | 役割 | 含むべき型 |
|---------|------|-----------|
| `@prisma/client` | DB型の自動生成 | User, Word, WordProgress, LearningSession |
| `types/index.ts` | Prisma型の再エクスポート + API/UI共通型 | ApiResponse, SessionAnswer, LearningMode |
| `lib/mastery.ts` | マスタリーロジック + ドメイン型 | MasteryStatus, WordProgressData |
| `lib/api-client.ts` | API境界型のみ | WordData, WordProgressApi (Date→ISO string) |
| `types/word-data.ts` | JSONインポート型のみ | WordDataJson, WordExampleJson |

### 4. 発見可能性の向上

```typescript
// Before: MasteryStatusの定義場所が不明確
import { MasteryStatus } from '@/types'; // どこで定義？何のためのステータス？

// After: 定義元が明確
import { MasteryStatus } from '@/lib/mastery'; // マスタリーロジックのステータスだとわかる
```

---

## 残された課題

### 1. TypeScriptエラー（約75個）

Phase 7では型定義のみ修正したため、使用箇所でエラーが残っている：

**主なエラー**:
- 削除済みフィールド参照: `name`, `dailyGoal`, `wordsStudied`, `examples`, `easeFactor`, `difficulty`, `frequency`
- 削除済み関数参照: `getOptimalSessionComposition`, `selectOptimalWords`

**対応**: Phase 6で修正予定

### 2. 未使用ファイル

- `src/lib/word-data-loader.ts` - APIルートで直接Prisma使用のため不要（削除検討）

---

## まとめ

### 達成したこと

✅ 型定義の3重重複を解消
✅ Co-location原則の適用（MasteryStatus → mastery.ts）
✅ Prisma型を信頼できる唯一の情報源に
✅ API境界型とDB型の明確な分離
✅ 65行のコード削減
✅ メンテナンス性の大幅向上

### 次のステップ

📋 Phase 6: API統合
- セッション構築API更新（新ロジック適用）
- 進捗更新API修正（削除済みフィールド対応）
- 残りのTypeScriptエラー修正

---

## 参考資料

- **コミット**: `7ccfb7d` - [Phase 7] Refactor: Eliminate type definition duplication and apply Co-location principle
- **関連ドキュメント**:
  - [Session Construction Refactoring](./session-construction-refactoring-v2.md) - Phase 1-5の詳細
  - [Data Architecture Improvements](./data-architecture-improvements.md) - データ構造改善の全体像
