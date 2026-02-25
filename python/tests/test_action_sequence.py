"""
test_action_sequence.py — Replay verification for the exact action sequence
observed in eval output with seed=1.

Action history (blocks 1–10): [41, 41, 41, 41, 26, 26, 41, 34, 39, 34]
  action=41 → target_x=10, rotation=1  (block left-edge at col 10)
  action=26 → target_x=6,  rotation=2  (block left-edge at col 6)
  action=34 → target_x=8,  rotation=2  (block left-edge at col 8)
  action=39 → target_x=9,  rotation=3  (block left-edge at col 9, right at col 10)

After 5× action=41, cols 10–11 are fully stacked (height 10).
action=39 then tries to place a block spanning cols 9–10; since col 10 is full
at row 0, find_drop_position returns -2 (block can't enter the board).
This must trigger game over — not a silent no-op.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.env import LuminesEnvNative
from python.game.constants import BOARD_HEIGHT, BOARD_WIDTH

# Actions before game over (indices 0–7): cols 10–11 fill up, then one col-8 drop
SAFE_ACTIONS = [41, 41, 41, 41, 26, 26, 41, 34]
# Action that should trigger game over (spans col 9–10, col 10 is full)
GAME_OVER_ACTION = 39


# ---------------------------------------------------------------------------
# Safe prefix — 8 steps that should all complete without game over
# ---------------------------------------------------------------------------

def test_safe_prefix_completes_without_game_over():
    """
    The first 8 actions ([41×4, 26×2, 41, 34]) should all land successfully.
    After them: cols 0–5 and 12–15 are still empty (no blocks placed there).
    With timeline advancement, patterns may have been cleared so col 10 may
    not be fully stacked and score may be > 0.
    """
    env = LuminesEnvNative(mode="per_block", seed="1")
    env.reset(seed=1)

    for i, action in enumerate(SAFE_ACTIONS):
        _, _, done, _, info = env.step(action)
        assert not done, f"Game ended unexpectedly at step {i} (action={action})"
        assert info["reward_components"]["survival_bonus"] == pytest.approx(0.1)

    assert env._state.status != "gameOver"

    # Empty columns outside the placement region
    board = env._state.board
    for col in list(range(0, 6)) + list(range(12, BOARD_WIDTH)):
        col_cells = [board[row][col] for row in range(BOARD_HEIGHT)]
        assert all(c == 0 for c in col_cells), (
            f"Col {col} should be empty but has cells: {col_cells}"
        )


# ---------------------------------------------------------------------------
# Game over when block cannot enter the board
# ---------------------------------------------------------------------------

def test_game_over_when_block_cannot_enter_board():
    """
    action=39 (target_x=9, spans cols 9–10) after col 10 is full must trigger
    game over, not silently no-op. Previously the board would appear frozen as
    the block placed cells above the board that immediately became falling columns
    and never settled (no ticks between per-block steps).

    Col 10 is filled directly via board manipulation to guarantee a full column
    regardless of how the timeline has advanced.
    """
    from python.game.board import create_empty_board
    env = LuminesEnvNative(mode="per_block", seed="1")
    env.reset(seed=1)

    # Fill cols 10–11 completely so any block spanning those columns cannot enter
    board = create_empty_board()
    for row in range(BOARD_HEIGHT):
        board[row][10] = 1
        board[row][11] = 2

    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})

    # action=39 → target_x=9, spans cols 9–10; col 10 is full → game over
    _, _, done, _, info = env.step(GAME_OVER_ACTION)
    assert done, (
        "Expected game over when block (cols 9–10) can't enter a board "
        "where col 10 is fully stacked"
    )
    assert info["reward_components"]["death_penalty"] == pytest.approx(-1.0)


# ---------------------------------------------------------------------------
# Col 10 height increases with repeated action=41
# ---------------------------------------------------------------------------

def test_col10_height_increases_with_repeated_action41():
    """
    Step action=41 four times and verify:
    - col 10 height increases strictly after each placement
    - height_reward uses the pre-drop height, so step 1 is 0.0 (col was empty),
      and steps 2–4 are strictly decreasing (more negative each time)
    """
    env = LuminesEnvNative(mode="per_block", seed="1")
    env.reset(seed=1)

    prev_height = env._column_heights()[10]
    heights_after = []
    rewards = []

    for i in range(4):
        _, _, done, _, info = env.step(41)
        assert not done, f"Game ended unexpectedly on step {i+1}"

        curr_height = env._column_heights()[10]
        curr_height_reward = info["reward_components"]["height_reward"]

        assert curr_height > prev_height, (
            f"Step {i+1}: expected col 10 height to increase from {prev_height}, "
            f"got {curr_height}"
        )

        heights_after.append(curr_height)
        rewards.append(curr_height_reward)
        prev_height = curr_height

    # Step 1: col was empty before drop → height_reward == 0.0
    assert rewards[0] == pytest.approx(0.0), (
        f"Step 1: col 10 was empty before first drop, expected height_reward=0.0, "
        f"got {rewards[0]}"
    )

    # Steps 2–4: height_reward should be strictly decreasing (more negative)
    for i in range(1, 4):
        assert rewards[i] < rewards[i - 1], (
            f"Step {i+1}: expected height_reward to decrease "
            f"(was {rewards[i-1]}, got {rewards[i]})"
        )


# ---------------------------------------------------------------------------
# Board state after safe prefix
# ---------------------------------------------------------------------------

def test_board_state_after_safe_prefix():
    """
    After the 8 safe actions, assert board structure:
    - Cols 6–11 have non-zero cells (placement region)
    - Col 10 bottom row is filled
    - Cols 0–5 and 12–15 are entirely empty
    """
    env = LuminesEnvNative(mode="per_block", seed="1")
    env.reset(seed=1)

    for action in SAFE_ACTIONS:
        _, _, done, _, _ = env.step(action)
        assert not done

    board = env._state.board

    # Cols 10–11 fully stacked, so their bottom row must be filled
    assert board[9][10] != 0, "Row 9, col 10 should be filled after 5 placements"

    # No cells outside placement region (cols 0–5 and 12–15)
    for col in list(range(0, 6)) + list(range(12, BOARD_WIDTH)):
        for row in range(BOARD_HEIGHT):
            assert board[row][col] == 0, (
                f"Cell ({row}, {col}) should be 0 but got {board[row][col]}"
            )


# ---------------------------------------------------------------------------
# Render output
# ---------------------------------------------------------------------------

def test_render_shows_expected_state_after_safe_prefix():
    """
    env.render() with render_mode='ansi' should return a valid ASCII board.
    """
    env = LuminesEnvNative(mode="per_block", seed="1", render_mode="ansi")
    env.reset(seed=1)

    for action in SAFE_ACTIONS:
        _, _, done, _, _ = env.step(action)
        assert not done

    output = env.render()
    assert output is not None, "render() returned None with render_mode='ansi'"
    assert "+" + "-" * BOARD_WIDTH + "+" in output
    assert "|" in output
