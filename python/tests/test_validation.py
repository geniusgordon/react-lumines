"""
test_validation.py — Port of gameLogic.validation.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.constants import BOARD_HEIGHT, BOARD_WIDTH
from python.game.board import create_empty_board
from python.game.types import Block, FallingColumn, FallingCell
from python.game.collision import is_valid_position


def _make_block(pattern=None):
    if pattern is None:
        pattern = [[1, 1], [1, 1]]
    return Block(pattern=pattern, id='test')


def test_valid_position_empty_board():
    board = create_empty_board()
    block = _make_block()
    assert is_valid_position(board, block, 7, 5, []) == 'valid'


def test_valid_position_at_bottom():
    board = create_empty_board()
    block = _make_block()
    # Bottom row for a 2-tall block: y = BOARD_HEIGHT - 2
    assert is_valid_position(board, block, 0, BOARD_HEIGHT - 2, []) == 'valid'


def test_out_of_bounds_left():
    board = create_empty_board()
    block = _make_block()
    assert is_valid_position(board, block, -1, 5, []) == 'out_of_bounds'


def test_out_of_bounds_right():
    board = create_empty_board()
    block = _make_block()
    # Block is 2 wide; placing at BOARD_WIDTH - 1 means right edge is at BOARD_WIDTH
    assert is_valid_position(board, block, BOARD_WIDTH - 1, 5, []) == 'out_of_bounds'


def test_out_of_bounds_below():
    board = create_empty_board()
    block = _make_block()
    # y + 2 > BOARD_HEIGHT
    assert is_valid_position(board, block, 0, BOARD_HEIGHT - 1, []) == 'out_of_bounds'


def test_collision_with_board_cell():
    board = create_empty_board()
    board[5][7] = 1
    block = _make_block()
    assert is_valid_position(board, block, 7, 5, []) == 'collision'


def test_valid_above_board():
    """y=-2 with no collision should be 'valid'."""
    board = create_empty_board()
    block = _make_block()
    assert is_valid_position(board, block, 7, -2, []) == 'valid'


def test_collision_with_falling_column():
    board = create_empty_board()
    falling = [
        FallingColumn(x=7, cells=[FallingCell(id='x', y=5, color=1)], timer=0)
    ]
    block = _make_block()
    result = is_valid_position(board, block, 7, 5, falling)
    assert result == 'collision'


def test_valid_with_empty_falling_columns():
    board = create_empty_board()
    block = _make_block()
    assert is_valid_position(board, block, 7, 5, []) == 'valid'


def test_no_collision_if_falling_cell_in_different_column():
    board = create_empty_board()
    falling = [
        FallingColumn(x=10, cells=[FallingCell(id='x', y=5, color=1)], timer=0)
    ]
    block = _make_block()
    assert is_valid_position(board, block, 7, 5, falling) == 'valid'
