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

## Game Loop Architecture Deep Dive

### The Hybrid Approach: RAF + Fixed Timestep

Our game loop uses a sophisticated hybrid approach that combines `requestAnimationFrame` with fixed timestep logic to achieve deterministic 60 FPS gameplay.

#### Why Not setTimeout Alone?
```typescript
// ❌ AVOID: setTimeout-only approach
setInterval(() => gameUpdate(), 16.67); // Problems:
```
- **Timing drift**: Accumulates inaccuracies over time
- **Browser throttling**: Gets throttled when tab inactive (breaks determinism)  
- **Less efficient**: Not optimized for animations

#### Why Not requestAnimationFrame Alone?
```typescript
// ❌ AVOID: RAF-only approach  
function gameLoop() {
  gameUpdate(); // Runs at display refresh rate
  requestAnimationFrame(gameLoop);
}
```
- **Variable framerate**: Tied to display refresh (60Hz, 120Hz, 144Hz)
- **Non-deterministic**: Same game on different monitors = different behavior
- **Replay incompatibility**: Same inputs produce different results

#### Our Solution: The Best of Both Worlds
```typescript
// ✅ HYBRID APPROACH
const gameLoop = (currentTime) => {
  const deltaTime = currentTime - lastTime;
  accumulator += Math.min(deltaTime, maxFrameSkip * 16.67); // Debt cap
  
  while (accumulator >= 16.67 && updates < maxFrameSkip) {
    gameUpdate(); // ALWAYS exactly 60 FPS logic
    accumulator -= 16.67;
    updates++;
  }
  
  requestAnimationFrame(gameLoop); // Efficient rendering
};
```

### Spiral of Death Prevention

#### The Problem
Performance hiccups can create a catastrophic feedback loop:

1. **Normal**: Frame takes 16.67ms → 1 update
2. **Hiccup**: Frame takes 200ms → 12 updates queued  
3. **Cascade**: 12 updates take 300ms → 18 updates queued
4. **Death Spiral**: Game becomes completely unplayable

#### Our Protection Mechanisms

**1. Debt Capping (`maxFrameSkip`)**
```typescript
// Cap how much "debt" we can accumulate
accumulator += Math.min(deltaTime, FRAME_INTERVAL_MS * maxFrameSkip);
// If browser freezes for 2000ms, we only add ~83ms of debt (5 frames)
```

**2. Update Limiting**
```typescript
let updatesThisFrame = 0;
while (accumulator >= 16.67 && updatesThisFrame < 5) {
  gameUpdate();
  updatesThisFrame++; // Never more than 5 updates per frame
}
```

#### Behavior Under Stress

| Scenario | Without Protection | With Protection (maxFrameSkip=5) |
|----------|-------------------|-----------------------------------|
| Normal (16ms) | 1 update ✅ | 1 update ✅ |
| Slow (50ms) | 3 updates ✅ | 3 updates ✅ |  
| Very slow (200ms) | 12 updates 😰 | 5 updates max ✅ |
| Browser freeze (2000ms) | 120 updates 💀 | 5 updates max ✅ |

**Result**: Game stays playable even during performance crises!

### Cross-Platform Determinism

This architecture ensures identical behavior across all devices:

```
120Hz Monitor Example:
RAF at 0ms    → accumulator = 8.33ms  → 0 game updates
RAF at 8.33ms → accumulator = 16.66ms → 1 game update  
RAF at 16.66ms → accumulator = 8.32ms → 0 game updates
RAF at 25ms   → accumulator = 16.67ms → 1 game update

Result: Perfect 60 FPS game logic on any refresh rate display!
```

This is **essential** for Lumines because:
- **Replay system**: Must be frame-perfect for save/load
- **Competitive gameplay**: Players expect consistent timing  
- **Cross-device play**: Same seed must produce identical games
- **Rectangle detection**: Timing-sensitive clearing algorithms
