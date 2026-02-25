# PPO Training Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `--algo ppo|dqn` flag to `train.py` and `eval.py`, implementing PPO with VecNormalize alongside the existing DQN path.

**Architecture:** The `LuminesCNNExtractor` and `make_env` factory are shared. `train()` branches on `--algo` to build either a PPO model (with VecNormalize wrapping) or the existing DQN model (unchanged). `eval.py` gains `--algo` and auto-loads `vecnormalize.pkl` when evaluating a PPO checkpoint.

**Tech Stack:** stable-baselines3 `PPO`, `VecNormalize`, `SubprocVecEnv`, `DummyVecEnv`

---

### Task 1: Add `--algo` flag and PPO model construction to `train.py`

**Files:**
- Modify: `python/train.py`

**Context:** `train.py` currently only has a DQN path. We add `--algo dqn|ppo` (default `dqn`) and a PPO branch inside `train()`. The PPO branch wraps the VecEnv with `VecNormalize` and constructs a `PPO` model. DQN path stays untouched.

**Step 1: Add PPO import**

In `python/train.py`, change the SB3 import line from:
```python
from stable_baselines3 import DQN
```
to:
```python
from stable_baselines3 import DQN, PPO
from stable_baselines3.common.vec_env import SubprocVecEnv, DummyVecEnv, VecNormalize
```

(Note: `VecNormalize` moves here from the existing import — remove it from the `vec_env` import line below if it's there, but currently it isn't imported at all.)

**Step 2: Add `--algo` CLI argument**

In the `if __name__ == "__main__":` block, add after the existing `--dummy` argument:
```python
parser.add_argument(
    "--algo",
    choices=["dqn", "ppo"],
    default="dqn",
    help="RL algorithm to use (default: dqn)",
)
```

**Step 3: Wire `--algo` into `train()`**

Replace the current `train()` function body. The full replacement:

```python
def train(args):
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    os.makedirs(args.log_dir, exist_ok=True)

    VecEnvCls = DummyVecEnv if args.dummy else SubprocVecEnv
    env = VecEnvCls([make_env(i, native=args.native) for i in range(args.envs)])
    eval_env = DummyVecEnv([make_env(9999, native=args.native)])

    if args.algo == "ppo":
        _train_ppo(args, env, eval_env)
    else:
        _train_dqn(args, env, eval_env)
```

**Step 4: Extract existing DQN logic into `_train_dqn()`**

Move the existing body of `train()` (everything after the VecEnv construction) into a new function:

```python
def _train_dqn(args, env, eval_env):
    if args.resume is not None:
        checkpoint = args.resume if args.resume else os.path.join(args.checkpoint_dir, "best_model")
        print(f"Resuming from {checkpoint} ...")
        model = DQN.load(checkpoint, env=env, device=args.device, tensorboard_log=args.log_dir)
        reset_num_timesteps = False
    else:
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=[128, 128],
        )
        model = DQN(
            "MultiInputPolicy",
            env,
            learning_rate=args.lr,
            buffer_size=200_000,
            learning_starts=10_000,
            batch_size=256,
            gamma=0.99,
            train_freq=4,
            gradient_steps=1,
            target_update_interval=1000,
            exploration_fraction=0.5,
            exploration_initial_eps=1.0,
            exploration_final_eps=0.05,
            policy_kwargs=policy_kwargs,
            tensorboard_log=args.log_dir,
            device=args.device,
            verbose=1,
        )
        reset_num_timesteps = True

    callbacks = [
        CheckpointCallback(
            save_freq=50_000 // args.envs,
            save_path=args.checkpoint_dir,
            name_prefix="lumines_dqn",
        ),
        EvalCallback(
            eval_env,
            best_model_save_path=args.checkpoint_dir,
            log_path=args.log_dir,
            eval_freq=args.eval_freq // args.envs,
            n_eval_episodes=args.eval_episodes,
            deterministic=True,
            render=False,
        ),
    ]

    model.learn(total_timesteps=args.timesteps, callback=callbacks, reset_num_timesteps=reset_num_timesteps)

    final_path = os.path.join(args.checkpoint_dir, "final_dqn")
    model.save(final_path)
    print(f"\nTraining complete. Model saved to {final_path}.zip")
```

