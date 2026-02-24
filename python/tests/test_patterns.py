"""
test_patterns.py — Port of gameLogic.patterns.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.board import create_empty_board
from python.game.patterns import detect_patterns, mark_column_cells
from python.game.types import Square


def test_detect_single_2x2_square():
    board = create_empty_board()
    board[5][5] = 1
    board[5][6] = 1
    board[6][5] = 1
    board[6][6] = 1

    patterns = detect_patterns(board)
    assert len(patterns) == 1
    assert patterns[0] == Square(x=5, y=5, color=1)


def test_detect_3x2_overlapping_patterns():
    """A 3×2 block produces two overlapping 2×2 patterns."""
    board = create_empty_board()
    board[5][5] = 1; board[5][6] = 1; board[5][7] = 1
    board[6][5] = 1; board[6][6] = 1; board[6][7] = 1

    patterns = detect_patterns(board)
    assert len(patterns) == 2
    assert Square(x=5, y=5, color=1) in patterns
    assert Square(x=6, y=5, color=1) in patterns


def test_detect_multiple_squares_different_colors():
    board = create_empty_board()
    board[1][1] = 1; board[1][2] = 1; board[2][1] = 1; board[2][2] = 1
    board[5][5] = 2; board[5][6] = 2; board[6][5] = 2; board[6][6] = 2

    patterns = detect_patterns(board)
    assert len(patterns) == 2
    assert Square(x=1, y=1, color=1) in patterns
    assert Square(x=5, y=5, color=2) in patterns


def test_detect_empty_board():
    board = create_empty_board()
    assert detect_patterns(board) == []


def test_no_pattern_for_mixed_colors():
    """A 2×2 area with mixed colors should not be detected."""
    board = create_empty_board()
    board[3][3] = 1; board[3][4] = 2
    board[4][3] = 2; board[4][4] = 1

    patterns = detect_patterns(board)
    assert len(patterns) == 0


def test_no_pattern_for_single_cell():
    board = create_empty_board()
    board[5][5] = 1

    patterns = detect_patterns(board)
    assert len(patterns) == 0


def test_mark_column_cells_marks_left_column():
    """Patterns starting at 'column' should have their left column marked."""
    detected = [Square(x=5, y=5, color=1)]
    marked = mark_column_cells(5, detected)
    assert Square(x=5, y=5, color=1) in marked
    assert Square(x=5, y=6, color=1) in marked


def test_mark_column_cells_marks_right_column_of_prev():
    """Patterns starting at column-1 should have their right column marked."""
    detected = [Square(x=4, y=5, color=1)]
    marked = mark_column_cells(5, detected)
    assert Square(x=5, y=5, color=1) in marked
    assert Square(x=5, y=6, color=1) in marked


def test_mark_column_cells_no_duplicates():
    """A pattern spanning both column and column-1 should not produce duplicates."""
    detected = [Square(x=5, y=5, color=1), Square(x=4, y=5, color=1)]
    marked = mark_column_cells(5, detected)
    positions = [(s.x, s.y) for s in marked]
    assert len(positions) == len(set(positions))
