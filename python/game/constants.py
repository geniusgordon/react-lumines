"""
constants.py — Port of src/constants/gameConfig.ts
All game constants for the pure Python Lumines implementation.
"""

# Core game dimensions
BOARD_WIDTH = 16
BOARD_HEIGHT = 10

# Timing constants
TARGET_FPS = 60

# Timer constants
FIXED_DROP_INTERVAL = 90        # Frames between automatic drops
COUNTDOWN_START = 3
COUNTDOWN_DURATION = 30         # Frames per countdown step
GAME_DURATION_FRAMES = 60 * TARGET_FPS  # 3600 frames = 60 seconds
TIMELINE_SWEEP_INTERVAL = GAME_DURATION_FRAMES // 15 // BOARD_WIDTH  # 15 frames per column
FALLING_CELL_INTERVAL = 1       # Frames between falling cell steps

# Default values
INITIAL_POSITION_X = 7
INITIAL_POSITION_Y = -2

# Block patterns — all 16 possible 2×2 color combinations
# Color: 0 = empty, 1 = light, 2 = dark
BLOCK_PATTERNS = [
    # Pattern 0: All light
    [[1, 1], [1, 1]],
    # Pattern 1
    [[1, 1], [1, 2]],
    # Pattern 2
    [[1, 1], [2, 1]],
    # Pattern 3
    [[1, 1], [2, 2]],
    # Pattern 4
    [[1, 2], [1, 1]],
    # Pattern 5
    [[1, 2], [1, 2]],
    # Pattern 6
    [[1, 2], [2, 1]],
    # Pattern 7
    [[1, 2], [2, 2]],
    # Pattern 8
    [[2, 1], [1, 1]],
    # Pattern 9
    [[2, 1], [1, 2]],
    # Pattern 10
    [[2, 1], [2, 1]],
    # Pattern 11
    [[2, 1], [2, 2]],
    # Pattern 12
    [[2, 2], [1, 1]],
    # Pattern 13
    [[2, 2], [1, 2]],
    # Pattern 14
    [[2, 2], [2, 1]],
    # Pattern 15: All dark
    [[2, 2], [2, 2]],
]

BLOCK_HEIGHT = 2  # All blocks are 2×2
