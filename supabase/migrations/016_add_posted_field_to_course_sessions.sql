-- Add 'posted' field to course_sessions table
-- This allows teachers to make sessions available to students before the scheduled date

ALTER TABLE course_sessions
ADD COLUMN posted BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for better query performance on posted sessions
CREATE INDEX idx_course_sessions_posted ON course_sessions(posted);

-- Add comment to document the field
COMMENT ON COLUMN course_sessions.posted IS 'Whether the session is posted and visible to students before the scheduled date';
