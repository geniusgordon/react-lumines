# Lumines RL Agent — Architecture, Training & Run History

**Date:** 2026-02-24 (updated 2026-03-02)
**Status:** Implemented — PPO_36 current
**Files:** `python/train.py`, `python/eval.py`, `python/game/env.py`

---

## 1. Overview

A PPO-based reinforcement learning agent trained to play Lumines. The agent operates in `per_block` mode: one action per block placement, choosing a target column (0–14) and rotation (0–3) as a single `Discrete(60)` action.

Training uses [Stable-Baselines3](https://stable-baselines3.readthedocs.io/) with the pure-Python `LuminesEnvNative` gymnasium environment (`python/game/env.py`) — no Node.js subprocess required.

---

## 2. Timeline Sweep in Per-Block Mode

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

## 3. Neural Network Architecture

A two-branch `LuminesCNNExtractor` feeds into SB3's `MultiInputPolicy`.

```
Observation (Dict)
 ├── light_board (10×16 f32)               ─┐
 ├── dark_board (10×16 f32)                ─┤ CNN branch (6-channel input, PPO_36)
 ├── light_pattern_board (10×16 f32)       ─┤   4 × Conv2d(3×3, pad=1) → ReLU
 ├── dark_pattern_board (10×16 f32)        ─┤   Flatten → Linear(5120→64) → ReLU
 ├── proj_light_pattern_board (10×16 f32)  ─┤   (post-clear+gravity projected boards)
 ├── proj_dark_pattern_board (10×16 f32)   ─┘
 │                                                                │
 ├── current_block (2×2) ──────┐                                  │
 ├── queue (3×2×2)  ───────────┤  MLP branch                      │
 ├── timeline_x (1,)  ─────────┤  concat → Linear(20→64) → ReLU   │
 ├── game_timer (1,)  ──────────┤                                  │
 ├── holding_score (1,)  ───────┤                                  │
 ├── light_chain (1,)  ────────┤                                  │
 └── dark_chain (1,)  ─────────┘                                  │
                                                                   │
                        128-dim concat ←───────────────────────────
                               │
                    PPO actor head + critic head (separate extractors)
                    net_arch=dict(pi=[128,128], vf=[512,512,256])
```

**MLP input size:** 4 + 12 + 1 + 1 + 1 + 1 + 1 = 21 values.
**Combined output:** 128 dimensions (64 from each branch).

`light_board` is channel 1: binary float32 (10×16), 1.0 where board cell == color 1 (light). `dark_board` is channel 2: same encoding for color 2 (dark). Together they replace the old single `board` channel (which encoded 0/1/2 and forced the network to learn a threshold). Separate binary channels make color identity trivially readable for the CNN.

`light_pattern_board` is channel 3: each cell's value = number of 2×2 light-only patterns it participates in, normalised to [0,1] by dividing by 4. `dark_pattern_board` is channel 4: the same metric for dark cells only. Splitting the pattern signal by color means the CNN can directly distinguish "good light cluster" from "good dark cluster" — critical for single-color chain strategy — without having to learn a threshold over a mixed channel.

This replaces three channels from earlier runs (`pattern_board`, `ghost_board`, `projected_pattern_board`) with two color-separated ones. The net reduction (5 → 4 channels) drops a small amount of placement-simulation information (`ghost_board`) and post-clear projection (`projected_pattern_board`) while gaining clean per-color pattern signal that directly informs the color-aware reward.

None of the four CNN channels is in `MLP_KEYS`; all route exclusively through the CNN.

`holding_score` is a normalised scalar (clamped to [0,1] by dividing by 10) in the MLP branch. The agent can condition on combo state: knowing `holding_score=3` makes extending the chain more valuable than building isolated patterns elsewhere.

`light_chain` and `dark_chain` are the longest **connected** run of same-color pattern columns for each color respectively, normalised by `BOARD_WIDTH - 1 = 15`. "Connected" means each adjacent column pair in the chain has same-color 2×2 patterns whose top-left rows are within 1 of each other (`|row_a − row_b| ≤ 1`), ensuring the patterns actually share at least one cell. Separate per-color scalars let the agent observe each color's build-up state explicitly.

> **Bug note (fixed 2026-03-02):** Prior to this fix, `_count_single_color_chain` counted any consecutive columns that each contained *any* same-color 2×2 pattern, ignoring row positions. On a dense or nearly-full board this produced large inflated values from accidental adjacencies at different heights. All runs that used `light_chain`/`dark_chain` observations (PPO_30 onward) or `single_color_chain_delta` reward shaping (PPO_30–34) received corrupted chain signals. This is a plausible contributing factor to those runs failing to learn the alternating-color strategy despite explicit chain-building incentives. See `python/STRATEGY.md` for the full analysis.

The critic uses a deeper network (`vf=[512,512,256]`) than the actor (`pi=[128,128]`) because the value function must model complex board state → future return relationships, while the policy only needs to choose among 60 discrete actions.

Actor and critic use **separate** feature extractors (`share_features_extractor=False`). A shared extractor causes the critic's gradient to dominate the shared CNN/MLP weights, starving the actor of clean action-relevant features — PPO_10 demonstrated this with a clip fraction explosion to 0.42 and eval reward collapse from 11.6 → 1.9. Separate extractors let the critic specialise on board-quality prediction without conflicting with the actor.

`score`, `frame`, `block_position`, `column_heights`, and `timeline_board` are excluded from the network inputs. `score` and `frame` leak non-stationary scale information. `block_position` is redundant in per-block mode — the action selects the column directly and `ghost_board` encodes the resulting drop. `column_heights` is derivable from the `light_board`/`dark_board` CNN channels and would add 16 MLP inputs for zero net information gain. `timeline_board` is also redundant — `pattern_board` combined with the `timeline_x` scalar encodes the same information with less specialised inductive bias.

---

## 4. Training Configuration

| Hyperparameter | Value |
|---------------|-------|
| Algorithm | PPO |
| Policy | `MultiInputPolicy` |
| Parallel envs | 16 (`SubprocVecEnv`) |
| `n_steps` | 4096 per env (65 536 total per rollout) |
| `batch_size` | 256 |
| `n_epochs` | 10 |
| `gae_lambda` | 0.90 |
| `share_features_extractor` | `False` (separate actor/critic extractors) |
| `features_dim` | 128 (64 from CNN branch + 64 from MLP branch) |
| `net_arch` | `pi=[128,128], vf=[512,512,256]` |
| `vf_coef` | 0.5 |
| `clip_range` | 0.2 |
| `clip_range_vf` | `None` (no value function clipping) |
| `max_grad_norm` | 0.5 |
| `target_kl` | 0.008 |
| `gamma` | 0.99 |
| `ent_coef` | 0.15 → 0.05 (linear decay via `EntropyScheduleCallback`) |
| Learning rate | 3×10⁻⁵ → 1×10⁻⁷ (linear decay) |
| Eval episodes | 100 |
| Device | `mps` (Apple Silicon) |
| Total timesteps | 3 000 000 |
| Obs normalisation | `VecNormalize(norm_obs=True, norm_reward=False)` |
| Checkpoint frequency | Every 50 000 steps |
| Eval frequency | Every 50 000 steps |

### Why `VecNormalize`?

Observation normalisation (`norm_obs=True`) stabilises CNN and MLP inputs across the wide range of board states. Reward normalisation is **disabled** (`norm_reward=False`) to preserve raw combo spike magnitude — a large `score_delta` from a long chain should produce a proportionally strong gradient signal in the critic. Norm stats are saved alongside checkpoints as `vecnormalize.pkl` and restored on resume/eval.

### VecNormalize eval sync

The eval env's obs normalization stats (`obs_rms`) must stay in sync with the training env's. Without this, the training env's running stats drift over hundreds of thousands of steps while the eval env uses stale initial stats — causing the policy to see wrongly-normalized observations at eval time and producing a systematic eval reward regression after ~250k steps (observed in PPO_7/8/9).

`SyncAndSaveVecNormalizeCallback` runs after every eval: it copies `train_env.obs_rms` into `eval_env.obs_rms` (deepcopy) and saves `vecnormalize.pkl`.

---

## 5. Reward Function

Pure sparse reward — no shaping terms.

```python
reward = score_delta + death    # -3.0 on game over, else 0
```

| Component | Range | Purpose |
|-----------|-------|---------|
| `score_delta` | ≥ 0 | Actual game score from timeline sweeps (only training signal) |
| `death` | −3.0 | Penalise game over |

`info["reward_components"]` emits: `score_delta`, `death`, `total`.

Every board-state shaping signal considered (height, variance, fill, chain, purity,
`patterns_formed`) encodes implicit strategy assumptions. `patterns_formed` in PPO_34
created a local optimum: the agent maximised isolated 2×2 squares without discovering
the sweep combo mechanic. Removing all shaping forces the agent to optimise only for
actual sweep-cleared score.

Credit assignment is not the bottleneck: `n_steps=4096` spans ~682 full sweep cycles per
rollout (4096 blocks × 40 ticks/block ÷ 240 ticks/sweep). Higher initial entropy (0.15)
prevents premature policy collapse before the first sweep event.

See `python/STRATEGY.md` for full rationale.

---

## 6. File Reference

| File | Purpose |
|------|---------|
| `python/train.py` | Training entry point — `--algo ppo\|dqn`, builds envs, runs training |
| `python/eval.py` | Evaluation — loads a checkpoint, runs episodes, reports scores, optional ASCII render |
| `python/game/env.py` | Pure-Python gymnasium environment (`LuminesEnvNative`) |
| `python/game/` | Pure-Python game logic (board, blocks, physics, timeline, etc.) |
| `python/checkpoints/` | Saved model checkpoints (generated at runtime) |
| `python/logs/` | TensorBoard event files (generated at runtime) |

---

## 7. Training

```bash
# PPO (default)
python python/train.py

# Resume from best checkpoint
python python/train.py --resume

# Custom run
python python/train.py --timesteps 3000000 --envs 16 --device mps
```

PPO checkpoints: `python/checkpoints/lumines_ppo_<N>_steps.zip`
Best PPO model: `python/checkpoints/best_model_ppo.zip`
VecNormalize stats: `python/checkpoints/vecnormalize.pkl`

### Monitoring

```bash
tensorboard --logdir python/logs
```

---

## 8. Evaluation

```bash
# Basic: 100 episodes, print mean/max/min score
python python/eval.py

# Watch the agent play (ASCII board, 100ms between steps)
python python/eval.py --render --episodes 3 --delay 0.1
```

Eval automatically loads `vecnormalize.pkl` from the checkpoint directory.

---

## 9. Run History

| Run | Steps | Best eval reward | Peak clip frac | EV | Key change |
|-----|-------|-----------------|----------------|----|-----------|
| PPO_1–6 | ~400–540k | ~3–5 | 0.14–0.45 | 0.05–0.10 | Early experiments |
| PPO_7 | — | — | — | — | Added `column_heights`+`holes` obs, 3-block queue, `n_epochs=10` |
| PPO_8–9 | ~500k | — | — | ~0.10 | VecNormalize drift issue (eval regressed after 250k steps) |
| PPO_10 | 688k | 11.6 @ 350k | 0.42 | 0.11 | `SyncAndSaveVecNormalizeCallback` fixed eval drift; `share_features_extractor=True` caused clip fraction explosion and eventual eval collapse |
| PPO_11 | 2M | 14.58 @ 700k | 0.30 (stable) | 0.35 | `share_features_extractor=False`, LR 1e-4→1e-5, clip_range 0.2. No collapse. EV ceiling ~0.35, value loss drifted up in second half. |
| PPO_12 | 2M | 10.31 @ 450k | — | — | `features_dim=256`, LR 3e-5→3e-6, `n_steps=4096`, `gamma=0.995`, `target_kl=0.01`, entropy 0.1→0.01, `eval_episodes=50`. Larger model + longer rollouts hurt. |
| PPO_13 | 2M | 16.09 @ 950k | 0.17 | 0.55 | Dense `patterns_created*0.05` reward; `pattern_board` 2nd CNN channel; `features_dim=128`, LR 5e-5→5e-6. New best, but plateaued at 400k. |
| PPO_14 | 2M | — | — | 0.66 | `gae_lambda=0.90`, `n_envs=16`, `eval_episodes=100`, LR 3e-5→3e-6. Broke EV ceiling (0.55→0.66); plateau at ~15 eval reward by 1.28M steps. |
| PPO_15 | ~1.5M | 18.77 @ 700k | — | — | `ghost_board` 3rd CNN channel. New best eval reward ~18.8; agent survives longer but doesn't chain combos. |
| PPO_16 | 1.6M | 22.46 @ 1.6M | 0.14 | 0.73 | Combo awareness: `timeline_board` 4th CNN channel, `holding_score` MLP scalar, `holding_score_delta * 0.1` chain reward. New best; still trending up. |
| PPO_17 | 2M | ~22 | ~0.14 | ~0.73 | `adjacent_patterns_created * 0.10` placement bonus; `chain_length` MLP obs. No architecture change from PPO_16. |
| PPO_18 | 3M | — | — | — | `adjacent` weight 0.10→0.05; LR `3e-5→3e-6`; entropy final 0.03; `total_timesteps=3M`. |
| PPO_19–22 | 2–3M | ~22 | — | ~0.69 | Continued tuning; plateau at ~22 eval reward with healthy metrics (EV=0.69, KL=0.0076, clip=0.088). |
| PPO_23 | — | ~23 | — | — | Next-block obs + `n_steps=4096` to break plateau. |
| PPO_24 | — | — | — | — | `norm_reward=False`: expose raw combo spike magnitude to critic. |
| PPO_25 | — | — | — | — | Quadratic chain delta: `(new_chain²−old_chain²) * 0.02`. |
| PPO_26 | 2.1M | 24.19 @ 1.95M | — | 0.78 | `projected_pattern_board` 5th CNN channel; `projected_chain_reward` matching quadratic term. Value loss climbed 1.9→7.7 (unnormalised returns). |
| PPO_27 | 1.3M | 19.71 @ 1.25M | — | 0.72 | `norm_reward=True`, `clip_range_vf=0.2`, `vf_coef=0.5`. Value loss fixed (0.23, stable) but `norm_reward=True` compressed combo signal — below PPO_26. |
| PPO_28 | ~1M | ~21.5 @ 900k | — | 0.68 | `norm_reward=False` (reverted), existing 8-component reward unchanged. Value loss 3.6→5.7 @ 1M — same drift trajectory as PPO_26 confirms 8-component reward variance is the root cause. |
| PPO_29 | — | — | — | — | 4-component reward (`score_delta + chain_after_drop*0.05 + post_sweep_chain*0.05 + death`); `clip_range_vf=None`. Strips noisy components; measures goals directly. |
| PPO_30 | — | — | — | — | Color-aware obs + obs space cleanup: `light_board`+`dark_board` replace `board`; `dominant_color_chain` replaces `chain_length`; 5 redundant keys removed. Color-aware reward (`single_color_chain_delta*0.1 + post_sweep_chain*0.05`). Color-separated pattern boards: `light_pattern_board`+`dark_pattern_board` replace `pattern_board`+`ghost_board`+`projected_pattern_board`. CNN 4 channels, MLP 20 inputs. |
| PPO_31 | — | — | — | — | Flat PPO baseline with PPO_30 architecture. LSTM/RecurrentPPO is a separate parallel experiment (not a sequential run). |
| PPO_32 | — | — | — | — | Full color-aware reward redesign: `chain_delta_any_color*0.03 + open_pattern_delta*0.01 + post_sweep_light_delta*0.05 + post_sweep_dark_delta*0.05 + chain_blocking_delta*-0.05 + ruined_pattern_delta*-0.03` on top of `score_delta` and `death`. See `docs/plans/2026-03-01-ppo32-reward-redesign.md`. |
| PPO_33 | — | — | — | — | Potential-based redesign: `score_delta + lambda*(gamma*phi_next - phi_prev) + death`, with `phi = w_chain*chain_max + w_purity*purity - w_blockers*blockers - w_height*height + w_setup*setup` on the post-clear simulated board. See `docs/plans/2026-03-01-ppo33-reward-redesign.md`. |
| PPO_34 | — | — | — | — | Simplified to `score_delta + 0.3*patterns_formed + death`. Added `timeline_col` (H×W binary) as 5th CNN channel. `patterns_formed` = net new 2×2 same-color squares created by each placement. |
| PPO_35 | — | — | — | — | Remove `patterns_formed` shaping entirely: `reward = score_delta + death`. `patterns_formed` was a local attractor — agent maximised isolated 2×2 squares without discovering the sweep combo mechanic. Initial entropy raised 0.1→0.15 to maintain exploration before first sweep event. |
| PPO_36 | — | — | — | — | **Entropy floor + cosine LR restart + projected pattern boards (hypotheses 1 & 2).** `EntropyScheduleCallback` clamped to floor `0.02`; cosine LR with warm restarts (`n_restarts=3`). Two new CNN channels: `proj_light_pattern_board`, `proj_dark_pattern_board` (post-clear+gravity projected boards). `timeline_col` retained (7 CNN channels total). `game_timer` removed from obs. Sparse PPO_35 reward unchanged. Breaking change; cannot resume from PPO_35. |
| PPO_37 | — | — | — | — | **RecurrentPPO / LSTM (hypothesis 3: algorithm ceiling).** Already wired via `--recurrent` flag. LSTM maintains hidden state for "which color am I building toward". Useful if a Markov policy cannot express the alternating-color strategy. Run only if PPO_36 fails to break the plateau. |

### PPO_10 post-mortem

PPO_10 ran 688k steps. Eval reward peaked at **11.6 @ 350k** then collapsed to 1.9 by 650k. Clip fraction grew monotonically from 0.05 → 0.42. Explained variance never exceeded 0.11.

Root cause: `share_features_extractor=True` with `vf_coef=2.0` meant the critic's 2× gradient weight dominated the shared CNN/MLP extractor, pulling features toward value prediction. As the board complexity grew, the actor and critic gradients increasingly conflicted, producing large policy updates that exceeded the clip range and destabilised training. The VecNormalize sync was functioning correctly — the eval collapse was policy instability, not obs distribution drift.

### PPO_24 Rationale

PPO_23 used `norm_reward=True` on the training env and `norm_reward=False` on eval, making `rollout/ep_rew_mean` and `eval/mean_reward` structurally incomparable. More importantly, reward normalization compresses the signal from big combo sweeps — the critic sees a flattened distribution where a sweep scores only marginally better than a single placement. PPO_24 disables reward normalization to let raw reward magnitude flow to the critic, producing stronger gradient signal for combo setup behaviors.

### PPO_25 Rationale

Rather than adding timeline proximity obs (deferred), PPO_25 focused on combo incentives: replacing the linear `chain_length` reward with a quadratic delta `(new_chain² - old_chain²) * 0.02`. A 5-block chain is not 5× better than a 1-block clear — it's strategically far more valuable. The quadratic term makes each additional chain block worth progressively more, nudging the policy away from isolated 2×2 placements and toward wide connected patterns.

### PPO_26 Rationale & Results

The agent (PPO_25) builds chains but still leaves messy boards after sweeps because it cannot reason about the post-clear board state. PPO_26 adds a 5th CNN input channel (`projected_pattern_board`) showing the pattern board after simulating clear + gravity, and a matching `projected_chain_reward` component with the same quadratic weight as `chain_delta_reward`. Breaking change (CNN 4→5 channels); cannot resume from PPO_25 checkpoints.

Eval peaked at 24.19 @ ~1.95M steps but plateaued in the 21–24 range for the remainder of the run. Value loss climbed steadily from 1.9 → 7.7 over 2.1M steps — the critic was chasing unnormalized returns that grew as the policy improved. EV held at 0.783 (still good) but value loss trajectory was unsustainable.

### PPO_27 Rationale & Results

PPO_26 ran with `norm_reward=False`, which was intentional for PPO_24 to expose raw combo spikes to the critic. But as the policy improved and eval reward grew to ~22–24, the unnormalized discounted returns scaled up accordingly, causing value loss to drift from ~2 → ~8. Three targeted fixes:

- **`norm_reward=True`** — root cause fix; VecNormalize normalises returns to unit variance, keeping value targets bounded regardless of policy improvement
- **`clip_range_vf=0.2`** — clips how much the value function can change per update step; prevents large value swings contributing to loss spikes
- **`vf_coef=0.5`** — back to SB3 default; with `share_features_extractor=False` the higher weight was unnecessary and added critic gradient pressure

Value loss fixed: dropped from PPO_26's 7.7 → 0.23 and stable. However, `norm_reward=True` compressed the reward signal — eval peaked at 19.71 @ 1.25M steps vs PPO_26's ~22–24 at the same point. EV 0.721. Confirmed that `norm_reward=True` hurts by compressing combo spike magnitude, partially undoing PPO_24's intent. Stopped at 1.31M steps.

Note: with `norm_reward=True`, `rollout/ep_rew_mean` and `eval/mean_reward` are on different scales (rollout is normalised, eval is raw) and are not directly comparable.

### PPO_28 Rationale & Results

PPO_27's `norm_reward=True` compressed combo spike magnitude — eval peaked at only 19.71 vs PPO_26's ~24. PPO_28 reverts to `norm_reward=False` (same as PPO_26/24) while keeping all other PPO_27 fixes (`clip_range_vf=0.2`, `vf_coef=0.5`) and the existing 8-component reward unchanged. Goal: confirm `norm_reward=False` recovers PPO_26-level performance without the value loss drift.

Eval peaked ~21.5 @ 900k steps. Value loss 3.6 → 5.7 at 1M steps (climbing, same trajectory as PPO_26). EV 0.68. Confirmed `norm_reward=False` partially recovers signal vs PPO_27, but the 8-component reward's overlapping variance still causes value loss drift. Provides the baseline for PPO_29's reward redesign.

### PPO_29 Rationale

PPO_26–28 accumulated 8 reward components that overlap, conflict, and add unnecessary variance. The root problem: the shaping terms approximate "build combos and leave a good board" through indirect proxies rather than measuring those goals directly.

**Diagnosis of reward noise:**

- `chain_delta_reward` + `projected_chain_reward` — two simultaneous quadratic delta terms produce ±1.0 swings per step; combined variance dominates the shaping signal
- `post_sweep_pattern_delta` — fires **negative** when `score_delta > 0` (clearing patterns reduces pattern count); directly conflicts with the primary objective
- `holding_score_reward` — timeline-position-dependent: same board state, different returns; makes value function harder to fit
- `adjacent_patterns_created` — sparse (zero when no live combo zone); fragile gating adds noise without strong signal

**`clip_range_vf` fix:** Changed from `0.2` → `None`. With `norm_reward=False` and raw episode returns of 10–25, `clip_range_vf=0.2` capped each per-step value correction to ±0.2, preventing the critic from correcting large estimation errors quickly → unnecessary value loss drift. `None` removes the cap, letting the critic correct freely.

All other hyperparameters preserved from PPO_28.

### PPO_30 Rationale

PPO_29 simplified the reward to 4 components and removed conflicting signals — a necessary step. But the reward and observations remained color-blind, preventing the agent from learning the core Lumines strategy: alternating single-color combos.

**Three structural problems in PPO_29:**

- **Color-blind reward**: `chain_after_drop` counted any-color patterns. A mixed A+B chain of length 5 scored identically to a pure-color chain of length 5, even though the mixed chain produces zero sweep score when the timeline passes.
- **Level-based shaping misaligns incentives**: every block earned `0.05 × existing_chain` regardless of whether it improved the chain. The agent learned to keep chains large, not to grow them.
- **`post_sweep_chain` conflicted with scoring**: after a big sweep (large `score_delta`), the cleared board meant `post_sweep_chain ≈ 0`, producing a mixed signal — big positive + near-zero shaping — that implicitly discouraged the very combos we want.

**PPO_30 changes:**

1. **`single_color_chain_delta * 0.1`** replaces both `chain_after_drop` terms. Measures change in longest consecutive same-color pattern run. Positive when a placement extends the dominant chain; zero for neutral placements; negative when a placement fragments it. The sign matches strategy. *(Note: the underlying `_count_single_color_chain` had a row-adjacency bug that inflated chain values on dense boards — see bug note in section 3. This shaping signal was noisy as a result.)*

2. **`post_sweep_chain * 0.05`** now uses the same single-color metric, so it rewards leaving a clean same-color residue — not a mixed heap — after a sweep.

3. **`light_board` + `dark_board`** CNN channels replace the single `board` channel (0/1/2 int8). Separate binary channels make color identity a trivial lookup for the CNN rather than a threshold the network must learn.

4. **`light_pattern_board` + `dark_pattern_board`** replace the three-channel set (`pattern_board`, `ghost_board`, `projected_pattern_board`). Each channel counts 2×2 same-color patterns for its color, normalised to [0,1]. This gives the CNN direct per-color pattern signal — essential for the color-aware reward — while shedding the ghost placement simulation and post-clear projection that added complexity without matching the reward structure. Net CNN reduction: 5 → 4 channels.

5. **`dominant_color_chain`** MLP scalar replaces `chain_length`. Reports the single-color chain (best of light vs dark), so the actor's MLP branch has accurate information about the chain quality it is shaping.

6. **Obs space cleanup** — five keys removed as redundant:

| Key removed | Why |
|-------------|-----|
| `timeline_board` | `pattern_board` + `timeline_x` scalar encodes the same information. The masked channel adds a learned redundancy the CNN must resolve; cleaner to let the network combine the two inputs itself. |
| `block_position` | In per-block mode the action selects the target column directly; current position during placement is irrelevant. `ghost_board` already shows the resulting drop location. |
| `score` | Non-stationary cumulative value irrelevant to placement strategy. The reward signal carries all gradient information about score value. |
| `frame` | Unused in per-block mode — time advances via `ticks_per_block` internally. |
| `column_heights` | Fully derivable from `light_board` + `dark_board` CNN channels. Adding 16 MLP values for information the CNN already has wastes parameter budget and risks gradient confusion between branches. |

Net effect on architecture: CNN changes from PPO_29's 5 channels to 4 (`light_board`, `dark_board`, `light_pattern_board`, `dark_pattern_board` — drops `timeline_board`, `ghost_board`, `projected_pattern_board`; splits `pattern_board` into two color channels); MLP input shrinks from 38 → 20 (removing `block_position`(2) + `score`(1) + `frame`(1) + `column_heights`(16)).

No hyperparameter changes from PPO_29. Breaking change (CNN channel count, obs key changes) — cannot resume from PPO_29 checkpoints.

### PPO_34 Rationale

PPO_33's potential-based shaping (`phi`) combined six board-quality components and required careful weight tuning. PPO_34 simplified to a single, interpretable shaping term: `patterns_formed` — the net new 2×2 same-color squares created by each placement — weighted at 0.3.

Additionally, PPO_34 added `timeline_col` as a 5th CNN input channel: a binary H×W mask (1.0 in every row of the current timeline column, 0.0 elsewhere). This gives the CNN spatial awareness of the sweep position, enabling it to learn that patterns ahead of the sweep are more valuable than patterns behind it.

### PPO_35 Rationale

PPO_34 plateaued because `patterns_formed` created a local optimum. The agent could achieve consistent, dense gradient by maximising isolated 2×2 same-color squares anywhere on the board — this is achievable without ever learning how the timeline sweep scores chains. A board full of scattered 2×2 patterns scores nothing if they don't form consecutive columns ahead of the sweep.

**Why sparse-only?** Every board-state signal (height, variance, fill, chain, purity) encodes implicit strategy assumptions. Removing all shaping forces the agent to optimise for actual sweep-cleared score. `n_steps=4096` gives ~682 full sweep cycles per rollout, so credit assignment from sweep events to earlier placements is handled by rollout length, not shaping.

**Why raise initial entropy to 0.15?** Without the dense `patterns_formed` gradient, early training has sparse rewards — the agent may see no sweep score for many episodes. Higher initial entropy maintains exploration diversity during this cold-start period, preventing premature collapse to a degenerate policy before any sweep events are observed.

### PPO_36 Rationale

PPO_35 (sparse `score_delta + death`) performs similarly to PPO_16–34 (~22–24 eval score), confirming reward design was a red herring. Three bottleneck candidates were identified; PPO_36 tests hypotheses 1 and 2 simultaneously: **entropy collapse** and **missing post-clear board visibility**.

**Hypothesis 1 — Entropy collapse:**

Entropy typically decays to ~0.05 by 500k steps. Once the policy locks into a local strategy (e.g. center-column dumping), near-zero entropy prevents exploration of the color-alternation strategy. PPO_36 addresses this with two changes:

1. **Entropy floor** (`floor_ent=0.02`): `EntropyScheduleCallback._on_step` clamps `ent_coef` to `max(floor, scheduled)`. The policy always retains minimum exploration pressure, preventing complete collapse even after the linear decay completes.

2. **Cosine LR with warm restarts** (`n_restarts=3`): Three LR cycles over the full training run, each starting at `3e-5` and decaying to `3e-6`. The periodic LR spikes perturb the policy away from local optima, analogous to simulated annealing restarts.

**Hypothesis 2 — Missing post-clear board visibility:**

The only run that exceeded 24 was PPO_26, which included a `projected_pattern_board` CNN channel — the pattern board after simulating clear + gravity. PPO_30 removed it when switching to color-separated channels, and no subsequent run recovered that ceiling.

PPO_36 re-adds this signal in color-separated form:
- `proj_light_pattern_board`: 2×2 light patterns on the board after clearing current detected patterns and applying gravity.
- `proj_dark_pattern_board`: same for dark.

Computing the projected board: take a copy of `self._state.board`, zero out all cells belonging to `self._state.detected_patterns`, then call `apply_gravity`. Build the color pattern channels on this projected board using the same `/ 4.0` normalisation as the live channels.

`timeline_col` is retained, giving the CNN spatial awareness of the sweep position (7 CNN channels total). `game_timer` is removed from obs as non-stationary and strategically redundant.

**Prediction**: If eval score breaks above 24, one or both of these changes was the bottleneck. If the plateau persists, move to PPO_37 (RecurrentPPO).

**Breaking change**: Cannot resume from PPO_35. Sparse reward formula unchanged.

---

## 10. Future Directions

### Why runs plateau at ~22–24

All runs from PPO_16–28 show the same pattern: rapid improvement in the first ~1M steps, then plateau. Root causes:

1. **Entropy collapse → exploitation trap** — policy converges to a local optimum; with `ent_coef` decaying to near-zero, PPO can't escape.
2. **Credit assignment breaks down** — Lumines combos require multi-move setup. With `gamma=0.99`, rewards 30+ steps out are heavily discounted.
3. **Observation blindspot** — agent doesn't see the next block, preventing planning beyond immediate placement.
4. **Policy-value coupling** — once EV plateaus (~0.69–0.73), the critic is bounded by what the observation space + rollout length allows.

### High-impact ideas

| Idea | Rationale |
|------|-----------|
| Add next-block to observation | Lookahead is the largest strategic info gap; even 1 block ahead changes planning |
| Longer rollouts (`n_steps=8192`) | Better credit assignment for delayed combo rewards |
| Cyclic/cosine LR schedule | Periodic LR restarts help escape local optima vs. monotonic decay |
| Higher entropy floor | Don't let `ent_coef` decay below ~0.02; keeps exploration alive in late training |

### Medium-impact ideas

**PPG (Phasic Policy Gradient)** — gives the value function dedicated auxiliary phases for longer training on stored data → much better EV, more stable late training, better credit assignment. Available in `sb3-contrib`. ~1.5× more compute than PPO. Try after PPO ceiling is confirmed.

**IMPALA** — asynchronous distributed actor-learner with V-trace correction; handles long-horizon credit assignment better; scales to 32+ parallel envs. Only relevant if env throughput becomes the bottleneck.

### Key metrics to watch per run

- **EV > 0.75** — critic keeping up with policy
- **Entropy loss trending more negative** — exploration maintained
- **Eval reward breaking above 24** — plateau broken
- **Value loss stable or declining** — critic not chasing growing returns
- **Rollout/eval gap** — only meaningful when both use the same reward scale; with `norm_reward=False` both are on raw scale and directly comparable
