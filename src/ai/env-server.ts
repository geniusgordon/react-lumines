/**
 * env-server.ts — Headless Lumines environment server
 *
 * Reads newline-delimited JSON commands from stdin.
 * Writes newline-delimited JSON responses to stdout.
 *
 * Usage:
 *   tsx src/ai/env-server.ts [--mode per_block|per_frame]
 *
 * Commands:
 *   {"cmd": "reset", "seed": "optional"}
 *   {"cmd": "step", "action": {"targetX": 7, "rotation": 0}}   // per_block
 *   {"cmd": "step", "action": "MOVE_LEFT"}                      // per_frame
 *   {"cmd": "render"}
 *   {"cmd": "close"}
 */

import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';

import {
  LuminesEnv,
  type StepMode,
  type BlockAction,
  type FrameAction,
} from './LuminesEnv.js';

// Parse --mode argument
const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const mode: StepMode =
  modeIdx !== -1 &&
  (args[modeIdx + 1] === 'per_frame' || args[modeIdx + 1] === 'per_block')
    ? (args[modeIdx + 1] as StepMode)
    : 'per_block';

// --record-replay <path>
const recordIdx = args.indexOf('--record-replay');
const recordReplayPath: string | null =
  recordIdx !== -1 ? (args[recordIdx + 1] ?? null) : null;

let recordedSeed: string = Date.now().toString();
const recordedInputs: { type: string; frame: number }[] = [];

const env = new LuminesEnv({ mode });

function send(obj: object): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

interface ResetCmd {
  cmd: 'reset';
  seed?: string;
}

interface StepCmd {
  cmd: 'step';
  action: BlockAction | FrameAction;
}

interface RenderCmd {
  cmd: 'render';
}

interface CloseCmd {
  cmd: 'close';
}

type Command = ResetCmd | StepCmd | RenderCmd | CloseCmd;

function handleCommand(cmd: Command): void {
  switch (cmd.cmd) {
    case 'reset': {
      const obs = env.reset(cmd.seed ?? undefined);
      if (recordReplayPath && cmd.seed) {
        recordedSeed = cmd.seed;
        recordedInputs.length = 0; // clear for new episode
      }
      send({ type: 'obs', observation: obs });
      break;
    }
    case 'step': {
      const result = env.step(cmd.action);
      if (recordReplayPath && result.appliedInputs.length > 0) {
        recordedInputs.push(...result.appliedInputs);
      }
      send({ type: 'step', ...result });
      break;
    }
    case 'render': {
      send({ type: 'render', ascii: env.render() });
      break;
    }
    case 'close': {
      if (recordReplayPath && recordedInputs.length > 0) {
        const replayData = {
          id: randomUUID(),
          seed: recordedSeed,
          inputs: recordedInputs,
          gameConfig: { version: '1.0.0', timestamp: Date.now() },
          metadata: {
            finalScore: 0,
            playerName: 'AI Agent',
          },
        };
        writeFileSync(recordReplayPath, JSON.stringify(replayData, null, 2));
      }
      process.exit(0);
    }
  }
}

let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const cmd = JSON.parse(trimmed) as Command;
      handleCommand(cmd);
    } catch (e) {
      send({ type: 'error', message: String(e) });
    }
  }
});

process.stdin.on('end', () => process.exit(0));
