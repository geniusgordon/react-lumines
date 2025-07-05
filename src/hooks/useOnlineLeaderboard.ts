import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { TopLeaderboardEntry, InsertReplayInput } from '@/types/database';

interface UseOnlineLeaderboardResult {
  leaderboard: TopLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitScore: (
    replayData: InsertReplayInput
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useOnlineLeaderboard(): UseOnlineLeaderboardResult {
  const [leaderboard, setLeaderboard] = useState<TopLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('top_leaderboard')
        .select('*')
        .limit(50);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching online leaderboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch leaderboard'
      );
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const submitScore = async (replayData: InsertReplayInput) => {
    try {
      const { error: supabaseError } = await supabase
        .from('replays')
        .insert([
          {
            ...replayData,
            is_anonymous: true, // All submissions are anonymous for now
            user_id: null, // Anonymous submissions
          },
        ])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Refresh leaderboard after successful submission
      await fetchLeaderboard();

      return { success: true };
    } catch (err) {
      console.error('Error submitting score:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to submit score',
      };
    }
  };

  const refresh = fetchLeaderboard;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return {
    leaderboard,
    loading,
    error,
    refresh,
    submitScore,
  };
}
