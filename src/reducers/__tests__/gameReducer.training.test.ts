import { describe, it, expect } from 'vitest';
import { gameReducer } from '@/reducers/gameReducer';
import { createInitialGameState } from '@/reducers/gameState/initialState';

function makeTrainingState() {
  const s = createInitialGameState('test-seed', false, 'training');
  return { ...s, status: 'playing' as const };
}

describe('training mode tick', () => {
  it('does not advance the timeline when mode is training', () => {
    const state = makeTrainingState();
    const initialTimelineX = state.timeline.x;

    // Run enough ticks to normally advance the timeline
    let s = state;
    for (let i = 0; i < state.timeline.sweepInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.timeline.x).toBe(initialTimelineX);
  });

  it('does not auto-drop the block when mode is training', () => {
    const state = makeTrainingState();
    const initialY = state.blockPosition.y;

    let s = state;
    for (let i = 0; i < state.dropInterval + 5; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.blockPosition.y).toBe(initialY);
  });

  it('does not count down game timer when mode is training', () => {
    const state = makeTrainingState();
    const initialTimer = state.gameTimer;

    let s = state;
    for (let i = 0; i < 10; i++) {
      s = gameReducer(s, { type: 'TICK' });
    }

    expect(s.gameTimer).toBe(initialTimer);
  });
});
