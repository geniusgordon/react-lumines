# PPO Training Improvement Roadmap

_Written: 2026-02-27, after PPO_22 analysis_

## Context

All runs (PPO_16–22) show the same pattern: rapid improvement in the first ~1M steps, then plateau. PPO_22 reached eval reward ~22 at 3M steps with healthy metrics (EV=0.69, KL=0.0076, clip=0.088) but flat eval trend for the last 500k steps.

## Root Causes of Plateau

1. **Entropy collapse → exploitation trap** — policy converges to a local optimum; with `ent_coef` decaying to near-zero, PPO can't escape.
2. **Credit assignment breaks down** — Lumines combos require multi-move setup. With `n_steps=2048` and `gamma=0.99`, rewards 30+ steps out are heavily discounted.
3. **Observation blindspot** — agent doesn't see the next block or timeline position, preventing planning beyond immediate placement.
4. **Policy-value coupling** — once EV plateaus (~0.69–0.73), the critic is bounded by what the observation space + rollout length allows.

---

## Improvement Ideas

### High Impact

| Idea | Rationale |
|------|-----------|
| Add next-block to observation | Lookahead is the largest strategic info gap; even 1 block ahead changes planning |
| Longer rollouts (`n_steps=4096–8192`) | Better credit assignment for delayed combo rewards |
| Cyclic/cosine LR schedule | Periodic LR restarts help escape local optima vs. monotonic decay |
| Higher entropy floor | Don't let `ent_coef` decay below ~0.02; keeps exploration alive in late training |

### Medium Impact

#### Timeline Proximity in Observation
Add a single scalar to MLP obs: `timeline_x / BOARD_WIDTH` (range 0→1).

- **Why:** The sweep position fundamentally changes optimal strategy — a combo about to be swept scores big; garbage placed there is wasted. Without this signal, the agent is "blind" to sweep timing.
- **How:** One line in `env.py` — append `self.state['timeline']['x'] / BOARD_WIDTH` to the MLP observation vector. MLP input size +1.
- **Cost:** Negligible.

#### Combo Chain Reward: f(chain_length²)
Replace linear chain reward with quadratic scaling.

- **Why:** A 5-block chain is not 5× better than a 1-block clear — it's strategically far more valuable (clears more board, compounds with sweep). Linear reward makes chain-building only marginally better per block, so the policy doesn't prioritize it.
- **How:** In `env.py`, replace `chain_length * coeff` with `chain_length**2 * coeff` (tune coeff to avoid reward hacking). Validate against episode score first.
- **Risk:** Can encourage reward hacking if chains are achievable in ways that hurt long-term board state.

#### PPG (Phasic Policy Gradient)
Alternative to PPO with separate policy and value update phases.

- **Why:** PPO trains policy and value together, creating gradient conflict (this is why `share_features_extractor=False` was necessary). PPG gives the value function dedicated "auxiliary phases" for longer training on stored data → much better EV, more stable late training, better credit assignment.
- **How:** Available in `sb3-contrib`. ~1.5× more compute than PPO.
- **When to try:** After PPO improvements are exhausted and EV ceiling is confirmed.

#### IMPALA
Asynchronous distributed actor-learner architecture with V-trace correction.

- **Why:** Handles long-horizon credit assignment better; scales to 32+ parallel envs.
- **When to try:** Only if env throughput becomes the bottleneck at large scale. Complex to set up; overkill for current scale.

---

## Suggested Iteration Roadmap

| Run | Changes | Goal | Result |
|-----|---------|------|--------|
| PPO_23 | Next-block obs + `n_steps=4096` | Break plateau, better combo timing | Eval ~23, plateau |
| PPO_24 | Disable reward normalization (`norm_reward=False`) | Isolate VecNormalize signal compression; expose raw combo spike magnitude to critic | Done |
| PPO_25 | Quadratic chain delta reward `(new_chain² - old_chain²) * 0.02` | Incentivise long combos over isolated placements | Done |
| PPO_26 | `projected_pattern_board` 5th CNN channel + `projected_chain_reward` `(new_proj_chain² - old_proj_chain²) * 0.02` | Spatial awareness of post-clear board quality | Eval peaked ~24.2, plateau ~21–24 |
| PPO_27 | `norm_reward=True`, `clip_range_vf=0.2`, `vf_coef=0.5` | Stabilise rising value loss; keep value targets bounded | Eval peaked ~19.7 @ 1.25M — behind PPO_26; `norm_reward=True` hurt signal |
| PPO_28 | Reward redesign: strip to 4 components (score_delta + pre-sweep chain level + post-sweep chain level + death); `norm_reward=False`, `clip_range_vf=0.2`, `vf_coef=0.5` | Reduce reward variance; align shaping directly with "big combo + good residual board" goal | — |
| PPO_29 | PPG (if PPO ceiling confirmed) | Better late-training EV and stability | — |

Each iteration isolates 1–2 changes to attribute improvements clearly.

### PPO_24 Rationale

PPO_23 used `norm_reward=True` on the training env and `norm_reward=False` on eval, making rollout/ep_rew_mean and eval/mean_reward structurally incomparable (different scales). More importantly, reward normalization compresses the signal from big combo sweeps — the critic sees a flattened distribution where a sweep scores only marginally better than a single placement. PPO_24 disables reward normalization to let raw reward magnitude flow to the critic, potentially producing stronger gradient signal for combo setup behaviors.

### PPO_25 Rationale

