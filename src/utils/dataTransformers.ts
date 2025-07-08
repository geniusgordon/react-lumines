import type { DatabaseReplay, InsertReplayInput } from '@/types/database';
import type { Json } from '@/types/database.gen';
import type { SavedReplay, ReplayData } from '@/types/replay';

export function convertDatabaseReplayToSavedReplay(
  data: DatabaseReplay
): SavedReplay {
  return {
    id: data.id,
    data: {
      id: data.id,
      seed: data.seed,
      inputs: data.inputs as any,
      gameConfig: data.game_config as any,
      metadata: {
        finalScore: data.final_score || 0,
        duration: data.duration_ms || 0,
        playerName: data.player_name || 'Anonymous',
      },
    },
    savedAt: data.created_at
      ? new Date(data.created_at).getTime()
      : new Date().getTime(),
  };
}

export function convertReplayDataToInsertInput(
  replayData: ReplayData,
  playerName?: string
): InsertReplayInput {
  const finalScore = replayData.metadata.finalScore;
  const duration = replayData.metadata.duration || 0;

  return {
    id: replayData.id,
    player_name: playerName || 'Anonymous',
    seed: replayData.seed,
    inputs: replayData.inputs as unknown as Json[],
    game_config: replayData.gameConfig,
    metadata: {
      ...replayData.metadata,
      playerName: playerName || 'Anonymous',
    },
    final_score: finalScore,
    duration_ms: duration,
  };
}
