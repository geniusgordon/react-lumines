-- Fix RLS policy for leaderboard_entries table
-- The trigger needs INSERT permission to create leaderboard entries automatically

CREATE POLICY "Leaderboard entries can be inserted by trigger" ON leaderboard_entries FOR INSERT WITH CHECK (true);