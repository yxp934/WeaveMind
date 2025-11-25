-- Change submissions.content from TEXT to JSONB for proper JSON handling
-- This will allow Supabase client to automatically parse/stringify JSON

-- First, convert existing text data to JSONB
-- The content is already stored as JSON strings, so we can cast them
ALTER TABLE submissions 
ALTER COLUMN content TYPE JSONB USING content::jsonb;

-- Add a comment to document the expected structure
COMMENT ON COLUMN submissions.content IS 'JSON object containing submission data. Expected structure: {"text": "...", "url": "..."}';

