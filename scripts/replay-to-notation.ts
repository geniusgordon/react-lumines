import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { ReplayData } from '@/types/replay';
import { validateReplayData } from '@/utils/replayUtils';

import { replayToNotation } from './replay-notation/notation';

function main(): void {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    process.stderr.write(
      'usage: pnpm tsx scripts/replay-to-notation.ts <replay.json>\n'
    );
    process.exit(args.length === 0 ? 2 : 0);
  }

  const path = args[0];
  const raw = readFileSync(path, 'utf8');
  let replay: ReplayData;
  try {
    replay = JSON.parse(raw) as ReplayData;
  } catch (err) {
    process.stderr.write(
      `failed to parse ${path}: ${(err as Error).message}\n`
    );
    process.exit(1);
  }

  const validation = validateReplayData(replay);
  if (!validation.valid) {
    process.stderr.write(
      `replay failed validation:\n  ${validation.errors.join('\n  ')}\n`
    );
    process.exit(1);
  }

  const markdown = replayToNotation(replay, { source: basename(path) });
  process.stdout.write(markdown);
}

main();
