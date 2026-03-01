# PPO_34: Pre-Clear Shaping Follow-Up (Implemented)

**Date:** 2026-03-01

## Goal

PPO_34 adds a small pre-clear pattern-building signal while preserving the PPO_33
reward equation:

```python
reward = score_delta + SHAPING_LAMBDA * (SHAPING_GAMMA * phi_next - phi_prev) + death
```

## Implementation

- Added `preclear_patterns` feature to potential computation.
- `preclear_patterns` = normalized count of complete 2×2 same-color patterns on the
  current board before simulated clear.
- Extended potential:
  - `phi = phi_ppo33 + w_preclear * preclear_patterns`
- Initial weight:
  - `w_preclear = 0.1`

No standalone additive pre-clear reward term was introduced; shaping remains
potential-based.

## Evaluation Plan

1. Keep architecture and PPO hyperparameters fixed from PPO_33 baseline.
2. Compare PPO_33 vs PPO_34 on:
   - early sample efficiency (first 100k–300k steps)
   - peak eval score
   - stability metrics (KL, clip fraction, explained variance, value loss trend)
3. Keep `score_delta` unscaled and verify reward-components logging remains interpretable.

## Success Criteria

1. Faster early score growth without degrading final performance.
2. No new instability in value loss or clip fraction.
3. Behaviorally: clearer pre-sweep pattern build-up leading to larger sweep cash-outs.
