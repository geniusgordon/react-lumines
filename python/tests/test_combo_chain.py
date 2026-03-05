"""
test_combo_chain.py — Tests for _count_single_color_chain row-connectivity fix.

The old implementation collected columns that had any same-color 2×2 pattern
and counted consecutive columns, ignoring whether adjacent-column patterns were
at compatible row positions (|row_a - row_b| <= 1).  These tests verify the
fixed DP-based implementation.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.board import create_empty_board
from python.game.env import LuminesEnvNative

L = 1  # light
D = 2  # dark


def make_env():
    env = LuminesEnvNative(mode="per_block", seed="0")
    env.reset()
    return env


def place_2x2(board, row, col, color):
    """Place a same-color 2×2 block with top-left at (row, col)."""
    board[row][col] = color
    board[row][col + 1] = color
    board[row + 1][col] = color
    board[row + 1][col + 1] = color


# ---------------------------------------------------------------------------
# Basic cases
# ---------------------------------------------------------------------------

def test_empty_board_returns_zero():
    env = make_env()
    board = create_empty_board()
    assert env._count_single_color_chain(board, L) == 0
    assert env._count_single_color_chain(board, D) == 0


def test_single_pattern_returns_one():
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=5, col=3, color=L)
    assert env._count_single_color_chain(board, L) == 1
    assert env._count_single_color_chain(board, D) == 0


def test_two_same_row_adjacent_cols_returns_two():
    """Patterns at same row, cols 3 and 4 — they share a column of cells."""
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=5, col=3, color=L)
    place_2x2(board, row=5, col=4, color=L)
    assert env._count_single_color_chain(board, L) == 2


def test_three_same_row_adjacent_cols_returns_three():
    env = make_env()
    board = create_empty_board()
    for col in range(3, 6):
        place_2x2(board, row=5, col=col, color=L)
    assert env._count_single_color_chain(board, L) == 3


# ---------------------------------------------------------------------------
# Row adjacency (|row_a - row_b| <= 1 is allowed)
# ---------------------------------------------------------------------------

def test_adjacent_cols_row_offset_1_counts_as_chain():
    """Patterns at (row=5, col=3) and (row=6, col=4) differ by 1 row — connected."""
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=5, col=3, color=L)
    place_2x2(board, row=6, col=4, color=L)
    assert env._count_single_color_chain(board, L) == 2


def test_adjacent_cols_row_offset_minus_1_counts_as_chain():
    """Patterns at (row=6, col=3) and (row=5, col=4) differ by 1 row — connected."""
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=6, col=3, color=L)
    place_2x2(board, row=5, col=4, color=L)
    assert env._count_single_color_chain(board, L) == 2


# ---------------------------------------------------------------------------
# The key regression: non-adjacent rows must NOT be chained
# ---------------------------------------------------------------------------

def test_adjacent_cols_different_rows_not_chained():
    """OLD BUG: cols 3 and 4 both have a pattern but at rows 0 and 8.
    They don't share any cells, so the chain length must be 1, not 2."""
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=0, col=3, color=L)
    place_2x2(board, row=8, col=4, color=L)
    # Each column has an isolated pattern — no chain between them
    assert env._count_single_color_chain(board, L) == 1


def test_three_cols_middle_breaks_connectivity():
    """Cols 3, 4, 5 all have light patterns but col 4's pattern is far from
    both neighbours.  Chain can't bridge col 3→4→5."""
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=0, col=3, color=L)   # top
    place_2x2(board, row=5, col=4, color=L)   # middle — gap > 1 from both
    place_2x2(board, row=8, col=5, color=L)   # bottom
    # No pair is row-adjacent, so max chain = 1
    assert env._count_single_color_chain(board, L) == 1


def test_gap_column_breaks_chain():
    """A column with no pattern resets the chain.

    place_2x2(col) covers cols [col, col+1], so adjacent placements share a
    boundary column and can create unintended bridging patterns.  We leave a
    true gap by placing two non-touching groups: cols 0-1 and cols 4-5 with
    col 3 genuinely empty (col 1's right edge is col 2; col 4's left edge is
    col 4 — nothing at col 3).
    """
    env = make_env()
    board = create_empty_board()
    # Group 1: patterns at col=0 and col=1 (right edge = col 2, col 3 stays empty)
    place_2x2(board, row=5, col=0, color=L)
    place_2x2(board, row=5, col=1, color=L)
    # col 3 is empty → genuine gap
    # Group 2: patterns at col=4 and col=5
    place_2x2(board, row=5, col=4, color=L)
    place_2x2(board, row=5, col=5, color=L)
    assert env._count_single_color_chain(board, L) == 2


# ---------------------------------------------------------------------------
# Color separation
# ---------------------------------------------------------------------------

def test_different_colors_not_mixed():
    """A dark pattern does not extend a light chain.

    place_2x2(col=3, L) covers cols 3-4; place_2x2(col=4, D) would overwrite
    those shared cells and destroy the light pattern.  Use non-overlapping
    columns instead: light at col=0, dark at col=3.
    """
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=5, col=0, color=L)
    place_2x2(board, row=5, col=3, color=D)
    assert env._count_single_color_chain(board, L) == 1
    assert env._count_single_color_chain(board, D) == 1


# ---------------------------------------------------------------------------
# Multi-row relay (same column has patterns at two heights)
# ---------------------------------------------------------------------------

def test_relay_through_column_not_allowed_without_direct_path():
    """Col 0 has a pattern at row 0.  Col 1 has patterns at row 0 AND row 8.
    Col 2 has a pattern at row 8.

    The chain 0→1 is valid (row 0 matches).
    The chain 1→2 via row 8 is also valid (row 8 matches).
    But the full path 0→1→2 requires col 1 to bridge rows 0 and 8, which it
    can't: the two patterns in col 1 are not themselves connected.
    Max chain = 2 (either 0→1 via row 0, or 1→2 via row 8), not 3.
    """
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=0, col=0, color=L)
    place_2x2(board, row=0, col=1, color=L)
    place_2x2(board, row=8, col=1, color=L)
    place_2x2(board, row=8, col=2, color=L)
    assert env._count_single_color_chain(board, L) == 2


def test_relay_through_column_works_when_rows_are_adjacent():
    """All 4 patterns form one connected group under flood-fill.

    Patterns: (row=0,col=0), (row=0,col=1), (row=1,col=1), (row=2,col=2).
    Each pair of consecutive patterns has |row|<=1 AND |col|<=1, so all are
    reachable from each other via flood-fill → group size = 4.
    """
    env = make_env()
    board = create_empty_board()
    place_2x2(board, row=0, col=0, color=L)
    place_2x2(board, row=0, col=1, color=L)
    place_2x2(board, row=1, col=1, color=L)  # overlaps with row-0 pattern in col 1
    place_2x2(board, row=2, col=2, color=L)  # connects to row-1 in col 1 (offset=1)
    assert env._count_single_color_chain(board, L) == 4


# ---------------------------------------------------------------------------
# max across colors
# ---------------------------------------------------------------------------

def test_max_single_color_chain_picks_best_color():
    env = make_env()
    board = create_empty_board()
    # Light chain of 3
    for col in range(3):
        place_2x2(board, row=5, col=col, color=L)
    # Dark chain of 1
    place_2x2(board, row=5, col=10, color=D)
    assert env._count_max_single_color_chain_from_board(board) == 3
