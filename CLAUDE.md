# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based Lumines puzzle game built with TypeScript, focusing on deterministic gameplay and replay functionality. The game features a 16x10 grid where 2x2 blocks fall and form same-colored rectangles that get cleared by a timeline sweep.

## Development Commands

### Essential Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (includes TypeScript compilation)
- `pnpm test` - Run tests with Vitest once (no watch mode)
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm test:watch` - Run tests with Vitest in watch mode

### Code Quality

- `pnpm lint` - Run ESLint and fix errors automatically
- `pnpm typecheck` - TypeScript type checking (no emit)
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

### Storybook

- `pnpm storybook` - Start Storybook dev server on port 6006
- `pnpm build-storybook` - Build Storybook for production

### Testing

- Single test file: `pnpm test src/utils/__tests__/gameLogic.test.ts`
- Watch mode: `pnpm test` (default behavior)
- Coverage: Tests are configured with jsdom environment

## Architecture Overview

### Core Patterns

- **State Management**: `useReducer` with immutable state updates
- **Game Loop**: Hybrid requestAnimationFrame + fixed timestep (60 FPS)
- **Deterministic System**: Seeded RNG, integer-only positioning, frame-based timing
- **Command Pattern**: All game actions dispatched through typed actions

### Key Components Structure

```
App
├── GameBoard (main game area)
│   ├── Block (falling piece)
│   ├── GridCell (board positions)
│   └── Timeline (sweep line)
├── DebugPanel (development tools)
├── Queue (upcoming blocks preview)
└── ScoreDisplay
```

### State Management

- Central game state managed by `gameReducer` in `src/reducers/gameReducer.ts`
- Debug-aware wrapper `gameReducerWithDebug` provides comprehensive logging
- All state changes through typed `GameAction` interfaces
- Completely deterministic - same seed + inputs = identical gameplay

### Game Loop Architecture

The game uses a sophisticated hybrid approach for deterministic 60 FPS gameplay:

- **Fixed Timestep**: Game logic always runs at exactly 16.67ms intervals
- **RAF Rendering**: Uses requestAnimationFrame for efficient browser rendering
- **Spiral of Death Protection**: `maxFrameSkip` prevents performance hiccups from cascading
- **Debug Mode**: Manual frame stepping for testing (`useGameLoop` with `debugMode: true`)

### Critical Files

#### Game Logic

- `src/types/game.ts` - All TypeScript interfaces and types
- `src/reducers/gameReducer.ts` - Central state management with debug logging
- `src/hooks/useGameLoop.ts` - Fixed timestep game loop implementation
- `src/utils/gameLogic.ts` - Core game mechanics (collision, clearing, gravity)
- `src/utils/seededRNG.ts` - Deterministic random number generation

#### Components

- `src/components/DebugPanel/` - Comprehensive debugging tools with manual stepping
- `src/components/GameBoard/` - Main game rendering
- Component structure follows index.ts barrel exports

#### Configuration

- `src/constants/gameConfig.ts` - All game constants and configuration
- Game runs at 60 FPS with 16x10 grid and 2x2 blocks

## Key Technical Decisions

### Deterministic Design

- **Integer-only coordinates**: No floating-point positioning
- **Frame-based timing**: All events measured in frame counts, not milliseconds
- **Seeded randomization**: Custom SeededRNG class for reproducible sequences
- **Input logging**: Every action recorded with frame timestamp for replay system

### Debug System

- **Debug Mode Toggle**: `gameState.debugMode` enables comprehensive logging
- **Manual Frame Stepping**: `manualStep()` function for frame-by-frame debugging
- **State Change Tracking**: Logs before/after state comparisons
- **Performance Aware**: Zero overhead when debug mode disabled

### Testing Approach

- **Vitest** with jsdom environment
- **@testing-library/react** for component testing
- Tests focus on game logic determinism and state management
- Path alias `@/` resolves to `src/`

## Development Patterns

### Component Development

- Use functional components with hooks only
- Follow existing component structure in `src/components/`
- Export through index.ts barrel files
- Use TypeScript interfaces from `src/types/game.ts`

### State Updates

- All state changes must go through the reducer
- Actions must include `frame` number for determinism
- Use `gameReducerWithDebug` for automatic debug logging
- Never mutate state directly - always return new objects

### Game Logic

- Use utilities from `src/utils/gameLogic.ts` for game mechanics
- Maintain deterministic behavior - same inputs must produce same outputs
- Integer-only coordinates and frame-based timing
- Validate all moves through collision detection

### Performance Considerations

- Game loop includes frame skip protection (`maxFrameSkip`)
- Selective rendering - only changed cells re-render
- Debug logging only active when `debugMode` is true
- Fixed timestep prevents timing drift

## Memory Bank Integration

This project uses a comprehensive Memory Bank system for context preservation:

- Core files: `projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`
- Always read memory bank files when starting work
- Update memory bank after significant changes
- Particularly important for understanding architecture decisions and current work focus

## Import Patterns

- Use path alias: `@/` for `src/`
- Barrel exports: Import from component directories via `index.ts`
- Example: `import { GameBoard, DebugPanel } from './components'`

## Debugging Tools

- Enable debug mode: dispatch `{ type: 'SET_DEBUG_MODE', payload: true, frame: 0 }`
- Manual stepping: Access `manualStep()` from `useGameLoop` with `debugMode: true`
- Console logging: Comprehensive state change tracking when debug mode active
- DebugPanel component provides UI controls for all debug features
