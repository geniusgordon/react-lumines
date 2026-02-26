# Lumines RL Agent — Architecture & Usage

**Date:** 2026-02-24 (updated 2026-02-26)
**Status:** Implemented — PPO_14 in progress (PPO_13 complete)
**Files:** `python/train.py`, `python/eval.py`, `python/game/env.py`

---

## 1. Overview

A PPO-based reinforcement learning agent trained to play Lumines. The agent operates in `per_block` mode: one action per block placement, choosing a target column (0–14) and rotation (0–3) as a single `Discrete(60)` action.

Training uses [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) with the pure-Python `LuminesEnvNative` gymnasium environment (`python/game/env.py`) — no Node.js subprocess required.

---

## 1a. Timeline Sweep in Per-Block Mode

### Problem

In real Lumines a player places 5–8 blocks per full timeline sweep. The timeline advances continuously while the player is thinking and placing. The RL environment must simulate this pacing so the agent learns to build patterns *ahead of* the sweep and chain combos — not just clear immediately on every placement.

### Solution: `blocks_per_sweep`

After every hard drop, `_step_per_block` runs `ticks_per_block` timeline ticks:

```python
ticks_per_block = (BOARD_WIDTH * TIMELINE_SWEEP_INTERVAL) // blocks_per_sweep
#               = (16 × 15) // 6 = 40  (default)
```

Each tick increments `frame`, decrements `game_timer`, re-detects patterns, and calls `update_timeline`. The timeline advances ~2–3 columns per block at the default setting, completing a full board pass every ~6 placements — matching real gameplay pacing.

| `blocks_per_sweep` | `ticks_per_block` | Cols/step | Full sweep every |
|--------------------|-------------------|-----------|-----------------|
| 1 | 240 | 16 | 1 block |
| 6 (default) | 40 | ~2–3 | ~6 blocks |
| 16 | 15 | 1 | 16 blocks |

Falling columns from clears are settled instantly at the end of the step (no animation ticks), so the observation always reflects the fully resolved board.

### Why not instant clear?

Clearing everything immediately on each placement would prevent the agent from learning combo strategies — the core skill in Lumines. With `blocks_per_sweep=6` the sweep progresses naturally and the agent must plan 2–3 blocks ahead to chain patterns.

---

## 2. Neural Network Architecture

A two-branch `LuminesCNNExtractor` feeds into SB3's `MultiInputPolicy`.

```
Observation (Dict)
 ├── board (10×16 int8)         ─┐
 ├── pattern_board (10×16 f32)  ─┤ CNN branch (2-channel input)
 │                               │   Conv2d(2→16, 3×3, pad=1) → ReLU
 │                               │   Conv2d(16→32, 3×3, pad=1) → ReLU
 │                               │   Flatten → Linear(→64) → ReLU
 │                               │                            │
 ├── current_block (2×2) ──────┐ │                            │
 ├── queue (3×2×2)  ───────────┤ │  MLP branch                │
 ├── block_position (2,) ──────┤ │  concat → Linear(37→64)    │
 ├── timeline_x (1,)  ─────────┤ │              → ReLU        │
 ├── game_timer (1,)  ──────────┤ │                            │
 ├── column_heights (16,) ──────┤ │                            │
 └── holes (1,)  ──────────────┘ │                            │
                                                               │
                        128-dim concat ←───────────────────────
                               │
                    PPO actor head + critic head (separate extractors)
                    net_arch=dict(pi=[128,128], vf=[512,512,256])
```

**MLP input size:** 4 + 12 + 2 + 1 + 1 + 16 + 1 = 37 values.
**Combined output:** 128 dimensions (64 from each branch).

`pattern_board` is routed through the CNN branch as channel 2 (stacked with `board`), not through the MLP branch. Each cell's value = number of 2×2 same-color patterns it participates in, normalised to [0,1]. The CNN can directly see where valuable overlap clusters are, rather than having to infer pattern locations from raw cell colors alone.

The critic uses a deeper network (`vf=[512,512,256]`) than the actor (`pi=[128,128]`) because the value function must model complex board state → future return relationships, while the policy only needs to choose among 60 discrete actions.

Actor and critic use **separate** feature extractors (`share_features_extractor=False`).
With `vf_coef=2.0`, a shared extractor causes the critic's value gradient to dominate the shared weights, pulling them toward value prediction and starving the actor of clean action-relevant features. In PPO_10 this produced explained variance stuck at ~0.11 throughout, a clip fraction explosion to 0.42 by 688k steps, and eval reward collapse from 11.6 → 1.9. Separate extractors let the critic specialise on board-quality prediction without conflicting with the actor.

