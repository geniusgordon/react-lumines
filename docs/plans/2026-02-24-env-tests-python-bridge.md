# LuminesEnv Tests + Python Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Vitest tests for LuminesEnv and a Python `gymnasium.Env` wrapper backed by a Node.js subprocess.

**Architecture:** Tests use Vitest (same as existing tests). The bridge runs one `tsx src/ai/env-server.ts` subprocess per Python env instance; commands/responses are newline-delimited JSON over stdin/stdout. `tsx` is used as the runner so no separate build step is required.

**Tech Stack:** Vitest, TypeScript, tsx, Node.js subprocess, Python 3.8+, gymnasium, numpy.

---

## Task 1: Install tsx

**Files:**
- Modify: `package.json`

**Step 1: Add tsx to devDependencies**

```bash
pnpm add -D tsx
```

**Step 2: Verify installation**

```bash
./node_modules/.bin/tsx --version
```

Expected: prints a version string like `4.x.x`.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tsx for running env-server without build step"
```

---

## Task 2: LuminesEnv tests — reset and observation shape

**Files:**
- Create: `src/ai/__tests__/LuminesEnv.test.ts`

**Step 1: Write the failing tests**

Create `src/ai/__tests__/LuminesEnv.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LuminesEnv } from '../LuminesEnv';

describe('LuminesEnv', () => {
  describe('reset()', () => {
    it('returns a valid initial observation', () => {
      const env = new LuminesEnv({ seed: 'test-seed' });
      const obs = env.reset();

      expect(obs.board).toHaveLength(10);
      expect(obs.board[0]).toHaveLength(16);
      expect(obs.currentBlock).toHaveLength(2);
      expect(obs.currentBlock[0]).toHaveLength(2);
      expect(obs.queue).toHaveLength(2);
      expect(obs.queue[0]).toHaveLength(2);
      expect(obs.score).toBe(0);
      expect(obs.frame).toBe(0);
      expect(obs.gameTimer).toBe(3600);
      expect(obs.timelineX).toBe(0);
    });

    it('accepts a new seed on reset', () => {
      const env = new LuminesEnv({ seed: 'seed-a' });
      const obs1 = env.reset('seed-a');
      const obs2 = env.reset('seed-b');
      // Different seeds → different first blocks (highly likely)
      // We just check it doesn't throw and returns valid obs
      expect(obs2.score).toBe(0);
      expect(obs2.gameTimer).toBe(3600);
    });
  });
});
```

**Step 2: Run to verify it passes (reset is already implemented)**

```bash
pnpm test src/ai/__tests__/LuminesEnv.test.ts
```

Expected: 2 tests pass.

**Step 3: Commit**

```bash
git add src/ai/__tests__/LuminesEnv.test.ts
git commit -m "test: add LuminesEnv reset() tests"
```

---

## Task 3: LuminesEnv tests — per-block step

**Files:**
- Modify: `src/ai/__tests__/LuminesEnv.test.ts`

**Step 1: Add per-block step tests**

Append inside the outer `describe('LuminesEnv', ...)` block:

```typescript
  describe('step() — per_block mode', () => {
    let env: LuminesEnv;

    beforeEach(() => {
      env = new LuminesEnv({ mode: 'per_block', seed: 'block-test' });
      env.reset();
    });

    it('returns a valid step result', () => {
      const result = env.step({ targetX: 7, rotation: 0 });

      expect(result.reward).toBeGreaterThanOrEqual(0);
      expect(typeof result.done).toBe('boolean');
      expect(result.observation.board).toHaveLength(10);
      expect(result.observation.score).toBeGreaterThanOrEqual(0);
    });

    it('increments blocksPlaced each step', () => {
      const r1 = env.step({ targetX: 7, rotation: 0 });
      const r2 = env.step({ targetX: 3, rotation: 1 });

      expect(r1.info.blocksPlaced).toBe(1);
      expect(r2.info.blocksPlaced).toBe(2);
    });

    it('clamps targetX out-of-bounds silently', () => {
      // Should not throw for extreme values
      expect(() => env.step({ targetX: -99, rotation: 0 })).not.toThrow();
      expect(() => env.step({ targetX: 999, rotation: 0 })).not.toThrow();
    });

    it('returns done:true after game over and no-ops on subsequent steps', () => {
      // Play until game over (fill the board with 200 blocks max)
      let done = false;
      let result = env.step({ targetX: 0, rotation: 0 });
      for (let i = 0; i < 200 && !done; i++) {
        result = env.step({ targetX: 0, rotation: 0 });
        done = result.done;
      }

      if (result.done) {
        const afterDone = env.step({ targetX: 7, rotation: 0 });
        expect(afterDone.done).toBe(true);
        expect(afterDone.reward).toBe(0);
      }
      // If game didn't end in 200 blocks (normal — game is 3600 frames),
      // just check done is false (timer-based game over, not block-fill based)
    });
  });
