# PPO Training Improvement Design

**Date:** 2026-02-26
**Status:** Approved

## Problem

After 1M steps the PPO agent is essentially stalled:

| Metric | Value | Healthy Target |
|---|---|---|
| clip_fraction | 0.66 | < 0.2 |
| approx_kl | 0.23 | < 0.05 |
| explained_variance | 0.30 | > 0.6 |
| policy_gradient_loss | ≈ 0 | negative |
| ep_len_mean | ~27 blocks | ~60–90 blocks |

Root causes:
1. **Learning rate too high** — `3e-4` causes oversized policy updates that KL clipping cannot contain, producing `clip_fraction=0.66` and `approx_kl=0.23`
2. **Too many SGD epochs** — `n_epochs=10` over-optimizes each batch, compounding the large-step problem
3. **Entropy collapsed** — `ent_coef=0.01` insufficient; policy became deterministic at ~2 nats
4. **Death penalty too small** — `-1.0` is barely distinguishable from reward noise on a bad placement; agent dies after ~27 blocks out of a possible ~90

## Approach

Two-part fix: PPO hyperparameters + reward rebalance.

### 1. PPO Hyperparameter Changes (`python/train.py`, `_train_ppo`)

| Parameter | Before | After | Rationale |
|---|---|---|---|
| `learning_rate` | `3e-4` | `1e-4` | Directly reduces clip_fraction and KL |
| `n_epochs` | `10` | `4` | Fewer gradient steps per batch; less over-optimization |
| `ent_coef` | `0.01` | `0.05` | Restore exploration; entropy was collapsing to ~2 nats |
| `target_kl` | _(absent)_ | `0.02` | Early-stop epoch loop when updates exceed KL budget |
| `n_steps` | `512` | `1024` | Longer rollouts improve credit assignment in sparse-ish reward |

`batch_size`, `gamma`, `gae_lambda`, `clip_range`, `vf_coef`, `max_grad_norm` unchanged.

### 2. Reward Change (`python/game/env.py`, `_step_per_block`)

| Parameter | Before | After | Rationale |
|---|---|---|---|
| `death_penalty` | `-1.0` | `-10.0` | Makes dying very costly without rewarding timid play |

No survival bonus added. The agent's only source of positive reward remains `score_delta`, so surviving longer is a means to earning more score — not an end in itself.

All other reward terms unchanged:
- `chain_delta * 0.3` — combo chain shaping
- `color_adj * 0.1` — color consolidation shaping
- `height_reward = -(aggregate_height / 160) * 0.2` — board pressure

## Success Criteria

After a fresh 2M-step run, check `python/inspect_logs.py`:

- `clip_fraction` < 0.2
- `approx_kl` < 0.05
- `explained_variance` > 0.5
- `ep_len_mean` > 45 blocks (significant improvement from ~27)
- `eval/mean_reward` trending upward over the run

## Files Changed

- `python/train.py` — PPO hyperparameters in `_train_ppo`
- `python/game/env.py` — `death_penalty` in `_step_per_block`

## Non-Goals

- Network architecture changes (not needed until PPO is stable)
- Observation space changes
- Reward term additions or removals beyond death_penalty
