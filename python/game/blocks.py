"""
blocks.py — Block generation and placement.
Port of src/utils/gameLogic/blocks.ts
"""

import copy
from typing import List, Optional
from .constants import BLOCK_PATTERNS, BOARD_WIDTH, BLOCK_HEIGHT
from .types import Block, FallingColumn
from .rng import SeededRNG


def generate_random_block(rng: SeededRNG) -> Block:
    """Generate a random block using seeded RNG."""
    pattern = rng.choice(BLOCK_PATTERNS)
    block_id = rng.generate_id()
    return Block(
        pattern=[row[:] for row in pattern],
        id=block_id,
    )


def rotate_block_pattern(pattern: List[List[int]], clockwise: bool = True) -> List[List[int]]:
    """
    Rotate a 2×2 block pattern.
    Clockwise:     rotated[j][size-1-i] = pattern[i][j]
    Counter-CW:    rotated[size-1-j][i] = pattern[i][j]
    """
    size = len(pattern)
    rotated = [[0] * size for _ in range(size)]

    for i in range(size):
        for j in range(size):
            if clockwise:
                rotated[j][size - 1 - i] = pattern[i][j]
            else:
                rotated[size - 1 - j][i] = pattern[i][j]

    return rotated


def _get_available_spaces(
    board_x: int,
    falling_columns: List[FallingColumn],
    board: List[List[int]],
) -> int:
    """
    Calculate how many rows from the top of the board are available
    for a block column to be placed into (respecting falling cells and
    existing board content in the top BLOCK_HEIGHT rows).
    """
    # Space limited by falling columns at this x
    spaces_by_falling = BLOCK_HEIGHT
    for col in falling_columns:
        if col.x == board_x and col.cells:
            top_cell = col.cells[-1]  # cells sorted bottom-to-top; last = highest
            spaces_by_falling = min(top_cell.y, BLOCK_HEIGHT)
            break

    # Space limited by board cells in the top rows
    spaces_by_board = 0
    for y in range(BLOCK_HEIGHT):
        if board[y][board_x] == 0:
            spaces_by_board += 1

    return min(spaces_by_falling, spaces_by_board)


def place_block_on_board(
    board: List[List[int]],
    falling_columns: List[FallingColumn],
    block: Block,
    position_x: int,
    position_y: int,
) -> List[List[int]]:
    """
    Place a block on the board.
    If position_y < 0 (block is above the board), uses partial placement
    logic that respects falling columns as obstacles.
    Otherwise places cells that fit within bounds and don't collide.
    """
    new_board = [row[:] for row in board]

    if position_y < 0:
        return _place_block_above_board(new_board, block, position_x, position_y, falling_columns, board)
    else:
        return _place_block_normally(new_board, block, position_x, position_y)


def _place_block_above_board(
    new_board: List[List[int]],
    block: Block,
    position_x: int,
    position_y: int,
    falling_columns: List[FallingColumn],
    original_board: List[List[int]],
) -> List[List[int]]:
    pattern = block.pattern

    for x in range(BLOCK_HEIGHT):
        board_x = position_x + x
        available_spaces = _get_available_spaces(board_x, falling_columns, original_board)

        # Place cells from bottom up, only as many as fit
        for y in range(1, BLOCK_HEIGHT - available_spaces - 1, -1):
            if 0 <= y < BLOCK_HEIGHT and 0 <= board_x < BOARD_WIDTH:
                dest_y = y - (BLOCK_HEIGHT - available_spaces)
                if 0 <= dest_y < len(new_board):
                    new_board[dest_y][board_x] = pattern[y][x]

    return new_board


def _place_block_normally(
    new_board: List[List[int]],
    block: Block,
    position_x: int,
    position_y: int,
) -> List[List[int]]:
    pattern = block.pattern

    for y in range(len(pattern)):
        for x in range(len(pattern[y])):
            if pattern[y][x] == 0:
                continue
            board_x = position_x + x
            board_y = position_y + y
            if (0 <= board_x < BOARD_WIDTH and
                    0 <= board_y < len(new_board) and
                    new_board[board_y][board_x] == 0):
                new_board[board_y][board_x] = pattern[y][x]

    return new_board


def can_place_any_part_of_block(
    board: List[List[int]],
    position_x: int,
) -> bool:
    """
    Returns True if at least one cell of the block can be placed.
    Checks whether the first row has empty space at the block's x or x+1.
    """
    first_row = board[0]
    return first_row[position_x] == 0 or first_row[position_x + 1] == 0
