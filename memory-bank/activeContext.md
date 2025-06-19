# Active Context - Lumines Game

## Current Work Status

- **Phase**: Phase 2+ Complete - Visual Components + Tailwind Integration ✅
- **Last Updated**: Components converted to Tailwind CSS with custom theme
- **Memory Bank**: Up-to-date with Tailwind CSS conversion

## Immediate Next Steps

### 1. Core Architecture Setup ✅ COMPLETED

- [x] Create type definitions in `src/types/game.ts`
- [x] Implement `SeededRNG` class for deterministic randomness
- [x] Set up game constants in `src/constants/gameConfig.ts`
- [x] Create basic game state structure with useReducer

### 2. Visual Components ✅ COMPLETED + ENHANCED

- [x] `GameBoard` component - 16x10 grid rendering
- [x] `Block` component - 2x2 tetromino display
- [x] `GridCell` component - individual board squares
- [x] ~~CSS styling with dark theme and animations~~ **CONVERTED TO TAILWIND**
- [x] Timeline sweep visualization
- [x] Demo app showcasing all components
- [x] **NEW**: Tailwind CSS integration with custom game colors
- [x] **NEW**: CSS-first theme configuration using `@theme` directive
- [x] **NEW**: Utility-first styling approach

### 3. Core Game Loop

- [x] `useGameLoop` hook - fixed 60 FPS updates
- [ ] `useControls` hook - keyboard input capture
- [ ] Basic block falling mechanics
- [ ] Collision detection system

## Recent Decisions

### Architecture Choices

- **State Management**: useReducer for complex game state transitions
- **Deterministic Design**: Integer-only positioning, fixed timesteps
- **Component Structure**: Feature-based organization with custom hooks
- **No External Dependencies**: Pure React implementation
- **Styling**: Tailwind CSS v4 with custom game color theme

### Development Approach

- **Documentation First**: Complete memory bank before coding
- **Storybook Integration**: Component development in isolation
- **TypeScript Strict**: Full type safety from the start
- **Test-Driven**: Plan testing strategy alongside implementation
- **Utility-First CSS**: Tailwind classes with custom theme

## Active Considerations

### Technical Challenges

1. **Fixed Timestep Implementation**: Ensuring consistent 16ms intervals
2. **Deterministic Behavior**: Avoiding floating-point precision issues
3. **Rectangle Detection**: Efficient algorithm for same-colored rectangles
4. **Timeline Sweep**: Smooth animation while maintaining determinism

### Design Decisions Recently Resolved ✅

- [x] **Color scheme for light/dark blocks**: Integrated into Tailwind theme
- [x] **Styling approach**: Converted to Tailwind with custom colors
- [ ] Animation timing for rectangle clearing
- [ ] UI layout for score display and controls
- [ ] Visual feedback for invalid moves

## Important Patterns & Preferences

### Code Style

- Functional components with hooks only
- Custom hooks for complex logic extraction
- Immutable state updates
- Clear separation of concerns
- **NEW**: Tailwind utility classes over CSS modules

### Styling Approach

- **Tailwind v4**: CSS-first configuration with `@theme` directive
- **Custom Colors**: Game-specific palette integrated into Tailwind
- **Utility Classes**: `bg-game-light`, `border-game-grid`, etc.
- **No CSS Files**: Component styles removed, using utilities only
- **Custom Animations**: Keyframes in main CSS for game-specific effects

### Game Design Philosophy

- **Deterministic First**: Every decision prioritizes reproducibility
- **Performance Critical**: 60 FPS is non-negotiable
- **User Experience**: Smooth, responsive controls with clear feedback
- **Minimal UI**: Clean, uncluttered interface focusing on gameplay

## Project Insights

### Key Requirements

- **Deterministic System**: Seeds must produce identical gameplay
- **Replay Functionality**: Full input recording and playback
- **Performance**: Smooth 60 FPS with fixed timesteps
- **Rectangle Clearing**: Core mechanic requiring precise implementation

### Critical Success Factors

1. **Accurate Game Logic**: Rectangle detection and clearing must be perfect
2. **Responsive Controls**: Input lag will ruin the experience
3. **Visual Clarity**: Players must easily distinguish block colors
4. **Deterministic Behavior**: Same seed = same game, always
5. **NEW**: Consistent theming through Tailwind color system

## Learning & Evolution

### Development Strategy

- Start with core mechanics before polish
- Use Storybook for component-driven development
- Implement replay system early for testing determinism
- Focus on TypeScript types for clear contracts
- **NEW**: Leverage Tailwind for consistent design system

### Recent Improvements

- **Tailwind Integration**: Moved from CSS modules to utility-first approach
- **Color System**: Centralized game colors in Tailwind theme
- **Bundle Size**: Reduced by removing component CSS files
- **Maintainability**: Styles co-located with components via utility classes

### Risk Areas

- **Timing Precision**: Fixed timesteps in JavaScript environment
- **Performance**: Maintaining 60 FPS during intensive operations
- **State Complexity**: Managing deterministic game state transitions
- **Rectangle Algorithm**: Efficient detection of clearing patterns

## Next Session Priorities

1. ✅ ~~Tailwind CSS conversion~~ **COMPLETED**
2. Start useGameLoop hook for fixed timestep updates
3. Begin useControls hook for input capture
4. Implement basic block falling mechanics
5. Add collision detection system

**Focus Area**: With visual components and styling complete, focus shifts to core game mechanics and the game loop implementation.
