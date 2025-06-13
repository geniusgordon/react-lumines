# Active Context - Lumines Game

## Current Work Status
- **Phase**: Phase 1 Complete - Core Foundation ✅
- **Last Updated**: Core architecture and type system implemented
- **Memory Bank**: Up-to-date with Phase 1 completion

## Immediate Next Steps

### 1. Core Architecture Setup ✅ COMPLETED
- [x] Create type definitions in `src/types/game.ts` 
- [x] Implement `SeededRNG` class for deterministic randomness
- [x] Set up game constants in `src/constants/gameConfig.ts`
- [x] Create basic game state structure with useReducer

### 2. Foundation Components
- [ ] `GameBoard` component - 16x10 grid rendering
- [ ] `Block` component - 2x2 tetromino display
- [ ] `GridCell` component - individual board squares
- [ ] Basic styling for game board and blocks

### 3. Core Game Loop
- [ ] `useGameLoop` hook - fixed 60 FPS updates
- [ ] `useControls` hook - keyboard input capture
- [ ] Basic block falling mechanics
- [ ] Collision detection system

## Recent Decisions

### Architecture Choices
- **State Management**: useReducer for complex game state transitions
- **Deterministic Design**: Integer-only positioning, fixed timesteps
- **Component Structure**: Feature-based organization with custom hooks
- **No External Dependencies**: Pure React implementation

### Development Approach
- **Documentation First**: Complete memory bank before coding
- **Storybook Integration**: Component development in isolation
- **TypeScript Strict**: Full type safety from the start
- **Test-Driven**: Plan testing strategy alongside implementation

## Active Considerations

### Technical Challenges
1. **Fixed Timestep Implementation**: Ensuring consistent 16ms intervals
2. **Deterministic Behavior**: Avoiding floating-point precision issues
3. **Rectangle Detection**: Efficient algorithm for same-colored rectangles
4. **Timeline Sweep**: Smooth animation while maintaining determinism

### Design Decisions Pending
- [ ] Color scheme for light/dark blocks
- [ ] Animation timing for rectangle clearing
- [ ] UI layout for score display and controls
- [ ] Visual feedback for invalid moves

## Important Patterns & Preferences

### Code Style
- Functional components with hooks only
- Custom hooks for complex logic extraction
- Immutable state updates
- Clear separation of concerns

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

## Learning & Evolution

### Development Strategy
- Start with core mechanics before polish
- Use Storybook for component-driven development
- Implement replay system early for testing determinism
- Focus on TypeScript types for clear contracts

### Risk Areas
- **Timing Precision**: Fixed timesteps in JavaScript environment
- **Performance**: Maintaining 60 FPS during intensive operations
- **State Complexity**: Managing deterministic game state transitions
- **Rectangle Algorithm**: Efficient detection of clearing patterns

## Next Session Priorities
1. Create basic GameBoard component with grid rendering
2. Implement Block and GridCell components
3. Add basic CSS styling for visual layout
4. Start useGameLoop hook for fixed timestep updates
5. Begin useControls hook for input capture

**Focus Area**: Build visual components and basic rendering before implementing game loop mechanics. 