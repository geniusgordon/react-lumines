# Training Improvements — Action Space Fix, Reward Shaping & Hyperparameter Tuning

**Date:** 2026-02-25
**Status:** Implemented
**Files:** `python/game/env.py`, `python/train.py`

---

## 1. Problem: Agent Dying in 6 Steps, Zero Reward

After initial training the agent exhibited three compounding failure modes:

1. **Action space bias.** The action space was `Discrete(64)` (16 columns × 4 rotations) but the board only has 15 valid placement columns (x=0..14). The decode `target_x = action // 4` maps actions 60–63 to x=15, which is then clamped to x=14. This gave column 14 **8 actions** while every other column had 4 — twice the initial probability mass. PPO immediately exploited this free lunch.

2. **Policy collapse.** With `ent_coef=0.0` (SB3 default) the policy converged almost immediately to column 14 (the biased column). With a 2×2 block and a 10-row board, five consecutive placements in the same two columns fills those columns to row 0. The sixth placement attempt triggers game over.

3. **Reward sparsity.** The original reward was pure score delta (`score_after - score_before`). Lumines score only increases when the timeline sweeps over matched same-colour rectangles. In a 6-step episode the timeline barely moves, so `score_delta == 0` for every step. The agent had no learning signal at all.

TensorBoard evidence:
- `rollout/ep_len_mean` locked at ~6 across all training runs
- `rollout/ep_rew_mean` consistently 0
- `train/approx_kl` and `train/clip_fraction` spiked briefly then collapsed to 0 within ~50k steps

---

## 2. Diagnosis

### 2a. Why exactly 6 steps?

The game-over check in `_place_current_block` fires when both cells of the target column at row 0 are occupied. With a 10-row board and 2×2 blocks:

```
5 blocks stacked at same x → rows 0–9 of columns x, x+1 are full
6th placement at the same x → game over
```

Verified with a minimal reproduction:

```python
env = LuminesEnvNative(mode='per_block', seed='42')
env.reset()
for step in range(7):
    _, reward, done, _, _ = env.step(0)  # always x=0
    # step 6: reward=-1.0, done=True
```

With distributed actions (different x per step) the game runs indefinitely past 10 steps — the board mechanics are correct.

### 2b. Why column 14 specifically?

The `Discrete(64)` action space encoded 16 columns, but `max_x = BOARD_WIDTH - 2 = 14`. Actions 60–63 all decoded to x=15 and were silently clamped to x=14:

```
actions 0–3   → x=0  (4 actions)
actions 4–7   → x=1  (4 actions)
...
actions 56–59 → x=14 (4 actions)
actions 60–63 → x=15 → clamped to x=14  ← 4 extra!
```

Column 14 had 8/64 = 12.5% probability at init vs 6.25% for every other column. PPO's early gradient steps reinforced this slight bias until the policy fully collapsed to x=14.

The fix: `Discrete(60)` = 15 valid columns × 4 rotations. Every column now has exactly 4/60 probability.

### 2c. Why does the policy collapse further once it has a preference?

With `ent_coef=0.0` (SB3 default) there is no entropy regularisation. PPO finds the easiest way to reduce policy gradient loss, which is to make the policy deterministic. Once the policy assigns near-probability-1 to a single action, the advantage estimates for all other actions are never observed, and the policy cannot escape the local optimum.

---

## 3. Fixes

### 3a. Action space fix (`Discrete(64)` → `Discrete(60)`)

Changed `action_space = spaces.Discrete(60)` in `LuminesEnvNative`. The board has 15 valid placement columns (x=0..14) and 4 rotations:

```python
# Before — x=15 clamped to x=14, doubling its probability
self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations

# After — every column has equal initial probability
self.action_space = spaces.Discrete(60)  # 15 cols × 4 rotations (x=0..14)
```

The decode logic `target_x = action // 4` required no changes — it already maps actions 0–59 to x=0–14 correctly.

**This was the primary cause of collapse to column 14.** All subsequent reward shaping and entropy fixes are necessary but insufficient without this correction.

### 3b. Entropy regularisation (`ent_coef`)

Added `ent_coef` to the PPO constructor and set the CLI default to `0.1`. This adds `ent_coef × H(π)` to the objective, penalising premature certainty.

```python
model = PPO(..., ent_coef=args.ent_coef, ...)
```

```
--ent-coef 0.1   (default; try 0.1–0.5 range)
```

Iterations tested:
| `ent_coef` | Result |
|-----------|--------|
| 0.0 (default) | Immediate collapse; ep_len=6 from step 1 |
| 0.05 | Delayed collapse; ep_len still reaches 6 by ~200k steps; reward plateaus at −1.3 |
| 0.1 | Policy diversifies; ongoing |

### 3c. Reward shaping (iteration 1)

Two components were added to `_step_per_block` in `LuminesEnvNative`:

```python
height_penalty = self._max_column_height() / BOARD_HEIGHT * 0.1
if done:
    reward = score_delta - 1.0
else:
    reward = score_delta + 0.1 - height_penalty
```

