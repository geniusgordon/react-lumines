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


# ---------------------------------------------------------------------------
# Reward components structure (PPO_29)
# ---------------------------------------------------------------------------

def test_reward_components_exact_keys():
    """reward_components must contain exactly the potential-shaping keys."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    expected_keys = {
        "score_delta",
        "phi_prev",
        "phi_next",
        "potential_delta",
        "shaping_reward",
        "chain_max",
        "purity",
        "blockers",
        "height",
        "setup",
        "preclear_patterns",
        "death",
        "total",
    }
    assert set(info["reward_components"].keys()) == expected_keys


def test_reward_components_no_chain_after_drop():
    """chain_after_drop must NOT be present."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "chain_after_drop" not in info["reward_components"]


def test_reward_components_no_height_delta():
    """height_delta must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "height_delta" not in info["reward_components"]


def test_reward_components_no_patterns_created():
    """patterns_created must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "patterns_created" not in info["reward_components"]


def test_reward_components_no_holding_score_reward():
    """holding_score_reward must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "holding_score_reward" not in info["reward_components"]


def test_reward_components_no_adjacent_patterns():
    """adjacent_patterns_created must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "adjacent_patterns_created" not in info["reward_components"]


def test_reward_components_no_chain_delta_reward():
    """chain_delta_reward must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "chain_delta_reward" not in info["reward_components"]


def test_reward_components_no_projected_chain_reward():
    """projected_chain_reward must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "projected_chain_reward" not in info["reward_components"]


def test_reward_components_no_post_sweep_pattern_delta():
    """post_sweep_pattern_delta must NOT be present in reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "post_sweep_pattern_delta" not in info["reward_components"]


def test_reward_components_no_spread_penalty():
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


# ---------------------------------------------------------------------------
# Potential-based reward formula:
#   total = score_delta + shaping_reward + death
# ---------------------------------------------------------------------------

def test_reward_total_matches_formula():
    """total must equal the potential-based reward formula."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, reward, _, _, info = env.step(0)
    rc = info["reward_components"]
    expected_total = (
        rc["score_delta"]
        + rc["shaping_reward"]
        + rc["death"]
    )
    assert rc["total"] == pytest.approx(expected_total)
    assert rc["total"] == pytest.approx(reward)


def test_potential_delta_is_float():
    """potential_delta must be present and a float."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "potential_delta" in info["reward_components"]
    assert isinstance(info["reward_components"]["potential_delta"], float)


def test_shaping_reward_is_float():
    """shaping_reward must be present and a float."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "shaping_reward" in info["reward_components"]
    assert isinstance(info["reward_components"]["shaping_reward"], float)


def test_phi_values_are_float():
    """phi_prev and phi_next must both be present and floats."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "phi_prev" in info["reward_components"]
    assert "phi_next" in info["reward_components"]
    assert isinstance(info["reward_components"]["phi_prev"], float)
    assert isinstance(info["reward_components"]["phi_next"], float)


def test_shape_components_are_normalized_ranges():
    """Potential feature components should stay in [0, 1]."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    rc = info["reward_components"]
    assert 0.0 <= rc["chain_max"] <= 1.0
    assert 0.0 <= rc["purity"] <= 1.0
    assert 0.0 <= rc["blockers"] <= 1.0
    assert 0.0 <= rc["height"] <= 1.0
    assert 0.0 <= rc["setup"] <= 1.0
    assert 0.0 <= rc["preclear_patterns"] <= 1.0


def test_preclear_patterns_positive_when_board_has_2x2():
    """preclear_patterns should be >0 when current board contains complete 2x2 patterns."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    sim = env._simulate_clear_board(board)
    _phi, comps = env._compute_potential(sim, preclear_board=board)
    assert comps["preclear_patterns"] > 0.0


def test_prev_phi_resets_on_reset():
    """After reset(), _prev_phi must match the reset state's potential."""
    from python.game.env import SHAPING_GAMMA, SHAPING_LAMBDA
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset(seed=123)
    _, _, _, _, info1 = env.step(0)
    rc1 = info1["reward_components"]
    expected_phi_next = (rc1["shaping_reward"] / SHAPING_LAMBDA + rc1["phi_prev"]) / SHAPING_GAMMA
    assert rc1["phi_next"] == pytest.approx(expected_phi_next)

    env.reset(seed=123)
    _, _, _, _, info2 = env.step(0)
    rc2 = info2["reward_components"]
    # With same reset seed, baseline phi_prev should be reproducible.
    assert rc2["phi_prev"] == pytest.approx(rc1["phi_prev"])


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
# _simulate_clear_board
# ---------------------------------------------------------------------------

