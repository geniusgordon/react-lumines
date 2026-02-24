# LuminesEnv Tests + Python Bridge — Design

**Date:** 2026-02-24
**Status:** Approved

---

## Overview

Two deliverables built on top of `src/ai/LuminesEnv.ts`:

1. **Vitest unit tests** — verify correctness and determinism of LuminesEnv
2. **Python bridge** — expose LuminesEnv as a `gymnasium.Env` for RL training

---

## Part 1: Tests

**File:** `src/ai/__tests__/LuminesEnv.test.ts`

**Framework:** Vitest (matches existing project tests)

### Test groups

| Group | What it covers |
|-------|---------------|
| `reset()` | Returns valid observation shape; score=0; status not gameOver |
| Per-block step | Reward ≥ 0; obs shape correct; `done` only on game over; `blocksPlaced` increments |
| Per-frame step | Same shape/reward checks; NO_OP doesn't mutate block position |
| Determinism | Two instances with same seed + same action sequence → identical final scores |
| Edge cases | `targetX` out-of-bounds clamped silently; step after `done` is a no-op returning `done: true` |

---

## Part 2: Python Bridge

### Architecture

Node subprocess per env, JSON over stdio. One `node dist/env-server.cjs` process per environment instance. Communication is newline-delimited JSON.

```
Python process
  └── LuminesEnv (gymnasium.Env)
        └── subprocess: node dist/env-server.cjs --mode per_block
              ← {"cmd": "reset", "seed": "abc"}
              → {"type": "obs", "observation": {...}}
              ← {"cmd": "step", "action": {"targetX": 7, "rotation": 0}}
              → {"type": "step", "reward": 0, "done": false, "observation": {...}, "info": {...}}
              ← {"cmd": "close"}
              → (process exits)
```

### New files

```
src/ai/
└── env-server.ts          Node CLI — reads cmds from stdin, writes responses to stdout

python/
├── lumines_env.py          gymnasium.Env subclass
├── example.py              Smoke test / usage demo
└── requirements.txt        gymnasium, numpy

package.json               Add tsx devDep + build:env-server script
```

### Protocol

All messages are newline-terminated JSON objects.

**Commands (Python → Node):**

```jsonc
{"cmd": "reset", "seed": "optional-string"}
{"cmd": "step", "action": {"targetX": 7, "rotation": 0}}   // per_block
{"cmd": "step", "action": "MOVE_LEFT"}                      // per_frame
{"cmd": "close"}
```

**Responses (Node → Python):**

```jsonc
{"type": "obs", "observation": {...}}
{"type": "step", "observation": {...}, "reward": 0, "done": false, "info": {...}}
{"type": "error", "message": "..."}
```

### Build

Add `tsx` to `devDependencies`. Add `build:env-server` npm script:

```bash
esbuild src/ai/env-server.ts --bundle --platform=node --format=cjs \
  --alias:@/=./src/ --outfile=dist/env-server.cjs
```

This produces a standalone CommonJS file with all `@/` aliases resolved.

### Gymnasium spaces

**Per-block action space:** `Discrete(64)` — decoded as:
- `targetX = action // 4` (0–15)
- `rotation = action % 4` (0–3)

**Per-frame action space:** `Discrete(7)` — indexed as:
`[MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW, SOFT_DROP, HARD_DROP, NO_OP]`

**Observation space:**

| Key | Type | Shape | Range |
|-----|------|-------|-------|
| `board` | `Box(int8)` | `(10, 16)` | 0–2 |
| `current_block` | `Box(int8)` | `(2, 2)` | 0–2 |
| `block_position` | `Box(int32)` | `(2,)` | x: 0–15, y: -2–9 |
| `queue` | `Box(int8)` | `(2, 2, 2)` | 0–2 |
| `timeline_x` | `Box(int32)` | `(1,)` | 0–15 |
| `score` | `Box(int32)` | `(1,)` | 0–∞ |
| `frame` | `Box(int32)` | `(1,)` | 0–∞ |
| `game_timer` | `Box(int32)` | `(1,)` | 0–3600 |

### Python usage

```python
from lumines_env import LuminesEnv

env = LuminesEnv(mode='per_block', seed='test-123')
obs, info = env.reset()

for _ in range(10):
    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)
    if terminated:
        break

env.close()
```

For parallelism, wrap with `gymnasium.vector.AsyncVectorEnv` or SB3's `SubprocVecEnv` — each spawns its own Node subprocess.
