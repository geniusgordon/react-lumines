import { TARGET_FPS } from '@/constants/gameConfig';
import { createInitialGameState, gameReducer } from '@/reducers/gameReducer';
import type { GameAction, GameState } from '@/types/game';
import type { FrameActions } from '@/types/replay';

export interface ReplaySimHooks {
  /** Called once after the countdown, before the first frame. */
  onStart?: (state: GameState) => void;
  /** Called for each HARD_DROP, with the state just before and just after it. */
  onHardDrop?: (pre: GameState, post: GameState, frame: number) => void;
  /** Called every frame after its TICK, with the pre-tick and post-tick state. */
  onFrame?: (preTick: GameState, post: GameState, frame: number) => void;
}

/**
 * Total frames to simulate: the recorded game duration when known, else fall
 * back to the frame-action span. Real replays carry metadata.duration (=> full
 * game); tiny synthetic test replays without a duration keep legacy behaviour.
 */
export function replayTotalFrames(
  durationMs: number | undefined,
  frameCount: number
): number {
  return durationMs ? Math.ceil((durationMs * TARGET_FPS) / 1000) : frameCount;
}

/**
 * Single source of replay simulation. Mirrors the live useReplayPlayer:
 * ticks through the countdown, then runs `totalFrames` frames applying each
 * frame's recorded user actions followed by one TICK. Frames past the last
 * recorded input simply have no user actions. Returns the final state.
 */
export function driveReplay(
  seed: string,
  frameActions: FrameActions[],
  totalFrames: number,
  recordedBlockQueue: number[] | null,
  hooks: ReplaySimHooks = {}
): GameState {
  let state: GameState = createInitialGameState(
    seed,
    false,
    'normal',
    recordedBlockQueue
  );
  state = gameReducer(state, { type: 'START_GAME' });

  // Tick through the countdown exactly as the live player does.
  let guard = 0;
  while (state.status === 'countdown' && guard < totalFrames + TARGET_FPS) {
    state = gameReducer(state, { type: 'TICK' });
    guard += 1;
  }

  hooks.onStart?.(state);

  for (let frame = 0; frame < totalFrames; frame++) {
    const frameData = frameActions[frame];
    if (frameData) {
      for (const action of frameData.userActions as GameAction[]) {
        if (action.type === 'HARD_DROP') {
          const pre = state;
          state = gameReducer(state, action);
          hooks.onHardDrop?.(pre, state, frame);
        } else {
          state = gameReducer(state, action);
        }
      }
    }
    const preTick = state;
    state = gameReducer(state, { type: 'TICK' });
    hooks.onFrame?.(preTick, state, frame);
  }

  return state;
}
