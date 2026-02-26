# PPO Run 7 — Fundamental Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the EV ceiling (stuck at 0.05–0.22 across all runs) by giving the critic explicit spatial features, separating policy/value extractors, and simplifying the reward to reduce unexplained variance.

**Architecture:** Add `column_heights[16]` and `holes[1]` to the observation so the critic can see board quality directly; use `share_features_extractor=False` so the value network trains independently; simplify the reward to 4 terms; show full queue (3 blocks) instead of 2; increase `n_epochs` to 10.

**Tech Stack:** Python 3.14, gymnasium, stable-baselines3, pytest. All changes are in `python/game/env.py` and `python/train.py`. Tests in `python/tests/test_env_rewards.py` and `python/tests/test_action_sequence.py`.

---

## Background

Every PPO run has hit an `explained_variance` ceiling of ~0.22. Root causes:

1. **Critic can't see board quality** — the CNN has to discover column heights, holes, and chain structure from sparse reward signal alone. It doesn't.
2. **Shared feature extractor** — policy and value compete for the same 128-dim representation with `vf_coef=2.0` pulling toward value prediction, potentially harming the actor.
3. **Reward has too many noisy components** — 7 terms (score_delta, squares_delta, chain_delta, adj_bonus, height_delta, survival_bonus, death_penalty) add variance the critic must explain but can't, keeping EV low.
4. **Too few value update epochs** — `n_epochs=4` means each experience trains the critic only 4 times per rollout.

---

## Files to modify

| File | Change |
|------|--------|
| `python/game/env.py` | Add obs features, simplify reward |
| `python/train.py` | `share_features_extractor=False`, add MLP_KEYS, `n_epochs=10` |
| `python/tests/test_env_rewards.py` | Add obs tests, remove deleted reward component tests |
| `python/tests/test_action_sequence.py` | Remove `survival_bonus` assertion |
| `docs/2026-02-24-rl-agent-design.md` | Update Section 4 reward table + Section 2 arch |

---

## Task 1: Add `column_heights` and `holes` to observation

**Files:**
- Modify: `python/game/env.py`
- Test: `python/tests/test_env_rewards.py`

### Step 1: Write failing tests

Add to end of `python/tests/test_env_rewards.py`:

```python
# ---------------------------------------------------------------------------
# Observation features: column_heights and holes
# ---------------------------------------------------------------------------

def test_obs_has_column_heights():
    """Observation dict must contain 'column_heights' key."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "column_heights" in obs


def test_obs_column_heights_shape():
    """column_heights must have shape (16,)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["column_heights"].shape == (16,)


def test_obs_column_heights_empty_board():
    """column_heights must be all zeros for empty board."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{**env._state.__dict__, "board": create_empty_board()})
    obs = env._build_obs()
    assert (obs["column_heights"] == 0).all()


def test_obs_column_heights_one_full_column():
    """A column filled to the top should report height == BOARD_HEIGHT (10)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    for row in range(BOARD_HEIGHT):
        board[row][3] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert obs["column_heights"][3] == BOARD_HEIGHT
    assert obs["column_heights"][0] == 0


def test_obs_has_holes():
    """Observation dict must contain 'holes' key."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert "holes" in obs


def test_obs_holes_shape():
    """holes must have shape (1,)."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["holes"].shape == (1,)


def test_obs_holes_empty_board_is_zero():
    """holes must be 0 for a board with no overhangs."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    env._state = env._state.__class__(**{**env._state.__dict__, "board": create_empty_board()})
    obs = env._build_obs()
    assert obs["holes"][0] == 0


def test_obs_holes_counts_overhang():
    """An empty cell with a filled cell above it counts as a hole."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    # Col 5: row 8 filled, row 9 empty — 1 hole
    board[8][5] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert obs["holes"][0] == 1


def test_obs_holes_solid_column_no_holes():
    """A solid column with no gaps has 0 holes."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    board = create_empty_board()
    board[8][5] = 1
    board[9][5] = 1
    env._state = env._state.__class__(**{**env._state.__dict__, "board": board})
    obs = env._build_obs()
    assert obs["holes"][0] == 0
```

### Step 2: Run tests to verify they fail

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_obs_has_column_heights -v
```
Expected: **FAIL** — `KeyError: 'column_heights'`

### Step 3: Implement in `env.py`

**3a. Add `_compute_holes()` method** — add after `_count_adj_contacts` (or after `_count_complete_squares`):

```python
def _compute_holes(self) -> int:
    """Count empty cells that have at least one filled cell above them in the same column."""
    board = self._state.board
    holes = 0
    for col in range(BOARD_WIDTH):
        found_filled = False
        for row in range(BOARD_HEIGHT):
            if board[row][col] != 0:
                found_filled = True
            elif found_filled:
                holes += 1
    return holes
