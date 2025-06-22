# Game Reducer Tests

This directory contains organized test suites for the game reducer functionality. The tests have been broken down into focused modules for better maintainability and readability.

## Test Organization

### 📁 File Structure

- **`gameReducer.basic.test.ts`** - Core functionality tests (15 tests)
- **`gameReducer.movement.test.ts`** - Block movement and control tests (14 tests)  
- **`gameReducer.gameplay.test.ts`** - Gameplay mechanics tests (18 tests)
- **`gameReducer.timeline.test.ts`** - Timeline processing tests (14 tests)

### 🧪 Test Categories

#### Basic Functionality (`gameReducer.basic.test.ts`)
- Initial state creation and validation
- Game flow actions (start, pause, resume, restart, game over)
- Debug mode toggling
- Error handling and edge cases
- State immutability guarantees

#### Block Movement (`gameReducer.movement.test.ts`)
- Left/right movement with boundary detection
- Clockwise/counter-clockwise rotation
- Soft drop and hard drop mechanics
- Collision detection
- Game state validation for movement actions

#### Gameplay Mechanics (`gameReducer.gameplay.test.ts`)
- Game tick progression and timing
- Automatic block dropping
- Timeline movement and wrapping
- Gravity application
- Pattern detection (2x2 squares, larger rectangles)
- Block placement and queue management

#### Timeline Processing (`gameReducer.timeline.test.ts`)
- Column-by-column timeline processing
- Pattern marking and score accumulation
- Cell clearing logic with timing constraints
- Complex clearing scenarios
- Timeline edge cases and wrapping
- Variable timeline speeds

## Running Tests

```bash
# Run all reducer tests
npm test -- src/reducers/__tests__/

# Run specific test category
npm test -- src/reducers/__tests__/gameReducer.basic.test.ts
npm test -- src/reducers/__tests__/gameReducer.movement.test.ts
npm test -- src/reducers/__tests__/gameReducer.gameplay.test.ts
npm test -- src/reducers/__tests__/gameReducer.timeline.test.ts
```

## Test Coverage

Total: **122 tests** covering all aspects of the game reducer

This organization makes it easier to:
- Navigate to relevant tests for specific functionality
- Add new tests in logical groupings
- Maintain and update test suites
- Debug specific game mechanics
- Onboard new developers to the codebase 