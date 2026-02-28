# Headless Lumines Environment — Design Decisions

**Date:** 2026-02-24
**Status:** Implemented
**Files:** `src/ai/LuminesEnv.ts`, `src/ai/index.ts`

---

## 1. Per-Block vs Per-Frame Granularity

### Decision: Per-block as the default

The environment supports two step modes. Per-block (`'per_block'`) is the default.

### Rationale

**Credit assignment.** In per-frame mode an episode lasts ~3,600 steps (60 s × 60 FPS). The reward signal (score from timeline sweeps) arrives tens of seconds after the block placement that caused it. This long credit-assignment horizon makes it difficult for RL algorithms to associate a good placement decision with the eventual reward.

In per-block mode each episode is ~40–100 decisions. Each `step()` call covers exactly one block placement, and reward is computed as the score delta across that placement window. The credit gap shrinks from hundreds of frames to a handful.

**Mirrors established puzzle-game RL research.** All high-performing Tetris agents (DQN, MCTS, ES) operate at piece-placement granularity, not frame granularity. The per-block abstraction is the standard for this problem class.

**Timeline sweep consideration.** Lumines scoring is deferred: cleared cells accumulate in `timeline.holdingScore` and are converted to points as the timeline sweeps left-to-right. In real gameplay a player places 5–8 blocks per full timeline sweep. The Python `LuminesEnvNative` simulates this by advancing the timeline a fixed number of ticks after each hard drop (`ticks_per_block = BOARD_WIDTH × SWEEP_INTERVAL ÷ blocks_per_sweep`, default 40 ticks / ~2–3 columns per block). This means:

- Patterns near the current timeline position are cleared within the same step.
- Patterns well ahead of the sweep are cleared in a later step, matching how a human player experiences the game.
- The agent learns to build patterns *ahead of* the sweep rather than just reacting immediately.

`blocks_per_sweep` (default 6) is a constructor parameter that controls pacing. See `docs/2026-02-24-rl-agent-design.md §1a` for details.

**Per-frame mode** is retained for completeness: it enables research into direct policy gradient approaches where frame-level micro-control matters, or for behavioural cloning from human replays.

---

## 2. Action Space

### Per-block mode

```typescript
interface BlockAction {
  targetX: number;       // 0–15, target column for left edge (clamped to valid range)
  rotation: 0 | 1 | 2 | 3;  // 0=original, 1=CW 90°, 2=180°, 3=CCW 90°
}
```

**Size:** 16 × 4 = 64 discrete actions.

**Execution model:** The environment applies rotations first (dispatching `ROTATE_CW` n times), then moves horizontally (dispatching `MOVE_LEFT`/`MOVE_RIGHT`), then hard-drops. This mirrors the optimal human strategy and guarantees the block reaches the intended column regardless of current position.

**Clamping:** If `targetX` would place the block out of bounds, it is silently clamped to `[0, BOARD_WIDTH − 2]`. Rotations that are invalid at the current position are ignored by the underlying game engine (the state remains unchanged).

### Per-frame mode

```typescript
type FrameAction =
  | 'MOVE_LEFT' | 'MOVE_RIGHT'
  | 'ROTATE_CW' | 'ROTATE_CCW'
  | 'SOFT_DROP' | 'HARD_DROP'
  | 'NO_OP';
```

**Size:** 7 discrete actions. One action is applied, then one `TICK` is dispatched.

---

## 3. Observation Space

| Field | Shape | dtype | Notes |
|-------|-------|-------|-------|
| `board` | `[10][16]` | int | 0=empty, 1=light, 2=dark |
| `currentBlock` | `[2][2]` | int | Current falling piece pattern |
| `blockPosition` | `{x, y}` | int | Top-left corner; y can be negative |
| `queue` | `[2][2][2]` | int | Next 2 blocks |
| `timelineX` | scalar | int | Current sweep column (0–15) |
| `score` | scalar | int | Cumulative score |
| `frame` | scalar | int | Absolute frame count since game start |
| `gameTimer` | scalar | int | Frames remaining (3600 → 0) |

**Board encoding:** The board matrix matches `GameState.board` directly (row-major, `board[row][col]`). Row 0 is the top of the screen.

**Queue depth:** Two blocks are exposed. The full queue has three entries internally; the third is excluded to keep the observation compact. Agents may benefit from the full three if needed — adjust `queue: s.queue.slice(0, 3)`.

**Timeline position as feature:** `timelineX` is critical signal. Placing light-colored patterns to the right of the timeline maximises the time before they are swept, giving the agent more opportunity to extend patterns before scoring is triggered. Agents that learn to use `timelineX` should outperform those that ignore it.

---

## 4. Reward Design

The Python `LuminesEnvNative` uses a shaped reward designed around the combo
mechanic. See `docs/2026-02-24-rl-agent-design.md §4` for the full formula.

**Summary (per_block mode, PPO_30+):**

```
reward = score_delta                         # actual combo payoff from timeline sweep
       + single_color_chain_delta × 0.1     # delta in longest same-color chain (can be negative)
       + post_sweep_chain × 0.05            # same-color chain after sweep + gravity settle
       + death                               # -3.0 on game over, else 0
```

**Rationale:**
- `score_delta` is the primary objective — directly tied to game score.
- `single_color_chain_delta` is a color-aware delta signal: rewards placements that extend the dominant single-color chain; penalises those that fragment it. Unlike earlier runs, it can go negative, making the gradient signal directional.
- `post_sweep_chain` rewards leaving a clean same-color residue after a sweep — encouraging the alternating-combo strategy central to Lumines.
- No flat survival bonus — the agent must score to maximise return.

See `docs/2026-02-24-rl-agent-design.md §5` for full formula and design rationale history.

---

## 5. Game Initialization

```
createInitialGameState(seed)   →  status: 'initial'
gameReducer(s, START_GAME)     →  status: 'countdown'
gameReducer(s, SKIP_COUNTDOWN) →  status: 'playing'
```

`SKIP_COUNTDOWN` is used instead of ticking through 90 countdown frames. This avoids wasting compute on non-playable frames and makes `reset()` instantaneous.

---

## 6. Determinism Guarantee

Two `LuminesEnv` instances constructed with the same `seed` and driven with the same sequence of actions will produce identical `observation`, `reward`, and `done` sequences. This holds because:

1. `gameReducer` is a pure function with no side effects.
2. `SeededRNG` is deterministic for a given seed (call-count-based state).
3. All positions are integer-valued — no floating-point accumulation.

Verification:

```typescript
const env1 = new LuminesEnv({ seed: 'abc' });
const env2 = new LuminesEnv({ seed: 'abc' });
env1.reset(); env2.reset();
const r1 = env1.step({ targetX: 7, rotation: 0 });
const r2 = env2.step({ targetX: 7, rotation: 0 });
assert(r1.reward === r2.reward && r1.done === r2.done);
```

---

## 7. Usage Example

```typescript
import { LuminesEnv } from '@/ai';

const env = new LuminesEnv({ seed: 'test-123' });
let obs = env.reset();

for (let i = 0; i < 10; i++) {
  const result = env.step({ targetX: 7, rotation: 0 });
  console.log(env.render());
  console.log('reward:', result.reward, 'done:', result.done);
  if (result.done) break;
}
```