Rather than adding timeline proximity obs (deferred), PPO_25 focused on combo incentives: replacing the linear `chain_length` reward with a quadratic delta `(new_chain² - old_chain²) * 0.02`. A 5-block chain is not 5× better than a 1-block clear — it's strategically far more valuable. The quadratic term makes each additional chain block worth progressively more, nudging the policy away from isolated 2×2 placements and toward wide connected patterns.

### PPO_26 Rationale

The agent (PPO_25) builds chains but still leaves messy boards after sweeps because it cannot reason about the post-clear board state. PPO_26 adds a 5th CNN input channel (`projected_pattern_board`) showing the pattern board after simulating clear + gravity, and a matching `projected_chain_reward` component with the same quadratic weight as `chain_delta_reward`. This is a breaking change (CNN 4→5 channels); cannot resume from PPO_25 checkpoints.

### PPO_26 Results

Eval peaked at 24.19 @ ~1.95M steps but plateaued in the 21–24 range for the remainder of the run. Value loss climbed steadily from 1.9 → 7.7 over 2.1M steps — the critic was chasing unnormalized returns that grew as the policy improved. EV held at 0.783 (still good) but value loss trajectory was unsustainable.

### PPO_27 Rationale

PPO_26 ran with `norm_reward=False`, which was intentional for PPO_24 to expose raw combo spikes to the critic. But as the policy improved and eval reward grew to ~22–24, the unnormalized discounted returns scaled up accordingly, causing value loss to drift from ~2 → ~8. Three targeted fixes:

- **`norm_reward=True`** — root cause fix; VecNormalize normalises returns to unit variance, keeping value targets bounded regardless of policy improvement
- **`clip_range_vf=0.2`** — clips how much the value function can change per update step (mirrors policy clipping); prevents large value swings contributing to loss spikes
- **`vf_coef=0.5`** — back to SB3 default (was 2.0); with `share_features_extractor=False` the high weight was unnecessary and added critic gradient pressure

Note: with `norm_reward=True`, `rollout/ep_rew_mean` and `eval/mean_reward` are again on different scales (rollout is normalised, eval is raw). The large rollout/eval gap seen in PPO_26 (~15 vs ~22) will no longer be meaningful to compare directly.

### PPO_27 Results

Value loss fixed: dropped from PPO_26's 7.7 → 0.23 and stable. However, `norm_reward=True` compressed the reward signal — eval peaked at 19.71 @ 1.25M steps vs PPO_26's ~22–24 at the same point. EV 0.721 (GOOD but slightly lower). Confirmed that `norm_reward=True` hurts by compressing combo spike magnitude, partially undoing PPO_24's intent. Stopped at 1.31M steps.

### PPO_28 Rationale

PPO_26/27 accumulated 8 reward components that overlap, conflict, and add unnecessary variance. The root problem: the shaping terms were trying to approximate "build combos and leave a good board" through indirect proxies (delta-based chain terms, post_sweep_pattern_delta, adjacent_patterns, holding_score) rather than measuring those goals directly.

**Diagnosis of current reward noise:**

- `chain_delta_reward` + `projected_chain_reward` — two simultaneous quadratic delta terms produce ±1.0 swings per step; combined variance dominates the shaping signal
- `post_sweep_pattern_delta` — fires **negative** when `score_delta > 0` (clearing patterns reduces pattern count); directly conflicts with the primary objective
- `holding_score_reward` — timeline-position-dependent: same board state, different returns; makes value function harder to fit
- `adjacent_patterns_created` — sparse (zero when no live combo zone); fragile gating adds noise without strong signal
- 8 overlapping components inflate reward variance → higher value loss, harder critic fitting

**Redesign: 4 components, directly aligned with the goal**

```python
reward = score_delta                          # primary: actual combo payoff (sparse, correct)
       + chain_after_drop * 0.05             # dense: chain length right after placement
       + post_sweep_chain * 0.05             # dense: chain length after tick loop settles
       + death_penalty                        # survival
```

- **`chain_after_drop`** (`_count_chain_length_from_board()` measured after hard drop, before ticks) — direct proxy for combo potential. Level-based not delta: continuous reward for maintaining chains, not just building them.
- **`post_sweep_chain`** (`_count_chain_length_from_board()` measured after tick loop + gravity settling, step 5) — direct proxy for "board readiness for next combo". This is goal 2 stated explicitly.
- Level-based rewards are always ≥ 0 and produce stable gradients; no conflicting sign flips from chain breaks.

**Components dropped:** `patterns_created`, `adjacent_patterns_created`, `chain_delta_reward`, `projected_chain_reward`, `post_sweep_pattern_delta`, `height_delta`, `holding_score_reward`.

**Hyperparameters:** `norm_reward=False` (preserve raw combo spike magnitude for critic), `clip_range_vf=0.2` (stabilise per-update value swings), `vf_coef=0.5` (reduce critic gradient pressure). No architecture changes — CNN still 5 channels, obs space unchanged.

### PPO_29 Rationale

PPG gives the value function dedicated "auxiliary phases" for longer training on stored data → much better EV, more stable late training, better credit assignment. Try after PPO improvements are exhausted and EV ceiling is confirmed. ~1.5× more compute than PPO. Available in `sb3-contrib`.

---

## Key Metrics to Watch Per Run

- **EV > 0.75** — critic keeping up with policy
- **Entropy loss trending more negative** — exploration maintained
- **Eval reward breaking above 24** (current best) — plateau broken
- **Rollout/eval gap** — only meaningful when both use the same reward scale; with `norm_reward=True` (PPO_27+), rollout rewards are normalised and not directly comparable to raw eval rewards
