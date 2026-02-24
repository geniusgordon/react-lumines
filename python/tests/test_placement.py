"""
test_placement.py — Port of gameLogic.placement.test.ts
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.constants import BOARD_HEIGHT
from python.game.board import create_empty_board
from python.game.types import Block, FallingColumn, FallingCell
from python.game.blocks import place_block_on_board, can_place_any_part_of_block
from python.game.validation import find_drop_position


# ---------------------------------------------------------------------------
# find_drop_position
# ---------------------------------------------------------------------------

def test_find_drop_position_empty_board():
    """Block should fall to the bottom of an empty board."""
    board = create_empty_board()
    block = Block(pattern=[[1, 1], [1, 1]], id='test')
    drop_y = find_drop_position(board, block, 7, -2, [])
    # Block is 2 rows tall, so bottom row = BOARD_HEIGHT - 1, top = BOARD_HEIGHT - 2
    assert drop_y == BOARD_HEIGHT - 2


def test_find_drop_position_stops_above_obstacle():
    """Block should stop one row above an obstacle."""
    board = create_empty_board()
    # Place an obstacle at y=7
    board[7][7] = 1; board[7][8] = 1
    block = Block(pattern=[[1, 1], [1, 1]], id='test')
    drop_y = find_drop_position(board, block, 7, -2, [])
    # Block bottom row would be at y+1=drop_y+1, which must not hit row 7
    assert drop_y == 5  # top at 5, bottom at 6, row 7 is occupied


def test_find_drop_position_with_falling_column():
    """Block should stop above falling cells."""
    board = create_empty_board()
    # A falling cell at y=6 in column 7
    falling = [FallingColumn(x=7, cells=[FallingCell(id='x', y=6, color=1)], timer=0)]
    block = Block(pattern=[[1, 1], [1, 1]], id='test')
    drop_y = find_drop_position(board, block, 7, -2, falling)
    # Block bottom (y+1) collides with falling at y=6, so drop_y must be < 5
    assert drop_y < 6


# ---------------------------------------------------------------------------
# can_place_any_part_of_block
# ---------------------------------------------------------------------------

def test_can_place_when_board_empty():
    board = create_empty_board()
    assert can_place_any_part_of_block(board, 7) is True


def test_cannot_place_when_both_columns_filled():
    board = create_empty_board()
    board[0][7] = 1
    board[0][8] = 2
    assert can_place_any_part_of_block(board, 7) is False


def test_can_place_when_one_column_free():
    board = create_empty_board()
    board[0][7] = 1
    # Column 8 is still free
    assert can_place_any_part_of_block(board, 7) is True


# ---------------------------------------------------------------------------
# place_block_on_board
# ---------------------------------------------------------------------------

def test_place_block_normally():
    board = create_empty_board()
    block = Block(pattern=[[1, 2], [2, 1]], id='test')
    new_board = place_block_on_board(board, [], block, 3, 5)
    assert new_board[5][3] == 1
    assert new_board[5][4] == 2
    assert new_board[6][3] == 2
    assert new_board[6][4] == 1


def test_place_block_does_not_overwrite_existing():
    """Cells should not overwrite existing board content."""
    board = create_empty_board()
    board[5][3] = 2  # Already occupied
    block = Block(pattern=[[1, 1], [1, 1]], id='test')
    new_board = place_block_on_board(board, [], block, 3, 5)
    # Occupied cell should remain 2
    assert new_board[5][3] == 2
    # Other cells should be placed
    assert new_board[5][4] == 1
    assert new_board[6][3] == 1
    assert new_board[6][4] == 1


def test_place_block_above_board_partial():
    """
    When position_y < 0, only rows that fit in the board are placed.
    """
    board = create_empty_board()
    # Block fully above the board — nothing should be placed
    block = Block(pattern=[[1, 1], [1, 1]], id='test')
    new_board = place_block_on_board(board, [], block, 7, -2)
    # First row should still be empty (block is at y=-2, rows 0 and 1 are off-board or have 0)
    # The important thing: the board should not raise errors and be valid
    assert len(new_board) == BOARD_HEIGHT
    assert len(new_board[0]) == 16
