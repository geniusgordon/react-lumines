# Utils Tests Organization

This directory contains organized test files for all utility functions in the Lumines game project. Tests are organized into focused subdirectories for better maintainability and clarity.

## Directory Structure

```
src/utils/__tests__/
├── gameLogic/               # Game logic tests (30 tests)
│   ├── gameLogic.board.test.ts
│   ├── gameLogic.fallingCells.test.ts
│   ├── gameLogic.generation.test.ts
│   ├── gameLogic.gravity.test.ts
│   ├── gameLogic.patterns.test.ts
│   ├── gameLogic.placement.test.ts
│   ├── gameLogic.rotation.test.ts
│   ├── gameLogic.validation.test.ts
│   └── README.md
├── replayUtils/             # Replay system tests (25 tests)
│   ├── replayUtils.validation.test.ts
│   ├── replayUtils.expansion.test.ts
│   ├── replayUtils.compaction.test.ts
│   ├── replayUtils.creation.test.ts
│   ├── replayUtils.integration.test.ts
│   └── README.md
├── seededRNG.test.ts        # Random number generator tests (15 tests)
└── README.md               # This file
```

## Test Categories

### Game Logic Tests (30 tests)
Core game mechanics testing including:
- Board operations and state management
- Block rotation and positioning
- Collision detection and validation
- Block placement and drop mechanics
- Pattern detection (2x2 squares)
- Gravity application and clearing
- Random block generation

### Replay Utils Tests (25 tests)
Replay system functionality testing including:
- Replay data validation
- Data expansion (compact → frame-based)
- Data compaction (recorded → compact)
- Replay data creation
- End-to-end integration scenarios

### Seeded RNG Tests (15 tests)
Deterministic random number generation testing including:
- Seed consistency and reproducibility
- Statistical distribution validation
- Edge case handling

## Running Tests

### Run All Utils Tests
```bash
pnpm test src/utils/__tests__/
```

### Run Tests by Category
```bash
# Game logic tests only
pnpm test src/utils/__tests__/gameLogic/

# Replay utils tests only
pnpm test src/utils/__tests__/replayUtils/

# Seeded RNG tests only
pnpm test src/utils/__tests__/seededRNG.test.ts
```

### Run Specific Test Files
```bash
pnpm test src/utils/__tests__/gameLogic/gameLogic.patterns.test.ts
pnpm test src/utils/__tests__/replayUtils/replayUtils.validation.test.ts
```

## Benefits of This Organization

1. **Logical Grouping** - Related tests are grouped together in subdirectories
2. **Focused Development** - Work on specific functionality without running unrelated tests
3. **Easier Navigation** - Clear directory structure makes finding tests simple
4. **Better Maintenance** - Smaller, focused files are easier to understand and modify
5. **Modular Testing** - Can run test suites independently during development
6. **Clear Documentation** - Each subdirectory has its own README explaining the tests

## Test Coverage Summary

| Category | Tests | Coverage |
|----------|-------|----------|
| Game Logic | 30 | Core game mechanics |
| Replay Utils | 25 | Replay system functionality |
| Seeded RNG | 15 | Deterministic randomization |
| **Total** | **70** | **Complete utils coverage** |

## Integration with Project

These utility tests ensure the reliability of core systems:

- **Deterministic Gameplay**: Game logic tests ensure consistent behavior
- **Replay Functionality**: Replay utils tests guarantee accurate recording/playback
- **Reproducibility**: Seeded RNG tests ensure deterministic random generation

All tests maintain the project's focus on deterministic, frame-based gameplay suitable for competitive play and replay analysis.

## Development Workflow

When working on utilities:

1. **Run relevant test suite** during development
2. **Add tests** for new functionality in appropriate subdirectory
3. **Update README** files when adding new test categories
4. **Run full suite** before committing changes

This organization supports efficient development while maintaining comprehensive test coverage.