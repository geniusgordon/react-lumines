// Helper used by the manual CLI smoke test (`pnpm tsx ... | head`).
// Generates a small synthetic v2 replay and writes it to a tmp path.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gameReducer, createInitialGameState } from '@/reducers/gameReducer';
import type { GameState } from '@/types/game';
import { createReplayData } from '@/utils/replayUtils';

const seed = 'smoke-seed';
let state: GameState = createInitialGameState(seed);
state = gameReducer(state, { type: 'START_GAME' });
state = gameReducer(state, { type: 'SKIP_COUNTDOWN' });

const inputs: { type: string; frame: number }[] = [];
for (let i = 0; i < 8; i++) {
  inputs.push({ type: 'HARD_DROP', frame: 0 });
  state = gameReducer(state, { type: 'HARD_DROP' });
  for (let f = 0; f < 30; f++) {
    inputs.push({ type: 'TICK', frame: 0 });
    state = gameReducer(state, { type: 'TICK' });
  }
}

const replay = createReplayData(inputs, state);
const dir = mkdtempSync(join(tmpdir(), 'lumines-smoke-'));
const path = join(dir, 'smoke.json');
writeFileSync(path, JSON.stringify(replay));
process.stdout.write(path);
