import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { ReplayData } from '@/types/replay';
import {
  computeBoardColorBalance,
  computeDecisionRegret,
  computeFocusRhythm,
  computeFrozenGrowth,
  computeRegionEfficiency,
  computeSweepValue,
  computeWellProfile,
  summarizePayoutColor,
} from '@/utils/placementMetrics';
import type { PayoutColorRecord, SweepEvent } from '@/utils/placementMetrics';
import { validateReplayData } from '@/utils/replayUtils';

import { simulateReplay } from './metrics-corpus/simulateReplay';
import { spearman } from './metrics-corpus/spearman';

interface RunMetrics {
  source: string;
  finalScore: number;
  meanRegionEfficiency: number;
  meanMaxWellDepth: number;
  meanBumpiness: number;
  meanSealPressure: number;
  meanRegret: number;
  alternationRate: number;
  meanPurity: number;
  handoffRate: number;
  meanSweepValue: number;
}

function analyzeReplay(replay: ReplayData, source: string): RunMetrics {
  let drops = 0;
  let sumEfficiency = 0;
  let sumWellDepth = 0;
  let sumBumpiness = 0;
  let sumSealPressure = 0;
  let sumRegret = 0;
  const payoutRecords: PayoutColorRecord[] = [];
  const sweepEvents: SweepEvent[] = [];

  const finalState = simulateReplay(replay, {
    onDrop: ({ pre, post }) => {
      drops += 1;
      sumEfficiency += computeRegionEfficiency(post.board).meanEfficiency;
      const well = computeWellProfile(post.board);
      sumWellDepth += well.maxWellDepth;
      sumBumpiness += well.bumpiness;
      const seal = computeFrozenGrowth(post.board).sealPressure;
      sumSealPressure += (seal.light + seal.dark) / 2;
      sumRegret += computeDecisionRegret(
        pre.board,
        pre.fallingColumns,
        pre.currentBlock,
        pre.blockPosition.x
      ).regret;
    },
    onPayout: ({ pre, post }) => {
      const { dominantColor, dominantShare } = summarizePayoutColor(
        pre.markedCells
      );
      payoutRecords.push({
        dominantColor,
        dominantShare,
        postBalanceDelta: computeBoardColorBalance(post.board).delta,
      });
      sweepEvents.push({
        frame: post.frame,
        clearedCells: pre.markedCells.length,
        scoreDelta: post.score - pre.score,
        dropsSincePrevious: 0,
      });
    },
  });

  const rhythm = computeFocusRhythm(payoutRecords);
  const sweepValue = computeSweepValue(sweepEvents);
  const safeDrops = drops === 0 ? 1 : drops;

  return {
    source,
    finalScore: finalState.score,
    meanRegionEfficiency: sumEfficiency / safeDrops,
    meanMaxWellDepth: sumWellDepth / safeDrops,
    meanBumpiness: sumBumpiness / safeDrops,
    meanSealPressure: sumSealPressure / safeDrops,
    meanRegret: sumRegret / safeDrops,
    alternationRate: rhythm.alternationRate,
    meanPurity: rhythm.meanPurity,
    handoffRate: rhythm.handoffRate,
    meanSweepValue: sweepValue.meanPoints,
  };
}

function loadReplay(path: string): ReplayData | null {
  try {
    const replay = JSON.parse(readFileSync(path, 'utf8')) as ReplayData;
    const validation = validateReplayData(replay);
    if (!validation.valid) {
      process.stderr.write(`skip ${path}: ${validation.errors.join('; ')}\n`);
      return null;
    }
    return replay;
  } catch (err) {
    process.stderr.write(`skip ${path}: ${(err as Error).message}\n`);
    return null;
  }
}

function main(): void {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    process.stderr.write(
      'usage: pnpm tsx scripts/metrics-corpus.ts <replay.json> [more.json ...]\n'
    );
    process.exit(2);
  }

  const runs: RunMetrics[] = [];
  for (const path of paths) {
    const replay = loadReplay(path);
    if (replay) {
      runs.push(analyzeReplay(replay, basename(path)));
    }
  }

  if (runs.length < 2) {
    process.stderr.write(
      `need >= 2 valid replays to correlate; got ${runs.length}\n`
    );
    process.exit(1);
  }

  const scores = runs.map(r => r.finalScore);
  const metricKeys: Array<keyof RunMetrics> = [
    'meanRegionEfficiency',
    'meanMaxWellDepth',
    'meanBumpiness',
    'meanSealPressure',
    'meanRegret',
    'alternationRate',
    'meanPurity',
    'handoffRate',
    'meanSweepValue',
  ];

  const correlations = metricKeys
    .map(key => ({
      metric: key,
      rho: spearman(
        runs.map(r => r[key] as number),
        scores
      ),
    }))
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho));

  process.stdout.write(
    `# Strategy metric vs finalScore (N=${runs.length})\n\n`
  );
  process.stdout.write('Spearman rho, sorted by |rho| (strongest first):\n\n');
  for (const { metric, rho } of correlations) {
    process.stdout.write(`  ${rho.toFixed(3).padStart(7)}  ${metric}\n`);
  }
  process.stdout.write(
    '\nNote: small/skill-skewed corpus + RNG luck in finalScore — treat as\n' +
      'suggestive, not proof. Metrics stable across seeds are the trustworthy ones.\n'
  );
}

main();
