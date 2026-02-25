"""
test_per_block_timeline.py — Tests for timeline advancement in per_block mode.

Verifies:
  1. ticks_per_block is computed correctly from blocks_per_sweep
  2. Frame counter and game_timer advance by ticks_per_block per step
  3. timeline.x advances the expected number of columns per step
  4. Patterns ARE cleared when the timeline sweeps over them
  5. Patterns are NOT cleared before the timeline reaches them
  6. Score only increases after the timeline has swept through a pattern
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
from python.game.env import LuminesEnvNative
from python.game.board import create_empty_board
from python.game.constants import BOARD_HEIGHT, BOARD_WIDTH, TIMELINE_SWEEP_INTERVAL


FULL_SWEEP = BOARD_WIDTH * TIMELINE_SWEEP_INTERVAL  # 16 * 15 = 240


def make_env(blocks_per_sweep=6, seed="test"):
    env = LuminesEnvNative(mode="per_block", seed=seed, blocks_per_sweep=blocks_per_sweep)
    env.reset()
    return env


def set_board(env, board):
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})


# ---------------------------------------------------------------------------
# ticks_per_block computation
# ---------------------------------------------------------------------------

def test_ticks_per_block_default():
    """blocks_per_sweep=6 → ticks_per_block = 240 // 6 = 40."""
    env = make_env(blocks_per_sweep=6)
    assert env.ticks_per_block == FULL_SWEEP // 6  # 40


def test_ticks_per_block_full_sweep():
    """blocks_per_sweep=1 → one full sweep (240 ticks) per placement."""
    env = make_env(blocks_per_sweep=1)
    assert env.ticks_per_block == FULL_SWEEP  # 240


def test_ticks_per_block_half_sweep():
    """blocks_per_sweep=2 → half sweep (120 ticks) per placement."""
    env = make_env(blocks_per_sweep=2)
    assert env.ticks_per_block == FULL_SWEEP // 2  # 120


def test_ticks_per_block_one_column_per_step():
    """blocks_per_sweep=16 → exactly one column advance per placement."""
    env = make_env(blocks_per_sweep=16)
    assert env.ticks_per_block == TIMELINE_SWEEP_INTERVAL  # 15


# ---------------------------------------------------------------------------
# Frame counter and game_timer
# ---------------------------------------------------------------------------

def test_frame_advances_by_ticks_per_block():
    """frame increments by ticks_per_block each step."""
    env = make_env(blocks_per_sweep=6)
    initial_frame = env._state.frame
    env.step(0)
    assert env._state.frame == initial_frame + env.ticks_per_block


def test_frame_accumulates_over_multiple_steps():
    """frame accumulates correctly across multiple steps."""
    env = make_env(blocks_per_sweep=6)
    initial_frame = env._state.frame
    env.step(0)
    env.step(0)
    env.step(0)
    assert env._state.frame == initial_frame + 3 * env.ticks_per_block


def test_game_timer_decreases_by_ticks_per_block():
    """game_timer decrements by ticks_per_block each step."""
    env = make_env(blocks_per_sweep=6)
    initial_timer = env._state.game_timer
    env.step(0)
    assert env._state.game_timer == initial_timer - env.ticks_per_block


# ---------------------------------------------------------------------------
# Timeline position
# ---------------------------------------------------------------------------

def test_timeline_x_advances_half_sweep():
    """
    blocks_per_sweep=2 → 120 ticks = 8 column advances.
    Starting from x=0, timeline.x should be 8 after one step.
    """
    env = make_env(blocks_per_sweep=2)
    assert env._state.timeline.x == 0
    env.step(0)
    expected_cols = env.ticks_per_block // TIMELINE_SWEEP_INTERVAL  # 120 // 15 = 8
    assert env._state.timeline.x == expected_cols


def test_timeline_x_wraps_after_full_sweep():
    """
    blocks_per_sweep=1 → 240 ticks = 16 column advances.
    Starting from x=0, timeline wraps back to 0 after one step.
    """
    env = make_env(blocks_per_sweep=1)
    assert env._state.timeline.x == 0
    env.step(0)
    assert env._state.timeline.x == 0  # (0 + 16) % 16 = 0


def test_timeline_x_advances_one_column_per_step():
    """
    blocks_per_sweep=16 → 15 ticks = 1 column advance per step.
    After three steps, timeline.x should be 3.
    """
    env = make_env(blocks_per_sweep=16)
    for _ in range(3):
        done = env.step(0)[2]
        if done:
            pytest.skip("game ended early")
    assert env._state.timeline.x == 3


# ---------------------------------------------------------------------------
# Pattern clearing — positive cases
# ---------------------------------------------------------------------------

def test_pattern_cleared_after_full_sweep():
    """
    Pre-place a 2×2 pattern at cols 2-3 (rows 8-9).
    With blocks_per_sweep=1 (full sweep per step), the timeline sweeps all
    columns and the pattern must be cleared, leaving those cells empty.
    """
    env = make_env(blocks_per_sweep=1)
    board = create_empty_board()
    board[8][2] = 1;  board[8][3] = 1
    board[9][2] = 1;  board[9][3] = 1
    set_board(env, board)

    # Place block far from the pattern so it doesn't disturb cols 2-3
    env.step(32)  # target_x=8, rotation=0

    assert env._state.board[8][2] == 0, "Row 8 col 2 should be cleared"
    assert env._state.board[8][3] == 0, "Row 8 col 3 should be cleared"
    assert env._state.board[9][2] == 0, "Row 9 col 2 should be cleared"
    assert env._state.board[9][3] == 0, "Row 9 col 3 should be cleared"


