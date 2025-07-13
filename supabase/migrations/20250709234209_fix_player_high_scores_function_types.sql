-- Migration: Fix get_player_high_scores function return types
-- Update function to use exact column types from leaderboard_entries table

-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS get_player_high_scores(INTEGER);

CREATE OR REPLACE FUNCTION get_player_high_scores(
    score_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    player_name VARCHAR(100),
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
