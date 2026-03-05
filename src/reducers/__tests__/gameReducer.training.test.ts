import { describe, it, expect } from 'vitest';

import { gameReducer } from '@/reducers/gameReducer';
import { createInitialGameState } from '@/reducers/gameState/initialState';
import type { GameState } from '@/types/game';

function makeTrainingState() {
  const s = createInitialGameState('test-seed', false, 'training');
  return { ...s, status: 'playing' as const };
}

describe('training mode tick', () => {
  it('does not advance the timeline when mode is training', () => {
    const state = makeTrainingState();
    const initialTimelineX = state.timeline.x;

    // Run enough ticks to normally advance the timeline
    let s: GameState = state;
    for (let i = 0; i < state.timeline.sweepInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.timeline.x).toBe(initialTimelineX);
  });

  it('does not auto-drop the block when mode is training', () => {
    const state = makeTrainingState();
    const initialY = state.blockPosition.y;

    let s: GameState = state;
    for (let i = 0; i < state.dropInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.blockPosition.y).toBe(initialY);
  });

  it('does not count down game timer when mode is training', () => {
    const state = makeTrainingState();
    const initialTimer = state.gameTimer;

    let s: GameState = state;
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.gameTimer).toBe(initialTimer);
  });
});

describe('training mode undo stack', () => {
  it('pushes a snapshot to undoStack on HARD_DROP in training mode', () => {
    const state = makeTrainingState();
    expect(state.undoStack).toHaveLength(0);

    const after = gameReducer(state, { type: 'HARD_DROP' });

    expect(after.undoStack).toHaveLength(1);
    // Snapshot should not contain its own undo stack
    expect(after.undoStack[0].undoStack).toHaveLength(0);
  });

  it('does not push undo snapshot in normal mode', () => {
    const state = {
      ...createInitialGameState('test-seed', false, 'normal'),
      status: 'playing' as const,
    };
    const after = gameReducer(state, { type: 'HARD_DROP' });
    expect(after.undoStack).toHaveLength(0);
  });

  it('caps undoStack at 20 entries', () => {
    let s: GameState = makeTrainingState();
    // Drop 25 blocks
    for (let i = 0; i < 25; i++) {
      s = gameReducer(s, { type: 'HARD_DROP' });
      if (s.status === 'gameOver') {
        break;
      }
    }
    expect(s.undoStack.length).toBeLessThanOrEqual(20);
  });
});

describe('MANUAL_SWEEP', () => {
  it('clears all detected patterns and updates score', () => {
    // Build a state with a known pattern on the board
    const s = makeTrainingState();
    // Place 2x2 same-color block manually by setting board cells
    const board = s.board.map(row => [...row]);
    board[8][0] = 1;
    board[8][1] = 1;
    board[9][0] = 1;
    board[9][1] = 1;
    const stateWithPattern = gameReducer({ ...s, board }, { type: 'TICK' });
    expect(stateWithPattern.detectedPatterns.length).toBeGreaterThan(0);

    const swept = gameReducer(stateWithPattern, { type: 'MANUAL_SWEEP' });

    expect(swept.detectedPatterns).toHaveLength(0);
    expect(swept.score).toBeGreaterThan(0);
    expect(swept.markedCells).toHaveLength(0);
  });

  it('is a no-op when no patterns exist', () => {
    const s = makeTrainingState();
    const swept = gameReducer(s, { type: 'MANUAL_SWEEP' });
    expect(swept).toBe(s); // same reference = no change
  });
});

describe('UNDO', () => {
  it('restores state to before last hard drop', () => {
    const s = makeTrainingState();
    const boardBefore = s.board;
    const afterDrop = gameReducer(s, { type: 'HARD_DROP' });
    const afterUndo = gameReducer(afterDrop, { type: 'UNDO' });

    expect(afterUndo.board).toEqual(boardBefore);
    expect(afterUndo.undoStack).toHaveLength(0);
  });

  it('is a no-op when undoStack is empty', () => {
    const s = makeTrainingState();
    const result = gameReducer(s, { type: 'UNDO' });
    expect(result).toBe(s);
  });
});
