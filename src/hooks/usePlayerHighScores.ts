import { useEffect } from 'react';

import { SupabaseService } from '@/services/supabaseService';
import type { PlayerHighScore } from '@/types/database';

import { useSupabaseQuery } from './useSupabaseQuery';

interface UsePlayerHighScoresResult {
  playerHighScores: PlayerHighScore[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlayerHighScores(): UsePlayerHighScoresResult {
  const { loading, data, error, refetch } = useSupabaseQuery({
    queryFn: SupabaseService.fetchPlayerHighScores,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    playerHighScores: data || [],
    loading,
    error,
    refresh: refetch,
  };
}
