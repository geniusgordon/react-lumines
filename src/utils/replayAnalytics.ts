import type {
  StateSnapshot,
  ReplayAnalytics,
  KeyMoment,
  ScorePoint,
} from '@/types/replay';
import { computeSweepYield } from '@/utils/placementMetrics';
import type { SweepEvent } from '@/utils/placementMetrics';
import { computeChainLengths } from '@/utils/trainingMetrics';

export const KEY_MOMENT_THRESHOLD = 5;

export function computeReplayAnalytics(
  snapshots: StateSnapshot[],
  placementCounts: number[],
  scoreEvents: Array<{ frame: number; delta: number }> = [],
  sweepEvents: SweepEvent[] = []
): ReplayAnalytics {
  if (snapshots.length === 0) {
    return {
      scoreTimeline: [],
      peakChainLength: 0,
      peakChainFrame: 0,
      boardEfficiency: 0,
      keyMoments: [],
      columnHeatmap: { counts: Array(16).fill(0), max: 0 },
      scoreDistribution: { small: 0, medium: 0, large: 0 },
      sweepYield: { total: 0, mean: 0, payouts: 0 },
    };
  }

  const scoreTimeline: ScorePoint[] = [];
  const keyMoments: KeyMoment[] = [];
  let peakChainLength = 0;
  let peakChainFrame = 0;
  const scoreDistribution = { small: 0, medium: 0, large: 0 };

  for (const snapshot of snapshots) {
    const { frame, gameState } = snapshot;

    scoreTimeline.push({ frame, score: gameState.score });

    // Peak chain
    const chains = computeChainLengths(gameState.detectedPatterns);
    const chainLength = Math.max(chains.light, chains.dark);
    if (chainLength > peakChainLength) {
      peakChainLength = chainLength;
      peakChainFrame = frame;
    }
  }

  // Build key moments and score distribution from per-frame score events
  for (const event of scoreEvents) {
    if (event.delta < KEY_MOMENT_THRESHOLD) {
      continue;
    }

    // Find nearest snapshot at or before this frame for chain context
    let bestSnapshot: StateSnapshot | null = null;
    for (const snapshot of snapshots) {
      if (snapshot.frame <= event.frame) {
        if (!bestSnapshot || snapshot.frame > bestSnapshot.frame) {
          bestSnapshot = snapshot;
        }
      }
    }
    const chains = bestSnapshot
      ? computeChainLengths(bestSnapshot.gameState.detectedPatterns)
      : { light: 0, dark: 0 };
    const chainLength = Math.max(chains.light, chains.dark);
    keyMoments.push({
      frame: event.frame,
      scoreDelta: event.delta,
      chainLength,
    });

    if (event.delta < 10) {
      scoreDistribution.small++;
    } else if (event.delta < 20) {
      scoreDistribution.medium++;
    } else {
      scoreDistribution.large++;
    }
  }

  const columnMax = Math.max(...placementCounts, 1);

  // Board efficiency from final snapshot
  const finalState = snapshots[snapshots.length - 1].gameState;
  const patterns = finalState.detectedPatterns;
  const uniquePatternCells = new Set<string>();
  for (const p of patterns) {
    uniquePatternCells.add(`${p.x},${p.y}`);
    uniquePatternCells.add(`${p.x + 1},${p.y}`);
    uniquePatternCells.add(`${p.x},${p.y + 1}`);
    uniquePatternCells.add(`${p.x + 1},${p.y + 1}`);
  }
  let totalNonEmpty = 0;
  const finalBoard = finalState.board;
  for (let col = 0; col < finalBoard.length; col++) {
    for (let row = 0; row < finalBoard[col].length; row++) {
      if (finalBoard[col][row] !== 0) {
        totalNonEmpty++;
      }
    }
  }
  const boardEfficiency =
    totalNonEmpty > 0 ? uniquePatternCells.size / totalNonEmpty : 0;

  const sweepStats = computeSweepYield(sweepEvents);

  return {
    scoreTimeline,
    peakChainLength,
    peakChainFrame,
    boardEfficiency,
    keyMoments,
    columnHeatmap: { counts: placementCounts, max: columnMax },
    scoreDistribution,
    sweepYield: {
      total: sweepStats.total,
      mean: sweepStats.mean,
      payouts: sweepEvents.length,
    },
  };
}
