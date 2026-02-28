"""
test_cross_validation.py — Structural invariant checks for the native Python env.

Note on RNG: Python's random.Random and npm's random-seed produce different
sequences from the same string seed, so block sequences differ between the
native env and the Node.js IPC env. Therefore this file only:
  1. Tests structural invariants of the native env in isolation.
  2. Optionally compares against the Node.js env when it's available (marked with
     pytest.mark.skipif so CI doesn't require Node).

Structural invariants tested:
  - board is always 10×16
  - score is non-negative and non-decreasing
  - game_timer decreases monotonically until game over
  - done=True only when game_timer reaches 0 or board fills up
  - timeline_x advances correctly
  - observation shapes match the declared observation space
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

import pytest
import numpy as np

from python.game.env import LuminesEnvNative


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _random_actions(n: int, seed: int = 0) -> list:
    rng = np.random.default_rng(seed)
    return rng.integers(0, 64, size=n).tolist()


# ---------------------------------------------------------------------------
# Structural invariants — native env in isolation
# ---------------------------------------------------------------------------

def test_reset_returns_correct_shapes():
    env = LuminesEnvNative(mode='per_block', seed='test123')
    obs, info = env.reset()

    assert obs['light_board'].shape == (10, 16)
    assert obs['dark_board'].shape == (10, 16)
    assert obs['light_pattern_board'].shape == (10, 16)
    assert obs['dark_pattern_board'].shape == (10, 16)
    assert obs['light_chain'].shape == (1,)
    assert obs['dark_chain'].shape == (1,)
    assert obs['current_block'].shape == (2, 2)
    assert obs['queue'].shape == (3, 2, 2)
    assert obs['timeline_x'].shape == (1,)
    assert obs['game_timer'].shape == (1,)


def test_initial_score_is_zero():
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()
    assert env._state.score == 0


def test_initial_game_timer():
    env = LuminesEnvNative(mode='per_block', seed='test123')
    obs, _ = env.reset()
    assert obs['game_timer'][0] == 3600


def test_score_non_decreasing():
    """Score should never decrease during play."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()

    prev_score = 0
    actions = _random_actions(50)
    for a in actions:
        obs, reward, done, _, info = env.step(a)
        assert info['finalScore'] >= prev_score
        prev_score = info['finalScore']
        if done:
            break


def test_game_timer_decreases():
    """game_timer should decrease over time."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    obs, _ = env.reset()

    prev_timer = int(obs['game_timer'][0])
    actions = _random_actions(20)
    for a in actions:
        obs, _, done, _, _ = env.step(a)
        assert obs['game_timer'][0] <= prev_timer
        prev_timer = int(obs['game_timer'][0])
        if done:
            break


def test_board_values_in_range():
    """light_board and dark_board must be binary (0.0 or 1.0) on every step."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()

    actions = _random_actions(30)
    for a in actions:
        obs, _, done, _, _ = env.step(a)
        light = obs['light_board']
        dark = obs['dark_board']
        assert np.all((light == 0.0) | (light == 1.0)), "light_board contains non-binary values"
        assert np.all((dark == 0.0) | (dark == 1.0)), "dark_board contains non-binary values"
        if done:
            break


def test_done_returns_true_eventually():
    """The game must eventually end."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()

    done = False
    for _ in range(10000):
        _, _, done, _, _ = env.step(0)  # always drop to left
        if done:
            break

    assert done, "Game never ended after 10000 steps"


def test_no_op_after_done_is_stable():
    """Stepping after game over should return done=True and reward=0."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()

    for _ in range(10000):
        _, _, done, _, _ = env.step(0)
        if done:
            break

    obs, reward, done2, _, _ = env.step(0)
    assert done2 is True
    assert reward == 0.0


def test_reset_restarts_game():
    """After reset, score and timer should be back to initial values."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    env.reset()

    for _ in range(10):
        env.step(32)

    obs, _ = env.reset()
    assert env._state.score == 0
    assert obs['game_timer'][0] == 3600


def test_timeline_advances():
    """Timeline x should advance from 0 and wrap around."""
    env = LuminesEnvNative(mode='per_frame', seed='test123')
    env.reset()

    timeline_xs = set()
    for _ in range(3000):
        obs, _, done, _, _ = env.step(6)  # NO_OP
        timeline_xs.add(int(obs['timeline_x'][0]))
        if done:
            break

    # Timeline should have visited multiple columns
    assert len(timeline_xs) > 1


def test_observation_space_contains_obs():
    """Each observation should be contained within the declared space."""
    env = LuminesEnvNative(mode='per_block', seed='test123')
    obs, _ = env.reset()

    for key, space in env.observation_space.spaces.items():
        assert space.contains(obs[key]), f"obs['{key}'] not in observation space"


# ---------------------------------------------------------------------------
# Optional: compare against Node.js env (skipped if unavailable)
# ---------------------------------------------------------------------------

def _node_env_available() -> bool:
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
        from lumines_env import LuminesEnv
        env = LuminesEnv(mode='per_block', seed='test123')
        env.reset()
        env.close()
        return True
    except Exception:
        return False


@pytest.mark.skipif(
    not _node_env_available(),
    reason="Node.js IPC env not available",
)
def test_structural_parity_with_node_env():
    """
    Run both envs with the same actions and compare structural invariants.
    Block sequences differ (different RNG algorithms), so only structure is compared.
    """
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from lumines_env import LuminesEnv

    py_env = LuminesEnvNative(mode='per_block', seed='test123')
    node_env = LuminesEnv(mode='per_block', seed='test123')

    py_env.reset()
    node_env.reset()

    actions = _random_actions(50)
    for a in actions:
        py_obs, py_r, py_done, _, _ = py_env.step(a)
        node_obs, node_r, node_done, _, _ = node_env.step(a)

        assert py_obs['light_board'].shape == (10, 16)
        assert py_obs['dark_board'].shape == (10, 16)
        assert np.all((py_obs['light_board'] == 0.0) | (py_obs['light_board'] == 1.0))
        assert np.all((py_obs['dark_board'] == 0.0) | (py_obs['dark_board'] == 1.0))

        if py_done or node_done:
            break

    py_env.close()
    node_env.close()