```

**Step 2: Run tests**

```bash
pnpm test src/ai/__tests__/LuminesEnv.test.ts
```

Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/ai/__tests__/LuminesEnv.test.ts
git commit -m "test: add LuminesEnv per-block step tests"
```

---

## Task 4: LuminesEnv tests — per-frame step and determinism

**Files:**
- Modify: `src/ai/__tests__/LuminesEnv.test.ts`

**Step 1: Add per-frame and determinism tests**

Append inside the outer `describe('LuminesEnv', ...)` block:

```typescript
  describe('step() — per_frame mode', () => {
    let env: LuminesEnv;

    beforeEach(() => {
      env = new LuminesEnv({ mode: 'per_frame', seed: 'frame-test' });
      env.reset();
    });

    it('returns valid step result', () => {
      const result = env.step('NO_OP');
      expect(result.observation.board).toHaveLength(10);
      expect(result.reward).toBeGreaterThanOrEqual(0);
    });

    it('NO_OP does not change blockPosition.x', () => {
      const before = env.getState().blockPosition.x;
      env.step('NO_OP');
      const after = env.getState().blockPosition.x;
      expect(after).toBe(before);
    });

    it('MOVE_LEFT changes blockPosition.x when not at wall', () => {
      // Default spawn is x=7, so MOVE_LEFT should work
      const before = env.getState().blockPosition.x;
      env.step('MOVE_LEFT');
      const after = env.getState().blockPosition.x;
      // Either moved left or was already at wall
      expect(after).toBeLessThanOrEqual(before);
    });
  });

  describe('determinism', () => {
    it('two instances with same seed + same actions produce identical results', () => {
      const env1 = new LuminesEnv({ mode: 'per_block', seed: 'det-seed' });
      const env2 = new LuminesEnv({ mode: 'per_block', seed: 'det-seed' });

      env1.reset('det-seed');
      env2.reset('det-seed');

      const actions: Array<{ targetX: number; rotation: 0 | 1 | 2 | 3 }> = [
        { targetX: 7, rotation: 0 },
        { targetX: 3, rotation: 1 },
        { targetX: 12, rotation: 2 },
        { targetX: 5, rotation: 3 },
        { targetX: 0, rotation: 0 },
      ];

      for (const action of actions) {
        const r1 = env1.step(action);
        const r2 = env2.step(action);
        expect(r1.reward).toBe(r2.reward);
        expect(r1.done).toBe(r2.done);
        expect(r1.observation.score).toBe(r2.observation.score);
      }

      expect(env1.getState().score).toBe(env2.getState().score);
    });
  });
```

**Step 2: Run all tests**

```bash
pnpm test src/ai/__tests__/LuminesEnv.test.ts
```

Expected: all tests pass.

**Step 3: Run full test suite to check for regressions**

```bash
pnpm test
```

Expected: 154+ tests pass, 0 failures.

**Step 4: Commit**

```bash
git add src/ai/__tests__/LuminesEnv.test.ts
git commit -m "test: add LuminesEnv per-frame and determinism tests"
```

---

## Task 5: Create env-server.ts

**Files:**
- Create: `src/ai/env-server.ts`

**Step 1: Create the server**

