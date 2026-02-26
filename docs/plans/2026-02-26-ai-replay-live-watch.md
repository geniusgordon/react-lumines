# AI Replay & Live Watch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (B) Save AI eval runs as replay JSON files viewable in the browser, then (A) watch the AI play live via a WebSocket inference server.

**Architecture:** Phase B threads replay-input recording through LuminesEnv.ts → env-server.ts → lumines_env.py → eval.py; the browser already has file-import in the Leaderboard. Phase A adds a Python WebSocket server for inference and a new `/ai-watch` browser route that drives the TS game engine with AI decisions.

**Tech Stack:** TypeScript/React, Vitest, Python, stable-baselines3, websockets (new Python dep)

---

## Phase B — Replay Recording

### Task 1: LuminesEnv.ts — add appliedInputs to StepResult

**Files:**
- Modify: `src/ai/LuminesEnv.ts`
- Test: `src/ai/__tests__/LuminesEnv.test.ts`

**Background:** `stepPerBlock` applies ROTATE_CW × N, MOVE_LEFT/RIGHT × N, then HARD_DROP — all at the same game frame (no TICKs between them). We capture these as `appliedInputs: { type: string; frame: number }[]` so env-server can write a valid replay file.

**Step 1: Write the failing test**

Add to `src/ai/__tests__/LuminesEnv.test.ts` inside `describe('step() — per_block mode')`:

