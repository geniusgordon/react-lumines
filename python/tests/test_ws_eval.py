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
    compute_holes,
    compute_pattern_board,
    compute_ghost_board,
    compute_timeline_board,
    compute_chain_length,
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
# compute_holes
# ---------------------------------------------------------------------------

class TestComputeHoles:
    def test_empty_board(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        assert compute_holes(board) == 0

    def test_no_holes_solid_column(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        for row in range(BOARD_HEIGHT):
            board[row][0] = 1
        assert compute_holes(board) == 0

    def test_one_hole(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        board[0][0] = 1   # top
        board[2][0] = 1   # row 1 is a hole, rows 3-9 also count as holes below filled cells
        # row 1 (above row 2 filled) + rows 3-9 (below row 2 filled) = 1 + 7 = 8
        assert compute_holes(board) == 8

    def test_matches_env(self):
        env = _make_env_with_board()
        board = env._state.board
        assert compute_holes(board) == env._compute_holes()


# ---------------------------------------------------------------------------
# compute_pattern_board
# ---------------------------------------------------------------------------

class TestComputePatternBoard:
    def test_empty_board(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        pb = compute_pattern_board(board)
        assert pb.shape == (BOARD_HEIGHT, BOARD_WIDTH)
        assert np.all(pb == 0.0)

    def test_single_2x2_pattern(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        for r in range(2):
            for c in range(2):
                board[r][c] = 1
        pb = compute_pattern_board(board)
        assert pb[0][0] == pytest.approx(0.25)
        assert pb[0][1] == pytest.approx(0.25)
        assert pb[1][0] == pytest.approx(0.25)
        assert pb[1][1] == pytest.approx(0.25)
        assert pb[2][0] == 0.0

    def test_matches_env(self):
        env = _make_env_with_board()
        board = env._state.board
        expected = env._build_pattern_channel()
        got = compute_pattern_board(board)
        np.testing.assert_array_almost_equal(got, expected)


# ---------------------------------------------------------------------------
# compute_timeline_board
# ---------------------------------------------------------------------------

class TestComputeTimelineBoard:
    def test_matches_env_definition(self):
        """timeline_board must be pattern_board masked to col > timeline_x."""
        env = _make_env_with_board()
        board = env._state.board
        timeline_x = env._state.timeline.x
        pattern_board = compute_pattern_board(board)

        expected = env._build_timeline_board()
        got = compute_timeline_board(pattern_board, timeline_x)
        np.testing.assert_array_almost_equal(got, expected)

    def test_all_columns_before_timeline_zeroed(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        # Put a 2x2 pattern in cols 0-1 and cols 4-5
        for r in range(2):
            board[r][0] = 1; board[r][1] = 1
            board[r][4] = 2; board[r][5] = 2
        pb = compute_pattern_board(board)
        # timeline at col 2 → cols 0,1,2 zeroed
        result = compute_timeline_board(pb, timeline_x=2)
        assert np.all(result[:, :3] == 0.0)
        # cols 4-5 should have pattern values
        assert np.any(result[:, 4:6] > 0.0)

    def test_no_patterns_past_timeline(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        for r in range(2):
            board[r][0] = 1; board[r][1] = 1
        pb = compute_pattern_board(board)
        # timeline at col 5 → pattern in cols 0-1 should be zeroed
        result = compute_timeline_board(pb, timeline_x=5)
        assert np.all(result == 0.0)


# ---------------------------------------------------------------------------
# compute_ghost_board
# ---------------------------------------------------------------------------

class TestComputeGhostBoard:
    def test_matches_env(self):
        env = _make_env_with_board()
        board = env._state.board
        current_block = env._state.current_block.pattern
        block_x = env._state.block_position_x

        expected = env._build_ghost_channel()
        got = compute_ghost_board(board, current_block, block_x)
        np.testing.assert_array_almost_equal(got, expected)

    def test_empty_board_ghost_lands_at_bottom(self):
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        block = [[1, 1], [1, 1]]
        ghost = compute_ghost_board(board, block, block_x=0)
        # block should land at the bottom two rows
        assert ghost[BOARD_HEIGHT - 2][0] == 1.0
        assert ghost[BOARD_HEIGHT - 2][1] == 1.0
        assert ghost[BOARD_HEIGHT - 1][0] == 1.0
        assert ghost[BOARD_HEIGHT - 1][1] == 1.0
        # rest (other than existing board cells that are 0) should be 0
        assert ghost[BOARD_HEIGHT - 3][0] == 0.0

    def test_ghost_includes_existing_board_cells(self):
        """ghost_board must include existing board occupancy, not just the ghost piece."""
        board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        board[5][3] = 1  # existing cell
        block = [[1, 1], [1, 1]]
        ghost = compute_ghost_board(board, block, block_x=7)
        # existing cell must be reflected
        assert ghost[5][3] == 1.0


# ---------------------------------------------------------------------------
# compute_chain_length
# ---------------------------------------------------------------------------

class TestComputeChainLength:
    def test_empty_board(self):
        pb = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
        assert compute_chain_length(pb) == pytest.approx(0.0)

    def test_single_column_pattern(self):
        pb = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
        pb[0][0] = 0.25  # pattern left-edge at col 0
        result = compute_chain_length(pb)
        # run of 1 in cols 0..14 → 1/15
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_rightmost_col_not_double_counted(self):
        pb = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
        # pattern at left-edge col 14 → fills cols 14 and 15 in pattern_board
        pb[0][14] = 0.25; pb[0][15] = 0.25
        result = compute_chain_length(pb)
        # only col 14 is scanned (left-edge range 0..14) → run of 1
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_matches_env(self):
        # compute_chain_length scans the board directly, matching
        # _count_chain_length_from_board (not _count_chain_length which uses
        # detected_patterns and can differ from board state).
        env = _make_env_with_board()
        board = env._state.board
        pb = compute_pattern_board(board)
        got = compute_chain_length(pb)
        expected = env._count_chain_length_from_board() / (BOARD_WIDTH - 1)
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

    def test_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_equal(ws_obs["board"], env_obs["board"])

    def test_pattern_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["pattern_board"], env_obs["pattern_board"])

    def test_timeline_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["timeline_board"], env_obs["timeline_board"])

    def test_ghost_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["ghost_board"], env_obs["ghost_board"])

    def test_column_heights(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["column_heights"], env_obs["column_heights"])

    def test_holes(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_equal(ws_obs["holes"], env_obs["holes"])

    def test_chain_length(self):
        # ws_eval derives chain_length from the board directly (like
        # _count_chain_length_from_board), not from detected_patterns
        # (_count_chain_length). Both scan the same board so they agree when
        # detected_patterns reflects the current board state.
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        ws_obs = obs_to_numpy(obs_json)
        board = env._state.board
        pb = compute_pattern_board(board)
        expected = compute_chain_length(pb)
        np.testing.assert_array_almost_equal(ws_obs["chain_length"], [expected])

    def test_holding_score(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["holding_score"], env_obs["holding_score"])
