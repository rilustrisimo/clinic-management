-- Fix the timeline trigger to not use non-existent updatedById field
CREATE OR REPLACE FUNCTION log_lab_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO "public"."LabOrderTimeline" ("orderId", "status", "timestamp", "userId")
    VALUES (NEW.id, NEW.status, now(), NEW."createdById");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
