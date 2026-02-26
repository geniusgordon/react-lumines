import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAiLoop } from '../useAiLoop';
import { createInitialGameState } from '@/reducers/gameReducer';
import { gameReducer } from '@/reducers/gameReducer';

describe('useAiLoop', () => {
  it('starts disconnected', () => {
    const state = createInitialGameState('test');
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useAiLoop(state, dispatch, { wsUrl: 'ws://localhost:9999' })
    );
    expect(result.current.isConnected).toBe(false);
  });

  it('buildObservation produces correct shape', async () => {
    const { buildObservationFromState } = await import('../useAiLoop');
    let state = createInitialGameState('obs-test');
    state = gameReducer(state, { type: 'START_GAME' });
    state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });
    const obs = buildObservationFromState(state) as Record<string, unknown>;
    expect(obs.board).toHaveLength(10);
    expect((obs.board as number[][])[0]).toHaveLength(16);
    expect(obs.currentBlock).toHaveLength(2);
    expect(typeof obs.timelineX).toBe('number');
    expect(typeof obs.score).toBe('number');
  });
});
