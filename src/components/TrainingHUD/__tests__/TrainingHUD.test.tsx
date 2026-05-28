import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TrainingHUD } from '@/components/TrainingHUD';
import { createInitialGameState } from '@/reducers/gameState/initialState';

function baseState() {
  return createInitialGameState('hud-seed', false, 'training');
}

describe('TrainingHUD practice controls', () => {
  it('dispatches SET_PRACTICE_SPEED when a preset is clicked', () => {
    const dispatch = vi.fn();
    render(<TrainingHUD gameState={baseState()} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('button', { name: '0.5x' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PRACTICE_SPEED',
      payload: 0.5,
    });
  });

  it('dispatches SET_PRACTICE_AUTO_SWEEP when the toggle is clicked', () => {
    const dispatch = vi.fn();
    render(<TrainingHUD gameState={baseState()} dispatch={dispatch} />);

    fireEvent.click(screen.getByRole('switch', { name: /auto sweep/i }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PRACTICE_AUTO_SWEEP',
      payload: true,
    });
  });

  it('highlights the currently selected speed preset', () => {
    const state = baseState();
    state.practice = { speedMultiplier: 2, autoSweep: false };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);

    const selected = screen.getByRole('button', { name: '2x' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});
