-- Seed a sample Station and optional UserStation mapping for UI testing
-- Replace SAMPLE_USER_ID with a real user id if known; otherwise, the mapping is skipped.

-- Insert Station if missing
INSERT INTO public."Station"(id, name)
SELECT 'frontdesk-1', 'Frontdesk 1'
WHERE NOT EXISTS (SELECT 1 FROM public."Station" WHERE id = 'frontdesk-1');

-- Optional: assign a user to the station if a matching user exists
DO $$
DECLARE
  v_user_id text;
BEGIN
  SELECT id INTO v_user_id FROM public."User" ORDER BY "createdAt" LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public."UserStation"(id, userId, stationId)
    SELECT 'us-frontdesk-1-' || v_user_id, v_user_id, 'frontdesk-1'
    WHERE NOT EXISTS (
      SELECT 1 FROM public."UserStation" WHERE userId = v_user_id AND stationId = 'frontdesk-1'
    );
  END IF;
END $$;
