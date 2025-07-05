import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { ReplayData } from '@/types/replay';

interface UseOnlineReplayResult {
  replayData: ReplayData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOnlineReplay(
  replayId: string | null
): UseOnlineReplayResult {
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
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

      // Convert DatabaseReplay to ReplayData format
      const convertedReplayData: ReplayData = {
        seed: data.seed,
        inputs: data.inputs,
        gameConfig: data.game_config,
        metadata: {
          ...data.metadata,
          finalScore: data.final_score,
          duration: data.duration_ms,
          playerName: data.player_name,
        },
      };

      setReplayData(convertedReplayData);
    } catch (err) {
      console.error('Error fetching online replay:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch replay');
      setReplayData(null);
    } finally {
      setLoading(false);
    }
  }, [replayId]);

  useEffect(() => {
    fetchReplay();
  }, [replayId, fetchReplay]);

  return {
    replayData,
    loading,
    error,
    refetch: fetchReplay,
  };
}
