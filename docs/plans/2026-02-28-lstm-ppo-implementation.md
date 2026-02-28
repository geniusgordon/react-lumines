# PPO+LSTM Implementation Plan (LSTM_PPO)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `--recurrent` flag to `train.py` that swaps `PPO` for `RecurrentPPO` (sb3-contrib), enabling a clean PPO+LSTM vs flat PPO comparison run.

**Architecture:** Single branch point in `_train_ppo` — when `--recurrent` is set, use `RecurrentPPO` with `MultiInputLstmPolicy` and `lstm_hidden_size=256`; otherwise existing `PPO` path is untouched. All callbacks, VecNormalize, and hyperparameters remain identical.

**Tech Stack:** `sb3-contrib.RecurrentPPO`, `stable-baselines3`, Python 3.11, MPS device (Apple Silicon)

---

### Task 1: Add `--recurrent` flag and wire up `RecurrentPPO`

**Files:**
- Modify: `python/train.py`

**Context:**
- `sb3-contrib` is already installed (in `requirements.txt`)
- `RecurrentPPO` uses `MultiInputLstmPolicy` instead of `MultiInputPolicy`
- All other hyperparameters (`lr`, `n_steps`, `batch_size`, `ent_coef`, etc.) are accepted by both classes identically
- `policy_kwargs` works the same way — `features_extractor_class`, `net_arch`, etc. all pass through
- The only `RecurrentPPO`-specific kwargs are `lstm_hidden_size` (default 256) and `n_lstm_layers` (default 1)
- `RecurrentPPO` does NOT accept `target_kl` — remove it when using recurrent mode

**Step 1: Add import at top of train.py**

Add after the existing SB3 import line (`from stable_baselines3 import DQN, PPO`):

```python
from sb3_contrib import RecurrentPPO
```

**Step 2: Add `--recurrent` flag to the argparse block**

Add after the `--algo` argument (near line 416):

```python
parser.add_argument(
    "--recurrent",
    action="store_true",
    default=False,
    help="Use RecurrentPPO (LSTM) instead of flat PPO",
)
```

**Step 3: Branch at model instantiation in `_train_ppo`**

Find the `else:` block in `_train_ppo` that creates the PPO model (currently starts around line 317). Replace the model creation with:

```python
    else:
        env = VecNormalize(env, norm_obs=True, norm_reward=False)
        eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, training=False)
        policy_kwargs = dict(
            features_extractor_class=LuminesCNNExtractor,
            features_extractor_kwargs=dict(features_dim=128),
            net_arch=dict(pi=[128, 128], vf=[512, 512, 256]),
            share_features_extractor=False,
        )
        if args.recurrent:
            model = RecurrentPPO(
                "MultiInputLstmPolicy",
                env,
                learning_rate=linear_schedule(3e-5, 3e-6),
                n_steps=4096,
                batch_size=256,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.90,
                clip_range=0.2,
                clip_range_vf=0.2,
                ent_coef=0.1,
                vf_coef=0.5,
                max_grad_norm=0.5,
                lstm_hidden_size=256,
                policy_kwargs=policy_kwargs,
                tensorboard_log=args.log_dir,
                device=args.device,
                verbose=1,
            )
        else:
            model = PPO(
                "MultiInputPolicy",
                env,
                learning_rate=linear_schedule(3e-5, 3e-6),
                n_steps=4096,
                batch_size=256,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.90,
                clip_range=0.2,
                clip_range_vf=0.2,
                ent_coef=0.1,
                vf_coef=0.5,
                max_grad_norm=0.5,
                target_kl=0.008,
                policy_kwargs=policy_kwargs,
                tensorboard_log=args.log_dir,
                device=args.device,
                verbose=1,
            )
        reset_num_timesteps = True
```

**Step 4: Smoke test — verify it starts without crashing**

```bash
python python/train.py --algo ppo --recurrent --timesteps 10000 --envs 2 --device cpu --dummy
```

Expected: Training starts, logs appear, no import errors or shape mismatches. Kill after a few seconds if it doesn't error immediately.

**Step 5: Verify flat PPO still works**

```bash
python python/train.py --algo ppo --timesteps 10000 --envs 2 --device cpu --dummy
```

Expected: Same as before — flat PPO starts cleanly. Confirms the flag doesn't break the existing path.

**Step 6: Commit**

```bash
git add python/train.py
git commit -m "feat(lstm-ppo): add --recurrent flag for RecurrentPPO (LSTM) comparison"
```

---

### Task 2: Launch the full LSTM_PPO training run

**Step 1: Stop PPO_30 if still running**

Check if training is active:
```bash
ps aux | grep train.py
```

If running, kill it (it has plateaued and is degrading).

**Step 2: Launch LSTM_PPO**

```bash
python python/train.py --algo ppo --recurrent --timesteps 5_000_000 --envs 16 --device mps
```

Expected: TensorBoard log appears in `python/logs/LSTM_PPO/`. First eval checkpoint at step ~50K.

**Step 3: Confirm TensorBoard is logging**

After ~2 minutes:
```bash
python python/inspect_logs.py
```

Expected: Shows `LSTM_PPO` as the latest run with initial scalars appearing.
