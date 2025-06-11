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
```

## Development Rules
- Please have conversation with developer(me) in Japanese. In a source code such as comments, it would be better to use English.

## Architecture

### Core Learning System
- **Spaced Repetition Engine** (`src/lib/spaced-repetition.ts`): Implements SuperMemo SM-2 algorithm with adaptive difficulty, cognitive load optimization, and interference minimization
- **Session Management** (`src/components/learning/SessionManager.tsx`): Orchestrates 10-minute learning sessions with real-time progress tracking, focus scoring, and adaptive composition (20% new words, 80% reviews)
- **Multi-modal Learning** (`src/components/learning/WordCard.tsx`): Four learning modes - eng_to_jpn, jpn_to_eng, audio_recognition, context_fill with hint system and response time tracking

### Database Schema
- **User Progress Tracking**: Individual spaced repetition data per user-word pair with performance metrics across different learning modes
- **Session Analytics**: Detailed session tracking including response times, focus scores, and learning mode performance
- **Achievement System**: Gamification elements with unlockable achievements based on streaks, accuracy, and volume

### Learning Science Implementation
- **Ebbinghaus Forgetting Curve**: Next review timing calculated based on individual forgetting patterns
- **Active Recall**: All learning modes require active retrieval rather than passive recognition
- **Interleaving**: Similar words spaced apart in learning sequences to minimize interference
- **Cognitive Load Theory**: Session composition optimized for 2-3 words per minute based on user level

## Development Notes

### Database Setup
The app uses SQLite with Prisma. The database file is `prisma/vocab.db`. Always run `npx prisma generate` after schema changes and `npx prisma db push` to apply them.

### Mock Data
SessionManager currently uses mock vocabulary data. In production, this should be replaced with API calls to fetch words based on user progress and spaced repetition schedules.

### Learning Algorithm
The spaced repetition algorithm in `src/lib/spaced-repetition.ts` is scientifically calibrated. Be careful when modifying ease factor calculations, interval progressions, or mastery thresholds as these directly impact learning effectiveness.

### Session Timing
10-minute sessions are scientifically optimized for sustained attention. The timer system includes pause/resume functionality and automatic session completion.

### Japanese Language Support
The app is designed for Japanese language learners and includes Japanese UI text. Phonetic pronunciation data is stored for audio features.