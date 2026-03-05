# Human Demo Recorder — Design

Date: 2026-03-05

## Goal

Allow a human to play the Lumines Python env and record their gameplay as demonstrations for future behavioral cloning (imitation learning) to bootstrap the RL agent.

## Two Scripts

### `python/play.py`

Human-playable terminal interface over `LuminesEnvNative` in `per_block` mode.

**Controls:**
- `←` / `→` — move column cursor left/right
- `z` / `x` — rotate piece CCW / CW
- `Space` / `Enter` — drop piece at selected column/rotation
- `q` — quit and save demo

**Display:** ASCII board with ghost piece rendered at the currently selected column. Ghost is computed by simulating the hard drop read-only (no state mutation). Current block and queue shown below the board.

**Output:** Saves to `python/demos/<seed>_<timestamp>.json` on quit or game over.

### `python/extract_demos.py`

Converts saved demo JSONs into a numpy dataset for behavioral cloning.

Replays each demo through `LuminesEnvNative` using its seed, collecting `(obs, action)` pairs at each step. Saves all pairs to `python/demos/dataset.npz`.

## Demo File Format

```json
{
  "version": 1,
  "seed": "42",
  "actions": [[8, 0], [6, 1], [10, 2]],
  "final_score": 1234,
  "blocks_placed": 87
}
```

Each action is `[column, rotation]`. The seed makes the game fully deterministic and reproducible.

## Action Space

`per_block` mode: `action = column * 4 + rotation`, matching the trained model exactly.
- `column`: 0–14 (15 valid drop positions)
- `rotation`: 0–3

## Notes

- Ghost piece computation: copy state, apply rotations, find lowest valid row at target column — read-only, no env step.
- Demo files accumulate in `python/demos/`; `extract_demos.py` processes all of them into one dataset.
- `_getch()` from `eval.py` handles raw terminal input (arrow keys, single keypresses).
