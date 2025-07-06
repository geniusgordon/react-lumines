import { useEffect } from 'react';

import { SupabaseService } from '@/services/supabaseService';
import type { TopLeaderboardEntry } from '@/types/database';

import { useSupabaseQuery } from './useSupabaseQuery';

interface UseOnlineLeaderboardResult {
  leaderboard: TopLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOnlineLeaderboard(): UseOnlineLeaderboardResult {
  const { loading, data, error, refetch } = useSupabaseQuery({
    queryFn: SupabaseService.fetchLeaderboard,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    leaderboard: data || [],
    loading,
    error,
    refresh: refetch,
  };
}
