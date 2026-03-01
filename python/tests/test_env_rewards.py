"""
test_env_rewards.py — Tests for env.py reward shaping changes (PPO_30).
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import numpy as np
import pytest
from python.game.env import LuminesEnvNative
from python.game.board import create_empty_board
from python.game.patterns import detect_patterns
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




def test_death_on_game_over():
    """death must equal DEATH_PENALTY on the terminal step."""
    from python.game.env import DEATH_PENALTY
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    done = False
    info = {}
    while not done:
        _, _, done, _, info = env.step(0)
    assert info["reward_components"]["death"] == pytest.approx(DEATH_PENALTY)


def test_death_zero_on_non_terminal():
    """death must be 0.0 on non-terminal steps."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, done, _, info = env.step(0)
    if not done:
        assert info["reward_components"]["death"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# _count_chain_length
# ---------------------------------------------------------------------------

def _make_env_with_board(board):
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    patterns = detect_patterns(board)
    env._state = env._state.__class__(**{
        **env._state.__dict__,
        "board": board,
        "detected_patterns": patterns,
    })
    return env


def test_count_chain_length_empty_board():
    env = _make_env_with_board(create_empty_board())
    assert env._count_chain_length() == 0


def test_count_chain_length_single_pattern():
    """One 2×2 same-color square (cols 5-6, rows 8-9) → chain length 1."""
    board = create_empty_board()
    for r in (8, 9):
        for c in (5, 6):
            board[r][c] = 1
    assert _make_env_with_board(board)._count_chain_length() == 1


def test_count_chain_length_three_consecutive():
    """4-wide same-color strip → patterns at cols 2, 3, 4 → chain length 3."""
    board = create_empty_board()
    for c in range(2, 6):   # cols 2,3,4,5 → patterns at left edges 2,3,4
        board[8][c] = 1
        board[9][c] = 1
    assert _make_env_with_board(board)._count_chain_length() == 3


def test_count_chain_length_gap_returns_longest_run():
    """Patterns at cols 2,3 and 5,6 (gap at 4) → max chain length 2."""
    board = create_empty_board()
    for c in range(2, 5):   # cols 2,3,4 → patterns at 2,3
        board[8][c] = 1
        board[9][c] = 1
    for c in range(5, 8):   # cols 5,6,7 → patterns at 5,6
        board[8][c] = 2
        board[9][c] = 2
    assert _make_env_with_board(board)._count_chain_length() == 2


# ---------------------------------------------------------------------------
# Simplified reward structure (PPO Run 7)
# ---------------------------------------------------------------------------

def test_reward_components_no_survival_bonus():
    """survival_bonus must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "survival_bonus" not in info["reward_components"]


def test_reward_components_no_adj_bonus():
    """adj_bonus must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "adj_bonus" not in info["reward_components"]


def test_reward_components_no_chain_delta():
    """chain_delta must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "chain_delta" not in info["reward_components"]


# ---------------------------------------------------------------------------
# Queue visibility
# ---------------------------------------------------------------------------

def test_obs_queue_shape_is_3():
    """queue in observation must have shape (3, 2, 2) — all 3 queued blocks."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["queue"].shape == (3, 2, 2)


# ---------------------------------------------------------------------------
# light_pattern_board / dark_pattern_board obs channels (PPO_32)
# ---------------------------------------------------------------------------

def test_obs_has_light_pattern_board():
    """Observation dict must contain 'light_pattern_board' key."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "light_pattern_board" in obs


def test_obs_has_dark_pattern_board():
    """Observation dict must contain 'dark_pattern_board' key."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "dark_pattern_board" in obs


def test_obs_light_pattern_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["light_pattern_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_obs_dark_pattern_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["dark_pattern_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_obs_light_pattern_board_range():
    """light_pattern_board values must be in [0, 1]."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert np.all(obs["light_pattern_board"] >= 0.0)
    assert np.all(obs["light_pattern_board"] <= 1.0)


def test_obs_dark_pattern_board_range():
    """dark_pattern_board values must be in [0, 1]."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert np.all(obs["dark_pattern_board"] >= 0.0)
    assert np.all(obs["dark_pattern_board"] <= 1.0)


def test_light_pattern_board_zero_when_no_light_patterns():
    """light_pattern_board must be all zeros when board has no light 2×2 patterns."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Place a dark 2×2 only
    board[8][0] = 2; board[8][1] = 2
    board[9][0] = 2; board[9][1] = 2
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert np.all(obs["light_pattern_board"] == 0.0)


def test_dark_pattern_board_zero_when_no_dark_patterns():
    """dark_pattern_board must be all zeros when board has no dark 2×2 patterns."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Place a light 2×2 only
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert np.all(obs["dark_pattern_board"] == 0.0)


def test_light_pattern_board_nonzero_for_light_2x2():
    """light_pattern_board must be nonzero for cells in a light 2×2 pattern."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[8][4] = 1; board[8][5] = 1
    board[9][4] = 1; board[9][5] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert obs["light_pattern_board"][8][4] > 0.0
    assert obs["light_pattern_board"][9][5] > 0.0


def test_color_pattern_boards_do_not_overlap():
    """A cell cannot be nonzero in both light and dark pattern boards."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # light pattern at cols 0-1
    board[8][0] = 1; board[8][1] = 1; board[9][0] = 1; board[9][1] = 1
    # dark pattern at cols 4-5
    board[8][4] = 2; board[8][5] = 2; board[9][4] = 2; board[9][5] = 2
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    overlap = obs["light_pattern_board"] * obs["dark_pattern_board"]
    assert np.all(overlap == 0.0)


# ---------------------------------------------------------------------------
# _count_max_single_color_chain_from_board (PPO_30)
# ---------------------------------------------------------------------------

def _make_env_with_board_simple(board):
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    return env


def test_max_single_color_chain_empty_board():
    env = _make_env_with_board_simple(create_empty_board())
    assert env._count_max_single_color_chain_from_board() == 0


def test_max_single_color_chain_single_light_pattern():
    board = create_empty_board()
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    env = _make_env_with_board_simple(board)
    assert env._count_max_single_color_chain_from_board() == 1


def test_max_single_color_chain_mixed_colors_picks_best():
    """Light: 3 consecutive cols, Dark: 2 consecutive cols → returns 3."""
    board = create_empty_board()
    for c in range(3):
        board[8][c] = 1; board[9][c] = 1  # light cols 0,1,2 → patterns at 0,1
    board[8][5] = 2; board[8][6] = 2; board[9][5] = 2; board[9][6] = 2  # dark col 5
    env = _make_env_with_board_simple(board)
    # light: run of 2 (cols 0,1), dark: run of 1 (col 5) → max=2
    assert env._count_max_single_color_chain_from_board() == 2


def test_max_single_color_chain_ignores_mixed_2x2():
    """A 2×2 with mixed colors must not be counted."""
    board = create_empty_board()
    board[8][0] = 1; board[8][1] = 2
    board[9][0] = 2; board[9][1] = 1
    env = _make_env_with_board_simple(board)
    assert env._count_max_single_color_chain_from_board() == 0


def test_max_single_color_chain_gap_returns_longest_run():
    """Patterns at cols 0,1 (light) and 4,5 (light) with gap at 2,3 → max run = 2."""
    board = create_empty_board()
    for c in (0, 1, 2):
        board[8][c] = 1; board[9][c] = 1  # patterns at left edges 0,1
    for c in (4, 5, 6):
        board[8][c] = 1; board[9][c] = 1  # patterns at left edges 4,5
    env = _make_env_with_board_simple(board)
    assert env._count_max_single_color_chain_from_board() == 2


def test_max_single_color_chain_board_arg_does_not_mutate_state():
    """Passing a board arg must not affect the env's own board."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    original_board = [row[:] for row in env._state.board]
    alt_board = create_empty_board()
    alt_board[8][0] = 1; alt_board[8][1] = 1
    alt_board[9][0] = 1; alt_board[9][1] = 1
    env._count_max_single_color_chain_from_board(alt_board)
    assert env._state.board == original_board


# ---------------------------------------------------------------------------
# _build_color_board (PPO_30)
# ---------------------------------------------------------------------------

def test_build_color_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    assert env._build_color_board(1).shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_build_color_board_binary_values():
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{**env._state.__dict__, "board": create_empty_board()})
    light = env._build_color_board(1)
    dark = env._build_color_board(2)
    assert set(np.unique(light)).issubset({0.0, 1.0})
    assert set(np.unique(dark)).issubset({0.0, 1.0})


def test_build_color_board_light_dark_no_overlap():
    """A cell cannot be both light and dark."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[9][0] = 1; board[9][1] = 2
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    light = env._build_color_board(1)
    dark = env._build_color_board(2)
    assert np.all(light * dark == 0.0), "light_board and dark_board must not overlap"


# ---------------------------------------------------------------------------
# Observation key tests (PPO_30)
# ---------------------------------------------------------------------------

def test_obs_has_light_board():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "light_board" in obs


def test_obs_has_dark_board():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "dark_board" in obs


def test_obs_has_light_chain():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "light_chain" in obs


def test_obs_has_dark_chain():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "dark_chain" in obs


def test_obs_dominant_color_chain_absent():
    """dominant_color_chain must NOT be present (replaced by light_chain + dark_chain)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "dominant_color_chain" not in obs


def test_obs_light_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["light_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_obs_dark_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["dark_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_obs_light_chain_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["light_chain"].shape == (1,)


def test_obs_dark_chain_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["dark_chain"].shape == (1,)


def test_obs_board_absent():
    """'board' key must NOT be present in PPO_30 observations."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "board" not in obs


def test_obs_chain_length_absent():
    """'chain_length' key must NOT be present in PPO_30 observations."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "chain_length" not in obs




# ---------------------------------------------------------------------------
# proj_light_pattern_board / proj_dark_pattern_board observation channels (PPO_36)
# ---------------------------------------------------------------------------

def test_obs_has_projected_pattern_boards():
    """Observation dict must contain projected pattern board keys (PPO_36)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "proj_light_pattern_board" in obs
    assert "proj_dark_pattern_board" in obs


def test_obs_has_timeline_col():
    """timeline_col must still be present: CNN needs it to anchor live/projected channels to sweep position."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "timeline_col" in obs


def test_projected_pattern_board_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["proj_light_pattern_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)
    assert obs["proj_dark_pattern_board"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_projected_pattern_board_dtype():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["proj_light_pattern_board"].dtype == np.float32
    assert obs["proj_dark_pattern_board"].dtype == np.float32


def test_projected_pattern_board_range():
    """Values must be in [0.0, 1.0]."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert np.all(obs["proj_light_pattern_board"] >= 0.0)
    assert np.all(obs["proj_light_pattern_board"] <= 1.0)
    assert np.all(obs["proj_dark_pattern_board"] >= 0.0)
    assert np.all(obs["proj_dark_pattern_board"] <= 1.0)


def test_projected_board_clears_ahead_of_timeline_patterns():
    """Projected board must clear patterns ahead of the timeline, leave behind-timeline patterns intact."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    from game.patterns import detect_patterns
    from game.types import Timeline

    # Place a 2x2 light pattern at col=0 (bottom two rows)
    board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT - 2)] + [
        [1, 1] + [0] * (BOARD_WIDTH - 2),
        [1, 1] + [0] * (BOARD_WIDTH - 2),
    ]
    # Set timeline to col=0 so col=0 pattern is AT/ahead of sweep — should be projected-clear
    tl = env._state.timeline.__class__(**{**env._state.timeline.__dict__, "x": 0})
    env._state = env._state.__class__(**{
        **env._state.__dict__,
        "board": board,
        "timeline": tl,
        "detected_patterns": detect_patterns(board),
    })
    obs = env._build_obs()
    assert np.sum(obs["light_pattern_board"]) > 0         # live channel shows pattern
    assert np.sum(obs["proj_light_pattern_board"]) == 0.0 # projected: pattern cleared (ahead of timeline)

    # Now set timeline to col=2 so col=0 pattern is BEHIND the sweep — should NOT be projected-clear
    tl2 = env._state.timeline.__class__(**{**env._state.timeline.__dict__, "x": 2})
    env._state = env._state.__class__(**{**env._state.__dict__, "timeline": tl2})
    obs2 = env._build_obs()
    assert np.sum(obs2["light_pattern_board"]) > 0         # live channel still shows pattern
    assert np.sum(obs2["proj_light_pattern_board"]) > 0    # projected: behind-timeline pattern NOT cleared


# ---------------------------------------------------------------------------
# PPO_35 reward formula: score_delta + death (no shaping)
# ---------------------------------------------------------------------------

def test_reward_components_ppo35_exact_keys():
    """reward_components must contain exactly the PPO_35 keys."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    expected_keys = {"score_delta", "death", "total"}
    assert set(info["reward_components"].keys()) == expected_keys

def test_patterns_formed_absent_in_ppo35():
    """patterns_formed must NOT be present in PPO_35 reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "patterns_formed" not in info["reward_components"]

def test_reward_total_matches_ppo35_formula():
    """total must equal score_delta + death."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, reward, _, _, info = env.step(0)
    rc = info["reward_components"]
    expected = rc["score_delta"] + rc["death"]
    assert rc["total"] == pytest.approx(expected)
    assert reward == pytest.approx(rc["total"])

def test_ppo35_reward_formula_holds_across_many_steps():
    """formula total = score_delta + death for 50 steps."""
    env = LuminesEnvNative(mode="per_block", seed="99")
    env.reset()
    for action in range(50):
        _, reward, done, _, info = env.step(action % 60)
        rc = info["reward_components"]
        expected = rc["score_delta"] + rc["death"]
        assert rc["total"] == pytest.approx(expected, abs=1e-6)
        assert reward == pytest.approx(rc["total"], abs=1e-6)
        if done:
            env.reset()