**Step 5: Add `_train_ppo()` function**

Add after `_train_dqn()`:

```python
def _train_ppo(args, env, eval_env):
    norm_stats_path = os.path.join(args.checkpoint_dir, "vecnormalize.pkl")

    if args.resume is not None:
        checkpoint = args.resume if args.resume else os.path.join(args.checkpoint_dir, "best_model_ppo")
        print(f"Resuming PPO from {checkpoint} ...")
        env = VecNormalize.load(norm_stats_path, env)
        env.training = True
        eval_env = VecNormalize.load(norm_stats_path, eval_env)
        eval_env.training = False
        eval_env.norm_reward = False
        model = PPO.load(checkpoint, env=env, device=args.device, tensorboard_log=args.log_dir)
        reset_num_timesteps = False
    else:
        env = VecNormalize(env, norm_obs=True, norm_reward=True)
        eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=dict(pi=[128, 128], vf=[128, 128]),
        )
        model = PPO(
            "MultiInputPolicy",
            env,
            learning_rate=3e-4,
            n_steps=512,
            batch_size=256,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,
            vf_coef=0.5,
            max_grad_norm=0.5,
            policy_kwargs=policy_kwargs,
            tensorboard_log=args.log_dir,
            device=args.device,
            verbose=1,
        )
        reset_num_timesteps = True

    callbacks = [
        CheckpointCallback(
            save_freq=50_000 // args.envs,
            save_path=args.checkpoint_dir,
            name_prefix="lumines_ppo",
        ),
        EvalCallback(
            eval_env,
            best_model_save_path=args.checkpoint_dir,
            log_path=args.log_dir,
            eval_freq=args.eval_freq // args.envs,
            n_eval_episodes=args.eval_episodes,
            deterministic=True,
            render=False,
            callback_after_eval=SaveVecNormalizeCallback(env, norm_stats_path),
        ),
    ]

    model.learn(total_timesteps=args.timesteps, callback=callbacks, reset_num_timesteps=reset_num_timesteps)

    env.save(norm_stats_path)
    final_path = os.path.join(args.checkpoint_dir, "final_ppo")
    model.save(final_path)
    print(f"\nTraining complete. Model saved to {final_path}.zip")
    print(f"VecNormalize stats saved to {norm_stats_path}")
```

**Step 6: Add `SaveVecNormalizeCallback`**

Add this small callback class before `_train_ppo` (or at the top after imports):

```python
from stable_baselines3.common.callbacks import BaseCallback

class SaveVecNormalizeCallback(BaseCallback):
    """Saves VecNormalize stats after every eval."""
    def __init__(self, vec_env: VecNormalize, path: str):
        super().__init__()
        self.vec_env = vec_env
        self.path = path

    def _on_step(self) -> bool:
        self.vec_env.save(self.path)
        return True
```

**Step 7: Smoke test — verify PPO starts and runs 2000 steps without crashing**

```bash
cd /Users/gordon/Playground/react-lumines/master
python python/train.py --algo ppo --timesteps 2000 --envs 2 --dummy --device cpu
```

Expected output: SB3 PPO verbose header, then training progress, then "Training complete. Model saved to python/checkpoints/final_ppo.zip"

No error, no crash.

**Step 8: Verify DQN still works (regression check)**

```bash
python python/train.py --algo dqn --timesteps 2000 --envs 2 --dummy --device cpu
```

Expected: same as before — "Training complete. Model saved to python/checkpoints/final_dqn.zip"

**Step 9: Commit**

