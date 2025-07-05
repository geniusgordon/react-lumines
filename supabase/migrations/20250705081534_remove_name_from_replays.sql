-- Remove redundant 'name' column from replays table
-- The name was just a computed field from player_name and final_score
-- We can generate display names on the frontend instead

-- First, drop the views that depend on the name column
DROP VIEW IF EXISTS top_leaderboard;
DROP VIEW IF EXISTS recent_replays;

-- Now drop the name column from replays table
ALTER TABLE replays DROP COLUMN name;

-- Recreate the views without the name/replay_name field
CREATE VIEW top_leaderboard AS
SELECT 
  le.id,
  le.player_name,
  le.score,
  le.duration_ms,
  le.is_anonymous,
  le.achieved_at,
  r.id as replay_id
FROM leaderboard_entries le
JOIN replays r ON le.replay_id = r.id
ORDER BY le.score DESC, le.achieved_at ASC
LIMIT 100;

CREATE VIEW recent_replays AS
SELECT 
  r.id,
  r.player_name,
  r.final_score,
  r.duration_ms,
  r.is_anonymous,
  r.created_at,
  CASE 
    WHEN r.user_id IS NOT NULL THEN 'authenticated'
    ELSE 'anonymous'
  END as user_type
FROM replays r
WHERE r.final_score IS NOT NULL
ORDER BY r.created_at DESC
LIMIT 50;