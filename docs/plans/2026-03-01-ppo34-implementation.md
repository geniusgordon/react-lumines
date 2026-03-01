# PPO_34 Obs + Reward Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `timeline_col` as a 5th CNN channel and replace potential-based shaping with `score_delta + PATTERN_LAMBDA * patterns_formed + death`.

**Architecture:** Single env file change (`env.py`) + single training file change (`train.py`). All phi/potential code is removed; pattern formation is measured directly from game state at block-drop time. Tests are updated in-place in `test_env_rewards.py` and `test_env.py`.

**Tech Stack:** Python 3, gymnasium, numpy, PyTorch, Stable-Baselines3, pytest

---

### Task 1: Write failing tests for `timeline_col` observation channel

**Files:**
- Modify: `python/tests/test_env_rewards.py`

Append this block at the end of the file:

```python
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
```

**Step 2: Run tests to verify they fail**

```bash
cd /path/to/repo
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_obs_has_timeline_col -v
```
Expected: FAIL with `KeyError` or `AssertionError` — `timeline_col` not yet in obs.

**Step 3: Commit the failing tests**

```bash
git add python/tests/test_env_rewards.py
git commit -m "test(ppo34): add failing tests for timeline_col obs channel"
```

---

### Task 2: Write failing tests for new reward formula

**Files:**
- Modify: `python/tests/test_env_rewards.py`

Append this block after the Task 1 block:

```python
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
```

