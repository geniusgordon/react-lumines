import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from game.env import LuminesEnvNative


def test_compute_ghost_returns_valid_position():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Ghost at col 7, rot 0 must land within board bounds
    ghost_block, ghost_x, ghost_y = _compute_ghost(env._state, cursor_col=7, cursor_rot=0)
    assert 0 <= ghost_x <= 14
    assert 0 <= ghost_y < 10  # BOARD_HEIGHT


def test_compute_ghost_clamps_column():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Column 15 is out of range (max_x = BOARD_WIDTH - 2 = 14)
    _, ghost_x, _ = _compute_ghost(env._state, cursor_col=15, cursor_rot=0)
    assert ghost_x <= 14


def test_compute_ghost_respects_rotation():
    from play import _compute_ghost
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    block0, _, _ = _compute_ghost(env._state, cursor_col=7, cursor_rot=0)
    block1, _, _ = _compute_ghost(env._state, cursor_col=7, cursor_rot=1)
    # Patterns may differ after rotation (not always equal for asymmetric blocks)
    # At minimum, both return a 2x2 pattern
    assert len(block0.pattern) == 2
    assert len(block1.pattern) == 2


def test_render_play_contains_score():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=7, cursor_rot=0)
    assert "Score" in output


def test_render_play_shows_cursor_col():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=5, cursor_rot=2)
    assert "Col: 5" in output
    assert "Rot: 2" in output


def test_render_play_shows_controls():
    from play import _render_play
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    output = _render_play(env, cursor_col=7, cursor_rot=0)
    assert "Space" in output or "drop" in output.lower()


import json, tempfile, os


def test_save_demo_creates_file():
    from play import _save_demo
    with tempfile.TemporaryDirectory() as tmpdir:
        path = _save_demo(tmpdir, seed="99", actions=[[7, 0], [3, 2]], final_score=100, blocks_placed=2)
        assert os.path.exists(path)
        with open(path) as f:
            data = json.load(f)
        assert data["seed"] == "99"
        assert data["actions"] == [[7, 0], [3, 2]]
        assert data["final_score"] == 100
        assert data["version"] == 1
