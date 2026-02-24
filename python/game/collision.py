"""
collision.py — Collision detection.
Port of src/utils/gameLogic/collision.ts
"""

from typing import List
from .constants import BOARD_WIDTH, BOARD_HEIGHT
from .types import Block, FallingColumn


def has_collision_with_falling_columns(
    falling_columns: List[FallingColumn],
    position_x: int,
    position_y: int,
    pattern: List[List[int]],
) -> bool:
    """Check if a block pattern at (position_x, position_y) collides with falling cells."""
    falling_positions = set()
    for col in falling_columns:
        for cell in col.cells:
            falling_positions.add((col.x, cell.y))

    for y in range(len(pattern)):
        for x in range(len(pattern[y])):
            if pattern[y][x] != 0:
                board_x = position_x + x
                board_y = position_y + y

                if board_y < 0:
                    continue

                if (board_x, board_y) in falling_positions:
                    return True

    return False


def is_valid_position(
    board: List[List[int]],
    block: Block,
    position_x: int,
    position_y: int,
    falling_columns: List[FallingColumn],
) -> str:
    """
    Check if the block can be placed at (position_x, position_y).
    Returns: 'valid' | 'invalid' | 'collision' | 'out_of_bounds'
    """
    pattern = block.pattern
    pattern_width = len(pattern[0]) if pattern else 0
    pattern_height = len(pattern)

    # Check bounds
    if (position_x < 0 or
            position_x + pattern_width > BOARD_WIDTH or
            position_y < -2 or
            position_y + pattern_height > BOARD_HEIGHT):
        return 'out_of_bounds'

    # Check collision with board
    for y in range(pattern_height):
        for x in range(pattern_width):
            if pattern[y][x] != 0:
                board_x = position_x + x
                board_y = position_y + y

                if board_y < 0:
                    continue

                if board[board_y][board_x] != 0:
                    return 'collision'

    # Check collision with falling columns
    if falling_columns and has_collision_with_falling_columns(
        falling_columns, position_x, position_y, pattern
    ):
        return 'collision'

    return 'valid'