def test_simulate_clear_board_removes_all_patterns():
    """After _simulate_clear_board, no 2×2 same-color pattern should remain."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Light 2×2 at bottom-left
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    # Dark 2×2 at bottom-right
    board[8][4] = 2; board[8][5] = 2
    board[9][4] = 2; board[9][5] = 2

    result = env._simulate_clear_board(board)

    # Verify no 2×2 same-color pattern exists in the result
    for row in range(BOARD_HEIGHT - 1):
        for col in range(BOARD_WIDTH - 1):
            c = result[row][col]
            if c != 0:
                is_pattern = (
                    c == result[row][col + 1] == result[row + 1][col] == result[row + 1][col + 1]
                )
                assert not is_pattern, f"Pattern found at row={row}, col={col}"


def test_potential_shaping_still_applies_when_sweep_scores():
    """Even when score_delta > 0, potential shaping remains well-defined."""
    import python.game.env as env_module

    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()

    # Patch update_timeline (score source in _step_per_block) to force score_delta > 0.
    original_update_timeline = env_module.update_timeline

    def patched_update_timeline(state, *args, **kwargs):
        result = original_update_timeline(state, *args, **kwargs)
        return result.__class__(**{**result.__dict__, "score": result.score + 100})

    env_module.update_timeline = patched_update_timeline
    try:
        _, _, _, _, info = env.step(0)
    finally:
        env_module.update_timeline = original_update_timeline

    rc = info["reward_components"]
    assert rc["score_delta"] > 0, "score_delta must be positive for this test to be meaningful"
    assert np.isfinite(rc["shaping_reward"])
    assert np.isfinite(rc["potential_delta"])


def test_post_sweep_light_measures_chain_after_simulated_clear():
    """post_sweep_light should count light chains on the board after patterns are removed."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Light 2×2 pattern (will be cleared)
    board[8][0] = 1; board[8][1] = 1
    board[9][0] = 1; board[9][1] = 1
    # Surviving light cells that form a chain after clear (no 2×2 pattern)
    # Place 3 isolated light cells in a row at bottom to form a chain of 1 after gravity
    board[9][4] = 1; board[9][5] = 1
    board[9][6] = 1; board[9][7] = 1
    board[8][4] = 1; board[8][5] = 1
    board[8][6] = 1; board[8][7] = 1
    # This creates 2×2 patterns at cols 4,5,6 → will also be cleared
    # Instead, use single-row surviving cells that won't form 2×2 patterns
    board2 = create_empty_board()
    # Light 2×2 at cols 0-1 (to be cleared)
    board2[8][0] = 1; board2[8][1] = 1
    board2[9][0] = 1; board2[9][1] = 1
    # Single light row (not a 2×2 pattern — only one row tall)
    board2[9][4] = 1; board2[9][5] = 1; board2[9][6] = 1

    sim = env._simulate_clear_board(board2)
    # The 2×2 at cols 0-1 should be gone; surviving cells at cols 4,5,6 remain
    assert sim[9][0] == 0
    assert sim[9][4] == 1
    assert sim[9][5] == 1
    assert sim[9][6] == 1
    # Chain count from surviving cells: 3 wide single row → no 2×2 patterns → chain = 0
    chain = env._count_single_color_chain(sim, 1)
    assert chain == 0  # single row, no 2×2 patterns remain


# ---------------------------------------------------------------------------
# chain_blocking_delta (PPO_34)
# ---------------------------------------------------------------------------

def test_chain_blocking_delta_zero_on_empty_board():
    """No chain on empty board → blockers=0 → delta=0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{**env._state.__dict__, "board": create_empty_board()})
    assert env._count_chain_zone_blockers() == 0


def test_chain_blocking_delta_is_float():
    """Normalized blockers feature must be present and be a float."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "blockers" in info["reward_components"]
    assert isinstance(info["reward_components"]["blockers"], float)


