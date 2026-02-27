# PPO_21 Post-Sweep Pattern Delta Reward — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `post_sweep_pattern_delta` reward term that fires when the timeline sweeps cells, rewarding the agent for leaving a combinable board after a clear.

**Architecture:** One new signed reward term in `_step_per_block` in `python/game/env.py`. Measures `_count_complete_squares()` before the tick loop and again after gravity settling (step 5), then applies `weight * delta` only when `score_delta > 0`. No new helpers needed — reuses existing `_count_complete_squares()`.

**Tech Stack:** Python 3, gymnasium, pytest. Run tests with `python/.venv/bin/pytest`.

---

## Context

- Reward lives entirely in `python/game/env.py` → `_step_per_block`
- Tests live in `python/tests/test_env_rewards.py`
- Two existing tests must be updated to include the new key:
  - `test_reward_components_exact_keys` (line 222) — hardcodes the exact key set
  - `test_chain_delta_reward_included_in_total` (line 264) — hardcodes the total formula
- All other tests are unaffected

Run all reward tests:
```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -v
```

Run full suite:
```bash
python/.venv/bin/pytest python/tests/ -v
```

---

### Task 1: Write failing tests for the new reward term

**Files:**
- Modify: `python/tests/test_env_rewards.py`

**Step 1: Add three new tests at the bottom of `python/tests/test_env_rewards.py`**

```python
# ---------------------------------------------------------------------------
# post_sweep_pattern_delta (PPO_21)
# ---------------------------------------------------------------------------

def test_post_sweep_pattern_delta_key_present():
    """post_sweep_pattern_delta must be present in reward_components on every step."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    assert "post_sweep_pattern_delta" in info["reward_components"]


def test_post_sweep_pattern_delta_zero_when_no_sweep():
    """post_sweep_pattern_delta must be 0.0 when score_delta == 0 (no sweep fired)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Run steps until we find one with no score_delta
    for _ in range(30):
        _, _, done, _, info = env.step(env.action_space.sample())
        rc = info["reward_components"]
        if rc["score_delta"] == 0.0:
            assert rc["post_sweep_pattern_delta"] == pytest.approx(0.0)
            return
        if done:
            break
    pytest.skip("Could not find a step with score_delta == 0 in 30 steps")


def test_post_sweep_pattern_delta_included_in_total():
    """total must equal the sum of all components including post_sweep_pattern_delta."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, reward, _, _, info = env.step(0)
    rc = info["reward_components"]
    expected_total = (
        rc["score_delta"] + rc["patterns_created"] + rc["height_delta"]
        + rc["holding_score_reward"] + rc["adjacent_patterns_created"]
        + rc["chain_delta_reward"] + rc["post_sweep_pattern_delta"]
        + rc["death_penalty"]
    )
    assert rc["total"] == pytest.approx(expected_total)
    assert rc["total"] == pytest.approx(reward)
```

**Step 2: Run tests to verify they fail**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_key_present python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_zero_when_no_sweep python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_included_in_total -v
```

Expected: 2–3 FAILED (KeyError or AssertionError — key not yet in reward_components)

**Step 3: Commit the failing tests**

```bash
git add python/tests/test_env_rewards.py
git commit -m "test(ppo21): add failing tests for post_sweep_pattern_delta reward term"
```

---

### Task 2: Update the two existing tests that hardcode reward_components keys

**Files:**
- Modify: `python/tests/test_env_rewards.py` (lines 222–228 and 264–276)

**Step 1: Update `test_reward_components_exact_keys`**

Find this line in the test (around line 227):
```python
expected_keys = {"score_delta", "squares_delta", "patterns_created", "height_delta", "holding_score_reward", "adjacent_patterns_created", "chain_delta_reward", "death_penalty", "total"}
```

Replace with:
```python
expected_keys = {"score_delta", "squares_delta", "patterns_created", "height_delta", "holding_score_reward", "adjacent_patterns_created", "chain_delta_reward", "post_sweep_pattern_delta", "death_penalty", "total"}
```

**Step 2: Update `test_chain_delta_reward_included_in_total`**

Find the `expected_total` computation (around line 270–275):
```python
expected_total = (
    rc["score_delta"] + rc["patterns_created"] + rc["height_delta"]
    + rc["holding_score_reward"] + rc["adjacent_patterns_created"]
    + rc["chain_delta_reward"] + rc["death_penalty"]
)
```

Replace with:
```python
expected_total = (
    rc["score_delta"] + rc["patterns_created"] + rc["height_delta"]
    + rc["holding_score_reward"] + rc["adjacent_patterns_created"]
    + rc["chain_delta_reward"] + rc["post_sweep_pattern_delta"]
    + rc["death_penalty"]
)
```

**Step 3: Run all reward tests — expect the two updated tests to still fail (key not in impl yet), newly added tests also fail, but no regressions in the other tests**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -v
```

Expected: same tests failing as before, no new failures introduced

**Step 4: Commit**

```bash
git add python/tests/test_env_rewards.py
git commit -m "test(ppo21): update exact_keys and total tests to include post_sweep_pattern_delta"
```

---

### Task 3: Implement the reward term in env.py

**Files:**
- Modify: `python/game/env.py`

The change has three parts, all inside `_step_per_block`.

**Step 1: Capture `pre_tick_patterns` before the tick loop**

Find this block (around line 242–243):
```python
patterns_after_drop = self._count_complete_squares()
patterns_created = float(patterns_after_drop - prev_patterns)
```

`patterns_after_drop` is already the value we need for `pre_tick_patterns`. No new variable needed.

**Step 2: Capture `post_tick_patterns` after step 5 (gravity settling)**

Find the end of the gravity-settling block (around line 290–291):
```python
        self._state.board = apply_gravity(board)
        self._state.falling_columns = []
```

