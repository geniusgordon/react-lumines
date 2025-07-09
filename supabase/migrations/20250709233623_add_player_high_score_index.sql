-- Migration: Add Index for Player High Score Queries
-- Optimizes performance for finding maximum scores per player

-- Create composite index on player_name and score (descending)
-- This enables efficient grouping by player and finding max scores
CREATE INDEX idx_leaderboard_player_score ON leaderboard_entries(player_name, score DESC);

-- Create database function for server-side aggregation
-- This replaces the client-side processing for better performance
CREATE OR REPLACE FUNCTION get_player_high_scores(score_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  player_name TEXT,
  max_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.player_name,
    MAX(le.score) as max_score
  FROM leaderboard_entries le
  GROUP BY le.player_name
  ORDER BY max_score DESC
  LIMIT score_limit;
END;
$$ LANGUAGE plpgsql;