**Survival bonus (`+0.1`):** Rewards the agent for each block placed without dying. Without this, the agent receives zero reward for every step regardless of board state, giving no gradient to improve on.

**Height penalty (`-max_height / 10 * 0.1`):** Penalises tall columns with a smooth, continuous signal. This gives the policy a gradient *before* game over occurs — not just as a terminal −1 hit.

**Game over penalty (`−1.0`):** Applied at the terminal step to make dying strictly worse than surviving.

**Reward comparison (verified):**

| Strategy | Episode total |
|----------|--------------|
| Always x=0 (degenerate) | −0.80 (5 steps × diminishing + −1.0) |
| Distribute across columns | +0.62+ and still alive at step 10 |

The degenerate strategy is now strictly dominated — stacking a column penalises the agent progressively before it dies, and the game-over penalty ensures dying is worse than any living state.

### 3e. Reward shaping (iteration 2) — pattern formation signal

After iteration 1, training plateaued at `ep_rew_mean ≈ −1.3` within 60k steps and never improved further. Analysis showed `score_delta == 0` for the entire run: the agent learned to survive a few blocks but **never formed a clearable pattern**.

Root cause: the clear reward requires (1) same-colour adjacent placement, (2) a 2×2 square forming, and (3) the timeline sweeping through it. This is a deeply delayed, multi-step reward that PPO cannot credit-assign without a dense intermediate signal.

**Fix: reward for creating 2×2 same-colour squares** (`squares_delta`).

```python
prev_squares = self._count_complete_squares()
# ... block placement ...
squares_delta = float(self._count_complete_squares() - prev_squares)

height_penalty = self._max_column_height() / BOARD_HEIGHT * 0.05  # halved
if done:
    reward = score_delta - 1.0
else:
    reward = score_delta + squares_delta * 0.5 + 0.1 - height_penalty
```

```python
def _count_complete_squares(self) -> int:
    """Count all 2×2 same-colour squares on the board (overlapping squares counted separately)."""
    board = self._state.board
    count = 0
    for row in range(BOARD_HEIGHT - 1):
        for col in range(BOARD_WIDTH - 1):
            c = board[row][col]
            if c != 0 and c == board[row][col + 1] == board[row + 1][col] == board[row + 1][col + 1]:
                count += 1
    return count
```

Each new 2×2 same-colour square formed adds `+0.5` to the reward immediately — before the timeline sweeps. This gives the agent a dense signal that discovering colour alignment is valuable.

**spread_penalty removed:** The `std(heights) * 0.05` penalty was counterproductive; it incentivised the agent to flatten the board, which conflicts with the density required to form clearable patterns.

**Height penalty coefficient halved:** `0.1 → 0.05`. The previous coefficient was aggressive enough that the agent prioritised board flatness over pattern formation. The softer penalty still discourages runaway columns without overriding the pattern signal.

### 3d. Hyperparameter changes

| Hyperparameter | Iteration 1 | Iteration 2 | Rationale |
|---------------|------------|------------|-----------|
| `n_steps` | 2048 | 4096 | Longer rollouts improve credit assignment for delayed clear rewards |
| `batch_size` | 256 | 256 | Unchanged |
| `learning_rate` | constant 3×10⁻⁴ | linear decay `lr * progress` | Reintroduced after reward shaping stabilises value function; decays from 3×10⁻⁴ → 0 as training progresses |
| `target_kl` | 0.02 | 0.02 | Unchanged |
| `ent_coef` | 0.2 | 0.1 | Reduced after action space and reward fixes stabilise exploration |

---

## 4. Monitoring

With these changes, the signals to watch in TensorBoard:

| Metric | Healthy sign |
|--------|-------------|
| `rollout/ep_len_mean` | Should grow well past 6 and trend upward |
| `rollout/ep_rew_mean` | Should trend positive as agent learns to survive |
| `train/approx_kl` | Stays elevated for longer (~100–200k steps) before settling |
| `train/entropy_loss` | Stays noticeably negative throughout; should not collapse to ~0 |
| `train/explained_variance` | Should stay positive and close to 1.0; drops to negative indicate LR or vf_coef issues |

---

## 5. Remaining Limitations

- **Score is still sparse.** The `squares_delta` signal rewards pattern *formation*, but actual scoring requires the timeline to sweep over marked cells. The agent must now learn the second-order behaviour of placing patterns in front of the timeline sweep.
- **squares_delta is not cleared correctly.** Completed 2×2 squares that are later swept and cleared will reduce the count, so `squares_delta` can go negative when the timeline clears cells. This is intentional (the score_delta reward captures cleared value), but the net effect on reward should be monitored.
- **Timeline position not exploited.** The agent receives `timeline_x` in its observation but there is no shaped reward for placing patterns ahead of the sweep. A future improvement could add a proximity bonus for patterns positioned just ahead of the timeline.
