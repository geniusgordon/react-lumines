/**
 * LuminesEnv — Headless Lumines game environment for AI/ML training
 *
 * Exposes a Gymnasium-style interface:
 *   env.reset()        → initial Observation
 *   env.step(action)   → { observation, reward, done, info }
 *   env.render()       → ASCII board string
 *   env.getState()     → raw GameState
 *
 * Two step modes:
 *   'per_block' (default) — agent picks final placement each block spawn
 *   'per_frame'           — agent sends one discrete input per tick
 */

import { gameReducer } from '@/reducers/gameReducer';
import { createInitialGameState } from '@/reducers/gameState/initialState';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/gameConfig';
import type { GameState } from '@/types/game';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type StepMode = 'per_block' | 'per_frame';

/** Per-block action: agent specifies the desired final placement of the block. */
export interface BlockAction {
  /** Target column for the left edge of the block (0–15). Clamped to valid range. */
  targetX: number;
  /** Clockwise rotation count: 0=original, 1=CW 90°, 2=180°, 3=CCW 90°. */
  rotation: 0 | 1 | 2 | 3;
}

/** Per-frame action: one discrete input per tick. */
export type FrameAction =
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'ROTATE_CW'
  | 'ROTATE_CCW'
  | 'SOFT_DROP'
  | 'HARD_DROP'
  | 'NO_OP';

export interface Observation {
  /** 10×16 board: 0=empty, 1=light, 2=dark */
  board: number[][];
  /** 2×2 pattern of the current falling block */
  currentBlock: number[][];
  /** Top-left position of the current block (y can be negative = above board) */
  blockPosition: { x: number; y: number };
  /** Next 2 blocks in queue, each 2×2 */
  queue: number[][][];
  /** Current timeline sweep column (0–15) */
  timelineX: number;
  score: number;
  frame: number;
  /** Frames remaining until game ends (starts at 3600) */
  gameTimer: number;
}

export interface StepResult {
  observation: Observation;
  /** Score delta since the last step */
  reward: number;
  /** true when status === 'gameOver' */
  done: boolean;
  info: {
    finalScore: number;
    framesElapsed: number;
    blocksPlaced: number;
  };
}

// ---------------------------------------------------------------------------
// LuminesEnv
// ---------------------------------------------------------------------------

export class LuminesEnv {
  private state: GameState;
  private readonly mode: StepMode;
  private seed: string;
  private blocksPlaced: number = 0;

