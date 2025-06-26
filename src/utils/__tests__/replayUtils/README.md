# Replay Utils Tests Organization

This directory contains focused test files for the replay utilities. The original monolithic `replayUtils.test.ts` file has been broken down into smaller, more focused test files for better maintainability and clarity.

## Test File Structure

### Core Test Files

1. **`replayUtils.validation.test.ts`** - Replay Data Validation (9 tests)
   - Valid replay data acceptance
   - Structure validation (null/undefined, missing fields)
   - Input validation (invalid structure, action types)
   - Frame validation (negative numbers, chronological ordering)
   - Multiple actions per frame support

2. **`replayUtils.expansion.test.ts`** - Replay Data Expansion (5 tests)
   - Empty replay data handling
   - Single action expansion with frame gaps
   - Multiple actions per frame expansion
   - Action payload preservation
   - Frame sequence generation

3. **`replayUtils.compaction.test.ts`** - Replay Input Compaction (5 tests)
   - Empty input array handling
   - TICK action filtering and frame calculation
   - Multiple user actions before TICK
   - TICK-only input scenarios
   - Payload preservation during compaction

4. **`replayUtils.creation.test.ts`** - Replay Data Creation (4 tests)
   - Replay data creation with compaction
   - Empty input handling
   - Unique timestamp generation
   - Proper structure validation

5. **`replayUtils.integration.test.ts`** - End-to-End Integration (2 tests)
   - Full roundtrip: compact → expand → validate
   - Complex replay scenarios with mixed patterns

## Function Coverage

### `validateReplayData()`
- Comprehensive validation of replay data structure
- Input validation with detailed error reporting
- Action type validation against allowed game actions
- Frame ordering and chronological validation

### `expandReplayData()`
- Converts compact replay data to frame-based structure
- Handles gaps in frame sequences
- Preserves action payloads and timing
- Generates consistent frame sequences with TICK actions

### `compactReplayInputs()`
- Filters out TICK actions from recorded inputs
- Calculates correct frame numbers based on TICK positions
- Preserves user action payloads
- Handles edge cases (empty inputs, TICK-only sequences)

### `createReplayData()`
- Creates complete replay data structure
- Integrates compaction with metadata generation
- Generates unique timestamps and version info
- Validates final structure

## Running Tests

### Run All Replay Utils Tests
```bash
pnpm test src/utils/__tests__/replayUtils/
```

### Run Individual Test Suites
```bash
pnpm test src/utils/__tests__/replayUtils/replayUtils.validation.test.ts
pnpm test src/utils/__tests__/replayUtils/replayUtils.expansion.test.ts
pnpm test src/utils/__tests__/replayUtils/replayUtils.compaction.test.ts
pnpm test src/utils/__tests__/replayUtils/replayUtils.creation.test.ts
pnpm test src/utils/__tests__/replayUtils/replayUtils.integration.test.ts
```

### Run Specific Test Categories
```bash
# Validation tests only
pnpm test src/utils/__tests__/replayUtils/replayUtils.validation.test.ts

# Data processing tests (expansion + compaction)
pnpm test src/utils/__tests__/replayUtils/replayUtils.expansion.test.ts src/utils/__tests__/replayUtils/replayUtils.compaction.test.ts

# Integration tests
pnpm test src/utils/__tests__/replayUtils/replayUtils.integration.test.ts
```

## Benefits of This Organization

1. **Focused Testing** - Each file tests a specific aspect of replay utilities
2. **Easier Maintenance** - Smaller files are easier to understand and modify
3. **Faster Development** - Can run specific test suites during development
4. **Better Documentation** - Test file names clearly indicate functionality
5. **Modular Structure** - Follows the project's component-based architecture
6. **Clear Separation** - Validation, processing, and integration concerns are separate

## Test Coverage

All 25 original tests have been preserved and organized into logical groupings:
- Validation: 9 tests
- Expansion: 5 tests
- Compaction: 5 tests
- Creation: 4 tests
- Integration: 2 tests

Total: **25 tests** maintaining 100% coverage from the original file.

## Integration with Game System

These utilities are core to the replay system functionality:
- **Recording**: `useReplayRecorder` uses compaction functions
- **Playback**: `useReplayPlayer` uses validation and expansion functions
- **Data Flow**: Record → Compact → Validate → Expand → Playback

The tests ensure deterministic behavior critical for replay functionality in the Lumines game engine.