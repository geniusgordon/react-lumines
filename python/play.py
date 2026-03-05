"""
play.py — Human-playable Lumines terminal interface with demo recording.

Usage:
    python python/play.py                        # random seed
    python python/play.py --seed 42              # fixed seed
    python python/play.py --demos-dir my_demos   # custom output dir

Controls:
    ← / →   move column cursor
    z / x   rotate piece CCW / CW
    Space   drop piece
    q       quit and save demo
"""

import argparse
import json
import os
import select
import sys
import termios
import tty
from datetime import datetime

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from game.env import LuminesEnvNative
from game.blocks import rotate_block_pattern
from game.types import Block
from game.validation import find_drop_position
from game.constants import BOARD_WIDTH, BOARD_HEIGHT


def _compute_ghost(state, cursor_col: int, cursor_rot: int):
    """Return (rotated_block, ghost_x, ghost_y) for the current cursor position.

    Read-only: does not mutate state.
    """
    # Apply rotation to a copy of the current block pattern
    pattern = [row[:] for row in state.current_block.pattern]
    for _ in range(cursor_rot % 4):
        pattern = rotate_block_pattern(pattern, clockwise=True)
    ghost_block = Block(pattern=pattern, id=state.current_block.id)

    # Clamp column (block is 2 wide, so max left edge = BOARD_WIDTH - 2)
    ghost_x = max(0, min(cursor_col, BOARD_WIDTH - 2))

    # Find drop position from the block's current y (top of board)
    ghost_y = find_drop_position(
        state.board, ghost_block, ghost_x, state.block_position_y, state.falling_columns
    )
    return ghost_block, ghost_x, ghost_y
