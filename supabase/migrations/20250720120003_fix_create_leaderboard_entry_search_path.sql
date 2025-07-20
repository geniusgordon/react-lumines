-- Fix search_path security issue on create_leaderboard_entry_from_replay function
-- This migration drops and recreates the trigger function with secure search_path settings
-- to prevent potential schema injection attacks (CVE-2018-1058, CVE-2007-2138)

-- Drop the trigger first (required because function has dependencies)
DROP TRIGGER IF EXISTS create_leaderboard_entry_trigger ON replays;

-- Drop the existing function
DROP FUNCTION IF EXISTS create_leaderboard_entry_from_replay();

-- Recreate the function with secure search_path configuration
-- SET search_path = public, auth, pg_temp ensures:
-- 1. Only trusted schemas (public, auth) are searched
-- 2. pg_temp is placed last to prevent temp table masking attacks
-- 3. Explicit schema qualifications provide additional security
CREATE OR REPLACE FUNCTION create_leaderboard_entry_from_replay()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create leaderboard entry if final_score is present
  IF NEW.final_score IS NOT NULL THEN
    INSERT INTO public.leaderboard_entries (
      user_id,
      replay_id,
      player_name,
      score,
      duration_ms,
      is_anonymous,
      achieved_at
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      COALESCE(NEW.player_name, get_player_display_name(NEW.user_id, NEW.player_name)),
      NEW.final_score,
      COALESCE(NEW.duration_ms, 0),
      NEW.is_anonymous,
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, auth, pg_temp;

-- Recreate the trigger
CREATE TRIGGER create_leaderboard_entry_trigger
  AFTER INSERT ON replays
  FOR EACH ROW
  EXECUTE FUNCTION create_leaderboard_entry_from_replay();