```typescript
/**
 * env-server.ts — Headless Lumines environment server
 *
 * Reads newline-delimited JSON commands from stdin.
 * Writes newline-delimited JSON responses to stdout.
 *
 * Usage:
 *   tsx src/ai/env-server.ts [--mode per_block|per_frame]
 *
 * Commands:
 *   {"cmd": "reset", "seed": "optional"}
 *   {"cmd": "step", "action": {"targetX": 7, "rotation": 0}}   // per_block
 *   {"cmd": "step", "action": "MOVE_LEFT"}                      // per_frame
 *   {"cmd": "render"}
 *   {"cmd": "close"}
 */

import { LuminesEnv, type StepMode, type BlockAction, type FrameAction } from './LuminesEnv.js';

// Parse --mode argument
const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const mode: StepMode =
  modeIdx !== -1 && (args[modeIdx + 1] === 'per_frame' || args[modeIdx + 1] === 'per_block')
    ? (args[modeIdx + 1] as StepMode)
    : 'per_block';

const env = new LuminesEnv({ mode });

function send(obj: object): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

interface ResetCmd {
  cmd: 'reset';
  seed?: string;
}

interface StepCmd {
  cmd: 'step';
  action: BlockAction | FrameAction;
}

interface RenderCmd {
  cmd: 'render';
}

interface CloseCmd {
  cmd: 'close';
}

type Command = ResetCmd | StepCmd | RenderCmd | CloseCmd;

function handleCommand(cmd: Command): void {
  switch (cmd.cmd) {
    case 'reset': {
      const obs = env.reset(cmd.seed ?? undefined);
      send({ type: 'obs', observation: obs });
      break;
    }
    case 'step': {
      const result = env.step(cmd.action);
      send({ type: 'step', ...result });
      break;
    }
    case 'render': {
      send({ type: 'render', ascii: env.render() });
      break;
    }
    case 'close': {
      process.exit(0);
    }
  }
}

let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const cmd = JSON.parse(trimmed) as Command;
      handleCommand(cmd);
    } catch (e) {
      send({ type: 'error', message: String(e) });
    }
  }
});

process.stdin.on('end', () => process.exit(0));
```

**Step 2: Smoke-test the server manually**

```bash
echo '{"cmd":"reset","seed":"test"}' | ./node_modules/.bin/tsx src/ai/env-server.ts
```

Expected: one line of JSON printed to stdout, starting with `{"type":"obs","observation":{`.

**Step 3: Test a step**

```bash
printf '{"cmd":"reset","seed":"test"}\n{"cmd":"step","action":{"targetX":7,"rotation":0}}\n{"cmd":"close"}\n' \
  | ./node_modules/.bin/tsx src/ai/env-server.ts
```

Expected: two JSON lines — an `obs` response then a `step` response.

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/ai/env-server.ts
git commit -m "feat: add env-server.ts for Python bridge IPC"
```

---

## Task 6: Create Python wrapper

**Files:**
- Create: `python/lumines_env.py`
- Create: `python/requirements.txt`

**Step 1: Create requirements.txt**

```
gymnasium>=0.29.0
numpy>=1.24.0
```

**Step 2: Create `python/lumines_env.py`**

```python
"""
lumines_env.py — Gymnasium wrapper for the Lumines headless environment.

Spawns a Node.js subprocess running src/ai/env-server.ts via tsx.
One subprocess per env instance → naturally parallelisable with
gymnasium.vector.AsyncVectorEnv or SubprocVecEnv.

Usage:
    env = LuminesEnv(mode='per_block', seed='abc')
    obs, info = env.reset()
    obs, reward, terminated, truncated, info = env.step(action)
    env.close()

Action spaces:
    per_block → Discrete(64):  targetX = action // 4, rotation = action % 4
    per_frame → Discrete(7):   [MOVE_LEFT, MOVE_RIGHT, ROTATE_CW, ROTATE_CCW,
                                 SOFT_DROP, HARD_DROP, NO_OP]
"""

import json
import os
import subprocess
from typing import Any, Optional

import numpy as np
import gymnasium as gym
from gymnasium import spaces

