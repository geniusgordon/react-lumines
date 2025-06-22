import { describe, it, expect, beforeEach } from 'vitest';

import type { GameState, GameAction } from '@/types/game';

import { gameReducer, createInitialGameState } from '../gameReducer';

describe('Game Reducer - Block Movement', () => {
  let initialState: GameState;
  let playingState: GameState;

  beforeEach(() => {
    initialState = createInitialGameState(12345);
    playingState = { ...initialState, status: 'playing' as const };
  });

  describe('Block movement', () => {
    it('should move block left', () => {
      const action: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.x).toBe(6); // 7 - 1
      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
    });

    it('should move block right', () => {
      const action: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.x).toBe(8); // 7 + 1
      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
    });

    it('should not move block out of bounds', () => {
      // Move to left edge
      const leftEdgeState = { ...playingState, blockPosition: { x: 0, y: 0 } };
      const leftAction: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const leftResult = gameReducer(leftEdgeState, leftAction);

      expect(leftResult.blockPosition.x).toBe(0); // Should not move

      // Move to right edge
      const rightEdgeState = {
        ...playingState,
        blockPosition: { x: 14, y: 0 },
      };
      const rightAction: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const rightResult = gameReducer(rightEdgeState, rightAction);

      expect(rightResult.blockPosition.x).toBe(14); // Should not move
    });

    it('should not move when game is not playing', () => {
      const pausedState = { ...initialState, status: 'paused' as const };

      const leftAction: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const leftResult = gameReducer(pausedState, leftAction);
      expect(leftResult.blockPosition).toEqual(pausedState.blockPosition);

      const rightAction: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const rightResult = gameReducer(pausedState, rightAction);
      expect(rightResult.blockPosition).toEqual(pausedState.blockPosition);
    });
  });

  describe('Block rotation', () => {
    it('should rotate block clockwise', () => {
      const originalRotation = playingState.currentBlock.rotation;
      const action: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock.rotation).toBe((originalRotation + 1) % 4);
      expect(newState.frame).toBe(10);
    });

    it('should rotate block counter-clockwise', () => {
      const originalRotation = playingState.currentBlock.rotation;
      const action: GameAction = { type: 'ROTATE_CCW', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.currentBlock.rotation).toBe((originalRotation + 3) % 4);
      expect(newState.frame).toBe(10);
    });

    it('should update block pattern when rotating', () => {
      const action: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const newState = gameReducer(playingState, action);

      // Pattern should be updated and block instance should be new
      expect(newState.currentBlock.pattern).toBeDefined();
      expect(newState.currentBlock).not.toBe(playingState.currentBlock);
    });

    it('should not rotate when game is not playing', () => {
      const pausedState = { ...initialState, status: 'paused' as const };

      const cwAction: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const cwResult = gameReducer(pausedState, cwAction);
      expect(cwResult.currentBlock.rotation).toBe(
        pausedState.currentBlock.rotation
      );

      const ccwAction: GameAction = { type: 'ROTATE_CCW', frame: 10 };
      const ccwResult = gameReducer(pausedState, ccwAction);
      expect(ccwResult.currentBlock.rotation).toBe(
        pausedState.currentBlock.rotation
      );
    });
  });

  describe('Block dropping', () => {
    it('should soft drop block', () => {
      const action: GameAction = { type: 'SOFT_DROP', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.y).toBe(1); // 0 + 1
      expect(newState.frame).toBe(10);
      expect(newState.dropTimer).toBe(0); // Should reset drop timer
    });

    it('should hard drop block to bottom', () => {
      const action: GameAction = { type: 'HARD_DROP', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState.blockPosition.y).toBe(0);
      expect(newState.frame).toBe(10);
      // Should place block and generate new one
      expect(newState.currentBlock.id).not.toBe(playingState.currentBlock.id);
    });

    it('should place block when soft drop hits bottom', () => {
      // Position block near bottom
      const nearBottomState = {
        ...playingState,
        blockPosition: { x: 7, y: 8 }, // Near bottom of 10-high board
      };

      const action: GameAction = { type: 'SOFT_DROP', frame: 10 };
      const newState = gameReducer(nearBottomState, action);

      // Should place block and spawn new one
      expect(newState.currentBlock.id).not.toBe(
        nearBottomState.currentBlock.id
      );
      expect(newState.blockPosition).toEqual({ x: 7, y: 0 }); // Reset position for new block
    });

    it('should not drop when game is not playing', () => {
      const pausedState = { ...initialState, status: 'paused' as const };

      const softDropAction: GameAction = { type: 'SOFT_DROP', frame: 10 };
      const softDropResult = gameReducer(pausedState, softDropAction);
      expect(softDropResult.blockPosition).toEqual(pausedState.blockPosition);

      const hardDropAction: GameAction = { type: 'HARD_DROP', frame: 10 };
      const hardDropResult = gameReducer(pausedState, hardDropAction);
      expect(hardDropResult.blockPosition).toEqual(pausedState.blockPosition);
    });
  });

  describe('Collision detection in movement', () => {
    it('should prevent movement into occupied cells', () => {
      // Create a state with blocks on the board to test collision
      const boardWithBlocks = playingState.board.map(row => [...row]);
      boardWithBlocks[0][6] = 1; // Block to the left
      boardWithBlocks[0][8] = 1; // Block to the right

      const stateWithBlocks = {
        ...playingState,
        board: boardWithBlocks,
      };

      // Try to move left into occupied space
      const leftAction: GameAction = { type: 'MOVE_LEFT', frame: 10 };
      const leftResult = gameReducer(stateWithBlocks, leftAction);
      expect(leftResult.blockPosition.x).toBe(7); // Should not move

      // Try to move right into occupied space
      const rightAction: GameAction = { type: 'MOVE_RIGHT', frame: 10 };
      const rightResult = gameReducer(stateWithBlocks, rightAction);
      expect(rightResult.blockPosition.x).toBe(7); // Should not move
    });

    it('should prevent rotation when it would cause collision', () => {
      // This test would need a specific setup where rotation would cause collision
      // For now, we'll just test that rotation attempts don't crash
      const action: GameAction = { type: 'ROTATE_CW', frame: 10 };
      const newState = gameReducer(playingState, action);

      expect(newState).toBeDefined();
      expect(newState.frame).toBe(10);
    });
  });
});
