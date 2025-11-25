-- Add graded_at timestamp to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN submissions.graded_at IS 'Timestamp when the submission was graded by a teacher';

