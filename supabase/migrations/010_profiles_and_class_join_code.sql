-- Profiles table to store a single global role per auth user
-- and join_code support on classes for secure student self-enrollment.

-- 1) Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view only their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON profiles FOR SELECT
      USING (id = auth.uid());
  END IF;
END$$;

-- Users can create their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
      ON profiles FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END$$;

-- Users can update their own profile (but we prevent role changes via trigger below)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;
END$$;

-- Prevent changing role once it has been set (immutable role per account)
CREATE OR REPLACE FUNCTION prevent_profile_role_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS NOT NULL AND OLD.role <> NEW.role THEN
    RAISE EXCEPTION 'Profile role cannot be changed once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.profiles'::regclass
      AND tgname = 'profiles_prevent_role_change'
  ) THEN
    CREATE TRIGGER profiles_prevent_role_change
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION prevent_profile_role_change();
  END IF;
END$$;


-- 2) Join code for classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Backfill join_code for existing classes using a substring of the UUID-based id
UPDATE classes
SET join_code = substring(replace(id::text, '-', ''), 1, 8)
WHERE join_code IS NULL;

-- Enforce NOT NULL and uniqueness on join_code
DO $$
BEGIN
  -- Ensure all rows have a non-null join_code before adding constraint
  UPDATE classes
  SET join_code = substring(replace(id::text, '-', ''), 1, 8)
  WHERE join_code IS NULL;

  -- Add NOT NULL constraint
  BEGIN
    ALTER TABLE classes ALTER COLUMN join_code SET NOT NULL;
  EXCEPTION
    WHEN others THEN
      -- Ignore if constraint already applied
      NULL;
  END;

  -- Add UNIQUE constraint if it does not already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.classes'::regclass
      AND conname = 'classes_join_code_key'
  ) THEN
    ALTER TABLE classes ADD CONSTRAINT classes_join_code_key UNIQUE (join_code);
  END IF;
END$$;
