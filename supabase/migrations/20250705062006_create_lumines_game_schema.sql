-- Migration: Create Lumines Game Schema
-- Support for optional authentication (users can be logged in or anonymous)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for optional user data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create replays table (supports both authenticated and anonymous users)
CREATE TABLE replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous
  name VARCHAR(255) NOT NULL,
  player_name VARCHAR(100), -- Display name (from auth user or manual input)
  seed VARCHAR(255) NOT NULL,
  inputs JSONB NOT NULL, -- Array of ReplayInput objects
  game_config JSONB NOT NULL, -- version, timestamp
  metadata JSONB, -- finalScore, duration, playerName
  final_score INTEGER,
  duration_ms INTEGER,
  is_anonymous BOOLEAN DEFAULT FALSE, -- Track if submitted anonymously
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaderboard_entries table (mixed authenticated/anonymous)
CREATE TABLE leaderboard_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous
  replay_id UUID REFERENCES replays(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL, -- Always populated
  score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(replay_id) -- One leaderboard entry per replay
);

-- Create indexes for performance
CREATE INDEX idx_replays_user_id ON replays(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_replays_final_score ON replays(final_score DESC);
CREATE INDEX idx_replays_created_at ON replays(created_at DESC);
CREATE INDEX idx_replays_anonymous ON replays(is_anonymous);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC, achieved_at DESC);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_leaderboard_recent ON leaderboard_entries(achieved_at DESC);

-- Helper function to get player display name (from profile or fallback)
CREATE OR REPLACE FUNCTION get_player_display_name(user_uuid UUID, fallback_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN COALESCE(fallback_name, 'Anonymous');
  END IF;
  
  RETURN COALESCE(
    (SELECT display_name FROM profiles WHERE id = user_uuid),
    (SELECT username FROM profiles WHERE id = user_uuid),
    (SELECT email FROM auth.users WHERE id = user_uuid),
    fallback_name,
    'Anonymous'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to automatically populate leaderboard entry from replay
CREATE OR REPLACE FUNCTION create_leaderboard_entry_from_replay()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create leaderboard entry if final_score is present
  IF NEW.final_score IS NOT NULL THEN
    INSERT INTO leaderboard_entries (
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate leaderboard
CREATE TRIGGER create_leaderboard_entry_trigger
  AFTER INSERT ON replays
  FOR EACH ROW
  EXECUTE FUNCTION create_leaderboard_entry_from_replay();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for replays
CREATE POLICY "Replays are publicly readable" ON replays FOR SELECT USING (true);
CREATE POLICY "Anonymous users can insert replays" ON replays FOR INSERT WITH CHECK (
  -- Allow insert if user_id is NULL (anonymous) or matches current user
  user_id IS NULL OR user_id = auth.uid()
);
CREATE POLICY "Users can update their own replays" ON replays FOR UPDATE USING (
  -- Only authenticated users can update, and only their own replays
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);
CREATE POLICY "Users can delete their own replays" ON replays FOR DELETE USING (
  -- Only authenticated users can delete, and only their own replays
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- RLS Policies for leaderboard_entries
CREATE POLICY "Leaderboard entries are publicly readable" ON leaderboard_entries FOR SELECT USING (true);
-- Note: leaderboard_entries are managed automatically via trigger, so no direct INSERT/UPDATE/DELETE policies needed

-- Create a view for top leaderboard entries
CREATE VIEW top_leaderboard AS
SELECT 
  le.id,
  le.player_name,
  le.score,
  le.duration_ms,
  le.is_anonymous,
  le.achieved_at,
  r.id as replay_id,
  r.name as replay_name
FROM leaderboard_entries le
JOIN replays r ON le.replay_id = r.id
ORDER BY le.score DESC, le.achieved_at ASC
LIMIT 100;

-- Create a view for recent replays
CREATE VIEW recent_replays AS
SELECT 
  r.id,
  r.name,
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