-- Fix search_path security issue on get_player_high_scores function
-- This migration drops and recreates the function with secure search_path settings
-- to prevent potential schema injection attacks (CVE-2018-1058, CVE-2007-2138)

-- Drop the existing function
DROP FUNCTION IF EXISTS get_player_high_scores(INTEGER);

-- Recreate the function with secure search_path configuration
-- SET search_path = public, auth, pg_temp ensures:
-- 1. Only trusted schemas (public, auth) are searched
-- 2. pg_temp is placed last to prevent temp table masking attacks
-- 3. Explicit schema qualifications provide additional security
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
  FROM public.leaderboard_entries le
  GROUP BY le.player_name
  ORDER BY max_score DESC
  LIMIT score_limit;
END;
$$ LANGUAGE plpgsql
SET search_path = public, auth, pg_temp;