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

#### LSTM / Recurrent Policy
Replace MLP policy head with an LSTM that retains memory across timesteps.

- **Why:** Current MLP sees one frame at a time with no memory. Good Lumines strategy requires remembering recent placements, combo momentum, and zone context. LSTM learns implicit working memory without explicit encoding.
- **How:** Use `RecurrentPPO` from `sb3-contrib` (drop-in PPO replacement).
- **Cost:** ~2–3× slower per step; adds `lstm_hidden_size` and sequence length as hyperparameters.

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
| PPO_24 | Disable reward normalization (`norm_reward=False`) | Isolate VecNormalize signal compression; expose raw combo spike magnitude to critic | In progress |
| PPO_25 | Timeline proximity obs + quadratic chain reward | Agent learns sweep timing | — |
| PPO_26 | + LSTM (`RecurrentPPO`) | Long-horizon planning | — |
| PPO_27 | PPG (if PPO ceiling confirmed) | Better late-training EV and stability | — |

Each iteration isolates 1–2 changes to attribute improvements clearly.

### PPO_24 Rationale

PPO_23 used `norm_reward=True` on the training env and `norm_reward=False` on eval, making rollout/ep_rew_mean and eval/mean_reward structurally incomparable (different scales). More importantly, reward normalization compresses the signal from big combo sweeps — the critic sees a flattened distribution where a sweep scores only marginally better than a single placement. PPO_24 disables reward normalization to let raw reward magnitude flow to the critic, potentially producing stronger gradient signal for combo setup behaviors.

---

## Key Metrics to Watch Per Run

- **EV > 0.75** — critic keeping up with policy
- **Entropy loss trending more negative** — exploration maintained
- **Eval reward breaking above 24** (current best) — plateau broken
- **Rollout/eval gap narrowing** — currently rollout ~12 vs eval ~22; large gap suggests VecNormalize distortion
