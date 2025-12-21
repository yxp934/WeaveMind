-- Ensure discussion features can read basic profile fields for classmates

-- Add profile metadata fields if they are missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Replace the strict self-only select policy with a classmate-aware one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view their own profile'
  ) THEN
    DROP POLICY "Users can view their own profile" ON profiles;
  END IF;
END$$;

CREATE POLICY "Classmates can view basic profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM class_members cm_viewer
      JOIN class_members cm_target ON cm_viewer.class_id = cm_target.class_id
      WHERE cm_viewer.user_id = auth.uid()
        AND cm_target.user_id = profiles.id
    )
  );
