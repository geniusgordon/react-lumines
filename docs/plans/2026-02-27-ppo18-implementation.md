# PPO_18 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply three targeted hyperparameter/reward fixes to PPO_17 to push past the 24.17 eval ceiling.

**Architecture:** Two small edits — one reward weight in `env.py`, three hyperparameter values in `train.py`. No structural changes. Tests verify reward components and that training smoke-tests without crash.

**Tech Stack:** Python, Stable-Baselines3, Gymnasium, pytest (`python/.venv/bin/pytest`)

---

### Task 1: Reduce `adjacent_patterns_created` reward weight in env.py

**Files:**
- Modify: `python/game/env.py:16` (docstring) and `python/game/env.py:284` (reward line)
- Test: `python/tests/test_env.py` (existing, check reward_components key)

**Step 1: Verify the existing test covers reward_components**

Run:
```bash
python/.venv/bin/pytest python/tests/ -v -k "reward" 2>&1 | head -40
```
Expected: some reward-related tests pass.

**Step 2: Write a new failing test for the weight**

Add to `python/tests/test_env.py`:
```python
def test_adjacent_patterns_reward_weight():
    """adjacent_patterns_created contribution uses 0.05 weight in PPO_18."""
    from game.env import LuminesEnvNative
    env = LuminesEnvNative(mode="per_block", seed="42")
    env.reset()
    # Run a few steps and collect reward_components
    for action in range(60):
        _, _, done, _, info = env.step(action)
        if "reward_components" in info:
            rc = info["reward_components"]
            if rc["adjacent_patterns_created"] > 0:
                # weight should be 0.05, not 0.10
                implied_weight = rc["total"] - (
                    rc["score_delta"]
                    + rc["patterns_created"] * 0.05
                    + rc["height_delta"]
                    + rc["holding_score_reward"]
                    + rc["adjacent_patterns_created"] * 0.05
                    + rc["death_penalty"]
                )
                assert abs(implied_weight) < 1e-6, (
                    f"adjacent_patterns weight is not 0.05; residual={implied_weight}"
                )
        if done:
            break
```

**Step 3: Run to verify it fails**

```bash
python/.venv/bin/pytest python/tests/test_env.py::test_adjacent_patterns_reward_weight -v
```
Expected: FAIL (residual ≠ 0 because current weight is 0.10).

**Step 4: Apply the fix in env.py**

In `python/game/env.py`:

Line 16 — update docstring:
```
# Before
           + adjacent_patterns_created * 0.10 # bonus for patterns created adjacent to live combo zone
# After
           + adjacent_patterns_created * 0.05 # bonus for patterns created adjacent to live combo zone
```

Line 284 — update reward calculation:
```python
# Before
reward = score_delta + patterns_created * 0.05 + height_delta + holding_score_reward + adjacent_patterns_created * 0.10 + death
# After
reward = score_delta + patterns_created * 0.05 + height_delta + holding_score_reward + adjacent_patterns_created * 0.05 + death
```

Also update the `info["reward_components"]` dict entry on the line just below (the `"adjacent_patterns_created"` key value stays as-is — it records the count, not the weighted value; only the `"total"` key uses the weighted sum).

**Step 5: Run test to verify it passes**

```bash
python/.venv/bin/pytest python/tests/test_env.py::test_adjacent_patterns_reward_weight -v
```
Expected: PASS.

**Step 6: Run full test suite**

```bash
python/.venv/bin/pytest python/tests/ -v 2>&1 | tail -20
```
Expected: all tests pass.

**Step 7: Commit**

```bash
git add python/game/env.py python/tests/test_env.py
git commit -m "feat(ppo18): reduce adjacent_patterns reward weight 0.10 -> 0.05"
```

---

### Task 2: Update hyperparameters in train.py

**Files:**
- Modify: `python/train.py:267` (LR schedule), `python/train.py:301` (entropy callback), `python/train.py:319` (timesteps default)

No new tests needed — these are scalar constants. Verified by smoke test below.

**Step 1: Apply all three changes**

`python/train.py` line 267:
```python
# Before
learning_rate=linear_schedule(3e-5, 3e-6),
# After
learning_rate=linear_schedule(3e-5, 1e-6),
```

`python/train.py` line 301:
```python
# Before
EntropyScheduleCallback(initial_ent=0.1, final_ent=0.01, total_steps=args.timesteps),
# After
EntropyScheduleCallback(initial_ent=0.1, final_ent=0.03, total_steps=args.timesteps),
```

`python/train.py` line 319:
```python
# Before
parser.add_argument("--timesteps", type=int, default=2_000_000)
# After
parser.add_argument("--timesteps", type=int, default=3_000_000)
```

**Step 2: Smoke test — verify train.py imports and parses args cleanly**

```bash
python/.venv/bin/python -c "
import sys; sys.argv = ['train.py', '--algo', 'ppo', '--timesteps', '100']
import python.train as t
import argparse
p = argparse.ArgumentParser()
p.add_argument('--timesteps', type=int, default=3_000_000)
args = p.parse_args(['--timesteps', '100'])
assert args.timesteps == 100
print('default timesteps in source:', 3_000_000)
print('OK')
"
```

**Step 3: Verify the values are actually changed (grep check)**

```bash
grep -n "3e-6\|1e-6\|final_ent\|2_000_000\|3_000_000" python/train.py
```
Expected output — should show `1e-6`, `final_ent=0.03`, `3_000_000` and NOT `3e-6`, `final_ent=0.01`, `2_000_000`.

**Step 4: Commit**

```bash
git add python/train.py
git commit -m "feat(ppo18): LR final 3e-6->1e-6, entropy final 0.01->0.03, 3M steps default"
```

---

### Task 3: Update MEMORY.md with PPO_18 changes

**Files:**
- Modify: `/Users/gordon/.claude/projects/-Users-gordon-Playground-react-lumines-master/memory/MEMORY.md`

**Step 1: Add PPO_18 entry to MEMORY.md**

Append after the PPO_17 section:

```markdown
## PPO_18 changes

**Reward:**
- `adjacent_patterns_created * 0.05` (was 0.10) — equal weight to patterns_created

**Hyperparameters:**
- LR schedule: linear_schedule(3e-5, 1e-6) — tighter final LR (was 3e-6)
- Entropy: final_ent=0.03 (was 0.01) — keep exploration longer
- total_timesteps default: 3M (was 2M)

**Rationale:** PPO_17 entropy collapsed too fast, clip fraction crept to 0.142,
policy gradient signal shrank at end. No architecture changes.
```

**Step 2: Commit**

```bash
git add /Users/gordon/.claude/projects/-Users-gordon-Playground-react-lumines-master/memory/MEMORY.md
```
(Memory file is outside the repo — no commit needed, just save.)

---

### Task 4: Launch PPO_18 training

**Step 1: Verify clean state**

```bash
ls python/checkpoints/
ls python/logs/
```
Note: PPO_18 will create a new `PPO_18` log dir automatically (SB3 increments). Confirm there's no existing `PPO_18` dir.

**Step 2: Launch training**

```bash
python python/train.py --algo ppo --envs 16 --device mps 2>&1 | tee python/logs/ppo18_stdout.log &
```

**Step 3: Verify it started**

After ~30 seconds:
```bash
ls python/logs/
```
Expected: `PPO_18/` directory present.

```bash
python/.venv/bin/python python/inspect_logs.py python/logs/PPO_18 2>&1
```
Expected: some initial steps logged.
