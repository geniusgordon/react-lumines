# Game Logic Tests Organization

This directory contains focused test files for the game logic utilities. The original monolithic `gameLogic.test.ts` file has been broken down into smaller, more focused test files for better maintainability and clarity.

## Test File Structure

### Core Test Files

1. **`gameLogic.board.test.ts`** - Board Operations
   - Empty board creation
   - Board copying and deep copy validation

2. **`gameLogic.rotation.test.ts`** - Block Rotation
   - Clockwise and counter-clockwise rotation
   - Pattern rotation for different block types

3. **`gameLogic.validation.test.ts`** - Position Validation
   - Valid position checking
   - Out-of-bounds detection
   - Collision detection

4. **`gameLogic.placement.test.ts`** - Block Placement
   - Drop position calculation
   - Partial placement scenarios
   - Game over conditions

5. **`gameLogic.generation.test.ts`** - Random Block Generation
   - Deterministic block generation with seeded RNG
   - Block validity validation

6. **`gameLogic.patterns.test.ts`** - Pattern Detection
   - 2x2 square detection
   - Overlapping pattern detection
   - Multiple pattern scenarios

7. **`gameLogic.gravity.test.ts`** - Gravity and Clearing
   - Basic gravity application
   - Complex gravity scenarios with gaps
   - Square clearing with gravity

### Supporting Files

- **`gameLogic.index.test.ts`** - Main index file that imports all test suites
- **`seededRNG.test.ts`** - Tests for the seeded random number generator

## Running Tests

### Run All Game Logic Tests
```bash
npm test -- src/utils/__tests__/gameLogic.index.test.ts
```

### Run Individual Test Suites
```bash
npm test -- src/utils/__tests__/gameLogic.board.test.ts
npm test -- src/utils/__tests__/gameLogic.rotation.test.ts
npm test -- src/utils/__tests__/gameLogic.validation.test.ts
npm test -- src/utils/__tests__/gameLogic.placement.test.ts
npm test -- src/utils/__tests__/gameLogic.generation.test.ts
npm test -- src/utils/__tests__/gameLogic.patterns.test.ts
npm test -- src/utils/__tests__/gameLogic.gravity.test.ts
```

### Run All Tests in Directory
```bash
npm test -- src/utils/__tests__/
```

## Benefits of This Organization

1. **Focused Testing** - Each file tests a specific aspect of game logic
2. **Easier Maintenance** - Smaller files are easier to understand and modify
3. **Faster Development** - Can run specific test suites during development
4. **Better Documentation** - Test file names clearly indicate what they test
5. **Modular Structure** - Follows the project's component-based architecture

## Test Coverage

All 30 original tests have been preserved and organized into logical groupings:
- Board Operations: 2 tests
- Block Rotation: 3 tests  
- Position Validation: 4 tests
- Block Placement: 4 tests
- Random Block Generation: 2 tests
- Pattern Detection: 8 tests
- Gravity and Clearing: 7 tests

Total: **30 tests** maintaining 100% coverage from the original file. 