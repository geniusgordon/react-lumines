# RND Exploration Bonus — Design

**Date:** 2026-03-02
**Status:** Approved

## Context

The PPO agent is getting stuck in a local optimum — it learns to survive but never discovers the combo mechanic (alternating single-color sweeps). Pure `score_delta` reward requires the agent to discover combos through exploration alone. The current entropy bonus (initial 0.15, decaying) is not sufficient to push the agent toward novel board configurations.

RND (Random Network Distillation, Burda et al. 2018) provides a count-based exploration bonus without baking in strategy assumptions — it rewards visiting states the agent hasn't seen before, rather than rewarding any particular board pattern.

## Approach

**VecEnvWrapper + RNDCallback (Approach A)**

Stacked outermost on the VecNormalize wrapper so RND sees normalized observations (same distribution as the policy). Intrinsic rewards are added to extrinsic rewards inline during `step_wait()`. A callback trains the predictor at rollout end. All logic lives in a single `python/rnd.py` file. RND is opt-in via `--rnd-beta` (default 0.0 = disabled).

Pipeline stack:
```
SubprocVecEnv([make_env(i)...])
  └── VecNormalize(norm_obs=True, norm_reward=False)
        └── RNDVecWrapper(beta=args.rnd_beta, ...)   ← outermost, sees normalized obs
```

## Networks

Both networks take the 7-channel board observation `(7, 10, 16)` as input (channels: `light_board, dark_board, light_pattern_board, dark_pattern_board, proj_light_pattern_board, proj_dark_pattern_board, timeline_col`).

**Target network (frozen):**
```
Conv2d(7→32, 3×3, pad=1) → ReLU
Conv2d(32→32, 3×3, pad=1) → ReLU
Flatten → Linear(5120→128)
```

**Predictor network (trained):**
```
Conv2d(7→32, 3×3, pad=1) → ReLU
Conv2d(32→32, 3×3, pad=1) → ReLU
Flatten → Linear(5120→256) → ReLU → Linear(256→128)
```

Predictor is larger than target (standard practice) to prevent trivial identity solutions.

**Intrinsic reward per step:**
```
r_int = ||target(obs) - predictor(obs)||².mean(dim=-1)   # scalar per env
```

## Reward Normalization

`r_int` is non-stationary (high early in training, declines as predictor learns). Normalize by a running std (Welford's algorithm) updated every `step_wait()` call. No mean-centering (bonus should always be positive). Clip to `[0, 5.0]` to guard against rare outliers.

Combined reward:
```
r = score_delta + beta * (r_int / running_std).clip(0, 5.0)
```

Running stats are saved alongside VecNormalize stats so training can be resumed.

## Predictor Training

Handled by `RNDCallback._on_rollout_end()`:

1. Extract board channels from `model.rollout_buffer.observations` (Dict obs) and reshape to `(n_steps * n_envs, 7, 10, 16)`
2. Subsample to at most 8192 observations (random sample without replacement)
3. 1 epoch, mini-batches of 256, optimizer: Adam lr=`--rnd-lr` (default 1e-4)
4. Loss: `||target(obs) - predictor(obs)||².mean()`
5. Backprop through predictor only (target is frozen)

## CLI Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--rnd-beta` | float | 0.0 | Intrinsic reward weight; 0.0 disables RND entirely |
| `--rnd-lr` | float | 1e-4 | Predictor optimizer learning rate |

## Checkpointing

`RNDCallback` saves predictor weights and running reward stats to `python/checkpoints/rnd_state.pt` whenever VecNormalize stats are saved (i.e., at each eval checkpoint). `--resume` loads this file if it exists.

## Logging

`RNDCallback` logs to TensorBoard at each rollout end:
- `rnd/mean_r_int` — mean raw intrinsic reward over rollout
- `rnd/predictor_loss` — mean training loss for this rollout's predictor update
- `rnd/r_int_std` — running std used for normalization (tracks non-stationarity)

## Files

**New:**
- `python/rnd.py` — `RNDTargetNetwork`, `RNDPredictorNetwork`, `RNDVecWrapper`, `RNDCallback`

**Modified:**
- `python/train.py` — add `--rnd-beta` / `--rnd-lr` flags; wrap env with `RNDVecWrapper` in `_train_ppo()` when `beta > 0`; add `RNDCallback` to callbacks list; save/load RND state on resume

## Suggested Starting Hyperparameters

- `--rnd-beta 0.01` (low weight to avoid drowning extrinsic signal)
- Run for 3M steps, compare `eval/mean_game_score` vs baseline (same run without `--rnd-beta`)
- If agent discovers combos but score doesn't improve: reduce β
- If no change vs baseline: increase β to 0.05

## Non-Goals

- Separate intrinsic/extrinsic value heads (Approach C) — overkill for weighted-sum mixing
- DQN support — PPO only for now
- Reward shaping — RND is exploration-only; still no board-state shaping signals
