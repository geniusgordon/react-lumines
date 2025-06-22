# Active Context - Lumines Game

## Current Work Status

- **Phase**: Enhanced Game Over Logic Complete ✅
- **Last Updated**: Enhanced game over logic implemented and all tests passing (122/122)
- **Memory Bank**: Updated with enhanced game over implementation details

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

### 3. Core Game Loop ✅ COMPLETED

- [x] `useGameLoop` hook - fixed 60 FPS updates
- [x] `useControls` hook - keyboard input capture
- [x] Basic block falling mechanics
- [x] Collision detection system

### 4. Timeline Mechanics - NEXT FOCUS

- [x] Timeline sweep animation ✅
- [ ] **Square Detection**: Find same-colored 2×2+ regions
- [ ] **Square Marking**: Mark squares but keep them on board
- [ ] **Timeline Clearing**: Clear marked squares when sweep passes through
- [ ] **Scoring**: 1 point per 2×2 square cleared

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

1. **Fixed Timestep Implementation**: Ensuring consistent 16ms intervals ✅ SOLVED
2. **Deterministic Behavior**: Avoiding floating-point precision issues ✅ SOLVED  
3. **Enhanced Game Over Logic**: More permissive block placement logic ✅ SOLVED
4. **Square Detection & Marking**: Core Lumines mechanic - mark squares but keep on board
5. **Timeline-Based Clearing**: Only clear when sweep passes through marked areas
6. **Rhythm Mechanics**: Creating the strategic timing element unique to Lumines

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

## Recent Accomplishments

### Enhanced Game Over Logic ✅ COMPLETE

- **New Functions Implemented**: 
  - `canPlaceAnyPartOfBlock()` - Tests if any part of a 2×2 block can be placed
  - `isGameOverEnhanced()` - Only triggers game over when NO placement is possible anywhere
  - `placeBlockOnBoardPartial()` - Places only cells that fit, discards out-of-bounds cells
- **Game Reducer Updates**: 
  - Modified to use enhanced logic for more optimal gameplay
  - Fixed frame propagation bug in block placement functions
- **Test Coverage**: All 122 tests passing including comprehensive enhanced game over tests
- **Gameplay Impact**: Players can continue playing longer, only stopping when truly impossible

## Next Session Priorities

1. **Square Marking System**: Mark detected squares but keep them visible on board
2. **Timeline Integration**: Clear marked squares only when timeline sweep passes through
3. **Scoring Implementation**: Simple 1 point per 2×2 square system
4. **Visual Feedback**: Show marked squares differently from regular blocks
5. **Polish & Testing**: Animation polish and performance optimization

**Focus Area**: Complete the core Lumines timeline rhythm - the delay between square formation and clearing that creates the unique strategic timing element.
