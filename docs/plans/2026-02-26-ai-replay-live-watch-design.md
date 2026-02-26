# AI Replay & Live Watch Design

Date: 2026-02-26

## Goal

Two ways to watch the trained PPO agent play Lumines in the browser:

- **B — Replay**: run eval, save a replay JSON, import into browser via existing replay system
- **A — Live Watch**: run a WebSocket inference server, browser streams obs/actions in real-time

## Background

- The PPO model was trained on `LuminesEnvNative` (Python game engine).
- The browser uses the TypeScript game engine (npm `random-seed`).
- The RNG sequences differ between Python and TypeScript environments.
- However, the agent's observation contains only board state, current block, and next 2 blocks — no RNG state. The agent is fully reactive and generalises across block sequences. The mismatch is irrelevant.
- For replay (B), eval must run with `--no-native` so the TypeScript env generates the same block sequence as the browser game, enabling deterministic replay.

## Approach B — Record Replay

### Data Flow

```
python eval.py --save-replay out.json --no-native --episodes 1
  → spawns: tsx env-server.ts --mode per_block --record-replay out.json
      LuminesEnv.ts.stepPerBlock() captures each dispatched action + frame
      env-server.ts accumulates inputs; on close writes ReplayData JSON
browser: Leaderboard → Import File → /replays/:id
```

### Changes

**`src/ai/LuminesEnv.ts`**
- Add `appliedInputs: { type: string; frame: number }[]` to `StepResult`.
- In `stepPerBlock`, record each `gameReducer` dispatch (ROTATE_CW, MOVE_LEFT/RIGHT, HARD_DROP) with the current `this.state.frame` before ticking.

**`src/ai/env-server.ts`**
- Add `--record-replay <path>` CLI flag.
- Collect `appliedInputs` from each step response.
- Record seed from the `reset` command.
- On `close`, write a valid `ReplayData` JSON to the given path.

**`python/lumines_env.py`**
- Add `record_replay_path: Optional[str]` constructor param.
- Pass `--record-replay <path>` to subprocess args when set.

**`python/eval.py`**
- Add `--save-replay <path>` flag.
- When specified: force `--no-native`, pass path to `LuminesEnv`, limit to 1 episode.

**Browser** — no changes needed; `ReplayImport` in Leaderboard already supports file import.

### Usage

```bash
python python/eval.py --save-replay /tmp/ai-game.json --no-native --episodes 1
# browser → Leaderboard → Import File → /tmp/ai-game.json → watch replay
```

## Approach A — Live WebSocket Watch

### Data Flow

```
python python/ws_eval.py
  loads PPO checkpoint + VecNormalize stats
  starts WebSocket server on ws://localhost:8765
  loop: receive obs JSON → normalize → model.predict() → send action_int

browser /ai-watch
  useGame (TS game engine + rendering)
  useAiLoop: after each block spawn:
    serialize obs → send to WS → receive action_int
    dispatch: N×ROTATE_CW + N×MOVE_LEFT/RIGHT + HARD_DROP
    tick until next block spawns
```

### Changes

**`python/ws_eval.py`** (new)
- Load PPO checkpoint and VecNormalize stats.
- Start WebSocket server on port 8765 (websockets library).
- Per message: parse obs JSON, numpy-convert, normalize, `model.predict()`, send `action_int`.
- Single-client; logs each action and score.

**`src/hooks/useAiLoop.ts`** (new)
- Manages WebSocket connection to `ws://localhost:8765`.
- Exposes `isConnected` state.
- After each new block spawn (detected by block ID change), builds observation from `GameState`, sends JSON, awaits response, dispatches the decoded action (rotations + moves + hard drop).
- Drives game ticks via `requestAnimationFrame` with fixed timestep.

**`src/screens/AiWatchScreen.tsx`** (new)
- Route: `/ai-watch`.
- Uses `useGame` for game state.
- Uses `useAiLoop` for AI control.
- Renders the existing `<Game>` component in replay/display mode.
- Shows connection status badge (Connected / Waiting…).

**`src/App.tsx`** — add `/ai-watch` route.

**`src/screens/StartScreen.tsx`** — add "Watch AI" button linking to `/ai-watch`.

### Usage

```bash
python python/ws_eval.py           # terminal 1: starts inference server
pnpm dev                           # terminal 2: start dev server
# browser → / → Watch AI
```

## Implementation Order

1. **B first**: enables watching replays immediately; validates the replay recording pipeline.
2. **A second**: builds on B's understanding; adds live streaming on top.
