# PPO Training Design

**Date:** 2026-02-26
**Context:** Adding PPO as an alternative to DQN in the Lumines RL training pipeline.

## Background

Seven PPO iterations previously failed due to policy collapse. The root cause was two env bugs fixed in `f8439e0`:

1. **Silent no-op on full column** — `hard_drop` placed blocks above the board without triggering game over, so the agent never learned that stacking was fatal.
2. **Frozen falling cells** — in `per_block` mode, falling cells never settled between steps, causing invisible obstacles and undercounted column heights.

With these bugs fixed, PPO is worth retrying with a clean baseline.

## Design

### File Structure

`train.py` gains `--algo dqn|ppo` (default: `dqn`). `eval.py` gains the same flag. The `LuminesCNNExtractor` and `make_env` factory are shared between both algorithms.

```
train.py
  --algo dqn   → existing DQN path, unchanged
  --algo ppo   → PPO path with VecNormalize

eval.py
  --algo dqn   → DQN.load (current behavior)
  --algo ppo   → PPO.load + VecNormalize.load if stats file present
```

### Normalization

PPO wraps the VecEnv with `VecNormalize(norm_obs=True, norm_reward=True)`. DQN stays raw (VecNormalize breaks Q-value estimation). Norm stats are saved alongside model checkpoints as `vecnormalize.pkl`.

### PPO Hyperparameters

```python
PPO(
    "MultiInputPolicy", env,
    learning_rate=3e-4,
    n_steps=512,          # 512 × 8 envs = 4096 steps per rollout
    batch_size=256,
    n_epochs=10,
    gamma=0.99,
    gae_lambda=0.95,
    clip_range=0.2,
    ent_coef=0.01,
    vf_coef=0.5,
    max_grad_norm=0.5,
    policy_kwargs=dict(
        features_extractor_class=LuminesCNNExtractor,
        features_extractor_kwargs=dict(features_dim=128),
        net_arch=dict(pi=[128, 128], vf=[128, 128]),
    ),
)
```

`ent_coef=0.01` is conservative — prior runs used high values to fight collapse caused by env bugs. With bugs fixed, we start low and tune.

### Checkpoint Naming

- PPO: `lumines_ppo_<steps>_steps.zip`, best model: `best_model_ppo.zip`
- DQN: `lumines_dqn_<steps>_steps.zip`, best model: `best_model.zip` (unchanged)

Separate naming prevents runs from clobbering each other.

### Resume Path

```python
# Save (PPO)
vec_normalize.save(os.path.join(checkpoint_dir, "vecnormalize.pkl"))
model.save(checkpoint_path)

# Load (PPO resume)
env = VecNormalize.load(norm_stats_path, env)
env.training = True
model = PPO.load(checkpoint_path, env=env)
```

### eval.py Changes

Add `--algo dqn|ppo` flag (default: `dqn`). When `--algo ppo`, load `vecnormalize.pkl` from the same directory as the checkpoint if the file exists, then wrap the eval env before calling `PPO.load`.
