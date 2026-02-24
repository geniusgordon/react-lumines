# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based Lumines puzzle game built with TypeScript, focusing on deterministic gameplay and replay functionality. The game features a 16x10 grid where 2x2 blocks fall and form same-colored rectangles that get cleared by a timeline sweep. It includes an online leaderboard and shareable replays via Supabase.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (includes TypeScript compilation)
- `pnpm test` - Run tests with Vitest once (no watch mode)
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm test:watch` - Run tests in watch mode

### Code Quality

- `pnpm lint` - Run ESLint and fix errors automatically
- `pnpm typecheck` - TypeScript type checking (no emit)
- `pnpm format` - Format code with Prettier

### Storybook

- `pnpm storybook` - Start Storybook dev server on port 6006

### Testing

- Single test file: `pnpm test src/utils/__tests__/gameLogic.test.ts`
- Tests use jsdom environment with Vitest and `@testing-library/react`
- Path alias `@/` resolves to `src/`

## Environment Setup

Copy `.env.example` to `.env.local` and fill in Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Architecture Overview

### Routing

React Router v6 with four screen-level routes:

- `/` → `StartScreen` - main menu
- `/play` → `GameScreen` - active gameplay
- `/leaderboard` → `LeaderboardScreen` - online scores
- `/replays/:id` → `ReplayScreen` - replay playback

### Core Patterns

- **State Management**: `useReducer` with immutable state updates
- **Game Loop**: Hybrid requestAnimationFrame + fixed timestep (60 FPS)
- **Deterministic System**: Seeded RNG, integer-only positioning, frame-based timing
- **Command Pattern**: All game actions dispatched through typed `GameAction` interfaces

### Layer Structure

```
src/
├── screens/        # Route-level components (GameScreen, LeaderboardScreen, ReplayScreen, StartScreen)
├── components/     # Reusable UI components (Game, GameBoard, LeaderBoard, ReplayController, etc.)
├── hooks/          # Game logic hooks, replay hooks, Supabase data hooks
├── reducers/       # gameReducer - central state machine
├── services/       # SupabaseService - all database operations
├── lib/            # supabase.ts client initialization
├── utils/          # gameLogic, replayUtils, dataTransformers, seededRNG
├── types/          # game.ts, replay.ts, database.ts (Supabase types)
└── constants/      # gameConfig.ts - all game constants
```

### Critical Files

#### Game Logic

- `src/types/game.ts` - All game TypeScript interfaces and types
- `src/types/replay.ts` - Replay format types
- `src/types/database.ts` - Supabase database types (auto-generated in `database.gen.ts`)
- `src/reducers/gameReducer.ts` - Central state management; `gameReducerWithDebug` wraps for logging
- `src/hooks/useGameLoop.ts` - Fixed timestep game loop; `debugMode: true` enables manual stepping
- `src/utils/gameLogic/` - Core game mechanics: collision, clearing, gravity
- `src/utils/seededRNG/` - Deterministic random number generation
- `src/constants/gameConfig.ts` - Grid dimensions, FPS, timing constants

#### Replay System

- `src/hooks/useReplayRecorder.ts` - Records inputs with frame timestamps during gameplay
- `src/hooks/useReplayPlayer.ts` - Deterministic playback from recorded inputs
- `src/hooks/useSaveLoadReplay.ts` - Local save/load
- `src/hooks/useReplayShare.ts` - Upload replay to Supabase and generate shareable link
- `src/hooks/useOnlineReplay.ts` - Fetch and play a replay by ID
- `src/utils/replayUtils.ts` - Replay serialization/deserialization
- `src/utils/dataTransformers.ts` - Convert between database and app replay formats

#### Backend (Supabase)

- `src/lib/supabase.ts` - Supabase client (requires env vars)
- `src/services/supabaseService.ts` - `SupabaseService` static class: `fetchLeaderboard`, `insertReplay`, `fetchReplayById`, `fetchPlayerHighScores`
- `src/hooks/useOnlineLeaderboard.ts`, `usePlayerHighScores.ts`, `useScoreSubmission.ts` - Data hooks wrapping `SupabaseService`
- `src/hooks/useSupabaseQuery.ts` - Generic query hook

### Game Loop Architecture

- **Fixed Timestep**: Logic always runs at exactly 16.67ms intervals
- **RAF Rendering**: `requestAnimationFrame` for browser rendering
- **Spiral of Death Protection**: `maxFrameSkip` prevents cascading frame debt
- **Debug Mode**: `manualStep()` for frame-by-frame stepping

### Deterministic Design

- **Integer-only coordinates**: No floating-point positioning
- **Frame-based timing**: All events in frame counts, not milliseconds
- **Seeded randomization**: `SeededRNG` for reproducible sequences
- **Input logging**: Every action recorded with frame timestamp, enabling exact replay

## Development Patterns

### State Updates

- All state changes through the reducer; actions must include `frame` number
- Use `gameReducerWithDebug` during development for automatic state change logging
- Never mutate state directly

### Component Structure

- Functional components with hooks only
- Export through `index.ts` barrel files
- Import with `@/` alias: `import { GameBoard } from '@/components'`

### Debugging Tools

- Enable debug mode: `dispatch({ type: 'SET_DEBUG_MODE', payload: true, frame: 0 })`
- Manual stepping: use `manualStep()` from `useGameLoop` with `debugMode: true`
- `DebugPanel` component provides UI controls for all debug features
