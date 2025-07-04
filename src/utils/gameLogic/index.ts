// Helper utilities
export {
  BLOCK_HEIGHT,
  isPlayingState,
  createPosition,
  copyBoard,
  isInBounds,
  coordToString,
  validateAndApplyMove,
} from './helpers';

// Board operations
export { createEmptyBoard, applyGravity } from './board';

// Block mechanics
export {
  generateRandomBlock,
  rotateBlockPattern,
  placeBlockOnBoard,
  canPlaceAnyPartOfBlock,
} from './blocks';

// Collision detection
export { hasCollisionWithFallingColumns, isValidPosition } from './collision';

// Pattern detection & marking
export {
  detectPatterns,
  getPatternsByLeftColumn,
  markColumnCells,
} from './patterns';

// Physics & falling columns
export {
  createFallingColumns,
  findFallingCellsInColumn,
  updateFallingColumns,
  clearMarkedCellsAndApplyGravity,
} from './physics';

// Timeline mechanics & scoring
export {
  updateTimeline,
  advanceTimelineToNextColumn,
  processTimelineColumn,
  markCellsForClearing,
  clearMarkedCellsAndScore,
} from './timeline';

// Position validation
export { findDropPosition } from './validation';
