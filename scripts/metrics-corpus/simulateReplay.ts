import { TARGET_FPS, TIMER_CONFIG } from '@/constants/gameConfig';
import { createInitialGameState, gameReducer } from '@/reducers/gameReducer';
import type { Block, GameAction, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPayout } from '@/utils/placementMetrics';
import {
  expandReplayDataWithSnapshots,
  getReplayBlockQueue,
} from '@/utils/replayUtils';

export interface DropContext {
  pre: GameState;
  post: GameState;
  chosenX: number;
  block: Block;
}

export interface PayoutContext {
  pre: GameState;
  post: GameState;
}

export interface SimulateHandlers {
  onDrop?: (ctx: DropContext) => void;
  onPayout?: (ctx: PayoutContext) => void;
}

/**
 * Drive the real gameReducer through a replay and call hooks on each hard drop
 * and each payout. Returns the final state. Single source of replay simulation
 * for the corpus runner.
 *
 * This faithfully mirrors how the live player (`useReplayPlayer`) advances, so
 * v1 (RNG-reconstructed) replays reproduce their recorded score exactly:
 *   1. TICK through the countdown (do NOT use SKIP_COUNTDOWN — the live player
 *      ticks the countdown, and recorded input frames are indexed from the
 *      first *playing* frame).
 *   2. Run the full game DURATION (totalFrames from metadata.duration), not
 *      just up to the last recorded input — otherwise the final seconds of
 *      timeline sweeps/payouts are missed.
 * Frames past the last recorded input simply have no user actions (TICK only).
 */
export function simulateReplay(
  replay: ReplayData,
  handlers: SimulateHandlers
): GameState {
  const expanded = expandReplayDataWithSnapshots(replay);
  const { frameActions } = expanded;
  const recordedBlockQueue = getReplayBlockQueue(replay);

  const durationMs =
    replay.metadata.duration ?? TIMER_CONFIG.GAME_DURATION_SECONDS * 1000;
  const totalFrames = Math.ceil((durationMs * TARGET_FPS) / 1000);

  let state: GameState = createInitialGameState(
    replay.seed,
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

  for (let frame = 0; frame < totalFrames; frame++) {
    const frameData = frameActions[frame];
    if (frameData) {
      for (const action of frameData.userActions as GameAction[]) {
        if (action.type === 'HARD_DROP') {
          const pre = state;
          state = gameReducer(state, action);
          handlers.onDrop?.({
            pre,
            post: state,
            chosenX: pre.blockPosition.x,
            block: pre.currentBlock,
          });
        } else {
          state = gameReducer(state, action);
        }
      }
    }
    const preTick = state;
    state = gameReducer(state, { type: 'TICK' });
    if (detectPayout(preTick, state).payout) {
      handlers.onPayout?.({ pre: preTick, post: state });
    }
  }

  return state;
}
