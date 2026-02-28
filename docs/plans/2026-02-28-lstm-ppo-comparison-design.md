# PPO+LSTM vs Flat PPO Comparison (LSTM_PPO)

Date: 2026-02-28

## Context

PPO_30 plateaued at ~3M steps with peak eval reward ~22 and true game score stalling. Per the
algorithm exploration doc (`docs/2026-02-28-rl-algo-exploration.md`), the recommended next step
is PPO+LSTM (Stage 1 of 3) to test whether recurrent state helps the agent track board dynamics
across the 4-block planning horizon.

## Goal

Determine whether recurrence improves the agent vs flat PPO — either by reaching a higher
score ceiling or by reaching the same score with fewer env steps.

## What Changes

| | PPO_30 (baseline) | LSTM_PPO (LSTM) |
|---|---|---|
| Algorithm | `stable_baselines3.PPO` | `sb3_contrib.RecurrentPPO` |
| Feature extractor | `LuminesCNNExtractor` (128-dim) | Same, unchanged |
| Observation space | Same | Same |
| Reward shaping | Same | Same |
| Hyperparameters | lr schedule, ent_coef, etc. | Same where applicable |
| LSTM hidden size | n/a | 256 (default) |
| Training budget | 3M steps | 5M steps |
| Envs | 16 parallel | 16 parallel |

Single variable changed: algorithm only. Everything else frozen for a clean comparison.

## Implementation

1. Add `sb3-contrib` to `python/requirements.txt`
2. Add `--recurrent` flag to `train.py` — branches at model instantiation only
3. No changes to env, reward, obs, or callbacks

Run command:
```bash
python python/train.py --algo ppo --recurrent --timesteps 5_000_000 --envs 16 --device mps
```

## Evaluation

**Primary metric**: `eval/mean_reward` vs env steps — compare curves for PPO_30 and LSTM_PPO.

**Definitive metric**: `eval/mean_game_score` (true score, unaffected by reward shaping) —
logged by `SyncAndSaveVecNormalizeCallback`.

**Verdict thresholds**:
- **Clear win**: LSTM game score > PPO_30 peak (~22), or reaches same score in <2M steps
- **Marginal**: Small improvement — proceed to Stage 2 (SAC-Discrete) before concluding
- **No improvement**: Skip further LSTM tuning, move to SAC-Discrete directly
