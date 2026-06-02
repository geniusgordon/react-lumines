import type { Block, GameState } from '@/types/game';
import type { ReplayData } from '@/types/replay';
import { detectPayout } from '@/utils/placementMetrics';
import { driveReplay, replayTotalFrames } from '@/utils/replaySimulation';
import { expandReplayData, getReplayBlockQueue } from '@/utils/replayUtils';

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
 * Drive the real gameReducer through a replay (via the shared driveReplay) and
 * call hooks on each hard drop and each payout. Returns the final state.
 */
export function simulateReplay(
  replay: ReplayData,
  handlers: SimulateHandlers
): GameState {
  const frameActions = expandReplayData(replay);
  const totalFrames = replayTotalFrames(
    replay.metadata.duration,
    frameActions.length
  );
  return driveReplay(
    replay.seed,
    frameActions,
    totalFrames,
    getReplayBlockQueue(replay),
    {
      onHardDrop: (pre, post) => {
        handlers.onDrop?.({
          pre,
          post,
          chosenX: pre.blockPosition.x,
          block: pre.currentBlock,
        });
      },
      onFrame: (preTick, post) => {
        if (detectPayout(preTick, post).payout) {
          handlers.onPayout?.({ pre: preTick, post });
        }
      },
    }
  );
}
