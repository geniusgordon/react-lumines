import { useCallback, useEffect } from 'react';

import { SupabaseService } from '@/services/supabaseService';
import type { SavedReplay } from '@/types/replay';

import { useSupabaseQuery } from './useSupabaseQuery';

interface UseOnlineReplayResult {
  replay: SavedReplay | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOnlineReplay(
  replayId: string | null
): UseOnlineReplayResult {
  const queryFn = useCallback(async () => {
    if (!replayId) {
      throw new Error('No replay ID provided');
    }
    return SupabaseService.fetchReplayById(replayId);
  }, [replayId]);

  const { loading, data, error, refetch } = useSupabaseQuery({
    queryFn,
  });

  const executeQuery = useCallback(async () => {
    if (replayId) {
      await refetch();
    }
  }, [replayId, refetch]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return {
    replay: data,
    loading,
    error,
    refetch: executeQuery,
  };
}
