import { supabase } from '@/lib/supabase';
import type { TopLeaderboardEntry, InsertReplayInput } from '@/types/database';
import type { SavedReplay } from '@/types/replay';
import { convertDatabaseReplayToSavedReplay } from '@/utils/dataTransformers';

export class SupabaseService {
  static async fetchLeaderboard(): Promise<TopLeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('top_leaderboard')
      .select('*')
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  static async insertReplay(replayData: InsertReplayInput): Promise<void> {
    const { error } = await supabase
      .from('replays')
      .insert([
        {
          ...replayData,
          is_anonymous: true,
          user_id: null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
  }

  static async fetchReplayById(replayId: string): Promise<SavedReplay> {
    const { data, error } = await supabase
      .from('replays')
      .select('*')
      .eq('id', replayId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Replay not found');
    }

    return convertDatabaseReplayToSavedReplay(data);
  }
}