`score` and `frame` are excluded from the network inputs — they leak non-stationary scale information and are better left to the value baseline learned implicitly from returns.

---

## 3. Training Configuration

| Hyperparameter | Value |
|---------------|-------|
| Algorithm | PPO |
| Policy | `MultiInputPolicy` |
| Parallel envs | 8 (`SubprocVecEnv`) |
| `n_steps` | 2048 per env (16 384 total per rollout) |
| `batch_size` | 256 |
| `n_epochs` | 10 |
| `gae_lambda` | 0.90 |
| `share_features_extractor` | `False` (separate actor/critic extractors) |
| `features_dim` | 128 (64 from CNN branch + 64 from MLP branch) |
| `vf_coef` | 2.0 |
| `clip_range` | 0.2 |
| `max_grad_norm` | 0.5 |
| `target_kl` | 0.01 |
| `gamma` | 0.99 |
| `ent_coef` | 0.1 → 0.01 (linear decay over training) |
| Learning rate | 3×10⁻⁵ → 3×10⁻⁶ (linear decay) |
| Eval episodes | 100 |
| Device | `mps` (Apple Silicon) |
| Total timesteps | 2 000 000 |
| Obs/reward normalisation | `VecNormalize(norm_obs=True, norm_reward=True)` |
| Checkpoint frequency | Every 50 000 steps |
| Eval frequency | Every 50 000 steps |

### Why `VecNormalize`?

PPO's value function benefits from normalised observations and rewards. Norm stats are saved alongside checkpoints as `vecnormalize.pkl` and restored on resume/eval.

### VecNormalize eval sync

The eval env's obs normalization stats (`obs_rms`) must stay in sync with the training env's. Without this, the training env's running stats drift over hundreds of thousands of steps while the eval env uses stale initial stats — causing the policy to see wrongly-normalized observations at eval time and producing a systematic eval reward regression after ~250k steps (observed in PPO_7/8/9).

`SyncAndSaveVecNormalizeCallback` runs after every eval: it copies `train_env.obs_rms` into `eval_env.obs_rms` (deepcopy) and saves `vecnormalize.pkl`.

---

## 4. Reward Function

The reward is designed around Lumines' core scoring mechanic: the timeline
sweeps left-to-right, accumulating `holding_score` while passing over
consecutive columns of same-color 2×2 patterns, then cashing out on the first
empty column. Longer *chains* of consecutive pattern columns → bigger payouts.

```python
reward = score_delta
       + patterns_created * 0.05   # dense: new 2×2 patterns formed by this drop
       + height_delta
       + death_penalty  # -3.0 on game over, else 0
```

| Component | Range | Purpose |
|-----------|-------|---------|
| `score_delta` | ≥ 0 | Actual game score from timeline sweeps (primary objective) |
| `patterns_created * 0.05` | ≥ 0 | **Dense** signal: immediate reward for each new 2×2 same-color pattern created by this drop. Measured after hard drop but before timeline ticks — always ≥ 0. |
| `height_delta` | varies | **Potential-based** board pressure: penalises raising aggregate column height, rewards clearing. Zero on stable boards — no absolute baseline noise for the critic |
| `death_penalty` | −3.0 | Penalise game over |

`squares_delta` and `patterns_created` are both tracked in `info["reward_components"]` for observability.

No flat survival bonus — the agent's incentive to survive comes from future
scoring opportunities.

### Design rationale

