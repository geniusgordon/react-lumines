"""
test_gravity.py — Port of gameLogic.gravity.test.ts + gameLogic.fallingCells.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.constants import BOARD_HEIGHT
from python.game.board import create_empty_board
from python.game.physics import (
    create_falling_columns,
    clear_marked_cells_and_apply_gravity,
)
from python.game.types import Square, FallingColumn, FallingCell


# ---------------------------------------------------------------------------
# Falling cells tests (gameLogic.fallingCells.test.ts)
# ---------------------------------------------------------------------------

def test_create_falling_cells_basic():
    board = create_empty_board()
    # Column 3: cells at y=4,5,6 above a gap, bottom cell at y=BOARD_HEIGHT-1 stays
    board[4][3] = 1; board[5][3] = 2; board[6][3] = 1
    board[BOARD_HEIGHT - 1][3] = 2
    board[BOARD_HEIGHT - 1][4] = 1
    # Column 7: a floating cell at y=2
    board[2][7] = 1

    new_falling_cols, new_board = create_falling_columns(board, [])

    # Column 3 should have 3 falling cells (the ones above the gap)
    col3 = next(c for c in new_falling_cols if c.x == 3)
    assert len(col3.cells) == 3
    # Cells sorted bottom-to-top: y=6, y=5, y=4
    assert col3.cells[0].y == 6
    assert col3.cells[0].color == 1
    assert col3.cells[1].y == 5
    assert col3.cells[1].color == 2
    assert col3.cells[2].y == 4
    assert col3.cells[2].color == 1
    assert col3.timer == 0

    # Column 7 should have 1 falling cell
    col7 = next(c for c in new_falling_cols if c.x == 7)
    assert len(col7.cells) == 1
    assert col7.cells[0].y == 2
    assert col7.cells[0].color == 1

    # Board cells that fell should now be 0
    assert new_board[4][3] == 0
    assert new_board[5][3] == 0
    assert new_board[6][3] == 0
    # Bottom cell stays
    assert new_board[BOARD_HEIGHT - 1][3] == 2
    assert new_board[BOARD_HEIGHT - 1][4] == 1


def test_create_falling_cells_merges_with_existing():
    """New falling cells should merge with pre-existing falling column."""
    board = create_empty_board()
    board[5][3] = 2; board[6][3] = 1
    board[BOARD_HEIGHT - 1][3] = 2

    existing = [
        FallingColumn(
            x=3,
            cells=[
                FallingCell(id='1', y=4, color=1),
                FallingCell(id='2', y=3, color=1),
            ],
            timer=0,
        )
    ]

    new_falling_cols, _ = create_falling_columns(board, existing)

    col3 = next(c for c in new_falling_cols if c.x == 3)
    # Should have 4 cells: 2 new + 2 existing, sorted by y descending
    assert len(col3.cells) == 4
    # Verify existing cells are still there with original ids
    ids = [c.id for c in col3.cells]
    assert '1' in ids
    assert '2' in ids


# ---------------------------------------------------------------------------
# Gravity / clearing tests (gameLogic.gravity.test.ts)
# ---------------------------------------------------------------------------

def test_clear_squares_and_apply_gravity():
    board = create_empty_board()
    # Some cells above the squares to be cleared
    board[2][5] = 1; board[3][5] = 2
    # The squares to be cleared
    board[7][5] = 1; board[7][6] = 1
    board[8][5] = 1; board[8][6] = 1

    squares = [
        Square(x=5, y=7, color=1),
        Square(x=5, y=8, color=1),
        Square(x=6, y=7, color=1),
        Square(x=6, y=8, color=1),
    ]

    new_falling_cols, new_board = clear_marked_cells_and_apply_gravity(board, squares, [])

    # Cleared positions should now be 0
    assert new_board[7][5] == 0
    assert new_board[8][6] == 0

    # Column 5 should have falling cells for the cells that were above
    col5 = next((c for c in new_falling_cols if c.x == 5), None)
    assert col5 is not None
    assert len(col5.cells) == 2
    # Cells at y=2 (color=1) and y=3 (color=2), sorted bottom-to-top: y=3 first
    colors = {c.y: c.color for c in col5.cells}
    assert colors[3] == 2
    assert colors[2] == 1