```

**3b. Add to `observation_space`** — in `__init__`, extend the `spaces.Dict`:

```python
"column_heights": spaces.Box(0, BOARD_HEIGHT, shape=(BOARD_WIDTH,), dtype=np.float32),
"holes": spaces.Box(0, BOARD_HEIGHT * BOARD_WIDTH, shape=(1,), dtype=np.int32),
```

**3c. Add to `_build_obs()`**:

```python
"column_heights": np.array(self._column_heights(), dtype=np.float32),
"holes": np.array([self._compute_holes()], dtype=np.int32),
```

### Step 4: Run tests to verify they pass

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py -k "column_heights or holes" -v
```
Expected: **all PASS**

### Step 5: Commit

```bash
git add python/game/env.py python/tests/test_env_rewards.py
git commit -m "feat: add column_heights and holes to observation space"
```

---

## Task 2: Extend queue visibility from 2 to 3 blocks

The game queue always holds exactly 3 blocks. Currently the observation exposes only 2. Showing all 3 gives the critic better foresight.

**Files:**
- Modify: `python/game/env.py`
- Test: `python/tests/test_env_rewards.py`

### Step 1: Write failing test

```python
def test_obs_queue_shape_is_3():
    """queue in observation must have shape (3, 2, 2) — all 3 queued blocks."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    obs, _ = env.reset()
    assert obs["queue"].shape == (3, 2, 2)
```

### Step 2: Run test to verify it fails

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_obs_queue_shape_is_3 -v
```
Expected: **FAIL** — shape is (2, 2, 2)

### Step 3: Implement changes in `env.py`

**In `observation_space`** — change queue shape:
```python
# before:
"queue": spaces.Box(0, 2, shape=(2, 2, 2), dtype=np.int8),
# after:
"queue": spaces.Box(0, 2, shape=(3, 2, 2), dtype=np.int8),
```

**In `_build_obs()`** — change slice:
```python
# before:
"queue": np.array([b.pattern for b in s.queue[:2]], dtype=np.int8),
# after:
"queue": np.array([b.pattern for b in s.queue[:3]], dtype=np.int8),
```

### Step 4: Run test to verify it passes

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_obs_queue_shape_is_3 -v
```
Expected: **PASS**

### Step 5: Commit

```bash
git add python/game/env.py python/tests/test_env_rewards.py
git commit -m "feat: expose full 3-block queue in observation"
```

---

## Task 3: Simplify reward — remove survival_bonus, adj_bonus, chain_delta

**New formula:**
```python
reward = score_delta + squares_delta * 0.2 + height_delta + death_penalty
```

Removes: `survival_bonus`, `adj_bonus` (ADJ_BONUS_WEIGHT), `chain_delta`.

**Files:**
- Modify: `python/game/env.py`
- Modify: `python/tests/test_env_rewards.py` (remove/update broken tests)
- Modify: `python/tests/test_action_sequence.py` (remove survival_bonus assertion)

### Step 1: Update `test_action_sequence.py`

In `test_safe_prefix_completes_without_game_over`, remove the survival_bonus line:

```python
# REMOVE this line:
assert info["reward_components"]["survival_bonus"] == pytest.approx(0.05)
```

### Step 2: Update `test_env_rewards.py`

**Remove** these test functions entirely (they test deleted components):
- `test_survival_bonus_positive_on_non_terminal_step`
- `test_survival_bonus_zero_on_game_over`
- `test_reward_components_has_chain_delta`
- All `_count_adj_contacts` tests (14 tests from Task 1 of previous session)
- `test_reward_components_has_adj_bonus`
- `test_adj_bonus_non_negative`
- `test_adj_bonus_zero_on_game_over`

**Add** structural tests for the new simplified reward:

```python
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


def test_reward_components_exact_keys():
    """reward_components must contain exactly the 5 expected keys."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, _, _, info = env.step(0)
    expected_keys = {"score_delta", "squares_delta", "height_delta", "death_penalty", "total"}
    assert set(info["reward_components"].keys()) == expected_keys


def test_death_penalty_on_game_over():
    """death_penalty must equal DEATH_PENALTY on the terminal step."""
    from python.game.env import DEATH_PENALTY
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    done = False
    info = {}
    while not done:
        _, _, done, _, info = env.step(0)
    assert info["reward_components"]["death_penalty"] == pytest.approx(DEATH_PENALTY)


def test_death_penalty_zero_on_non_terminal():
    """death_penalty must be 0.0 on non-terminal steps."""
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    _, _, done, _, info = env.step(0)
    if not done:
        assert info["reward_components"]["death_penalty"] == pytest.approx(0.0)
```

