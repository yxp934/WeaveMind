-- Ensure new classes always have a non-null join_code by generating it on insert.
-- This complements migration 010, which backfilled existing rows and added NOT NULL + UNIQUE.

CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS trigger AS $$
BEGIN
  -- If join_code was not explicitly provided, derive it from the UUID id
  IF NEW.join_code IS NULL THEN
    NEW.join_code := substring(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.classes'::regclass
      AND tgname = 'classes_set_join_code'
  ) THEN
    CREATE TRIGGER classes_set_join_code
      BEFORE INSERT ON classes
      FOR EACH ROW
      EXECUTE FUNCTION set_class_join_code();
  END IF;
END$$;

