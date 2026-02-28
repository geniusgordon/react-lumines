# PPO_30: Color-Separated Pattern Boards

**Date:** 2026-02-28

## Problem

PPO_29 simplified the reward to 4 components and introduced a color-aware reward
(`single_color_chain_delta`, `post_sweep_chain`), but the CNN observation still used a
mixed `pattern_board` that combined light and dark patterns into a single channel.
This created a mismatch: the reward cares about per-color pattern quality, but the
CNN cannot distinguish which color is responsible for a given pattern cluster without
learning a separate threshold over mixed values.

Additional noise: `ghost_board` (drop simulation) and `projected_pattern_board`
(post-clear projection) added two CNN channels whose information doesn't align with
the color-aware reward structure.

## Solution

Replace `pattern_board` + `ghost_board` + `projected_pattern_board` (3 channels) with
`light_pattern_board` + `dark_pattern_board` (2 channels).

Each color-pattern channel counts 2×2 same-color patterns for a single color, normalised
to [0,1] by dividing by 4. The CNN now sees exactly the per-color pattern structure that
the reward is measuring — a direct alignment between observation and objective.

Net CNN reduction: 5 → 4 channels.

## Changes

### `python/game/env.py`

| What | Details |
|------|---------|
| Obs space | Remove `pattern_board`, `ghost_board`, `projected_pattern_board`; add `light_pattern_board` + `dark_pattern_board` |
| `_build_color_pattern_channel(color)` | New helper: counts 2×2 patterns of a single color, normalised /4. Replaces `_build_pattern_channel()` |
| Removed | `_build_pattern_channel()`, `_build_ghost_channel()`, `_build_projected_pattern_board()`, `_build_timeline_board()`, `_project_board()` |
| `_build_obs()` | Use `light_pattern_board` + `dark_pattern_board`; drop removed channels |

### `python/train.py`

- CNN stem: `Conv2d(5→4, ...)` to accept 4-channel input
- `forward()`: stack 4 channels — `light_board`, `dark_board`, `light_pattern_board`, `dark_pattern_board`
- Docstring updated

### `python/ws_eval.py`

- `compute_color_pattern_board(board, color)` — mirrors `env._build_color_pattern_channel()`
- Removed: `compute_pattern_board`, `compute_ghost_board`, `compute_projected_pattern_board`, `compute_timeline_board`
- `obs_to_numpy()`: use `light_pattern_board` + `dark_pattern_board`; drop `markedCells` extraction

### Tests

- `test_env_rewards.py`: replaced `projected_pattern_board` tests with color-pattern board tests (presence, shape, range, non-overlap, color-selectivity)
- `test_ws_eval.py`: removed `TestComputePatternBoard`, `TestComputeTimelineBoard`, `TestComputeGhostBoard`, `TestComputeProjectedPatternBoard`; updated `TestObsToNumpy` for new keys; removed `markedCells` from obs JSON
- `test_cross_validation.py`: added `light_pattern_board` + `dark_pattern_board` shape assertions

## Design Notes

- The two color-pattern channels are guaranteed non-overlapping: a cell can only be in
  a light-only or dark-only 2×2 pattern, not both. The CNN can treat them as complementary.
- Removing `ghost_board` trades placement-prediction information for fewer channels and
  cleaner alignment with color-aware objectives. The `queue` observation already provides
  look-ahead context.
- Removing `projected_pattern_board` removes the need for `find_drop_position` import
  and `markedCells` in the browser WebSocket observation JSON.
- **Breaking change**: CNN input shape 5 → 4. Cannot resume from PPO_29 checkpoints.

## Verification

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py python/tests/test_ws_eval.py python/tests/test_cross_validation.py -v
python/.venv/bin/pytest python/tests/ -v
python python/train.py --algo ppo --timesteps 5000 --envs 2 --dummy
python python/train.py --algo ppo --timesteps 3000000 --envs 16 --device mps
```
