# PPO_26: Post-Clear Projection Channel + Projected Chain Reward

**Date:** 2026-02-28

## Problem

The RL agent (PPO_25) builds short isolated combos and leaves messy boards after
timeline sweeps. Root cause: the agent has no spatial signal for what the board
will look like after marked cells are cleared and gravity applied. It can see
`pattern_board` (current patterns) and `timeline_board` (live combo zone), but
cannot reason about the post-clear board state when placing a block.

## Solution

1. **5th CNN channel** (`projected_pattern_board`) — the pattern channel computed
   on the board after simulating clear + gravity, giving the CNN direct spatial
   awareness of post-clear board quality.
2. **`projected_chain_reward`** component — quadratic potential over the chain
   length on the projected board, measured at placement time.

## Changes

### `python/game/env.py`

| What | Details |
|------|---------|
| `_project_board()` | New helper: clears `state.marked_cells` from board copy, then calls `apply_gravity` |
| `_build_projected_pattern_board()` | Pattern channel on projected board; equals `_build_pattern_channel()` when `marked_cells` is empty |
| `_count_chain_length_from_board(board=None)` | Optional `board` arg; defaults to `self._state.board` |
| Obs space | Add `"projected_pattern_board": Box(0,1,(H,W),float32)` |
| `_build_obs()` | Include `"projected_pattern_board"` |
| `_step_per_block()` | Measure `prev_proj_chain` before drop, `new_proj_chain` after drop; compute `projected_chain_reward = (new² - prev²) * 0.02` |
| Reward formula | `+ projected_chain_reward` |
| `reward_components` | Key `"projected_chain_reward"` added |

### `python/train.py`

- CNN stem: `Conv2d(4→5, ...)` to accept 5-channel input
- `forward()`: stack 5 channels — board, pattern_board, ghost_board, timeline_board, projected_pattern_board
- Docstring updated

### `python/ws_eval.py`

- `compute_projected_pattern_board(board, marked_cells)` — mirrors env helper
- `obs_to_numpy()`: extract `markedCells` from `obs_json`, add `projected_pattern_board` to output

## Reward formula (PPO_26)

```
reward = score_delta
       + patterns_created * 0.05
       + height_delta
       + holding_score_reward
       + adjacent_patterns_created * 0.05
       + chain_delta_reward                  # (new_chain² - old_chain²) * 0.02
       + projected_chain_reward              # (new_proj_chain² - old_proj_chain²) * 0.02  [NEW]
       + post_sweep_pattern_delta
       + death_penalty
```

## Design Notes

- `projected_chain_reward` uses same weight (0.02) as `chain_delta_reward` — equal
  footing between current-board and post-clear-board chain quality
- No clamp on `projected_chain_reward` — penalizes placements that break post-clear
  chains
- MLP_KEYS unchanged — `projected_pattern_board` is spatial, routes through CNN only
- Graceful degradation: when `marked_cells` is empty, projected board == current board,
  so `projected_pattern_board == pattern_board` and `projected_chain_reward` mirrors
  `chain_delta_reward`
- **Breaking change**: CNN input shape 4 → 5. Cannot resume from PPO_25 checkpoint.

## Verification

```bash
python/.venv/bin/pytest python/tests/test_env_rewards.py python/tests/test_ws_eval.py -v
python/.venv/bin/pytest python/tests/ -v
python python/train.py --algo ppo --timesteps 5000 --envs 2 --dummy
python python/train.py --algo ppo --timesteps 3000000 --envs 16 --device mps
```
