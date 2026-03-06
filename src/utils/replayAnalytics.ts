import type {
  StateSnapshot,
  ReplayAnalytics,
  KeyMoment,
  ScorePoint,
} from '@/types/replay';
import { computeChainLengths } from '@/utils/trainingMetrics';

export const KEY_MOMENT_THRESHOLD = 5;

export function computeReplayAnalytics(
  snapshots: StateSnapshot[],
  placementCounts: number[]
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
    };
  }

  const scoreTimeline: ScorePoint[] = [];
  const keyMoments: KeyMoment[] = [];
  let peakChainLength = 0;
  let peakChainFrame = 0;
  const scoreDistribution = { small: 0, medium: 0, large: 0 };

  let prevScore = 0;

  for (const snapshot of snapshots) {
    const { frame, gameState } = snapshot;
    const score = gameState.score;

    scoreTimeline.push({ frame, score });

    // Key moments: score jumps
    const scoreDelta = score - prevScore;
    if (scoreDelta >= KEY_MOMENT_THRESHOLD) {
      const chains = computeChainLengths(gameState.detectedPatterns);
      const chainLength = Math.max(chains.light, chains.dark);
      keyMoments.push({ frame, scoreDelta, chainLength });

      if (scoreDelta < 100) {
        scoreDistribution.small++;
      } else if (scoreDelta < 500) {
        scoreDistribution.medium++;
      } else {
        scoreDistribution.large++;
      }
    }

    // Peak chain
    const chains = computeChainLengths(gameState.detectedPatterns);
    const chainLength = Math.max(chains.light, chains.dark);
    if (chainLength > peakChainLength) {
      peakChainLength = chainLength;
      peakChainFrame = frame;
    }

    // Column heatmap: use placement counts passed in from simulation
    prevScore = score;
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

  return {
    scoreTimeline,
    peakChainLength,
    peakChainFrame,
    boardEfficiency,
    keyMoments,
    columnHeatmap: { counts: placementCounts, max: columnMax },
    scoreDistribution,
  };
}