### Step 3: Run updated tests to verify they fail with current code

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py::test_reward_components_no_survival_bonus -v
```
Expected: **FAIL** — survival_bonus IS present

### Step 4: Implement simplified reward in `env.py`

**4a. Remove constants:**
```python
# DELETE these lines:
SURVIVAL_BONUS = 0.05
ADJ_BONUS_WEIGHT = 0.04
```

**4b. Remove `_count_adj_contacts` method entirely.**

**4c. Update module docstring** — change the reward formula block to:
```
    reward = score_delta
           + squares_delta * 0.2  # creating 2×2 same-color patterns
           + height_delta         # -(height_increase / 160) * 0.5  (potential-based)
           + death_penalty        # DEATH_PENALTY on game over, else 0

reward_components keys emitted in info:
    score_delta, squares_delta, height_delta, death_penalty, total
```

**4d. Remove `find_drop_position` import** (no longer needed after removing adj_bonus).

**4e. Update `_step_per_block()`:**

Remove the pre-drop capture block:
```python
# DELETE these lines:
pre_drop_y = find_drop_position(...)
pre_drop_pattern = [row[:] for row in self._state.current_block.pattern]
```

Remove `prev_chain` tracking:
```python
# DELETE:
prev_chain = self._count_chain_length()
```

Replace the reward computation block (after step 5 settling) with:
```python
score_delta = float(self._state.score - prev_score)
squares_delta = float(self._count_complete_squares() - prev_squares)
height_delta = -(sum(self._column_heights()) - prev_aggregate_height) / (BOARD_HEIGHT * BOARD_WIDTH) * 0.5
done = self._state.status == "gameOver"
death = DEATH_PENALTY if done else 0.0
reward = score_delta + squares_delta * 0.2 + height_delta + death
info = self._build_info()
info["reward_components"] = {
    "score_delta": score_delta,
    "squares_delta": squares_delta,
    "height_delta": height_delta,
    "death_penalty": death,
    "total": reward,
}
return self._build_obs(), reward, done, False, info
```

### Step 5: Run all reward tests

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py python/tests/test_action_sequence.py -v
```
Expected: **all PASS** (the removed test functions no longer exist, new structural tests pass)

### Step 6: Commit

```bash
git add python/game/env.py python/tests/test_env_rewards.py python/tests/test_action_sequence.py
git commit -m "feat: simplify reward to score_delta + squares_delta + height_delta + death_penalty"
```

---

## Task 4: Update `train.py` — MLP_KEYS, separate extractor, n_epochs

**Files:**
- Modify: `python/train.py`

No new tests needed — these are hyperparameter/architecture changes verified by a successful training run.

### Step 1: Add `column_heights` and `holes` to `MLP_KEYS`

In `LuminesCNNExtractor`:
```python
# before:
MLP_KEYS = ["current_block", "queue", "block_position", "timeline_x", "game_timer"]
# after:
MLP_KEYS = ["current_block", "queue", "block_position", "timeline_x", "game_timer", "column_heights", "holes"]
```

This adds 16 (column_heights) + 1 (holes) = 17 more inputs to the MLP branch, total 33 values. The `nn.Linear(mlp_input_size, 64)` line already computes `mlp_input_size` dynamically so no size change is needed.

### Step 2: Add `share_features_extractor=False` and set `n_epochs=10`

In `_train_ppo()`, update `policy_kwargs` and PPO constructor:

```python
policy_kwargs = dict(
    features_extractor_class=LuminesCNNExtractor,
    features_extractor_kwargs=dict(features_dim=128),
    net_arch=dict(pi=[128, 128], vf=[512, 512, 256]),
    share_features_extractor=False,   # NEW — separate actor/critic feature extractors
)
model = PPO(
    "MultiInputPolicy",
    env,
    learning_rate=linear_schedule(1e-4, 1e-5),
    n_steps=2048,
    batch_size=256,
    n_epochs=10,          # was 4 — more value gradient steps per rollout
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.1,
    vf_coef=2.0,
    max_grad_norm=0.5,
    target_kl=0.02,
    policy_kwargs=policy_kwargs,
    tensorboard_log=args.log_dir,
    device=args.device,
    verbose=1,
)
```

### Step 3: Verify train.py is importable

