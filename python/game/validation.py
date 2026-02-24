"""
validation.py — Block drop position finder.
Port of src/utils/gameLogic/validation.ts
"""

from typing import List
from .constants import BOARD_HEIGHT
from .types import Block, FallingColumn
from .collision import is_valid_position


def find_drop_position(
    board: List[List[int]],
    block: Block,
    position_x: int,
    position_y: int,
    falling_columns: List[FallingColumn],
) -> int:
    """
    Find the lowest valid y-position for hard-dropping the block.
    Returns the final y coordinate.
    """
    drop_y = position_y

    while drop_y < BOARD_HEIGHT:
        test_y = drop_y + 1
        if is_valid_position(board, block, position_x, test_y, falling_columns) == 'valid':
            drop_y += 1
        else:
            break

    return drop_y
