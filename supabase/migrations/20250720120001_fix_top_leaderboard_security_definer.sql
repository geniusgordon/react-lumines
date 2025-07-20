-- Fix SECURITY DEFINER issue on top_leaderboard view
-- This migration drops and recreates the view with explicit SECURITY INVOKER
-- to ensure proper Row Level Security (RLS) policy enforcement

-- Drop the existing view that may have SECURITY DEFINER
DROP VIEW IF EXISTS top_leaderboard;

-- Recreate the view with explicit SECURITY INVOKER behavior
-- This ensures the view respects RLS policies and runs with the caller's privileges
CREATE VIEW public.top_leaderboard WITH (security_invoker = on) AS
SELECT 
  le.id,
  le.player_name,
  le.score,
  le.duration_ms,
  le.is_anonymous,
  le.achieved_at,
  r.id AS replay_id
FROM leaderboard_entries le
JOIN replays r ON le.replay_id = r.id
ORDER BY le.score DESC, le.achieved_at
LIMIT 100;