```bash
git add python/train.py
git commit -m "feat: add --algo ppo|dqn flag to train.py with VecNormalize"
```

---

### Task 2: Update `eval.py` with `--algo` flag and VecNormalize loading

**Files:**
- Modify: `python/eval.py`

**Context:** `eval.py` currently hardcodes `DQN.load(...)`. We add `--algo dqn|ppo` (default `dqn`). When `--algo ppo`, we wrap the eval env with `VecNormalize.load()` before calling `PPO.load()`. The checkpoint directory is inferred from the checkpoint path.

**Step 1: Add PPO import to eval.py**

Change the SB3 import from:
```python
from stable_baselines3 import DQN
```
to:
```python
from stable_baselines3 import DQN, PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
```

**Step 2: Add `--algo` argument**

In the `if __name__ == "__main__":` block, add after the existing `--no-native` argument:
```python
parser.add_argument(
    "--algo",
    choices=["dqn", "ppo"],
    default="dqn",
    help="Algorithm of the checkpoint to load (default: dqn)",
)
```

**Step 3: Update `evaluate()` to branch on `args.algo`**

Replace the model-loading line:
```python
# Before
model = DQN.load(args.checkpoint, device=args.device)
```
with:
```python
# After
if args.algo == "ppo":
    norm_stats_path = os.path.join(os.path.dirname(args.checkpoint), "vecnormalize.pkl")
    _dummy_env = DummyVecEnv([lambda: (LuminesEnvNative(mode="per_block") if args.native else LuminesEnv(mode="per_block"))])
    if os.path.exists(norm_stats_path):
        print(f"Loading VecNormalize stats from {norm_stats_path}")
        _dummy_env = VecNormalize.load(norm_stats_path, _dummy_env)
        _dummy_env.training = False
        _dummy_env.norm_reward = False
    model = PPO.load(args.checkpoint, env=_dummy_env, device=args.device)
else:
    model = DQN.load(args.checkpoint, device=args.device)
```

Note: The `_dummy_env` is only used to provide the observation space to `PPO.load` — the actual episode loop uses single-env instances below, which is fine since `model.predict()` works on raw dict observations.

**Step 4: Smoke test PPO eval**

First verify we have a checkpoint from Task 1's smoke test:
```bash
ls python/checkpoints/final_ppo.zip python/checkpoints/vecnormalize.pkl
```

Then run eval:
```bash
python python/eval.py --algo ppo --checkpoint python/checkpoints/final_ppo --episodes 2 --device cpu
```

Expected: 2 episodes complete, scores printed. No crash.

**Step 5: Smoke test DQN eval (regression)**

```bash
python python/eval.py --algo dqn --checkpoint python/checkpoints/final_dqn --episodes 2 --device cpu
```

Expected: same behaviour as before.

**Step 6: Commit**

```bash
git add python/eval.py
git commit -m "feat: add --algo ppo|dqn flag to eval.py with VecNormalize loading"
```

---

### Task 3: Full PPO training run

**Files:** No code changes — this is a training run to verify the implementation works end-to-end.

**Step 1: Clean up smoke test checkpoints**

```bash
rm -f python/checkpoints/final_ppo.zip python/checkpoints/final_dqn.zip python/checkpoints/vecnormalize.pkl
```

**Step 2: Start full PPO run**

```bash
python python/train.py --algo ppo --timesteps 2000000 --envs 8 --device mps
```

**Step 3: Monitor in TensorBoard**

```bash
tensorboard --logdir python/logs
```

Key metrics to verify the run is healthy (check at ~100k steps):
- `rollout/ep_len_mean` > 10 (agent surviving longer than the minimum)
- `train/entropy_loss` clearly negative (not collapsed to ~0)
- `train/approx_kl` staying below 0.05
- `train/explained_variance` positive and increasing

If entropy collapses to ~0 before 200k steps, increase `ent_coef` to `0.05` and restart.
