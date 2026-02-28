"""
Tests verifying that ws_eval.py compute_* functions produce observations
identical to env.py's _build_obs, so the model receives the same input at
inference time as it saw during training.
"""
import sys
import os
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ws_eval import (
    compute_column_heights,
    compute_dominant_color_chain,
    compute_color_pattern_board,
    obs_to_numpy,
    BOARD_HEIGHT,
    BOARD_WIDTH,
)
from game.env import LuminesEnvNative


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_env_with_board():
    """Return a LuminesEnvNative that has been stepped until the board has
    some filled cells, patterns, and a non-zero timeline position."""
    env = LuminesEnvNative(mode="per_block", seed="test_ws_eval")
    env.reset()
    # Place enough blocks to get patterns and a moved timeline
    for i in range(40):
        _, _, done, _, _ = env.step(0)  # always hard-drop at left
        if done:
            env.reset()
    return env


# ---------------------------------------------------------------------------
# compute_column_heights
# ---------------------------------------------------------------------------

class TestComputeColumnHeights:
    def test_empty_board(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        h = compute_column_heights(board)
        assert h.shape == (BOARD_WIDTH,)
        assert np.all(h == 0.0)

    def test_full_column(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        for row in range(BOARD_HEIGHT):
            board[row][0] = 1
        h = compute_column_heights(board)
        # tallest possible column: raw height = BOARD_HEIGHT
        assert h[0] == float(BOARD_HEIGHT)

    def test_single_cell_at_bottom(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        board[BOARD_HEIGHT - 1][3] = 1  # bottom row, col 3
        h = compute_column_heights(board)
        assert h[3] == 1.0  # height = BOARD_HEIGHT - (BOARD_HEIGHT-1) = 1

    def test_matches_env(self):
        env = _make_env_with_board()
        board = env._state.board
        expected = np.array(env._column_heights(), dtype=np.float32)
        got = compute_column_heights(board)
        np.testing.assert_array_equal(got, expected)


# ---------------------------------------------------------------------------
# compute_dominant_color_chain (PPO_30)
# ---------------------------------------------------------------------------

class TestComputeDominantColorChain:
    def _empty_board(self):
        return [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]

    def test_empty_board(self):
        assert compute_dominant_color_chain(self._empty_board()) == pytest.approx(0.0)

    def test_single_light_pattern(self):
        board = self._empty_board()
        board[8][0] = 1; board[8][1] = 1; board[9][0] = 1; board[9][1] = 1
        result = compute_dominant_color_chain(board)
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_matches_env(self):
        env = _make_env_with_board()
        board = env._state.board
        got = compute_dominant_color_chain(board)
        expected = env._count_max_single_color_chain_from_board() / (BOARD_WIDTH - 1)
        assert got == pytest.approx(expected, abs=1e-5)


# ---------------------------------------------------------------------------
# obs_to_numpy — integration test against _build_obs
# ---------------------------------------------------------------------------

class TestObsToNumpy:
    def _env_state_to_obs_json(self, env):
        """Convert env internal state to the JSON dict the browser would send."""
        s = env._state
        queue_patterns = [b.pattern for b in s.queue[:3]]
        while len(queue_patterns) < 3:
            queue_patterns.append([[0, 0], [0, 0]])
        return {
            "board": [list(row) for row in s.board],
            "currentBlock": s.current_block.pattern,
            "blockPosition": {"x": s.block_position_x, "y": s.block_position_y},
            "queue": queue_patterns,
            "timelineX": s.timeline.x,
            "score": s.score,
            "frame": s.frame,
            "gameTimer": s.game_timer,
            "holdingScore": s.timeline.holding_score,
        }

    def test_light_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["light_board"], env_obs["light_board"])

    def test_dark_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["dark_board"], env_obs["dark_board"])

    def test_light_pattern_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["light_pattern_board"], env_obs["light_pattern_board"])

    def test_dark_pattern_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["dark_pattern_board"], env_obs["dark_pattern_board"])

    def test_dominant_color_chain(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["dominant_color_chain"], env_obs["dominant_color_chain"])

    def test_holding_score(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["holding_score"], env_obs["holding_score"])
