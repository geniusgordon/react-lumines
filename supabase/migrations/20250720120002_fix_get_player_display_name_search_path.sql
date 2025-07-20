-- Fix search_path security issue on get_player_display_name function
-- This migration drops and recreates the function with secure search_path settings
-- to prevent potential schema injection attacks (CVE-2018-1058, CVE-2007-2138)

-- Drop the existing function
DROP FUNCTION IF EXISTS get_player_display_name(UUID, TEXT);

-- Recreate the function with secure search_path configuration
-- SET search_path = public, auth, pg_temp ensures:
-- 1. Only trusted schemas (public, auth) are searched
-- 2. pg_temp is placed last to prevent temp table masking attacks
-- 3. Explicit schema qualifications provide additional security
CREATE OR REPLACE FUNCTION get_player_display_name(user_uuid UUID, fallback_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN COALESCE(fallback_name, 'Anonymous');
  END IF;
  
  RETURN COALESCE(
    (SELECT display_name FROM public.profiles WHERE id = user_uuid),
    (SELECT username FROM public.profiles WHERE id = user_uuid),
    (SELECT email FROM auth.users WHERE id = user_uuid),
    fallback_name,
    'Anonymous'
  );
END;
$$ LANGUAGE plpgsql
SET search_path = public, auth, pg_temp;