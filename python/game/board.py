"""
board.py — Board operations.
Port of src/utils/gameLogic/board.ts
"""

from typing import List
from .constants import BOARD_WIDTH, BOARD_HEIGHT


def create_empty_board() -> List[List[int]]:
    """Create a BOARD_HEIGHT × BOARD_WIDTH board filled with 0 (empty)."""
    return [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]


def copy_board(board: List[List[int]]) -> List[List[int]]:
    """Return a deep copy of the board."""
    return [row[:] for row in board]


def apply_gravity(board: List[List[int]]) -> List[List[int]]:
    """
    Apply gravity: for each column, collect non-empty cells and pack them
    at the bottom, leaving empty cells at the top.
    """
    new_board = create_empty_board()

    for x in range(BOARD_WIDTH):
        # Collect non-empty cells from bottom to top
        column = []
        for y in range(BOARD_HEIGHT - 1, -1, -1):
            if board[y][x] != 0:
                column.append(board[y][x])

        # Place them at the bottom of the new board
        for i, cell in enumerate(column):
            new_board[BOARD_HEIGHT - 1 - i][x] = cell

    return new_board
