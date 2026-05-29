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
    const state = {
      ...baseState(),
      practice: { speedMultiplier: 0.75 as const, autoSweep: false },
    };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);

    const selected = screen.getByRole('button', { name: '0.75x' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('TrainingHUD color balance', () => {
  it('renders a light-heavy balance value from spawnedBlocks', () => {
    // pattern 0 = all-light; four of them => 16 light, 0 dark, delta +16
    const state = { ...baseState(), spawnedBlocks: [0, 0, 0, 0] };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);
    const node = screen.getByTestId('color-balance-value');
    expect(node.textContent).toContain('L');
    expect(node.textContent).toContain('16');
  });

  it('shows a neutral balance when light and dark are equal', () => {
    // pattern 0 = all-light (4), pattern 15 = all-dark (4) => delta 0
    const state = { ...baseState(), spawnedBlocks: [0, 15] };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);
    expect(screen.getByTestId('color-balance-value').textContent).toContain(
      '0'
    );
  });
});
