# System Patterns - Lumines Game Architecture

## Architecture Overview

### Component Hierarchy

```
App
├── GameScreen
│   ├── GameBoard
│   │   ├── Block (falling piece)
│   │   ├── GridCell (board positions)
│   │   └── Timeline (sweep line)
│   ├── ScoreDisplay
│   ├── BlockQueue (preview multiple upcoming blocks)
│   └── Controls
├── StartScreen
├── GameOverScreen
└── ReplayControls
```

### State Management Pattern

- **Central State**: Single game state managed by useReducer
- **Action-based**: All changes through dispatched actions
- **Immutable Updates**: State never mutated directly
- **Deterministic**: Same actions always produce same state

### Custom Hooks Architecture

```typescript
// Core game logic hooks
useGameLoop(gameState, dispatch); // Fixed 60 FPS updates
useControls(dispatch, isRecording); // Input capture & recording
useSeededRNG(seed); // Deterministic randomness
useTimeline(gameState); // Rectangle clearing logic
useReplay(replayData); // Playback functionality
```

## Key Technical Decisions

### Deterministic System Design

- **Integer-only coordinates**: No floating-point positioning
- **Fixed timesteps**: 16ms intervals (60 FPS), no deltaTime
- **Seeded randomization**: Custom RNG class for reproducible sequences
- **Frame-based timing**: All events measured in frame counts
- **Input logging**: Every action recorded with frame timestamp

### Game State Structure

```typescript
interface GameState {
  board: number[][]; // 2D grid (0=empty, 1=light, 2=dark)
  currentBlock: Block; // Falling piece
  queue: Block[]; // Preview blocks queue
  position: { x: number; y: number }; // Current block position
  score: number; // Player score
  frame: number; // Current frame counter
  timeline: { x: number; speed: number }; // Sweep line position
  gameStatus: 'playing' | 'paused' | 'gameOver';
  rng: SeededRNG; // Random number generator
}
```

### Block Representation

```typescript
interface Block {
  pattern: number[][]; // 2x2 color pattern
  rotation: 0 | 1 | 2 | 3; // Current rotation state
  id: string; // Unique identifier
}
```

## Design Patterns in Use

### 1. Command Pattern (Input System)

```typescript
interface GameAction {
  type:
    | 'MOVE_LEFT'
    | 'MOVE_RIGHT'
    | 'ROTATE_CW'
    | 'ROTATE_CCW'
    | 'SOFT_DROP'
    | 'HARD_DROP';
  frame: number; // When action occurred
  payload?: any; // Additional data
}
```

### 2. State Machine Pattern (Game States)

```typescript
type GameStatus = 'start' | 'playing' | 'paused' | 'gameOver' | 'replay';
// State transitions handled by reducer with clear rules
```

### 3. Observer Pattern (Game Events)

```typescript
// Custom events for game milestones
useEffect(() => {
  if (rectanglesCleared > 0) {
    onRectanglesCleared(rectanglesCleared);
  }
}, [rectanglesCleared]);
```

### 4. Factory Pattern (Block Generation)

```typescript
class BlockFactory {
  constructor(private rng: SeededRNG) {}

  createBlock(): Block {
    // Generate deterministic block patterns
  }
}
```

## Component Relationships

### Data Flow

1. **Input**: useControls captures keyboard input
2. **Actions**: Input converted to game actions
3. **State**: useReducer processes actions → new state
4. **Rendering**: Components receive state props
5. **Effects**: Side effects trigger on state changes

### Critical Implementation Paths

#### Block Movement

1. Input captured by useControls
2. Action dispatched to reducer
3. Collision detection validates move
4. State updated if valid
5. UI re-renders with new position

#### Rectangle Clearing

1. Timeline position updates each frame
2. Rectangle detection scans current timeline column
3. Matching rectangles marked for removal
4. Gravity applied to remaining blocks
5. Score updated based on cleared area

#### Replay System

1. All inputs logged with frame timestamps
2. Game state snapshots taken at intervals
3. Playback reconstructs state from actions
4. Verification ensures deterministic behavior

## Performance Optimizations

- **Selective rendering**: Only changed cells re-render
- **Memoization**: Expensive calculations cached
- **Frame skipping**: Maintain 60 FPS target
- **Efficient collision detection**: Early exit conditions