**Step 2: Run to verify they fail**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_reward_components_ppo34_exact_keys -v
```
Expected: FAIL — `reward_components` still has old phi keys.

**Step 3: Commit the failing tests**

```bash
git add python/tests/test_env_rewards.py
git commit -m "test(ppo34): add failing tests for new reward formula and patterns_formed"
```

---

### Task 3: Implement `timeline_col` in `env.py`

**Files:**
- Modify: `python/game/env.py`

**Step 1: Add `timeline_col` to `observation_space`**

In `__init__`, find the `observation_space = spaces.Dict({...})` block and add one entry:

```python
# After "dark_chain": spaces.Box(...),  add:
"timeline_col": spaces.Box(0, 1, shape=(BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32),
```

**Step 2: Add `timeline_col` to `_build_obs`**

In `_build_obs`, add to the returned dict:

```python
# After "dark_chain": np.array([...]),  add:
"timeline_col": self._build_timeline_col(),
```

**Step 3: Add `_build_timeline_col` helper method**

Add after `_build_color_pattern_channel`:

```python
def _build_timeline_col(self) -> np.ndarray:
    """Binary float32 (H×W): 1.0 in every row of the current timeline column."""
    mask = np.zeros((BOARD_HEIGHT, BOARD_WIDTH), dtype=np.float32)
    mask[:, self._state.timeline.x] = 1.0
    return mask
```

**Step 4: Run timeline_col tests**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -k "timeline_col" -v
```
Expected: all 7 timeline_col tests PASS.

**Step 5: Run full test suite to check for regressions**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: timeline_col tests pass; reward formula tests still fail (not yet implemented); all other existing tests pass.

**Step 6: Commit**

```bash
git add python/game/env.py
git commit -m "feat(ppo34): add timeline_col observation channel"
```

---

### Task 4: Implement new reward in `_step_per_block`

**Files:**
- Modify: `python/game/env.py`

**Step 1: Add `PATTERN_LAMBDA` constant**

Near the top of the file, after `DEATH_PENALTY = -3.0`, replace the shaping constants block:

```python
# Remove these lines:
# SHAPING_LAMBDA = 0.10
# SHAPING_GAMMA = 0.99
# PHI_W_CHAIN = 1.0
# PHI_W_PURITY = 0.6
# PHI_W_BLOCKERS = 0.8
# PHI_W_HEIGHT = 0.3
# PHI_W_SETUP = 0.2
# PHI_W_PRECLEAR = 0.1

# Add this line:
PATTERN_LAMBDA = 0.3
```

**Step 2: Update `_step_per_block` reward logic**

Find `_step_per_block`. The current structure after the hard_drop call is:

```python
# 3. Hard drop — also spawns the next block immediately
self._state = hard_drop(self._state, rng)
```

Insert pattern counting immediately after the hard_drop line and before the timeline tick loop:

```python
self._state = hard_drop(self._state, rng)

# Count patterns formed by this placement (before timeline sweeps any away)
patterns_before = self._count_complete_squares_from_board(board_before_drop)
patterns_after = self._count_complete_squares_from_board(self._state.board)
patterns_formed = max(0, patterns_after - patterns_before)
```

Where `board_before_drop` is captured just before the hard_drop. Add this line immediately before the rotations loop (at the top of the per-block logic):

```python
board_before_drop = [row[:] for row in self._state.board]
```

**Step 3: Replace the reward computation block**

Find and replace the reward computation (currently uses phi/shaping). The old block looks like:

```python
score_delta = float(self._state.score - prev_score)
sim_board = self._simulate_clear_board(self._state.board)
post_sweep_light = ...
...
phi_next, phi_components = self._compute_potential(...)
phi_prev = self._prev_phi
potential_delta = SHAPING_GAMMA * phi_next - phi_prev
shaping_reward = SHAPING_LAMBDA * potential_delta
self._prev_phi = phi_next

done = self._state.status == "gameOver"
death = DEATH_PENALTY if done else 0.0
reward = score_delta + shaping_reward + death
info = self._build_info()
info["reward_components"] = {
    "score_delta": score_delta,
    ...
}
```

Replace the entire block from `score_delta = ...` to the `return` with:

```python
score_delta = float(self._state.score - prev_score)
done = self._state.status == "gameOver"
death = DEATH_PENALTY if done else 0.0
reward = score_delta + PATTERN_LAMBDA * patterns_formed + death

info = self._build_info()
info["reward_components"] = {
    "score_delta": score_delta,
    "patterns_formed": float(patterns_formed),
    "death": death,
    "total": reward,
}
return self._build_obs(), reward, done, False, info
```

**Step 4: Run new reward tests**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -k "ppo34" -v
```
Expected: all PPO_34 reward tests PASS.

**Step 5: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: new tests pass; old phi tests now FAIL (they reference removed keys/methods — will be cleaned up in Task 5).

**Step 6: Commit**

```bash
git add python/game/env.py
git commit -m "feat(ppo34): replace phi shaping with score_delta + PATTERN_LAMBDA * patterns_formed"
```

---

### Task 5: Remove Φ-related code from `env.py`

**Files:**
- Modify: `python/game/env.py`

**Step 1: Remove `__init__` phi state**

In `__init__`, remove these lines:
```python
self._prev_post_sweep_light_chain = 0.0
self._prev_post_sweep_dark_chain = 0.0
sim_board = self._simulate_clear_board(self._state.board)
self._prev_phi, _ = self._compute_potential(sim_board)
```

**Step 2: Remove `reset` phi state**

In `reset`, remove:
```python
self._prev_post_sweep_light_chain = 0.0
self._prev_post_sweep_dark_chain = 0.0
sim_board = self._simulate_clear_board(self._state.board)
self._prev_phi, _ = self._compute_potential(sim_board)
```

**Step 3: Delete the following methods entirely**

- `_simulate_clear_board`
- `_count_near_patterns`
- `_count_max_near_patterns`
- `_count_blocked_near_patterns`
- `_count_chain_zone_blockers`
- `_compute_potential`
- `_count_patterns_in_zone`
- `_chain_range_for_color`

Keep: `_count_complete_squares_from_board`, `_count_complete_squares`, `_count_single_color_chain`, `_count_max_single_color_chain_from_board`, `_count_chain_length`, `_count_chain_length_from_board`, `_longest_run`, `_column_heights`, `_max_column_height`, `_max_column_height_from_board`, `_build_color_board`, `_build_color_pattern_channel`, `_build_timeline_col`.

**Step 4: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: PPO_34 tests pass; old phi tests fail with `AttributeError` (referencing deleted methods).

**Step 5: Commit**

```bash
git add python/game/env.py
git commit -m "refactor(ppo34): remove phi potential, simulate_clear, and unused reward helpers"
```

---

### Task 6: Delete stale phi tests, update formula test in `test_env.py`

**Files:**
- Modify: `python/tests/test_env_rewards.py`
- Modify: `python/tests/test_env.py`

**Step 1: Delete these test functions from `test_env_rewards.py`**

These test removed behavior — delete them entirely:

- `test_reward_components_exact_keys` (tests old phi key set)
- `test_reward_total_matches_formula` (tests old phi formula)
- `test_potential_delta_is_float`
- `test_shaping_reward_is_float`
- `test_phi_values_are_float`
- `test_shape_components_are_normalized_ranges`
- `test_preclear_patterns_positive_when_board_has_2x2`
- `test_prev_phi_resets_on_reset`
- `test_simulate_clear_board_removes_all_patterns`
- `test_potential_shaping_still_applies_when_sweep_scores`
- `test_post_sweep_light_measures_chain_after_simulated_clear`
- `test_chain_blocking_delta_zero_on_empty_board`
- `test_chain_blocking_delta_is_float`
- `test_chain_blocking_delta_positive_when_blocker_created`
- `test_chain_blocking_delta_zero_when_no_alt_color_patterns_in_zone`

Also delete these negative-assertion tests that referenced removed keys (now trivially true but misleading):
- `test_reward_components_no_chain_after_drop`
- `test_reward_components_no_height_delta`
- `test_reward_components_no_patterns_created`
- `test_reward_components_no_holding_score_reward`
- `test_reward_components_no_adjacent_patterns`
- `test_reward_components_no_chain_delta_reward`
- `test_reward_components_no_projected_chain_reward`
- `test_reward_components_no_post_sweep_pattern_delta`
- `test_reward_components_no_spread_penalty`
- `test_reward_components_no_placement_penalty`

**Step 2: Update `test_env.py`**

Replace the entire content of `python/tests/test_env.py` with:

```python
def test_potential_reward_formula():
    """PPO_34: total = score_delta + PATTERN_LAMBDA * patterns_formed + death."""
    from game.env import LuminesEnvNative, PATTERN_LAMBDA
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    for action in range(100):
        _, reward, done, _, info = env.step(action % 60)
        if "reward_components" in info:
            rc = info["reward_components"]
            expected = (
                rc["score_delta"]
                + PATTERN_LAMBDA * rc["patterns_formed"]
                + rc["death"]
            )
            residual = abs(rc["total"] - expected)
            assert residual < 1e-6, (
                f"PPO_34 reward formula mismatch at action {action}; residual={residual}"
            )
        if done:
            env.reset()
```

**Step 3: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: all tests PASS, no failures.

**Step 4: Commit**

```bash
git add python/tests/test_env_rewards.py python/tests/test_env.py
git commit -m "test(ppo34): remove stale phi tests, update reward formula test"
```

---

### Task 7: Update `train.py` — CNN 4→5 channels

**Files:**
- Modify: `python/train.py`

**Step 1: Update CNN stem**

Find:
```python
nn.Conv2d(4, 32, kernel_size=3, padding=1),   # stem: 4 → 32 channels
```
Replace with:
```python
nn.Conv2d(5, 32, kernel_size=3, padding=1),   # stem: 5 → 32 channels
```

**Step 2: Update `forward()` channel stacking**

Find the block:
```python
light = observations["light_board"].float()
dark  = observations["dark_board"].float()
lp    = observations["light_pattern_board"].float()
dp    = observations["dark_pattern_board"].float()
x = torch.stack([light, dark, lp, dp], dim=1)
```

Replace with:
```python
light = observations["light_board"].float()
dark  = observations["dark_board"].float()
lp    = observations["light_pattern_board"].float()
dp    = observations["dark_pattern_board"].float()
tl    = observations["timeline_col"].float()
x = torch.stack([light, dark, lp, dp, tl], dim=1)   # [B, 5, 10, 16]
```

**Step 3: Update module docstring**

Find in the docstring at the top of the file:
```
1. CNN branch   : 4-channel board input (10×16) → 4 × Conv2d(3×3,pad=1) → flatten → Linear(5120→64) → ReLU
                  Channels: light_board, dark_board, light_pattern_board, dark_pattern_board
```
Replace with:
```
1. CNN branch   : 5-channel board input (10×16) → 4 × Conv2d(3×3,pad=1) → flatten → Linear(5120→64) → ReLU
                  Channels: light_board, dark_board, light_pattern_board, dark_pattern_board, timeline_col
```

Also update the class docstring line:
```
# CNN branch (board: 10×16, 4 channels: light_board + dark_board + light_pattern_board + dark_pattern_board) ----
```
To:
```
# CNN branch (board: 10×16, 5 channels: light_board + dark_board + light_pattern_board + dark_pattern_board + timeline_col) ----
```

**Step 4: Verify CNN output size is unchanged**

The output of the CNN flatten is still `32 * 10 * 16 = 5120` because `padding=1` preserves spatial dimensions through all conv layers. No downstream size changes needed.

**Step 5: Run a quick smoke test**

```bash
cd python
python -c "
import sys; sys.path.insert(0, '..')
from game.env import LuminesEnvNative
from train import LuminesCNNExtractor
from gymnasium import spaces
import numpy as np

env = LuminesEnvNative(mode='per_block', seed='42')
obs, _ = env.reset()
ext = LuminesCNNExtractor(env.observation_space, features_dim=128)
print('Extractor created OK')
import torch
batch = {k: torch.tensor(v).unsqueeze(0) for k, v in obs.items()}
out = ext(batch)
print(f'Output shape: {out.shape}')  # Expected: torch.Size([1, 128])
"
```
Expected output:
```
Extractor created OK
Output shape: torch.Size([1, 128])
```

**Step 6: Commit**

```bash
git add python/train.py
git commit -m "feat(ppo34): update CNN extractor to 5-channel input with timeline_col"
```

---

### Task 8: Final verification

**Step 1: Run the full test suite one final time**

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: all tests pass, zero failures.

**Step 2: Verify gym observation space validates cleanly**

```bash
cd python
python -c "
import sys; sys.path.insert(0, '..')
from game.env import LuminesEnvNative
env = LuminesEnvNative(mode='per_block', seed='42')
obs, _ = env.reset()
assert env.observation_space.contains(obs), 'obs not in observation_space!'
print('Observation space validation: PASS')
_, _, _, _, info = env.step(0)
rc = info['reward_components']
print(f'reward_components keys: {sorted(rc.keys())}')
print(f'PPO_34 reward test: PASS')
"
```
Expected:
```
Observation space validation: PASS
reward_components keys: ['death', 'patterns_formed', 'score_delta', 'total']
PPO_34 reward test: PASS
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(ppo34): final verification — all tests pass, obs space validates"
```
