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
  // Build a board with a given number of light (1) and dark (2) cells.
  function boardWith(light: number, dark: number) {
    const board = baseState().board.map(row => [...row]);
    let placed = 0;
    for (let y = 0; y < board.length && placed < light; y++) {
      for (let x = 0; x < board[y].length && placed < light; x++) {
        board[y][x] = 1;
        placed++;
      }
    }
    placed = 0;
    // Place dark cells on a separate row to avoid overwriting light ones.
    const darkRow = board.length - 1;
    for (let x = 0; x < board[darkRow].length && placed < dark; x++) {
      board[darkRow][x] = 2;
      placed++;
    }
    return board;
  }

  it('renders a light-heavy balance value from the board', () => {
    // 6 light, 0 dark => delta +6
    const state = { ...baseState(), board: boardWith(6, 0) };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);
    const node = screen.getByTestId('color-balance-value');
    expect(node.textContent).toContain('L');
    expect(node.textContent).toContain('6');
  });

  it('shows a neutral balance when light and dark are equal', () => {
    // 3 light, 3 dark => delta 0
    const state = { ...baseState(), board: boardWith(3, 3) };
    render(<TrainingHUD gameState={state} dispatch={() => {}} />);
    expect(screen.getByTestId('color-balance-value').textContent).toContain(
      '0'
    );
  });
});
