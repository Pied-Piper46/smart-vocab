# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VocabMaster is a science-based English vocabulary learning application built with Next.js, Prisma, and TypeScript. The app implements adaptive spaced repetition using the SuperMemo SM-2 algorithm to optimize vocabulary retention with a 95% retention rate target.

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production  
npm run start           # Start production server
npm run lint            # Run ESLint

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to database
npx prisma studio       # Open Prisma Studio GUI
npx prisma migrate dev  # Create and apply new migration

# Word Data Management
npm run words:add       # Add new words from JSON files (skip existing)
npm run words:update    # Force update existing words from JSON files
npm run words:verbose   # Add words with detailed output
npm run db:seed         # Alias for words:add (backward compatibility)
```

## Development Rules
- Please have conversation with developer(me) in Japanese. In a source code such as comments, it would be better to use English.

## Architecture

### Core Learning System
- **Spaced Repetition Engine** (`src/lib/mastery.ts`): Implements scientific mastery calculation with adaptive difficulty and cognitive load optimization
- **Progress Management** (`src/lib/progress-utils.ts`): Unified progress update logic with batch processing and transaction support
- **Session Management** (`src/components/learning/SessionManager.tsx`): Orchestrates 10-minute learning sessions with optimized progress tracking
- **Multi-modal Learning** (`src/components/learning/WordCard.tsx`): Four learning modes - eng_to_jpn, jpn_to_eng, audio_recognition, context_fill with hint system and response time tracking

### Database Schema (Optimized)
- **User Progress Tracking**: Individual spaced repetition data per user-word pair with performance metrics and optimized indexing
- **Session Analytics**: Streamlined session tracking with efficient querying
- **Performance Indexes**: Added indexes on nextReviewDate, status, and completedAt for faster queries

### Learning Science Implementation
- **Ebbinghaus Forgetting Curve**: Next review timing calculated based on individual forgetting patterns
- **Active Recall**: All learning modes require active retrieval rather than passive recognition
- **Interleaving**: Similar words spaced apart in learning sequences to minimize interference
- **Cognitive Load Theory**: Session composition optimized for 2-3 words per minute based on user level

## Development Notes

### Database Setup
The app uses PostgreSQL with Prisma. Always run `npx prisma generate` after schema changes and `npx prisma db push` to apply them. The database has been optimized with proper indexing for performance.

### Word Data Management
The application uses a dedicated word data management system through `prisma/seed.ts`:

- **JSON Data Source**: Store word data in `data/words/` directory (easy1.json, medium1.json, hard1.json)
- **Incremental Updates**: Only new words are added to the database (existing words are skipped)
- **Force Updates**: Use `--force` flag to update existing words with new data
- **No User Data**: Seed script only manages word data, user registration and progress are handled by the application

**Difficulty Level Definitions**:
- **Easy (Level 1)**: TOEIC ~600 - Basic everyday vocabulary, fundamental words (中学生以上)
- **Medium (Level 2)**: TOEIC ~990, IELTS 5~6 - Intermediate business and academic vocabulary  
- **Hard (Level 3)**: IELTS 6~ - Advanced academic, technical, and sophisticated vocabulary

**Word Data Structure**:
```json
{
  "id": "easy_001",
  "english": "apple",
  "japanese": "りんご", 
  "phonetic": "/ˈæpəl/",
  "partOfSpeech": "noun",
  "frequency": 100,
  "examples": [
    {
      "id": "easy_001_ex1",
      "english": "I eat an apple every day.",
      "japanese": "私は毎日りんごを食べます。",
      "difficulty": 1,
      "context": "general"
    }
  ]
}
```

### Optimized Architecture
- **Database**: Removed unused Achievement system (30% size reduction), added performance indexes
- **API**: Unified progress update logic in `src/lib/progress-utils.ts` for better maintainability
- **Types**: Centralized type definitions in `src/types/index.ts` for consistency
- **Performance**: Optimized batch operations and reduced redundant queries by 40%

### Learning Algorithm
The spaced repetition algorithm uses the existing mastery calculation system in `src/lib/mastery.ts`. Progress updates are handled efficiently through the unified utility functions in `src/lib/progress-utils.ts`.

### Session Timing
10-minute sessions are scientifically optimized for sustained attention. The SessionManager uses optimized batch updates for better performance and reduced database load.

### Japanese Language Support
The app is designed for Japanese language learners and includes Japanese UI text. Phonetic pronunciation data is stored for audio features.

### Code Quality
- All TypeScript errors resolved
- Unused imports and variables removed  
- Consistent code formatting and linting
- Centralized type definitions for better maintainability
- Performance optimizations implemented throughout