After `self._state.falling_columns = []`, add:
```python
    post_tick_patterns = self._count_complete_squares()
```

Also add it outside the `if self._state.falling_columns:` block so it always runs. Place it just after the entire `if` block:

```python
    # Measure post-sweep board quality for potential-based shaping.
    # Must be measured after gravity settling (step 5) so falling cells
    # are included in the board.
    post_tick_patterns = self._count_complete_squares()
```

**Step 3: Compute `post_sweep_pattern_delta` and add to reward**

Find:
```python
score_delta = float(self._state.score - prev_score)
squares_delta = float(self._count_complete_squares() - prev_squares)
height_delta = -(sum(self._column_heights()) - prev_aggregate_height) / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5
done = self._state.status == "gameOver"
death = DEATH_PENALTY if done else 0.0
reward = score_delta + patterns_created * 0.05 + height_delta + holding_score_reward + adjacent_patterns_created * 0.05 + chain_delta_reward + death
```

Replace with:
```python
score_delta = float(self._state.score - prev_score)
squares_delta = float(self._count_complete_squares() - prev_squares)
height_delta = -(sum(self._column_heights()) - prev_aggregate_height) / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5
done = self._state.status == "gameOver"
death = DEATH_PENALTY if done else 0.0
# Post-sweep pattern delta: reward combinable residual, penalize junk residual.
# Only fires when a sweep actually occurred (score_delta > 0) to avoid
# double-counting placement quality already captured by patterns_created.
post_sweep_pattern_delta = (
    float(post_tick_patterns - patterns_after_drop) * 0.05
    if score_delta > 0 else 0.0
)
reward = score_delta + patterns_created * 0.05 + height_delta + holding_score_reward + adjacent_patterns_created * 0.05 + chain_delta_reward + post_sweep_pattern_delta + death
```

**Step 4: Add `post_sweep_pattern_delta` to `info["reward_components"]`**

Find:
```python
info["reward_components"] = {
    "score_delta": score_delta,
    "squares_delta": squares_delta,
    "patterns_created": patterns_created,
    "height_delta": height_delta,
    "holding_score_reward": holding_score_reward,
    "adjacent_patterns_created": adjacent_patterns_created,
    "chain_delta_reward": chain_delta_reward,
    "death_penalty": death,
    "total": reward,
}
```

Replace with:
```python
info["reward_components"] = {
    "score_delta": score_delta,
    "squares_delta": squares_delta,
    "patterns_created": patterns_created,
    "height_delta": height_delta,
    "holding_score_reward": holding_score_reward,
    "adjacent_patterns_created": adjacent_patterns_created,
    "chain_delta_reward": chain_delta_reward,
    "post_sweep_pattern_delta": post_sweep_pattern_delta,
    "death_penalty": death,
    "total": reward,
}
```

**Step 5: Also update the module docstring** at the top of `env.py` to document the new term.

Find in the docstring:
```
           + chain_delta_reward               # 0.15 per column the longest contiguous chain grows
           + death_penalty                     # DEATH_PENALTY on game over, else 0
```

Replace with:
```
           + chain_delta_reward               # 0.15 per column the longest contiguous chain grows
           + post_sweep_pattern_delta         # 0.05 * (patterns_after_ticks - patterns_after_drop), only when score_delta > 0
           + death_penalty                     # DEATH_PENALTY on game over, else 0
```

And add to the `reward_components keys emitted in info:` line — add `post_sweep_pattern_delta` to the list.

**Step 6: Run the new tests — expect all three to pass**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_key_present python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_zero_when_no_sweep python/tests/test_env_rewards.py::test_post_sweep_pattern_delta_included_in_total -v
```

Expected: all PASSED

**Step 7: Run full reward test suite — expect all to pass**

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -v
```

Expected: all PASSED

**Step 8: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v
```

Expected: all PASSED (106+ tests)

**Step 9: Commit**

```bash
git add python/game/env.py
git commit -m "feat(ppo21): add post_sweep_pattern_delta reward — combinable residual shaping after sweep"
```

---

### Task 4: Smoke-test the reward fires correctly at runtime

**Step 1: Run a short eval with render to visually confirm**

```bash
python python/eval.py --render --episodes 3
```

Watch for:
- Agent still builds combos and sweeps them
- Board after sweep looks less chaotic than PPO_20

**Step 2: Quick sanity check — print reward_components for one episode**

```python
# Run from repo root with python/.venv/bin/python
from python.game.env import LuminesEnvNative
env = LuminesEnvNative(mode="per_block", seed="test")
env.reset()
for i in range(30):
    _, r, done, _, info = env.step(env.action_space.sample())
    rc = info["reward_components"]
    if rc["score_delta"] > 0:
        print(f"step {i}: score_delta={rc['score_delta']:.1f}  post_sweep={rc['post_sweep_pattern_delta']:.3f}  patterns_created={rc['patterns_created']:.1f}")
    if done:
        break
```

Expected: lines printed when sweeps fire, `post_sweep_pattern_delta` non-zero on those lines.

---

### Task 5: Launch PPO_21 training

**Step 1: Start training**

```bash
python python/train.py --algo ppo --timesteps 3000000 --envs 8 --device mps
```

This will create a new `python/logs/PPO_21` directory.

**Step 2: Commit the launch**

```bash
git commit --allow-empty -m "feat(ppo21): launch PPO_21 training with post_sweep_pattern_delta reward"
```

**Step 3: Monitor after ~500k steps**

```bash
python python/inspect_logs.py python/logs/PPO_21
```

Look for:
- `eval/mean_reward` tracking toward PPO_17's 24.17 baseline
- `Explained variance` staying above 0.60
- `post_sweep_pattern_delta` visible in reward_components via eval logs