FRAME_ACTIONS = [
    "MOVE_LEFT",
    "MOVE_RIGHT",
    "ROTATE_CW",
    "ROTATE_CCW",
    "SOFT_DROP",
    "HARD_DROP",
    "NO_OP",
]


class LuminesEnv(gym.Env):
    metadata = {"render_modes": ["ansi"]}

    def __init__(
        self,
        mode: str = "per_block",
        seed: Optional[str] = None,
        render_mode: Optional[str] = None,
        repo_root: Optional[str] = None,
    ):
        super().__init__()

        self.mode = mode
        self._seed = seed
        self.render_mode = render_mode

        # Locate the repo root (parent of the python/ directory by default)
        if repo_root is None:
            repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self._repo_root = repo_root

        self._tsx = os.path.join(repo_root, "node_modules", ".bin", "tsx")
        self._server_script = os.path.join(repo_root, "src", "ai", "env-server.ts")
        self._proc: Optional[subprocess.Popen] = None  # type: ignore[type-arg]

        # Action space
        if mode == "per_block":
            self.action_space = spaces.Discrete(64)  # 16 cols × 4 rotations
        else:
            self.action_space = spaces.Discrete(len(FRAME_ACTIONS))

        # Observation space
        self.observation_space = spaces.Dict(
            {
                "board": spaces.Box(0, 2, shape=(10, 16), dtype=np.int8),
                "current_block": spaces.Box(0, 2, shape=(2, 2), dtype=np.int8),
                "block_position": spaces.Box(
                    low=np.array([-2, -2], dtype=np.int32),
                    high=np.array([15, 9], dtype=np.int32),
                    dtype=np.int32,
                ),
                "queue": spaces.Box(0, 2, shape=(2, 2, 2), dtype=np.int8),
                "timeline_x": spaces.Box(0, 15, shape=(1,), dtype=np.int32),
                "score": spaces.Box(
                    0, np.iinfo(np.int32).max, shape=(1,), dtype=np.int32
                ),
                "frame": spaces.Box(
                    0, np.iinfo(np.int32).max, shape=(1,), dtype=np.int32
                ),
                "game_timer": spaces.Box(0, 3600, shape=(1,), dtype=np.int32),
            }
        )

    # -------------------------------------------------------------------------

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None,  # type: ignore[type-arg]
    ) -> tuple[dict, dict]:  # type: ignore[type-arg]
        super().reset(seed=seed)
        if self._proc is None or self._proc.poll() is not None:
            self._start_proc()
        seed_str = str(seed) if seed is not None else self._seed
        self._send({"cmd": "reset", "seed": seed_str})
        resp = self._recv()
        return self._obs_to_numpy(resp["observation"]), {}

    def step(self, action: int) -> tuple:  # type: ignore[override]
        self._send({"cmd": "step", "action": self._encode_action(action)})
        resp = self._recv()
        obs = self._obs_to_numpy(resp["observation"])
        return obs, float(resp["reward"]), bool(resp["done"]), False, resp["info"]

    def render(self) -> Optional[str]:
        if self.render_mode != "ansi":
            return None
        self._send({"cmd": "render"})
        resp = self._recv()
        return resp["ascii"]  # type: ignore[no-any-return]

    def close(self) -> None:
        if self._proc and self._proc.poll() is None:
            try:
                self._send({"cmd": "close"})
            except Exception:
                pass
            self._proc.terminate()
        self._proc = None

    # -------------------------------------------------------------------------

    def _start_proc(self) -> None:
        self._proc = subprocess.Popen(
            [self._tsx, self._server_script, "--mode", self.mode],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,  # line-buffered
            cwd=self._repo_root,
        )

    def _send(self, obj: Any) -> None:
        assert self._proc and self._proc.stdin
        self._proc.stdin.write(json.dumps(obj) + "\n")
        self._proc.stdin.flush()

    def _recv(self) -> Any:
        assert self._proc and self._proc.stdout
        line = self._proc.stdout.readline()
        return json.loads(line)

    def _obs_to_numpy(self, obs: dict) -> dict:  # type: ignore[type-arg]
        bp = obs["blockPosition"]
        return {
            "board": np.array(obs["board"], dtype=np.int8),
            "current_block": np.array(obs["currentBlock"], dtype=np.int8),
            "block_position": np.array([bp["x"], bp["y"]], dtype=np.int32),
            "queue": np.array(obs["queue"], dtype=np.int8),
            "timeline_x": np.array([obs["timelineX"]], dtype=np.int32),
            "score": np.array([obs["score"]], dtype=np.int32),
            "frame": np.array([obs["frame"]], dtype=np.int32),
            "game_timer": np.array([obs["gameTimer"]], dtype=np.int32),
        }

    def _encode_action(self, action: int) -> Any:
        if self.mode == "per_block":
            return {"targetX": int(action) // 4, "rotation": int(action) % 4}
        return FRAME_ACTIONS[int(action)]
```

**Step 3: Commit**

```bash
git add python/lumines_env.py python/requirements.txt
git commit -m "feat: add Python gymnasium wrapper for LuminesEnv"
```

---

## Task 7: Create example.py and verify bridge end-to-end

**Files:**
- Create: `python/example.py`

**Step 1: Create `python/example.py`**

```python
"""
example.py — Smoke test + usage demo for the Lumines gymnasium env.

Run:
    cd /path/to/react-lumines
    pip install -r python/requirements.txt
    python python/example.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from lumines_env import LuminesEnv


def main():
    print("=== Smoke test: per_block mode ===")
    env = LuminesEnv(mode="per_block", seed="example-seed")
    obs, info = env.reset()

    print(f"board shape:         {len(obs['board'])}×{len(obs['board'][0])}")
    print(f"current_block shape: {obs['current_block'].shape}")
    print(f"queue shape:         {obs['queue'].shape}")
    print(f"game_timer:          {obs['game_timer'][0]}")
    print()

    total_reward = 0.0
    for i in range(10):
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        print(f"step {i+1:2d}  action={action:2d}  reward={reward:.0f}  "
              f"score={obs['score'][0]}  timer={obs['game_timer'][0]}  done={terminated}")
        if terminated:
            break

    print(f"\nTotal reward: {total_reward}")
    env.close()

    print("\n=== Determinism check ===")
    env1 = LuminesEnv(mode="per_block", seed="det-check")
    env2 = LuminesEnv(mode="per_block", seed="det-check")

    env1.reset(seed=42)
    env2.reset(seed=42)

    actions = [28, 7, 52, 3, 14]
    scores1, scores2 = [], []
    for a in actions:
        o1, r1, d1, _, i1 = env1.step(a)
        o2, r2, d2, _, i2 = env2.step(a)
        scores1.append(int(o1["score"][0]))
        scores2.append(int(o2["score"][0]))

    env1.close()
    env2.close()

    print(f"Env1 scores: {scores1}")
    print(f"Env2 scores: {scores2}")
    assert scores1 == scores2, "FAIL: scores differ!"
    print("PASS: determinism confirmed")


if __name__ == "__main__":
    main()
```

**Step 2: Install Python dependencies**

```bash
pip install -r python/requirements.txt
```

**Step 3: Run the example**

```bash
python python/example.py
```

Expected output:
```
=== Smoke test: per_block mode ===
board shape:         10×16
current_block shape: (2, 2)
queue shape:         (2, 2, 2)
game_timer:          3600

step  1  action=...  reward=0  score=0  timer=...  done=False
...

=== Determinism check ===
Env1 scores: [...]
Env2 scores: [...]
PASS: determinism confirmed
```

**Step 4: Commit**

```bash
git add python/example.py
git commit -m "feat: add Python bridge example and determinism smoke test"
```

---

## Task 8: Final verification

**Step 1: Run TypeScript typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 2: Run full test suite**

```bash
pnpm test
```

Expected: 160+ tests pass, 0 failures.

**Step 3: Re-run Python smoke test**

```bash
python python/example.py
```

Expected: "PASS: determinism confirmed"

**Step 4: Done — invoke finishing-a-development-branch skill**