`patterns_created` solves the sparse reward problem: the agent previously only received signal when the timeline swept, potentially several blocks after the placement that caused the clear. With `patterns_created * 0.05` the agent gets immediate feedback for building patterns. The 0.05 weight is small enough that clearing 4 patterns (−0.20 from this term's perspective) is dominated by any real `score_delta` (typically +2 to +10 per sweep) — no conflicting signal.

`patterns_created` is measured *before* timeline ticks, so it is always ≥ 0 (placing a block can only add cells). This avoids the old `squares_delta` problem where building patterns gave +reward but the timeline clearing them caused `squares_delta` to go negative, partially cancelling the `score_delta` for the same event.

`height_delta` is the potential-based form: zero when the board is stable,
negative when raised, positive when cleared. This avoids the constant negative
bias of the old absolute `height_reward` formula.

---

## 5. File Reference

| File | Purpose |
|------|---------|
| `python/train.py` | Training entry point — `--algo ppo\|dqn`, builds envs, runs training |
| `python/eval.py` | Evaluation — loads a checkpoint, runs episodes, reports scores, optional ASCII render |
| `python/game/env.py` | Pure-Python gymnasium environment (`LuminesEnvNative`) |
| `python/game/` | Pure-Python game logic (board, blocks, physics, timeline, etc.) |
| `python/checkpoints/` | Saved model checkpoints (generated at runtime) |
| `python/logs/` | TensorBoard event files (generated at runtime) |

---

## 6. Training

```bash
# PPO (default algo)
python python/train.py --algo ppo

# Custom run
python python/train.py --algo ppo \
  --timesteps 2000000 \
  --envs 8 \
  --device mps

# Resume from best checkpoint
python python/train.py --algo ppo --resume

# DQN (alternative)
python python/train.py --algo dqn
```

PPO checkpoints: `python/checkpoints/lumines_ppo_<N>_steps.zip`
Best PPO model: `python/checkpoints/best_model_ppo.zip`
VecNormalize stats: `python/checkpoints/vecnormalize.pkl`

### Monitoring

```bash
tensorboard --logdir python/logs
```

Key metrics to watch:
- `rollout/ep_rew_mean` — mean episode reward (should trend upward)
- `rollout/ep_len_mean` — episode length (longer = agent surviving better)
- `train/entropy_loss` — must stay noticeably negative; collapse to ~0 = policy collapse
- `train/approx_kl` — should stay below ~0.02; spikes indicate instability
- `train/explained_variance` — positive and trending toward 1.0

---

## 7. Evaluation

```bash
# Basic: 10 episodes, print mean/max/min score
python python/eval.py --algo ppo --checkpoint python/checkpoints/best_model_ppo

# Watch the agent play (ASCII board, 100ms between steps)
python python/eval.py --algo ppo \
  --checkpoint python/checkpoints/best_model_ppo \
  --render --episodes 3 --delay 0.1
```

Eval automatically loads `vecnormalize.pkl` from the checkpoint directory when `--algo ppo`.

---

## 8. Run History

| Run | Steps | Best eval reward | Peak clip frac | EV | Key change |
|-----|-------|-----------------|----------------|----|-----------|
| PPO_1–6 | ~400–540k | ~3–5 | 0.14–0.45 | 0.05–0.10 | Early experiments |
| PPO_7 | — | — | — | — | Added `column_heights`+`holes` obs, 3-block queue, `n_epochs=10` |
| PPO_8–9 | ~500k | — | — | ~0.10 | VecNormalize drift issue (eval regressed after 250k steps) |
| PPO_10 | 688k | 11.6 @ 350k | 0.42 | 0.11 | `SyncAndSaveVecNormalizeCallback` fixed eval drift; `share_features_extractor=True` caused clip fraction explosion and eventual eval collapse |
| PPO_11 | 2M | 14.58 @ 700k | 0.30 (stable) | 0.35 | `share_features_extractor=False`, LR 1e-4→1e-5, clip_range 0.2. No collapse. EV ceiling ~0.35, value loss drifted up in second half. |
| PPO_12 | 2M | 10.31 @ 450k | — | — | `features_dim=256`, LR 3e-5→3e-6, `n_steps=4096`, `gamma=0.995`, `target_kl=0.01`, entropy 0.1→0.01, `eval_episodes=50`. Larger model + longer rollouts hurt. |
| PPO_13 | 2M | 16.09 @ 950k | 0.17 | 0.55 | Dense `patterns_created*0.05` reward; `pattern_board` 2nd CNN channel; `features_dim=128`, LR 5e-5→5e-6. New best, but plateaued at 400k. |
| PPO_14 | — | — | — | — | `gae_lambda=0.90`, `n_envs=16`, `eval_episodes=100`, LR 3e-5→3e-6. Targets EV ceiling via reduced advantage variance + more rollout diversity. |

### PPO_10 post-mortem

PPO_10 ran 688k steps. Eval reward peaked at **11.6 @ 350k** then collapsed to 1.9 by 650k. Clip fraction grew monotonically from 0.05 → 0.42. Explained variance never exceeded 0.11.

Root cause: `share_features_extractor=True` with `vf_coef=2.0` meant the critic's 2× gradient weight dominated the shared CNN/MLP extractor, pulling features toward value prediction. As the board complexity grew, the actor and critic gradients increasingly conflicted, producing large policy updates that exceeded the clip range and destabilised training. The VecNormalize sync was functioning correctly — the eval collapse was policy instability, not obs distribution drift.
