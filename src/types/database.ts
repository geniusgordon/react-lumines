// Database Types - Supabase PostgreSQL Schema Types
import type { ReplayData } from './replay';

// Profile table structure
export interface Profile {
  id: string; // UUID
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Replay table structure
export interface DatabaseReplay {
  id: string; // UUID
  user_id?: string; // UUID, null for anonymous
  name: string;
  player_name?: string;
  seed: string;
  inputs: ReplayData['inputs']; // JSONB - Array of ReplayInput objects
  game_config: ReplayData['gameConfig']; // JSONB - version, timestamp
  metadata?: ReplayData['metadata']; // JSONB - finalScore, duration, playerName
  final_score?: number;
  duration_ms?: number;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

// Leaderboard entry table structure
export interface LeaderboardEntry {
  id: string; // UUID
  user_id?: string; // UUID, null for anonymous
  replay_id: string; // UUID
  player_name: string;
  score: number;
  duration_ms: number;
  is_anonymous: boolean;
  achieved_at: string;
}

// View types for optimized queries
export interface TopLeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  duration_ms: number;
  is_anonymous: boolean;
  achieved_at: string;
  replay_id: string;
  replay_name: string;
}

export interface RecentReplayEntry {
  id: string;
  name: string;
  player_name?: string;
  final_score?: number;
  duration_ms?: number;
  is_anonymous: boolean;
  created_at: string;
  user_type: 'authenticated' | 'anonymous';
}

// Database operation types
export interface CreateReplayInput {
  name: string;
  player_name?: string;
  seed: string;
  inputs: ReplayData['inputs'];
  game_config: ReplayData['gameConfig'];
  metadata?: ReplayData['metadata'];
  final_score?: number;
  duration_ms?: number;
  is_anonymous?: boolean;
}

export interface CreateProfileInput {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  avatar_url?: string;
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null;
  error?: string;
}

export interface DatabaseListResponse<T> {
  data: T[];
  error?: string;
  count?: number;
}

// Query filter types
export interface LeaderboardFilters {
  limit?: number;
  offset?: number;
  user_type?: 'authenticated' | 'anonymous' | 'all';
}

export interface ReplayFilters {
  limit?: number;
  offset?: number;
  user_id?: string;
  is_anonymous?: boolean;
  min_score?: number;
  date_from?: string;
  date_to?: string;
}

// Utility types for database operations
export type DatabaseReplayWithoutId = Omit<DatabaseReplay, 'id' | 'created_at' | 'updated_at'>;
export type ProfileWithoutTimestamps = Omit<Profile, 'created_at' | 'updated_at'>;
export type LeaderboardEntryWithoutId = Omit<LeaderboardEntry, 'id' | 'achieved_at'>;