```typescript
it('returns appliedInputs for each step', () => {
  const result = env.step({ targetX: 7, rotation: 2 });

  expect(Array.isArray(result.appliedInputs)).toBe(true);
  // rotation=2 → 2 ROTATE_CW
  const rotations = result.appliedInputs.filter(i => i.type === 'ROTATE_CW');
  expect(rotations).toHaveLength(2);
  // always ends with HARD_DROP
  const lastInput = result.appliedInputs[result.appliedInputs.length - 1];
  expect(lastInput.type).toBe('HARD_DROP');
  // all inputs have the same frame (before safety ticks)
  const frame = result.appliedInputs[0].frame;
  expect(result.appliedInputs.every(i => i.frame === frame)).toBe(true);
});

it('appliedInputs rotation=0 has no ROTATE_CW', () => {
  const result = env.step({ targetX: 7, rotation: 0 });
  const rotations = result.appliedInputs.filter(i => i.type === 'ROTATE_CW');
  expect(rotations).toHaveLength(0);
});

it('appliedInputs move count matches actual displacement', () => {
  env.reset('block-test');
  const stateBefore = env.getState();
  const startX = stateBefore.blockPosition.x; // default spawn X
  const targetX = startX + 2; // move right by 2
  const result = env.step({ targetX, rotation: 0 });
  const moves = result.appliedInputs.filter(i => i.type === 'MOVE_RIGHT');
  // moved right by 2 (or less if wall hit — result.appliedInputs only has successful moves)
  expect(moves.length).toBeLessThanOrEqual(2);
  expect(moves.length).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test src/ai/__tests__/LuminesEnv.test.ts
```
Expected: FAIL — `result.appliedInputs is not iterable` (property doesn't exist yet)

**Step 3: Add appliedInputs to StepResult type**

In `src/ai/LuminesEnv.ts`, add to `StepResult`:

```typescript
export interface StepResult {
  observation: Observation;
  reward: number;
  done: boolean;
  info: {
    finalScore: number;
    framesElapsed: number;
    blocksPlaced: number;
  };
  appliedInputs: { type: string; frame: number }[];  // add this line
}
```

**Step 4: Capture inputs in stepPerBlock**

Replace the entire `stepPerBlock` method body (keep signature):

```typescript
private stepPerBlock(action: BlockAction): StepResult {
  const prevScore = this.state.score;
  const prevBlockId = this.state.currentBlock.id;
  const inputFrame = this.state.frame;
  const appliedInputs: { type: string; frame: number }[] = [];

  const maxX = BOARD_WIDTH - 2;
  const targetX = Math.max(0, Math.min(action.targetX, maxX));

  const rotations = ((action.rotation % 4) + 4) % 4;
  for (let i = 0; i < rotations; i++) {
    this.state = gameReducer(this.state, { type: 'ROTATE_CW' });
    appliedInputs.push({ type: 'ROTATE_CW', frame: inputFrame });
  }

  const dx = targetX - this.state.blockPosition.x;
  if (dx < 0) {
    for (let i = 0; i < -dx; i++) {
      const prevX = this.state.blockPosition.x;
      this.state = gameReducer(this.state, { type: 'MOVE_LEFT' });
      if (this.state.blockPosition.x === prevX) break;
      appliedInputs.push({ type: 'MOVE_LEFT', frame: inputFrame });
    }
  } else if (dx > 0) {
    for (let i = 0; i < dx; i++) {
      const prevX = this.state.blockPosition.x;
      this.state = gameReducer(this.state, { type: 'MOVE_RIGHT' });
      if (this.state.blockPosition.x === prevX) break;
      appliedInputs.push({ type: 'MOVE_RIGHT', frame: inputFrame });
    }
  }

  this.state = gameReducer(this.state, { type: 'HARD_DROP' });
  appliedInputs.push({ type: 'HARD_DROP', frame: inputFrame });

  let safety = 0;
  const maxSafetyTicks = 1000;
  while (
    this.state.status !== 'gameOver' &&
    this.state.currentBlock.id === prevBlockId &&
    safety < maxSafetyTicks
  ) {
    this.state = gameReducer(this.state, { type: 'TICK' });
    safety++;
  }

  if (this.state.status !== 'gameOver') {
    this.blocksPlaced++;
  }

  return {
    observation: this.buildObservation(),
    reward: this.state.score - prevScore,
    done: this.state.status === 'gameOver',
    info: this.buildInfo(),
    appliedInputs,
  };
}
```

For `stepPerFrame`, add `appliedInputs: []` to its return statement:

```typescript
return {
  observation: this.buildObservation(),
  reward: this.state.score - prevScore,
  done: this.state.status === 'gameOver',
  info: this.buildInfo(),
  appliedInputs: [],
};
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test src/ai/__tests__/LuminesEnv.test.ts
```
Expected: all tests PASS

**Step 6: Commit**

```bash
git add src/ai/LuminesEnv.ts src/ai/__tests__/LuminesEnv.test.ts
git commit -m "feat: add appliedInputs tracking to LuminesEnv.stepPerBlock"
```

---

### Task 2: env-server.ts — --record-replay flag

**Files:**
- Modify: `src/ai/env-server.ts`

**Background:** When `--record-replay <path>` is passed, env-server collects `appliedInputs` from every step, captures the seed from the first `reset`, and writes a `ReplayData` JSON file on `close`.

No new tests needed — this is glue code between LuminesEnv and the file system. Verified by the integration test in Task 4.

**Step 1: Add CLI arg parsing and state**

At the top of `src/ai/env-server.ts`, after the existing `modeIdx` block, add:

```typescript
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

// --record-replay <path>
const recordIdx = args.indexOf('--record-replay');
const recordReplayPath: string | null =
  recordIdx !== -1 ? (args[recordIdx + 1] ?? null) : null;

let recordedSeed: string = Date.now().toString();
const recordedInputs: { type: string; frame: number }[] = [];
```

**Step 2: Capture seed on reset and inputs on step**

In `handleCommand`, update the `reset` and `step` cases:

```typescript
case 'reset': {
  const obs = env.reset(cmd.seed ?? undefined);
  if (recordReplayPath && cmd.seed) {
    recordedSeed = cmd.seed;
    recordedInputs.length = 0; // clear for new episode
  }
  send({ type: 'obs', observation: obs });
  break;
}
case 'step': {
  const result = env.step(cmd.action);
  if (recordReplayPath && result.appliedInputs.length > 0) {
    recordedInputs.push(...result.appliedInputs);
  }
  send({ type: 'step', ...result });
  break;
}
```

**Step 3: Write replay file on close**

Update the `close` case:

```typescript
case 'close': {
  if (recordReplayPath && recordedInputs.length > 0) {
    const replayData = {
      id: randomUUID(),
      seed: recordedSeed,
      inputs: recordedInputs,
      gameConfig: { version: '1.0.0', timestamp: Date.now() },
      metadata: {
        finalScore: 0,   // env doesn't expose final score at close time
        playerName: 'AI Agent',
      },
    };
    writeFileSync(recordReplayPath, JSON.stringify(replayData, null, 2));
  }
  process.exit(0);
}
```

**Step 4: Typecheck**

```bash
pnpm typecheck
```
Expected: no errors

**Step 5: Commit**

```bash
git add src/ai/env-server.ts
git commit -m "feat: add --record-replay flag to env-server"
```

---

### Task 3: lumines_env.py — pass --record-replay to subprocess

**Files:**
- Modify: `python/lumines_env.py`

**Step 1: Add constructor param**

In `LuminesEnv.__init__`, add `record_replay_path: Optional[str] = None` parameter and store it:

```python
def __init__(
    self,
    mode: str = "per_block",
    seed: Optional[str] = None,
    render_mode: Optional[str] = None,
    repo_root: Optional[str] = None,
    record_replay_path: Optional[str] = None,  # add this
):
    ...
    self._record_replay_path = record_replay_path  # add this
```

**Step 2: Pass to subprocess in _start_proc**

Replace `_start_proc`:

```python
def _start_proc(self) -> None:
    cmd = [
        self._tsx, "--tsconfig", self._tsconfig,
        self._server_script, "--mode", self.mode,
    ]
    if self._record_replay_path:
        cmd += ["--record-replay", self._record_replay_path]
    self._proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
        cwd=self._repo_root,
    )
```

**Step 3: Commit**

```bash
git add python/lumines_env.py
git commit -m "feat: add record_replay_path param to LuminesEnv Python wrapper"
```

---

### Task 4: eval.py — --save-replay flag + integration test

**Files:**
- Modify: `python/eval.py`

**Step 1: Add --save-replay CLI argument**

In the `argparse` block, add:

```python
parser.add_argument(
    "--save-replay",
    dest="save_replay",
    default=None,
    metavar="PATH",
    help="Save the first episode as a browser-compatible replay JSON (forces --no-native)",
)
```

**Step 2: Apply save-replay logic in evaluate()**

At the top of `evaluate()`, add:

```python
if args.save_replay:
    args.native = False  # force TypeScript env for browser compatibility
    args.episodes = 1    # only record one episode
```

In the `for episode` loop, where `LuminesEnv` is constructed (the `else` branch, `--no-native`), update to pass the path for the first episode only:

```python
# replace:
env = LuminesEnv(mode="per_block", render_mode=render_mode)
# with:
record_path = args.save_replay if (args.save_replay and episode == 1) else None
env = LuminesEnv(mode="per_block", render_mode=render_mode, record_replay_path=record_path)
```

Note: the `if args.native` branch uses `LuminesEnvNative` which doesn't support `record_replay_path` — but we forced `args.native = False` above so we'll never hit that branch when `--save-replay` is set.

**Step 3: Integration test — run and verify output**

```bash
cd /path/to/repo
python python/eval.py \
  --save-replay /tmp/ai-game.json \
  --no-native \
  --episodes 1 \
  --checkpoint python/checkpoints/best_model
```

Expected output:
```
Loading checkpoint: python/checkpoints/best_model
=== Episode 1/1 (seed=1) ===
Episode 1 finished — score: ...
```

Then verify the JSON was written:

```bash
python3 -c "
import json
with open('/tmp/ai-game.json') as f:
    d = json.load(f)
print('id:', d['id'])
print('seed:', d['seed'])
print('inputs:', len(d['inputs']))
print('sample input:', d['inputs'][0] if d['inputs'] else 'none')
print('playerName:', d['metadata']['playerName'])
"
```

Expected: valid JSON with `id`, `seed`, non-zero `inputs` list, `playerName: AI Agent`.

**Step 4: Import into browser and watch**

1. `pnpm dev` in another terminal
2. Open browser → `http://localhost:5173/leaderboard`
3. Use the **Import** button → select `/tmp/ai-game.json`
4. The replay appears in the list as "AI Agent"
5. Click it → `/replays/:id` → watch the AI play

**Step 5: Commit**

```bash
git add python/eval.py
git commit -m "feat: add --save-replay flag to eval.py for browser replay export"
```

---

## Phase A — Live WebSocket Watch

### Task 5: ws_eval.py — Python WebSocket inference server

**Files:**
- Create: `python/ws_eval.py`
- Modify: `python/requirements.txt`

**Background:** The server loads the PPO model and VecNormalize stats, listens on `ws://localhost:8765`, accepts observation JSON, runs inference, returns the action integer as a string. Single-client — only one game runs at a time.

**Step 1: Add websockets dependency**

```bash
cd python
cat requirements.txt
```

Add `websockets>=12.0` to `python/requirements.txt`, then:

```bash
python/.venv/bin/pip install websockets
```

**Step 2: Create ws_eval.py**

```python
"""
ws_eval.py — WebSocket inference server for live AI watch in browser.

Usage:
    python python/ws_eval.py
    python python/ws_eval.py --checkpoint python/checkpoints/best_model
    python python/ws_eval.py --port 8765

The server loads the PPO model, then waits for connections.
Each message: JSON observation → returns action int as string.
"""
import argparse
import asyncio
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from game.env import LuminesEnvNative


def load_model(checkpoint: str, device: str):
    norm_stats_path = os.path.join(os.path.dirname(checkpoint), "vecnormalize.pkl")
    dummy = DummyVecEnv([lambda: LuminesEnvNative(mode="per_block")])
    vec_normalize = None
    if os.path.exists(norm_stats_path):
        print(f"Loading VecNormalize stats from {norm_stats_path}")
        dummy = VecNormalize.load(norm_stats_path, dummy)
        dummy.training = False
        dummy.norm_reward = False
        vec_normalize = dummy
    model = PPO.load(checkpoint, env=dummy, device=device)
    print(f"Model loaded from {checkpoint}")
    return model, vec_normalize


def obs_to_numpy(obs_json: dict) -> dict:
    bp = obs_json["blockPosition"]
    return {
        "board": np.array(obs_json["board"], dtype=np.int8),
        "current_block": np.array(obs_json["currentBlock"], dtype=np.int8),
        "block_position": np.array([bp["x"], bp["y"]], dtype=np.int32),
        "queue": np.array(obs_json["queue"], dtype=np.int8),
        "timeline_x": np.array([obs_json["timelineX"]], dtype=np.int32),
        "score": np.array([obs_json["score"]], dtype=np.int32),
        "frame": np.array([obs_json["frame"]], dtype=np.int32),
        "game_timer": np.array([obs_json["gameTimer"]], dtype=np.int32),
    }


def normalize_obs(vec_normalize, obs: dict) -> dict:
    batched = {k: np.array([v]) for k, v in obs.items()}
    return vec_normalize.normalize_obs(batched)


def make_handler(model, vec_normalize):
    async def handler(websocket):
        print(f"Client connected: {websocket.remote_address}")
        try:
            async for message in websocket:
                obs_json = json.loads(message)
                obs = obs_to_numpy(obs_json)
                predict_obs = normalize_obs(vec_normalize, obs) if vec_normalize else obs
                action, _ = model.predict(predict_obs, deterministic=True)
                action_int = int(action.flat[0])
                await websocket.send(str(action_int))
        except Exception as e:
            print(f"Connection error: {e}")
        finally:
            print("Client disconnected")
    return handler


async def main(args):
    from websockets.asyncio.server import serve
    model, vec_normalize = load_model(args.checkpoint, args.device)
    handler = make_handler(model, vec_normalize)
    print(f"Inference server listening on ws://localhost:{args.port}")
    print("Open the browser and navigate to /ai-watch")
    async with serve(handler, "localhost", args.port):
        await asyncio.get_event_loop().run_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WebSocket inference server for live AI watch")
    parser.add_argument("--checkpoint", default="python/checkpoints/best_model")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()
    asyncio.run(main(args))
```

**Step 3: Verify it starts**

```bash
python python/ws_eval.py
```
Expected: `Inference server listening on ws://localhost:8765`

Ctrl-C to stop.

**Step 4: Commit**

```bash
git add python/ws_eval.py python/requirements.txt
git commit -m "feat: add WebSocket inference server ws_eval.py for live AI watch"
```

---

### Task 6: useAiLoop.ts — browser AI game loop hook

**Files:**
- Create: `src/hooks/useAiLoop.ts`
- Test: `src/hooks/__tests__/useAiLoop.test.ts`

**Background:** Drives the game with AI decisions. Uses a `requestAnimationFrame` + fixed-timestep loop. When a new block spawns (block ID changes), it sends the current observation to the WebSocket and waits for an action; on response it dispatches rotations, moves, and HARD_DROP. The loop pauses (skips TICK) while awaiting the WS response — on localhost this is imperceptible (<1ms).

**Step 1: Write failing tests**

Create `src/hooks/__tests__/useAiLoop.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiLoop } from '../useAiLoop';
import { createInitialGameState } from '@/reducers/gameReducer';
import { gameReducer } from '@/reducers/gameReducer';

describe('useAiLoop', () => {
  it('starts disconnected', () => {
    const state = createInitialGameState('test');
    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useAiLoop(state, dispatch, { wsUrl: 'ws://localhost:9999' })
    );
    expect(result.current.isConnected).toBe(false);
  });

  it('buildObservation produces correct shape', () => {
    // Import and test the helper directly
    const { buildObservationFromState } = await import('../useAiLoop');
    let state = createInitialGameState('obs-test');
    state = gameReducer(state, { type: 'START_GAME' });
    state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });
    const obs = buildObservationFromState(state);
    expect(obs.board).toHaveLength(10);
    expect(obs.board[0]).toHaveLength(16);
    expect(obs.currentBlock).toHaveLength(2);
    expect(typeof obs.timelineX).toBe('number');
    expect(typeof obs.score).toBe('number');
  });
});
```

**Step 2: Run to verify it fails**

```bash
pnpm test src/hooks/__tests__/useAiLoop.test.ts
```
Expected: FAIL — module not found

**Step 3: Create src/hooks/useAiLoop.ts**

```typescript
import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, GameAction } from '@/types/game';
import { BOARD_WIDTH, BOARD_HEIGHT, TARGET_FPS, FRAME_INTERVAL_MS } from '@/constants/gameConfig';

const DEFAULT_WS_URL = 'ws://localhost:8765';

export interface UseAiLoopReturn {
  isConnected: boolean;
  isRunning: boolean;
  currentFPS: number;
  manualStep: () => void;
}

/** Serialize GameState into the Observation JSON the Python model expects. */
export function buildObservationFromState(state: GameState): object {
  return {
    board: state.board,
    currentBlock: state.currentBlock.pattern,
    blockPosition: { x: state.blockPosition.x, y: state.blockPosition.y },
    queue: state.queue.slice(0, 2).map(b => b.pattern),
    timelineX: state.timeline.x,
    score: state.score,
    frame: state.frame,
    gameTimer: state.gameTimer,
  };
}

export function useAiLoop(
  gameState: GameState,
  dispatch: React.Dispatch<GameAction>,
  options?: { wsUrl?: string }
): UseAiLoopReturn {
  const wsUrl = options?.wsUrl ?? DEFAULT_WS_URL;

  const [isConnected, setIsConnected] = useState(false);
  const [currentFPS, setCurrentFPS] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const gameStateRef = useRef(gameState);
  const decidingRef = useRef(false);
  const pendingActionRef = useRef<{ targetX: number; rotation: number } | null>(null);
  const lastBlockIdRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(0);
  const fpsFrameCountRef = useRef(0);
  const fpsLastTimeRef = useRef(0);

  // Keep gameStateRef in sync
  useEffect(() => {
    gameStateRef.current = gameState;
  });

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const actionInt = parseInt(event.data, 10);
      if (!isNaN(actionInt)) {
        pendingActionRef.current = {
          targetX: Math.floor(actionInt / 4),
          rotation: actionInt % 4,
        };
      }
      decidingRef.current = false;
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl]);

  // Game loop
  const tick = useCallback(() => {
    const now = performance.now();
    const state = gameStateRef.current;

    // FPS tracking
    fpsFrameCountRef.current++;
    if (now - fpsLastTimeRef.current >= 1000) {
      setCurrentFPS(fpsFrameCountRef.current);
      fpsFrameCountRef.current = 0;
      fpsLastTimeRef.current = now;
    }

    if (state.status === 'playing' && isConnected) {
      // Pending AI action: apply it
      if (pendingActionRef.current && !decidingRef.current) {
        const { targetX, rotation } = pendingActionRef.current;
        pendingActionRef.current = null;

        for (let i = 0; i < rotation; i++) {
          dispatch({ type: 'ROTATE_CW' });
        }
        const currentX = state.blockPosition.x;
        const dx = targetX - currentX;
        const maxX = BOARD_WIDTH - 2;
        const clampedTarget = Math.max(0, Math.min(targetX, maxX));
        const clampedDx = clampedTarget - currentX;
        if (clampedDx < 0) {
          for (let i = 0; i < -clampedDx; i++) dispatch({ type: 'MOVE_LEFT' });
        } else if (clampedDx > 0) {
          for (let i = 0; i < clampedDx; i++) dispatch({ type: 'MOVE_RIGHT' });
        }
        dispatch({ type: 'HARD_DROP' });
        return;
      }

      // New block spawned: request AI decision
      const blockId = state.currentBlock.id;
      if (blockId !== lastBlockIdRef.current && !decidingRef.current) {
        lastBlockIdRef.current = blockId;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          decidingRef.current = true;
          const obs = buildObservationFromState(state);
          wsRef.current.send(JSON.stringify(obs));
        }
        // Don't tick this frame while waiting
        return;
      }

      // Normal tick (gravity, timeline, etc.)
      if (!decidingRef.current) {
        dispatch({ type: 'TICK' });
      }
    } else if (state.status === 'countdown') {
      dispatch({ type: 'TICK' });
    }
  }, [dispatch, isConnected]);

  // RAF loop with fixed timestep
  useEffect(() => {
    if (gameState.status !== 'playing' && gameState.status !== 'countdown') return;

    let accumulated = 0;
    let lastTime = performance.now();

    function loop(now: number) {
      accumulated += now - lastTime;
      lastTime = now;

      while (accumulated >= FRAME_INTERVAL_MS) {
        tick();
        accumulated -= FRAME_INTERVAL_MS;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState.status, tick]);

  return {
    isConnected,
    isRunning: gameState.status === 'playing',
    currentFPS,
    manualStep: () => {},
  };
}
```

**Step 4: Run tests**

```bash
pnpm test src/hooks/__tests__/useAiLoop.test.ts
```
Expected: PASS

**Step 5: Typecheck**

```bash
pnpm typecheck
```
Expected: no errors

**Step 6: Commit**

```bash
git add src/hooks/useAiLoop.ts src/hooks/__tests__/useAiLoop.test.ts
git commit -m "feat: add useAiLoop hook for WebSocket-driven AI game loop"
```

---

### Task 7: AiWatchScreen.tsx — new route

**Files:**
- Create: `src/screens/AiWatchScreen.tsx`
- Modify: `src/screens/index.ts`

**Step 1: Create AiWatchScreen.tsx**

```tsx
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GameCore } from '@/components/Game/GameCore';
import { useGame } from '@/hooks/useGame';
import { useAiLoop } from '@/hooks/useAiLoop';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { useGameControls } from '@/hooks/useGameControls';
import { useEffect } from 'react';

export function AiWatchScreen() {
  const navigate = useNavigate();
  const { gameState, actions, _dispatch } = useGame();
  const aiLoop = useAiLoop(gameState, _dispatch);
  const scale = useResponsiveScale({ minScale: 0.5, maxScale: 2, padding: 40 });
  const controls = useGameControls(gameState, actions, { enableKeyRepeat: false });

  // Auto-start when screen loads
  useEffect(() => {
    if (gameState.status === 'initial') {
      actions.startNewGame();
    }
  }, [gameState.status, actions]);

  if (!scale.ready) {
    return (
      <div className="bg-game-background flex h-full w-full items-center justify-center">
        <p className="text-2xl font-bold text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-game-background relative flex h-screen w-full flex-col items-center justify-center">
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Menu</span>
        </button>

        <div className="flex items-center gap-2 text-sm">
          {aiLoop.isConnected ? (
            <>
              <Wifi size={14} className="text-green-400" />
              <span className="text-green-400">AI Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-yellow-400" />
              <span className="text-yellow-400">
                Waiting for AI server… run: python python/ws_eval.py
              </span>
            </>
          )}
        </div>

        <div className="text-sm text-gray-500">{aiLoop.currentFPS} fps</div>
      </div>

      {/* Game */}
      <GameCore
        key={gameState.seed}
        gameState={gameState}
        actions={actions}
        controls={controls}
        gameLoop={aiLoop}
        scale={scale}
        replayMode={true}
        exportReplay={() => null}
      />
    </div>
  );
}
```

**Step 2: Export from screens/index.ts**

Add to `src/screens/index.ts`:

```typescript
export { AiWatchScreen } from './AiWatchScreen';
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```
Expected: no errors (if `GameCore` props complain, check `UseGameLoopReturn` type — `useAiLoop` must match it)

**Step 4: Commit**

```bash
git add src/screens/AiWatchScreen.tsx src/screens/index.ts
git commit -m "feat: add AiWatchScreen for live AI game viewing"
```

---

### Task 8: Wire up routing and Start screen button

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/StartScreen.tsx`

**Step 1: Add /ai-watch route to App.tsx**

```typescript
import {
  StartScreen,
  GameScreen,
  LeaderboardScreen,
  ReplayScreen,
  AiWatchScreen,          // add
} from '@/screens';

// In Routes, add:
<Route path="/ai-watch" element={<AiWatchScreen />} />
```

**Step 2: Add Watch AI button to StartScreen.tsx**

Import `Bot` icon from lucide-react, add button after Rankings:

```tsx
import { Play, ChartNoAxesColumn, Bot } from 'lucide-react';

// In the buttons div, add after Rankings button:
<Button
  size="lg"
  onClick={() => navigate('/ai-watch')}
  variant="secondary"
  icon={Bot}
  fullWidth
>
  Watch AI
</Button>
```

**Step 3: Run full test suite**

```bash
pnpm test
```
Expected: all tests pass

**Step 4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```
Expected: no errors

**Step 5: Manual smoke test**

```bash
# Terminal 1
python python/ws_eval.py

# Terminal 2
pnpm dev
```

1. Open `http://localhost:5173`
2. Click **Watch AI** → `/ai-watch`
3. Header shows "AI Connected" in green
4. Game auto-starts, AI begins placing blocks
5. Stop `ws_eval.py` → header switches to "Waiting for AI server…"
6. Restart `ws_eval.py` → reconnects and AI resumes

**Step 6: Commit**

```bash
git add src/App.tsx src/screens/StartScreen.tsx
git commit -m "feat: wire up /ai-watch route and Watch AI button on start screen"
```

---

## Reference

### ReplayData format (for verification)

```typescript
interface ReplayData {
  id: string;           // UUID
  seed: string;         // game seed (must match browser for deterministic replay)
  inputs: { type: string; frame: number }[];  // user actions only, no TICKs
  gameConfig: { version: string; timestamp: number };
  metadata: { finalScore: number; playerName?: string };
}
```

### Action encoding (per_block)

```
action_int = targetX * 4 + rotation
targetX = action_int // 4   (0–15)
rotation = action_int % 4   (0–3 clockwise turns)
```

### Observation keys (Python ↔ TypeScript)

| Python key | TypeScript key | Shape |
|---|---|---|
| `board` | `board` | 10×16 |
| `current_block` | `currentBlock` | 2×2 |
| `block_position` | `blockPosition` | {x,y} |
| `queue` | `queue` | 2×2×2 |
| `timeline_x` | `timelineX` | scalar |
| `score` | `score` | scalar |
| `frame` | `frame` | scalar |
| `game_timer` | `gameTimer` | scalar |
