-- Add missing fields to assignments table
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS grading_criteria TEXT;

