import type { Database } from './database.gen';

export type TopLeaderboardEntry =
  Database['public']['Views']['top_leaderboard']['Row'];
export type DatabaseReplay = Database['public']['Tables']['replays']['Row'];
export type InsertReplayInput =
  Database['public']['Tables']['replays']['Insert'];
export type PlayerHighScore = {
  player_name: string;
  max_score: number;
};

export type { Database };
