"""
test_env_rewards.py — Tests for env.py reward shaping changes.

Tests (RED phase):
  - _count_complete_squares counts 2x2 same-color squares on the board
  - placing a block that creates a 2x2 pattern gives squares_delta reward
  - height_penalty uses coefficient 0.05 (not 0.1)
  - spread_penalty is absent from reward_components
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import numpy as np
import pytest
from python.game.env import LuminesEnvNative
from python.game.board import create_empty_board
from python.game.constants import BOARD_HEIGHT, BOARD_WIDTH


# ---------------------------------------------------------------------------
# _count_complete_squares
# ---------------------------------------------------------------------------

def test_count_complete_squares_empty_board():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{
        **env._state.__dict__,
        "board": create_empty_board(),
    })
    assert env._count_complete_squares() == 0


def test_count_complete_squares_one_square():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    assert env._count_complete_squares() == 1


def test_count_complete_squares_two_non_overlapping():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # First square (color 1)
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    # Second square (color 2)
    board[8][4] = 2; board[8][5] = 2
    board[9][4] = 2; board[9][5] = 2
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    assert env._count_complete_squares() == 2


def test_count_complete_squares_mixed_colors_not_counted():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[8][0] = 1; board[8][1] = 2
    board[9][0] = 2; board[9][1] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    assert env._count_complete_squares() == 0


def test_count_complete_squares_3x2_block_counts_two():
    """A 3-wide × 2-tall same-color region has 2 overlapping 2×2 squares."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    for col in range(3):
        board[8][col] = 1
        board[9][col] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    assert env._count_complete_squares() == 2


# ---------------------------------------------------------------------------
# Reward components structure
# ---------------------------------------------------------------------------

def test_reward_components_has_squares_delta():
    """After any step, reward_components must include squares_delta."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "squares_delta" in info["reward_components"]


def test_reward_components_has_no_spread_penalty():
    """spread_penalty must be absent from reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "spread_penalty" not in info["reward_components"]


def test_reward_components_no_placement_penalty():
    """placement_penalty must not be present in reward_components (removed)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "placement_penalty" not in info["reward_components"]


def test_reward_components_no_height_penalty():
    """height_penalty must not be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "height_penalty" not in info["reward_components"]


def test_squares_delta_reward_positive_when_square_formed():
    """
    Set up board so that placing next block completes a 2x2 square.
    squares_delta in reward_components should be > 0.
    """
    env = LuminesEnvNative(mode="per_block", seed="0")
    env.reset()

    # Peek at the current block color to set up a matching bottom-left L
    block = env._state.current_block.pattern
    color = block[0][0]  # top-left cell color

    # Place two cells of the same color at the bottom so that dropping
    # the block at x=0 (identity rotation) completes a 2x2
    board = create_empty_board()
    board[9][0] = color
    board[9][1] = color
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})

    # Only proceed if current block top row is all `color`
    # (so dropping at x=0 with rotation=0 gives squares on rows 8-9)
    if block[0][0] == color and block[0][1] == color:
        _, _, _, _, info = env.step(0)  # targetX=0, rotation=0
        assert info["reward_components"]["squares_delta"] > 0
    else:
        pytest.skip("block color mismatch for this seed — skip placement test")


# ---------------------------------------------------------------------------
# Height reward
# ---------------------------------------------------------------------------

def test_reward_components_has_height_reward():
    """After any step, reward_components must include height_reward."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "height_reward" in info["reward_components"]


def test_height_reward_penalizes_tall_column():
    """When target column is taller than average, height_reward must be < 0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Fill column 0 from row 2 down (height = 8), all others empty
    for row in range(2, BOARD_HEIGHT):
        board[row][0] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    _, _, _, _, info = env.step(0)  # targetX=0, rotation=0
    assert info["reward_components"]["height_reward"] < 0


def test_height_reward_rewards_short_column():
    """When target column is shorter than average, height_reward must be > 0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Fill all columns except column 7 to height 6
    for col in range(BOARD_WIDTH):
        if col == 7:
            continue
        for row in range(4, BOARD_HEIGHT):
            board[row][col] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    _, _, _, _, info = env.step(28)  # targetX=7, rotation=0
    assert info["reward_components"]["height_reward"] > 0
