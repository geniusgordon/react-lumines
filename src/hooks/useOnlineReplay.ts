import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { SavedReplay } from '@/types/replay';

interface UseOnlineReplayResult {
  replay: SavedReplay | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOnlineReplay(
  replayId: string | null
): UseOnlineReplayResult {
  const [replay, setReplay] = useState<SavedReplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReplay = useCallback(async () => {
    if (!replayId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('replays')
        .select('*')
        .eq('id', replayId)
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (!data) {
        throw new Error('Replay not found');
      }

      const convertedReplay: SavedReplay = {
        id: data.id,
        data: {
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

      setReplay(convertedReplay);
    } catch (err) {
      console.error('Error fetching online replay:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch replay');
      setReplay(null);
    } finally {
      setLoading(false);
    }
  }, [replayId]);

  useEffect(() => {
    fetchReplay();
  }, [replayId, fetchReplay]);

  return {
    replay,
    loading,
    error,
    refetch: fetchReplay,
  };
}
