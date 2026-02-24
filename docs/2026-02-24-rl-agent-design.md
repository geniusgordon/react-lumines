# Lumines RL Agent — Architecture & Usage

**Date:** 2026-02-24
**Status:** Implemented
**Files:** `python/train.py`, `python/eval.py`, `python/requirements.txt`

---

## 1. Overview

A PPO-based reinforcement learning agent trained to play Lumines. The agent operates in `per_block` mode: one action per block placement, with reward equal to the score delta produced by each placement window (covering any timeline sweeps that occur before the next block spawns).

Training uses [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) on top of the `LuminesEnv` gymnasium wrapper (`python/lumines_env.py`), which communicates with the TypeScript game engine via a Node.js subprocess (`src/ai/env-server.ts`).

---

## 2. Neural Network Architecture

A two-branch `BaseFeaturesExtractor` feeds into SB3's `MultiInputPolicy`.

```
Observation (Dict)
 ├── board (10×16 int8) ──────────── CNN branch
 │                                      Conv2d(1→16, 3×3, pad=1) → ReLU
 │                                      Conv2d(16→32, 3×3, pad=1) → ReLU
 │                                      Flatten → Linear(→64) → ReLU
 │                                                               │
 ├── current_block (2×2) ──────┐                                 │
 ├── queue (2×2×2)  ───────────┤  MLP branch                    │
 ├── block_position (2,) ──────┤  concat → Linear(16→64) → ReLU │
 ├── timeline_x (1,)  ─────────┤                                 │
 └── game_timer (1,)  ─────────┘                                 │
                                                                  │
                        128-dim concat ←──────────────────────────
                               │
                    SB3 policy head + value head
```

**MLP input size:** 4 + 8 + 2 + 1 + 1 = 16 values.
**Combined output:** 128 dimensions (64 from each branch).

`score` and `frame` are excluded from the network inputs — they would leak non-stationary scale information and are better left to the value baseline learned implicitly from returns.

---

## 3. Training Configuration

| Hyperparameter | Value |
|---------------|-------|
| Algorithm | PPO |
| Policy | `MultiInputPolicy` |
| Parallel envs | 4 (`SubprocVecEnv`) |
| `n_steps` | 512 per env (2 048 total per rollout) |
| `batch_size` | 64 |
| `n_epochs` | 10 |
| Learning rate | 3×10⁻⁴ linear decay → 0 |
| Device | `mps` (Apple Silicon) |
| Total timesteps | 1 000 000 |
| Reward normalisation | `VecNormalize` (reward only, clip 10) |
| Checkpoint frequency | Every 50 000 steps |
| Eval frequency | Every 25 000 steps (5 episodes) |

### Why `VecNormalize` on reward only?

The observation space is already bounded and heterogeneous (board cells are categorical 0/1/2, not continuous). Normalising observations would distort the categorical board encoding. Reward normalisation alone stabilises PPO's value estimates without harming the observation structure.

### Why linear LR decay?

PPO is sensitive to learning-rate magnitude late in training when the policy has converged. A schedule that decays to zero prevents over-updating a near-optimal policy and keeps the KL-clipping constraint meaningful throughout.

---

## 4. File Reference

| File | Purpose |
|------|---------|
| `python/train.py` | Training entry point — defines `LuminesCNNExtractor`, builds envs, runs PPO |
| `python/eval.py` | Evaluation — loads a checkpoint, runs episodes, reports scores, optional ASCII render |
| `python/lumines_env.py` | Gymnasium wrapper (unchanged) |
| `python/requirements.txt` | Python dependencies |
| `src/ai/LuminesEnv.ts` | TypeScript headless game engine (unchanged) |
| `src/ai/env-server.ts` | Node.js IPC bridge (unchanged) |
| `python/checkpoints/` | Saved model checkpoints (generated at runtime) |
| `python/logs/` | TensorBoard event files (generated at runtime) |

---

## 5. Installation

```bash
# Python deps (from repo root)
pip install -r python/requirements.txt

# Node deps (needed by env-server.ts)
pnpm install
```

---

## 6. Training

```bash
# Default: 1M steps, 4 envs, MPS device
python python/train.py

# Custom run
python python/train.py \
  --timesteps 2000000 \
  --envs 8 \
  --device mps \
  --checkpoint-dir python/checkpoints \
  --log-dir python/logs
```

Checkpoints are saved to `python/checkpoints/lumines_ppo_<N>_steps.zip` every 50k steps.
The best model (by eval return) is saved to `python/checkpoints/best_model.zip`.
The final model is saved to `python/checkpoints/final.zip`.

The `VecNormalize` statistics are saved alongside the final model as `python/checkpoints/vec_normalize.pkl`.

### Monitoring

```bash
tensorboard --logdir python/logs
```

Key metrics to watch:
- `rollout/ep_rew_mean` — mean episode reward (should trend upward)
- `train/value_loss` — should decrease then stabilise
- `train/approx_kl` — should stay below ~0.02; spikes indicate instability

---

## 7. Evaluation

```bash
# Basic: 10 episodes, print mean/max/min score
python python/eval.py --checkpoint python/checkpoints/final.zip

# More episodes
python python/eval.py --checkpoint python/checkpoints/final.zip --episodes 20

# Watch the agent play (ASCII board, 100ms between steps)
python python/eval.py \
  --checkpoint python/checkpoints/final.zip \
  --render \
  --episodes 3 \
  --delay 0.1

# Faster render
python python/eval.py --render --delay 0.03
```

Eval uses `cpu` by default (faster subprocess startup for single-env inference).

---

## 8. Expected Results

After 1M steps on Apple M-series hardware (~30–60 min):

| Metric | Random baseline | Target after 1M steps |
|--------|----------------|----------------------|
| Mean score | ~0 | > 0, improving trend |
| Max score | occasional small values | measurable clears |

The agent is expected to learn to form 2×2 same-colour patterns and place blocks to maximise timeline sweeps before the timer expires. Scores will be low initially; performance typically improves significantly with 2–5M steps.

---

## 9. Extending the Agent

**Longer training:**
```bash
python python/train.py --timesteps 5000000
```

**Resuming from checkpoint:** SB3 does not natively support resuming `VecNormalize` mid-run. For long runs, set `--timesteps` high from the start.

**Reward shaping:** Edit the `step()` return value in `src/ai/env-server.ts` or add a reward wrapper around `LuminesEnv` in Python. See `docs/2026-02-24-headless-env-design.md` §4 for design rationale.

**Per-frame mode:** Change `mode='per_block'` to `mode='per_frame'` in `make_env()`. Update `action_space` handling accordingly (Discrete(7) instead of Discrete(64)).