```bash
python/.venv/bin/python -c "import sys; sys.path.insert(0, 'python'); from game.env import LuminesEnvNative; e = LuminesEnvNative(); obs, _ = e.reset(); print(obs.keys()); print(obs['column_heights'].shape, obs['holes'].shape, obs['queue'].shape)"
```
Expected output:
```
dict_keys(['board', 'current_block', 'block_position', 'queue', 'timeline_x', 'score', 'frame', 'game_timer', 'column_heights', 'holes'])
(16,) (1,) (3, 2, 2)
```

### Step 4: Run full test suite

```bash
python/.venv/bin/pytest python/tests/ -v
```
Expected: **all pass** (106 - removed tests + new tests)

### Step 5: Commit

```bash
git add python/train.py
git commit -m "feat: separate actor/critic extractors, add column_heights+holes to MLP, n_epochs=10"
```

---

## Task 5: Update docs

**Files:**
- Modify: `docs/2026-02-24-rl-agent-design.md`

### Step 1: Update Section 2 (Neural Network Architecture)

Update the MLP branch input description:
```
 ├── current_block (2×2) ──────┐
 ├── queue (3×2×2)  ───────────┤  MLP branch
 ├── block_position (2,) ──────┤  concat → Linear(33→64) → ReLU
 ├── timeline_x (1,)  ─────────┤
 ├── game_timer (1,)  ──────────┤
 ├── column_heights (16,) ──────┤
 └── holes (1,)  ──────────────┘
```

Update MLP input size line: `**MLP input size:** 4 + 12 + 2 + 1 + 1 + 16 + 1 = 37 values.`

Add note about separate extractors:
```
Each branch is instantiated independently for actor and critic
(`share_features_extractor=False`) — the critic specialises on board-quality
prediction without conflicting with the actor's action-selection features.
```

### Step 2: Update Section 4 (Reward Function)

Replace the reward block with:
```python
reward = score_delta
       + squares_delta * 0.2
       + height_delta
       + death_penalty  # -3.0 on game over, else 0
```

Update the table — remove `adj_bonus`, `survival_bonus`, `chain_delta` rows.

### Step 3: Update Section 3 (Training Configuration) — n_epochs and queue size

Update `n_epochs` row: `6` → `10`
Update `queue` obs row: `(2×2×2)` → `(3×2×2)`
Add row: `share_features_extractor` = `False`

### Step 4: Commit

```bash
git add docs/2026-02-24-rl-agent-design.md
git commit -m "docs: update rl-agent-design for PPO Run 7 redesign"
```

---

## Task 6: Verification and training launch

### Step 1: Run the full test suite

```bash
python/.venv/bin/pytest python/tests/ -v 2>&1 | tail -10
```
Expected: all pass, 0 failures.

### Step 2: Quick sanity eval with random policy

```bash
python/.venv/bin/python -c "
import sys; sys.path.insert(0, 'python')
from game.env import LuminesEnvNative
import numpy as np
env = LuminesEnvNative(mode='per_block', seed='42')
obs, _ = env.reset()
print('Obs keys:', list(obs.keys()))
print('column_heights:', obs['column_heights'])
print('holes:', obs['holes'])
print('queue shape:', obs['queue'].shape)
total_reward = 0
done = False
while not done:
    action = env.action_space.sample()
    obs, reward, done, _, info = env.step(action)
    total_reward += reward
print('Episode reward:', total_reward)
print('Reward components:', info['reward_components'])
"
```
Expected: runs without crash, reward_components has exactly 5 keys, queue shape (3,2,2).

### Step 3: Start PPO_7 training

```bash
python python/train.py --algo ppo --envs 8 --device mps --timesteps 2000000
```

This creates `python/logs/PPO_7/`. Monitor with:
```bash
python/.venv/bin/python python/inspect_logs.py python/logs/PPO_7
```

### Step 4: Check EV at first checkpoint (~50k steps)

```bash
python/.venv/bin/python python/inspect_logs.py python/logs/PPO_7
```
Expected: `explained_variance` > 0.2 early and trending up (was stuck at 0.05 throughout PPO_5/6).

---

## Summary of changes

| File | What changes |
|------|-------------|
| `python/game/env.py` | +`_compute_holes()`, +`column_heights`+`holes` in obs, queue 2→3, simplified reward (4 terms), removed `SURVIVAL_BONUS`/`ADJ_BONUS_WEIGHT`/`_count_adj_contacts`/`find_drop_position` import |
| `python/train.py` | `MLP_KEYS` +16 entries, `share_features_extractor=False`, `n_epochs=10` |
| `python/tests/test_env_rewards.py` | +9 obs tests, removed ~20 deleted-component tests, +6 simplified-reward structural tests |
| `python/tests/test_action_sequence.py` | Remove `survival_bonus` assertion |
| `docs/2026-02-24-rl-agent-design.md` | Update arch diagram, reward table, training config table |
