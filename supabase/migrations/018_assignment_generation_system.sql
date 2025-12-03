-- Assignment Generation System
-- This migration adds support for AI-generated assignments with multiple question types

-- Question types enum
CREATE TYPE question_type AS ENUM ('mcq', 'fill_blank', 'code', 'linking');

-- Assignment questions table
CREATE TABLE assignment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL,
    question_number INTEGER NOT NULL,
    question_type question_type NOT NULL,
    question_text TEXT NOT NULL,
    question_data JSONB NOT NULL DEFAULT '{}', -- Stores type-specific data (options, blanks, test cases, etc.)
    answer_data JSONB NOT NULL DEFAULT '{}', -- Stores correct answers and grading criteria
    estimated_time INTEGER NOT NULL DEFAULT 5, -- Estimated time in minutes
    rationale TEXT, -- Explanation of why this question is included
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, question_number)
);

-- Assignment iterations table (tracks AI generation process)
CREATE TABLE assignment_iterations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL DEFAULT 1,
    agent_type VARCHAR(50) NOT NULL, -- 'teacher' or 'student'
    iteration_type VARCHAR(50) NOT NULL, -- 'generate', 'refine', 'test'
    input_prompt TEXT NOT NULL,
    output_data JSONB NOT NULL DEFAULT '{}',
    feedback TEXT, -- Teacher feedback for refinements
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, iteration_number, agent_type)
);

-- Assignment question testing table (student agent test results)
CREATE TABLE assignment_question_testing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    test_attempt INTEGER NOT NULL DEFAULT 1,
    student_response TEXT, -- What the student agent produced
    response_analysis JSONB DEFAULT '{}', -- Analysis of the response
    matches_criteria BOOLEAN NOT NULL DEFAULT FALSE,
    refinement_notes TEXT,
    refined_answer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_question_id, test_attempt)
);

-- Assignment generation runs table (tracks entire generation process)
CREATE TABLE assignment_generation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'reviewing', 'testing', 'completed', 'failed'
    target_duration INTEGER NOT NULL DEFAULT 20, -- Target duration in minutes
    current_iteration INTEGER NOT NULL DEFAULT 0,
    total_iterations INTEGER NOT NULL DEFAULT 0,
    teacher_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add fields to assignments table for AI generation
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS target_duration INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS generation_status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'published'
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iteration_count INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX idx_assignment_questions_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_assignment_questions_session ON assignment_questions(session_id);
CREATE INDEX idx_assignment_questions_type ON assignment_questions(question_type);
CREATE INDEX idx_assignment_iterations_assignment ON assignment_iterations(assignment_id);
CREATE INDEX idx_assignment_iterations_agent ON assignment_iterations(agent_type);
CREATE INDEX idx_assignment_question_testing_question ON assignment_question_testing(assignment_question_id);
CREATE INDEX idx_assignment_generation_runs_assignment ON assignment_generation_runs(assignment_id);
CREATE INDEX idx_assignment_generation_runs_session ON assignment_generation_runs(session_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_question_testing ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_generation_runs ENABLE ROW LEVEL SECURITY;

-- Teachers can read/write assignments and related data in their classes
CREATE POLICY "Teachers can manage assignments in their classes" ON assignment_questions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = assignment_questions.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

CREATE POLICY "Teachers can manage assignment iterations" ON assignment_iterations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = assignment_iterations.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

CREATE POLICY "Teachers can manage assignment testing" ON assignment_question_testing
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignment_questions aq
        JOIN assignments a ON aq.assignment_id = a.id
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE aq.id = assignment_question_testing.assignment_question_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

CREATE POLICY "Teachers can manage generation runs" ON assignment_generation_runs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = assignment_generation_runs.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- Students can read assignments assigned to them
CREATE POLICY "Students can read assignments in their classes" ON assignment_questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE a.id = assignment_questions.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

CREATE POLICY "Students can read assignment iterations" ON assignment_iterations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE a.id = assignment_iterations.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

CREATE POLICY "Students can read assignment testing" ON assignment_question_testing
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignment_questions aq
        JOIN assignments a ON aq.assignment_id = a.id
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE aq.id = assignment_question_testing.assignment_question_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

CREATE POLICY "Students can read generation runs" ON assignment_generation_runs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE a.id = assignment_generation_runs.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

-- Updated assignments policies to include new fields
DROP POLICY IF EXISTS "Teachers can manage assignments in their classes" ON assignments;
CREATE POLICY "Teachers can manage assignments in their classes" ON assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM classes c
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE c.id = assignments.class_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

DROP POLICY IF EXISTS "Students can read assignments in their classes" ON assignments;
CREATE POLICY "Students can read assignments in their classes" ON assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.class_id = assignments.class_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);
