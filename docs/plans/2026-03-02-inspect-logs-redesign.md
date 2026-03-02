# inspect_logs.py Redesign

**Date:** 2026-03-02
**Scope:** Improve `python/inspect_logs.py` for better single-run training analysis

## Problem

The current script has two gaps:

1. **Incomplete metric coverage** — only logs standard SB3 PPO metrics. Missing game-specific
   scalars (`ep_game_score_*`, `ep_peak_combo_len_*`), RND intrinsic reward metrics
   (`rnd/*`), and infrastructure metrics (`time/fps`, `train/learning_rate`).

2. **Last-5 only** — shows only the final 5 data points per metric. Gives no sense of the
   learning curve shape — whether the agent is still improving, has plateaued, or has regressed.

## Design

### 1. Metric Coverage

Add all observed scalar tags to `TAGS_OF_INTEREST`:

**Game metrics (new):**
- `rollout/ep_game_score_mean`, `rollout/ep_game_score_max`
- `rollout/ep_peak_combo_len_mean`, `rollout/ep_peak_combo_len_max`
- `eval/mean_game_score`, `eval/max_game_score`

**RND metrics (new, shown only when present):**
- `rnd/mean_r_int`, `rnd/r_int_std`, `rnd/predictor_loss`

**Infrastructure (new):**
- `time/fps`, `train/learning_rate`

The health assessment (`assess()`) should be updated to reference game score (not just
reward) for convergence signals, since reward and game score can diverge.

### 2. Percentile Curve (replaces last-5)

For each metric, replace the "last 5" line with an 11-point percentile curve at
`0%, 10%, 20%, ..., 100%` of training steps.

Each percentile point is the **local average** of the nearest ~10% of data points
centered on that mark, rather than a single sampled value. This smooths noise while
preserving the trend shape.

**Output format:**

```
rollout/ep_game_score_mean
  steps : 16,384 → 2,097,152  (128 points)
  values: first=12.1  last=847.3  min=8.4  max=912.0  (peak @ step 1,835,008)
  curve : 12→45→89→134→201→318→492→651→798→834→847
           0% 10% 20% 30% 40% 50% 60% 70% 80% 90%100%
```

### 3. Health Assessment Updates

- Use `eval/mean_game_score` (or `rollout/ep_game_score_mean`) as primary convergence
  signal alongside `train/explained_variance`.
- Add RND health check: flag if `rnd/predictor_loss` is not decreasing (stuck exploration).
- Add combo-len check: flag if `ep_peak_combo_len_mean` is near zero late in training
  (agent not discovering combo mechanic).

## What Does Not Change

- CLI interface: `python python/inspect_logs.py [log_dir]`
- Auto-detection of latest run
- Overall script structure (TAGS_OF_INTEREST list, `summarize()`, `assess()`, `main()`)
- Text-only output, no external dependencies added
