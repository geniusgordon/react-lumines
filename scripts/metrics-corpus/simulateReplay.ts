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
 * Drive the real gameReducer through a replay (mirrors the simulation loop in
 * scripts/replay-notation/notation.ts) and call hooks on each hard drop and
 * each payout. Returns the final state. Single source of replay simulation for
 * the corpus runner.
 */
export function simulateReplay(
  replay: ReplayData,
  handlers: SimulateHandlers
): GameState {
  const expanded = expandReplayDataWithSnapshots(replay);
  const recordedBlockQueue = getReplayBlockQueue(replay);

  let state: GameState = createInitialGameState(
    replay.seed,
    false,
    'normal',
    recordedBlockQueue
  );
  state = gameReducer(state, { type: 'START_GAME' });
  state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });

  for (const frameData of expanded.frameActions) {
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
    const preTick = state;
    state = gameReducer(state, { type: 'TICK' });
    if (detectPayout(preTick, state).payout) {
      handlers.onPayout?.({ pre: preTick, post: state });
    }
  }

  return state;
}