  constructor(options?: { mode?: StepMode; seed?: string }) {
    this.mode = options?.mode ?? 'per_block';
    this.seed = options?.seed ?? Date.now().toString();
    this.state = this.initState(this.seed);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start a new episode. Optionally pass a new seed.
   * Returns the initial observation at the first playable frame.
   */
  reset(seed?: string): Observation {
    if (seed !== undefined) this.seed = seed;
    this.state = this.initState(this.seed);
    this.blocksPlaced = 0;
    return this.buildObservation();
  }

  /**
   * Advance the environment by one step.
   *
   * In 'per_block' mode: action must be a BlockAction.
   * In 'per_frame' mode: action must be a FrameAction string.
   */
  step(action: BlockAction | FrameAction): StepResult {
    if (this.state.status === 'gameOver') {
      // No-op after game over — caller should reset()
      return {
        observation: this.buildObservation(),
        reward: 0,
        done: true,
        info: this.buildInfo(),
      };
    }

    if (this.mode === 'per_block') {
      return this.stepPerBlock(action as BlockAction);
    } else {
      return this.stepPerFrame(action as FrameAction);
    }
  }

  /**
   * Render an ASCII representation of the current board state.
   * Useful for debugging in terminal or notebooks.
   */
  render(): string {
    const s = this.state;
    const lines: string[] = [];

    // Build display grid (copy of board)
    const display: number[][] = s.board.map(row => [...row]);

    // Overlay current block (values 3=current-light, 4=current-dark)
    const { x: bx, y: by } = s.blockPosition;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const col = bx + dx;
        const row = by + dy;
        if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
          const cell = s.currentBlock.pattern[dy][dx];
          if (cell !== 0) display[row][col] = cell === 1 ? 3 : 4;
        }
      }
    }

    // Column header
    lines.push('   ' + '0123456789012345');
    lines.push('  +' + '-'.repeat(BOARD_WIDTH) + '+');

    for (let row = 0; row < BOARD_HEIGHT; row++) {
      const rowStr = display[row]
        .map((c, col) => {
          if (col === s.timeline.x) {
            // Timeline column indicator (overrides cell rendering)
            if (c === 0) return '|';
            if (c === 1 || c === 3) return 'I';
            return 'i';
          }
          if (c === 0) return '.';
          if (c === 1) return '□';
          if (c === 2) return '■';
          if (c === 3) return 'o'; // current block (light)
          return 'x'; // current block (dark)
        })
        .join('');
      lines.push(`${String(row).padStart(2)}|${rowStr}|`);
    }

    lines.push('  +' + '-'.repeat(BOARD_WIDTH) + '+');
    lines.push(
      `  Timeline: col ${s.timeline.x}  Score: ${s.score}  Frame: ${s.frame}  Timer: ${s.gameTimer}  Blocks: ${this.blocksPlaced}`
    );

    return lines.join('\n');
  }

  /** Direct access to the raw GameState — read-only by convention. */
  getState(): GameState {
    return this.state;
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  private initState(seed: string): GameState {
    let s = createInitialGameState(seed);
    // Transition: initial → countdown
    s = gameReducer(s, { type: 'START_GAME' });
    // Skip the 90-frame countdown immediately
    s = gameReducer(s, { type: 'SKIP_COUNTDOWN' });
    return s;
  }

  // -------------------------------------------------------------------------
  // Per-block step
  // -------------------------------------------------------------------------

  private stepPerBlock(action: BlockAction): StepResult {
    const prevScore = this.state.score;
    const prevBlockId = this.state.currentBlock.id;

    // Clamp targetX: block is 2 cells wide, so max left edge = BOARD_WIDTH - 2
    const maxX = BOARD_WIDTH - 2;
    const targetX = Math.max(0, Math.min(action.targetX, maxX));

    // 1. Apply rotations (0–3 clockwise turns)
    const rotations = ((action.rotation % 4) + 4) % 4;
    for (let i = 0; i < rotations; i++) {
      this.state = gameReducer(this.state, { type: 'ROTATE_CW' });
    }

    // 2. Move horizontally to targetX (respect walls and existing blocks)
    const dx = targetX - this.state.blockPosition.x;
    if (dx < 0) {
      for (let i = 0; i < -dx; i++) {
        const prevX = this.state.blockPosition.x;
        this.state = gameReducer(this.state, { type: 'MOVE_LEFT' });
        if (this.state.blockPosition.x === prevX) break; // wall/block collision
      }
    } else if (dx > 0) {
      for (let i = 0; i < dx; i++) {
        const prevX = this.state.blockPosition.x;
        this.state = gameReducer(this.state, { type: 'MOVE_RIGHT' });
        if (this.state.blockPosition.x === prevX) break;
      }
    }

    // 3. Hard drop — places block instantly, spawns next block (or sets gameOver)
    this.state = gameReducer(this.state, { type: 'HARD_DROP' });

    // 4. Safety loop: tick until the new block has spawned or game ends.
    //    In practice, HARD_DROP already triggers block spawn, so this is a
    //    no-op for normal play but guards edge cases.
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
    };
  }

  // -------------------------------------------------------------------------
  // Per-frame step
  // -------------------------------------------------------------------------

  private stepPerFrame(action: FrameAction): StepResult {
    const prevScore = this.state.score;

    // Dispatch the requested action (except NO_OP)
    type DirectActionType =
      | 'MOVE_LEFT'
      | 'MOVE_RIGHT'
      | 'ROTATE_CW'
      | 'ROTATE_CCW'
      | 'SOFT_DROP'
      | 'HARD_DROP';

    const directActions: Record<string, DirectActionType | null> = {
      MOVE_LEFT: 'MOVE_LEFT',
      MOVE_RIGHT: 'MOVE_RIGHT',
      ROTATE_CW: 'ROTATE_CW',
      ROTATE_CCW: 'ROTATE_CCW',
      SOFT_DROP: 'SOFT_DROP',
      HARD_DROP: 'HARD_DROP',
      NO_OP: null,
    };

    const actionType = directActions[action];
    if (actionType !== null) {
      this.state = gameReducer(this.state, { type: actionType });
    }

    // Always tick one frame
    this.state = gameReducer(this.state, { type: 'TICK' });

    return {
      observation: this.buildObservation(),
      reward: this.state.score - prevScore,
      done: this.state.status === 'gameOver',
      info: this.buildInfo(),
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private buildObservation(): Observation {
    const s = this.state;
    return {
      board: s.board as number[][],
      currentBlock: s.currentBlock.pattern as number[][],
      blockPosition: { x: s.blockPosition.x, y: s.blockPosition.y },
      // Expose next 2 blocks from queue
      queue: s.queue.slice(0, 2).map(b => b.pattern as number[][]),
      timelineX: s.timeline.x,
      score: s.score,
      frame: s.frame,
      gameTimer: s.gameTimer,
    };
  }

  private buildInfo(): StepResult['info'] {
    return {
      finalScore: this.state.score,
      framesElapsed: this.state.frame,
      blocksPlaced: this.blocksPlaced,
    };
  }
}
