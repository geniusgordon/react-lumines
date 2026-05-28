import { describe, it, expect } from 'vitest';

import { gameReducer } from '@/reducers/gameReducer';
import { createInitialGameState } from '@/reducers/gameState/initialState';
import type { GameState } from '@/types/game';

function makeTrainingState() {
  const s = createInitialGameState('test-seed', false, 'training');
  return { ...s, status: 'playing' as const };
}

describe('training mode tick', () => {
  it('does not count down game timer when mode is training and autoSweep is off', () => {
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

describe('training mode practice settings', () => {
  it('initializes practice with defaults in training mode', () => {
    const s = createInitialGameState('seed', false, 'training');
    expect(s.practice).toEqual({ speedMultiplier: 1, autoSweep: false });
  });

  it('does not initialize practice in normal mode', () => {
    const s = createInitialGameState('seed', false, 'normal');
    expect(s.practice).toBeUndefined();
  });
});

describe('SET_PRACTICE_SPEED', () => {
  it('updates speedMultiplier and scales dropInterval and sweepInterval', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r.practice?.speedMultiplier).toBe(0.5);
    expect(r.dropInterval).toBe(180); // 90 / 0.5
    expect(r.timeline.sweepInterval).toBe(30); // 15 / 0.5
  });

  it('rounds non-integer sweep intervals (2x => 8)', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 2,
    });
    expect(r.dropInterval).toBe(45);
    expect(r.timeline.sweepInterval).toBe(8); // round(15 / 2)
  });

  it('scales remaining gameTimer when autoSweep is on', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 3600,
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    // Going from 1x to 0.5x doubles the remaining timer
    expect(r.gameTimer).toBe(7200);
  });

  it('does not scale gameTimer when autoSweep is off', () => {
    const s = makeTrainingState();
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r.gameTimer).toBe(s.gameTimer);
  });

  it('is a no-op in normal mode', () => {
    const s = { ...createInitialGameState('seed', false, 'normal'), status: 'playing' as const };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
    expect(r).toBe(s);
  });
});

describe('training mode tick honors practice settings', () => {
  it('auto-drops the block in training mode (scaled drop interval)', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
    };
    const initialY = s.blockPosition.y;

    let t: GameState = s;
    for (let i = 0; i < s.dropInterval + 1; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.blockPosition.y).toBeGreaterThan(initialY);
  });

  it('does not advance the timeline when autoSweep is off', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
    };
    let t: GameState = s;
    for (let i = 0; i < s.timeline.sweepInterval + 5; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.timeline.x).toBe(s.timeline.x);
  });

  it('advances the timeline when autoSweep is on', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
    };
    let t: GameState = s;
    for (let i = 0; i < s.timeline.sweepInterval + 1; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.timeline.x).toBe(s.timeline.x + 1);
  });

  it('counts down gameTimer when autoSweep is on', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 100,
    };
    let t: GameState = s;
    for (let i = 0; i < 10; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.gameTimer).toBe(90);
  });

  it('does not count down gameTimer when autoSweep is off', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: false },
      gameTimer: 100,
    };
    let t: GameState = s;
    for (let i = 0; i < 10; i++) {
      t = gameReducer(t, { type: 'TICK' });
    }
    expect(t.gameTimer).toBe(100);
  });
});

describe('SET_PRACTICE_AUTO_SWEEP', () => {
  it('enables autoSweep and resets gameTimer to scaled full duration', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 0.5, autoSweep: false },
      gameTimer: 0,
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
    expect(r.practice?.autoSweep).toBe(true);
    expect(r.gameTimer).toBe(7200); // 3600 / 0.5
  });

  it('disables autoSweep without touching gameTimer or timeline.x', () => {
    const base = makeTrainingState();
    const s: GameState = {
      ...base,
      practice: { speedMultiplier: 1, autoSweep: true },
      gameTimer: 1234,
      timeline: { ...base.timeline, x: 5 },
    };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: false,
    });
    expect(r.practice?.autoSweep).toBe(false);
    expect(r.gameTimer).toBe(1234);
    expect(r.timeline.x).toBe(5);
  });

  it('is a no-op in normal mode', () => {
    const s = { ...createInitialGameState('seed', false, 'normal'), status: 'playing' as const };
    const r = gameReducer(s, {
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
    expect(r).toBe(s);
  });
});