def test_chain_blocking_delta_positive_when_blocker_created():
    """
    Light chain at cols 0-1 (patterns at left edges 0, 1; cells at cols 0,1,2 rows 8-9).
    chain_right = 1; zone = [max(0,0-1)=0 .. min(14,1+1)=2].
    Adding a dark 2×2 at left edge 2 (cols 2-3, rows 6-7) falls inside the zone at
    a different row, so the light pattern is unaffected → count increases.
    """
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()

    # Light cells at cols 0,1,2 rows 8-9 → patterns at left edges 0 and 1; chain_right=1
    board_no_blocker = create_empty_board()
    for c in range(3):  # cols 0,1,2
        board_no_blocker[8][c] = 1
        board_no_blocker[9][c] = 1

    count_before = env._count_chain_zone_blockers(board_no_blocker)

    # Dark 2×2 at left edge 2 (cols 2-3, rows 6-7) — different rows, no overlap with light chain
    # zone = [0 .. 2], col 2 is inside zone
    board_with_blocker = [row[:] for row in board_no_blocker]
    board_with_blocker[6][2] = 2; board_with_blocker[6][3] = 2
    board_with_blocker[7][2] = 2; board_with_blocker[7][3] = 2

    count_after = env._count_chain_zone_blockers(board_with_blocker)
    assert count_after > count_before


def test_chain_blocking_delta_zero_when_no_alt_color_patterns_in_zone():
    """When there are no alt-color 2×2 patterns in the zone, count is 0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()

    # Light chain at cols 2-4; dark 2×2 far outside the zone (col 10)
    board = create_empty_board()
    for c in range(2, 6):
        board[8][c] = 1
        board[9][c] = 1
    board[8][10] = 2; board[8][11] = 2
    board[9][10] = 2; board[9][11] = 2

    # zone is [max(0,2-1)=1 .. min(14,4+1)=5]; dark pattern at col 10 is outside
    assert env._count_chain_zone_blockers(board) == 0


# ---------------------------------------------------------------------------
# timeline_col observation channel (PPO_34)
# ---------------------------------------------------------------------------

def test_obs_has_timeline_col():
    """Observation dict must contain 'timeline_col' key."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "timeline_col" in obs


def test_timeline_col_shape():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["timeline_col"].shape == (BOARD_HEIGHT, BOARD_WIDTH)


def test_timeline_col_dtype():
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["timeline_col"].dtype == np.float32


def test_timeline_col_binary_values():
    """timeline_col must contain only 0.0 and 1.0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    unique = set(np.unique(obs["timeline_col"]))
    assert unique.issubset({0.0, 1.0})


def test_timeline_col_marks_correct_column():
    """timeline_col must be 1.0 in every row of timeline_x, 0.0 elsewhere."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    tx = env._state.timeline.x
    obs = env._build_obs()
    assert np.all(obs["timeline_col"][:, tx] == 1.0)
    for col in range(BOARD_WIDTH):
        if col != tx:
            assert np.all(obs["timeline_col"][:, col] == 0.0)


def test_timeline_col_at_column_zero():
    """When timeline_x == 0, column 0 must be all 1.0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    new_tl = env._state.timeline.__class__(
        **{**env._state.timeline.__dict__, "x": 0}
    )
    env._state = env._state.__class__(**{**env._state.__dict__, "timeline": new_tl})
    obs = env._build_obs()
    assert np.all(obs["timeline_col"][:, 0] == 1.0)
    assert np.all(obs["timeline_col"][:, 1:] == 0.0)


def test_timeline_col_at_column_max():
    """When timeline_x == BOARD_WIDTH-1, last column must be all 1.0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    new_tl = env._state.timeline.__class__(
        **{**env._state.timeline.__dict__, "x": BOARD_WIDTH - 1}
    )
    env._state = env._state.__class__(**{**env._state.__dict__, "timeline": new_tl})
    obs = env._build_obs()
    assert np.all(obs["timeline_col"][:, BOARD_WIDTH - 1] == 1.0)
    assert np.all(obs["timeline_col"][:, :BOARD_WIDTH - 1] == 0.0)


