"""
types.py — Python dataclasses mirroring TypeScript game interfaces.
Port of src/types/game.ts
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List


@dataclass
class Block:
    pattern: List[List[int]]  # 2×2 grid, values 1 or 2
    id: str


@dataclass
class Timeline:
    x: int                  # Current horizontal column (0 to BOARD_WIDTH-1)
    sweep_interval: int     # Frames per column movement
    timer: int              # Frames until next column movement
    active: bool
    holding_score: int      # Accumulated points waiting to be cleared


@dataclass
class FallingCell:
    id: str
    y: int
    color: int


@dataclass
class FallingColumn:
    x: int
    cells: List[FallingCell]
    timer: int


@dataclass
class Square:
    """Detected 2×2 pattern or marked cell."""
    x: int
    y: int
    color: int


@dataclass
class GameState:
    id: str

    # Core game data
    board: List[List[int]]      # BOARD_HEIGHT × BOARD_WIDTH
    current_block: Block
    queue: List[Block]
    block_position_x: int
    block_position_y: int

    # Game flow
    status: str                 # 'initial' | 'countdown' | 'playing' | 'paused' | 'gameOver'
    score: int

    # Timer system
    countdown: int
    game_timer: int

    # Pattern detection
    detected_patterns: List[Square]
    marked_cells: List[Square]

    # Timing
    frame: int
    drop_timer: int
    drop_interval: int

    # Timeline sweep
    timeline: Timeline

    # Falling cells
    falling_columns: List[FallingColumn]

    # Deterministic system
    seed: str
    rng_state: int

    # Debug
    debug_mode: bool = False
