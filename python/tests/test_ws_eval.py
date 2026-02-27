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
    compute_pattern_board,
    compute_ghost_board,
    compute_timeline_board,
    compute_chain_length,
    compute_projected_pattern_board,
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
    def _empty_board(self):
        return [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]

    def test_empty_board(self):
        assert compute_chain_length(self._empty_board()) == pytest.approx(0.0)

    def test_single_2x2_pattern(self):
        board = self._empty_board()
        # 2×2 pattern at left-edge col 0
        board[0][0] = 1; board[0][1] = 1; board[1][0] = 1; board[1][1] = 1
        result = compute_chain_length(board)
        # run of 1 left-edge col (0) → 1/15
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_right_edge_not_counted_as_separate_run(self):
        board = self._empty_board()
        # Pattern at left-edge col 3: right-edge col 4 must NOT be counted separately
        board[8][3] = 1; board[8][4] = 1; board[9][3] = 1; board[9][4] = 1
        result = compute_chain_length(board)
        # Only one left-edge (col 3) → run of 1
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_rightmost_pattern(self):
        board = self._empty_board()
        # Pattern at left-edge col 14 (rightmost valid left-edge)
        board[8][14] = 1; board[8][15] = 1; board[9][14] = 1; board[9][15] = 1
        result = compute_chain_length(board)
        assert result == pytest.approx(1.0 / (BOARD_WIDTH - 1))

    def test_matches_env(self):
        # compute_chain_length scans the board directly, matching
        # _count_chain_length_from_board (not _count_chain_length which uses
        # detected_patterns and can differ from board state).
        env = _make_env_with_board()
        board = env._state.board
        got = compute_chain_length(board)
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
            "markedCells": [{"x": cell.x, "y": cell.y} for cell in s.marked_cells],
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

    def test_chain_length(self):
        # ws_eval derives chain_length from the board directly, matching
        # env._count_chain_length_from_board.
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["chain_length"], env_obs["chain_length"])

    def test_holding_score(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(ws_obs["holding_score"], env_obs["holding_score"])

    def test_projected_pattern_board(self):
        env = _make_env_with_board()
        obs_json = self._env_state_to_obs_json(env)
        env_obs = env._build_obs()
        ws_obs = obs_to_numpy(obs_json)
        np.testing.assert_array_almost_equal(
            ws_obs["projected_pattern_board"], env_obs["projected_pattern_board"]
        )


# ---------------------------------------------------------------------------
# compute_projected_pattern_board
# ---------------------------------------------------------------------------

class TestComputeProjectedPatternBoard:
    def _empty_board(self):
        return [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]

    def test_no_marked_cells_equals_pattern_board(self):
        """When marked_cells=[], projected board equals current board → same as pattern_board."""
        board = self._empty_board()
        for r in (8, 9):
            for c in (2, 3):
                board[r][c] = 1
        expected = compute_pattern_board(board)
        got = compute_projected_pattern_board(board, [])
        np.testing.assert_array_almost_equal(got, expected)

    def test_marked_cells_cleared_before_pattern_detection(self):
        """Cells listed in marked_cells should be zeroed before patterns are detected."""
        board = self._empty_board()
        # Place a 2×2 pattern at rows 8-9, cols 4-5
        for r in (8, 9):
            for c in (4, 5):
                board[r][c] = 2
        # Mark the entire 2×2 as to-be-cleared
        marked = [{"x": c, "y": r} for r in (8, 9) for c in (4, 5)]
        got = compute_projected_pattern_board(board, marked)
        # After clearing those cells the board is empty → no patterns
        assert np.all(got == 0.0)

    def test_gravity_applied_after_clearing(self):
        """After clearing marked cells, remaining cells should fall down."""
        board = self._empty_board()
        # Stack: row 7 = color1 (on top), row 8 = color2 (marked for clear), row 9 = color1
        # col 0 and 1: rows 7,8,9 filled
        for c in (0, 1):
            board[7][c] = 1
            board[8][c] = 2  # will be marked
            board[9][c] = 1
        # Mark row 8, cols 0-1 for clearing
        marked = [{"x": c, "y": 8} for c in (0, 1)]
        got = compute_projected_pattern_board(board, marked)
        # After clearing row 8, col 0 and 1: rows 7 (color1) fall to row 9.
        # So row 8 col 0,1 = empty (color1 from row 7 falls), row 9 col 0,1 = color1.
        # This means rows 8-9 cols 0-1 have color1 → forms a 2×2 pattern.
        assert got[8][0] > 0.0 or got[9][0] > 0.0  # some pattern detected

    def test_matches_env(self):
        """compute_projected_pattern_board must match env._build_projected_pattern_board."""
        env = LuminesEnvNative(mode="per_block", seed="test_ws_eval")
        env.reset()
        for _ in range(40):
            _, _, done, _, _ = env.step(0)
            if done:
                env.reset()
        board = [list(row) for row in env._state.board]
        # Convert Square objects to dicts for ws_eval
        marked = [{"x": cell.x, "y": cell.y} for cell in env._state.marked_cells]
        expected = env._build_projected_pattern_board()
        got = compute_projected_pattern_board(board, marked)
        np.testing.assert_array_almost_equal(got, expected)
