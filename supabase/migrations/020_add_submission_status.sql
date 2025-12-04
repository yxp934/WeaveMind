-- Migration: Add submission status fields
-- Adds status tracking for writing and research submissions

-- Create submission_status enum type
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'graded');

-- Add status field to writing_submissions table
ALTER TABLE writing_submissions
ADD COLUMN IF NOT EXISTS status submission_status DEFAULT 'draft';

-- Add final_submitted_at timestamp to writing_submissions table
ALTER TABLE writing_submissions
ADD COLUMN IF NOT EXISTS final_submitted_at TIMESTAMP WITH TIME ZONE;

-- Add status field to research_submissions table
ALTER TABLE research_submissions
ADD COLUMN IF NOT EXISTS status submission_status DEFAULT 'draft';

-- Add final_submitted_at timestamp to research_submissions table
ALTER TABLE research_submissions
ADD COLUMN IF NOT EXISTS final_submitted_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_writing_submissions_status ON writing_submissions(status);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_final_submitted ON writing_submissions(final_submitted_at);
CREATE INDEX IF NOT EXISTS idx_research_submissions_status ON research_submissions(status);
CREATE INDEX IF NOT EXISTS idx_research_submissions_final_submitted ON research_submissions(final_submitted_at);

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_writing_submissions_assignment_status ON writing_submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_research_submissions_assignment_status ON research_submissions(assignment_id, status);

-- Update existing submissions to 'draft' status (if migration is re-run)
-- This is idempotent as the column has a default value