def test_score_increases_after_full_sweep_clears_pattern():
    """
    Same setup as above — score must be > 0 after the sweep clears the pattern.
    """
    env = make_env(blocks_per_sweep=1)
    board = create_empty_board()
    board[8][2] = 1;  board[8][3] = 1
    board[9][2] = 1;  board[9][3] = 1
    set_board(env, board)

    env.step(32)  # target_x=8

    assert env._state.score > 0, "Score must increase after clearing a 2×2 pattern"


# ---------------------------------------------------------------------------
# Pattern clearing — negative case (timeline hasn't reached the pattern yet)
# ---------------------------------------------------------------------------

def test_pattern_not_cleared_when_timeline_too_far_behind():
    """
    Pre-place a 2×2 pattern at cols 10-11.
    With blocks_per_sweep=16 (1 column/step), timeline advances from 0 to 1
    in a single step — nowhere near col 10. Score stays 0 and board is intact.
    """
    env = make_env(blocks_per_sweep=16)
    board = create_empty_board()
    board[8][10] = 1;  board[8][11] = 1
    board[9][10] = 1;  board[9][11] = 1
    set_board(env, board)

    prev_score = env._state.score
    env.step(0)  # place block at col 0, well away from the pattern

    assert env._state.score == prev_score, (
        "Score must not increase — timeline only reached col 1, pattern is at col 10"
    )
    assert env._state.board[8][10] == 1, "Board cell should still be intact"


# ---------------------------------------------------------------------------
# Pattern clearing — cumulative steps
# ---------------------------------------------------------------------------

def test_pattern_cleared_after_enough_steps():
    """
    Pre-place a 2×2 pattern at cols 2-3 (rows 8-9).
    With blocks_per_sweep=16 (1 column/step), the timeline needs to advance
    through cols 2, 3, and 4 for the clear to fire (4 steps minimum).
    After 6 steps the score must have increased.
    """
    env = make_env(blocks_per_sweep=16)
    board = create_empty_board()
    board[8][2] = 1;  board[8][3] = 1
    board[9][2] = 1;  board[9][3] = 1
    set_board(env, board)

    prev_score = env._state.score

    # Place 6 blocks spread across empty columns, none overlapping cols 2-3
    placement_cols = [0, 5, 7, 9, 11, 13]
    for col in placement_cols:
        obs, _, done, _, _ = env.step(col * 4)  # rotation=0
        if done:
            break

    assert env._state.score > prev_score, (
        "Score must increase once timeline sweeps past col 4 (clears pattern at cols 2-3)"
    )


def test_score_zero_after_only_one_step_with_slow_timeline():
    """
    Same board setup — but after just 1 step (timeline at col 1) score is still 0.
    The clear fires only when the timeline passes col 4.
    """
    env = make_env(blocks_per_sweep=16)
    board = create_empty_board()
    board[8][2] = 1;  board[8][3] = 1
    board[9][2] = 1;  board[9][3] = 1
    set_board(env, board)

    prev_score = env._state.score
    env.step(0)  # only 1 step → timeline at col 1

    assert env._state.score == prev_score


# ---------------------------------------------------------------------------
# Multiple patterns
# ---------------------------------------------------------------------------

def test_two_patterns_score_higher_than_one():
    """
    Two separate 2×2 patterns swept in one pass score higher than one pattern.
    """
    # One pattern at cols 2-3
    env1 = make_env(blocks_per_sweep=1, seed="s1")
    board1 = create_empty_board()
    board1[8][2] = 1;  board1[8][3] = 1
    board1[9][2] = 1;  board1[9][3] = 1
    set_board(env1, board1)
    env1.step(32)  # target_x=8
    score1 = env1._state.score

    # Two patterns: cols 2-3 and cols 6-7 (different colors, non-overlapping)
    env2 = make_env(blocks_per_sweep=1, seed="s1")
    board2 = create_empty_board()
    board2[8][2] = 1;  board2[8][3] = 1
    board2[9][2] = 1;  board2[9][3] = 1
    board2[8][6] = 2;  board2[8][7] = 2
    board2[9][6] = 2;  board2[9][7] = 2
    set_board(env2, board2)
    env2.step(32)  # same action, same column
    score2 = env2._state.score

    assert score2 > score1, (
        f"Two patterns should score higher than one: score2={score2}, score1={score1}"
    )


# ---------------------------------------------------------------------------
# No spurious score on empty board
# ---------------------------------------------------------------------------

def test_no_score_on_empty_board():
    """Placing any block on an empty board (no existing patterns) gives score_delta=0."""
    env = make_env(blocks_per_sweep=1)
    _, _, _, _, info = env.step(0)
    assert info["reward_components"]["score_delta"] == 0.0
