-- Fix SECURITY DEFINER issues on views
-- This migration drops and recreates both views with explicit SECURITY INVOKER
-- to ensure proper Row Level Security (RLS) policy enforcement

-- Drop the existing views that may have SECURITY DEFINER
DROP VIEW IF EXISTS recent_replays;

-- Recreate the view with explicit SECURITY INVOKER behavior
-- This ensures the view respects RLS policies and runs with the caller's privileges
CREATE VIEW public.recent_replays WITH (security_invoker = on) AS
SELECT
    id,
    player_name,
    final_score,
    duration_ms,
    is_anonymous,
    created_at,
    CASE
        WHEN user_id IS NOT NULL THEN 'authenticated'::text
        ELSE 'anonymous'::text
    END AS user_type
FROM replays
WHERE final_score IS NOT NULL
ORDER BY created_at DESC
LIMIT 50;