# ---------------------------------------------------------------------------
# PPO_34 reward formula: score_delta + PATTERN_LAMBDA * patterns_formed + death
# ---------------------------------------------------------------------------

def test_reward_components_ppo34_exact_keys():
    """reward_components must contain exactly the PPO_34 keys."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    expected_keys = {"score_delta", "patterns_formed", "death", "total"}
    assert set(info["reward_components"].keys()) == expected_keys


def test_reward_total_matches_ppo34_formula():
    """total must equal score_delta + PATTERN_LAMBDA * patterns_formed + death."""
    from python.game.env import PATTERN_LAMBDA
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, reward, _, _, info = env.step(0)
    rc = info["reward_components"]
    expected = rc["score_delta"] + PATTERN_LAMBDA * rc["patterns_formed"] + rc["death"]
    assert rc["total"] == pytest.approx(expected)
    assert reward == pytest.approx(rc["total"])


def test_patterns_formed_is_nonnegative():
    """patterns_formed must always be >= 0 (clamped)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    for action in range(30):
        _, _, done, _, info = env.step(action % 60)
        assert info["reward_components"]["patterns_formed"] >= 0
        if done:
            break


def test_patterns_formed_positive_when_2x2_created():
    """Placing a block that completes a 2×2 pattern gives patterns_formed >= 1."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()

    # Board: light cell at [8][1] and [9][1] — right half of a potential 2×2 at col 0
    board = create_empty_board()
    board[8][1] = 1
    board[9][1] = 1

    # Current block: all-light [[1,1],[1,1]]
    cb = env._state.current_block
    light_block = cb.__class__(pattern=[[1, 1], [1, 1]], id=cb.id)

    env._state = env._state.__class__(**{
        **env._state.__dict__,
        "board": board,
        "block_position_x": 0,
        "block_position_y": 0,
        "current_block": light_block,
    })

    # Action 0: target_x=0, rotation=0 — block lands at cols 0-1, rows 8-9
    # Before: 0 complete 2×2 patterns
    # After:  light at [8][0],[8][1],[9][0],[9][1] → 1 complete 2×2 pattern
    _, _, _, _, info = env.step(0)
    assert info["reward_components"]["patterns_formed"] >= 1


def test_patterns_formed_zero_when_no_pattern_created():
    """Placing a block into an isolated empty area gives patterns_formed == 0."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()

    # Empty board, mixed block [[1,2],[2,1]] → can't form same-color 2×2
    board = create_empty_board()
    cb = env._state.current_block
    mixed_block = cb.__class__(pattern=[[1, 2], [2, 1]], id=cb.id)

    env._state = env._state.__class__(**{
        **env._state.__dict__,
        "board": board,
        "block_position_x": 7,   # center, isolated
        "block_position_y": 0,
        "current_block": mixed_block,
    })

    _, _, _, _, info = env.step(28)  # action 28 = target_x=7, rotation=0
    assert info["reward_components"]["patterns_formed"] == 0


def test_no_shaping_reward_in_ppo34():
    """shaping_reward must NOT be present in PPO_34 reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "shaping_reward" not in info["reward_components"]


def test_no_phi_terms_in_ppo34():
    """phi_prev, phi_next, potential_delta must NOT be in PPO_34 reward_components."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "phi_prev" not in info["reward_components"]
    assert "phi_next" not in info["reward_components"]
    assert "potential_delta" not in info["reward_components"]


def test_ppo34_reward_formula_holds_across_many_steps():
    """formula total = score_delta + PATTERN_LAMBDA * patterns_formed + death for 50 steps."""
    from python.game.env import PATTERN_LAMBDA
    env = LuminesEnvNative(mode="per_block", seed="99")
    env.reset()
    for action in range(50):
        _, reward, done, _, info = env.step(action % 60)
        rc = info["reward_components"]
        expected = rc["score_delta"] + PATTERN_LAMBDA * rc["patterns_formed"] + rc["death"]
        assert rc["total"] == pytest.approx(expected, abs=1e-6)
        assert reward == pytest.approx(rc["total"], abs=1e-6)
        if done:
            env.reset()
