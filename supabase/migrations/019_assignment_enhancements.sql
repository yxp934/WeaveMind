-- Assignment Enhancement Migration
-- Adds support for Writing and Research assignment types with AI chat and plagiarism tracking

-- Add assignment subtype enum
CREATE TYPE assignment_subtype AS ENUM ('ai_generated', 'writing', 'research');

-- Add subtype field to assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS assignment_subtype assignment_subtype DEFAULT 'ai_generated';

-- Writing assignment details
CREATE TABLE writing_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    word_limit INTEGER,
    format_requirements TEXT,
    plagiarism_check BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id)
);

-- Student writing submissions
CREATE TABLE writing_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    copy_paste_count INTEGER DEFAULT 0,
    word_count INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    feedback TEXT,
    UNIQUE(assignment_id, student_id)
);

-- Content events tracking (copy/paste)
CREATE TABLE content_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES writing_submissions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'copy', 'paste'
    source_info TEXT, -- track where copied from (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research assignment details
CREATE TABLE research_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    word_limit INTEGER,
    research_guidelines TEXT,
    ai_assistance_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id)
);

-- Student research submissions
CREATE TABLE research_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    research_notes TEXT, -- AI conversation summary
    word_count INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    feedback TEXT,
    UNIQUE(assignment_id, student_id)
);

-- AI conversations for research assignments
CREATE TABLE student_ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_assignment_id UUID NOT NULL REFERENCES research_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_title TEXT,
    messages JSONB NOT NULL DEFAULT '[]', -- {role, content, timestamp}[]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_assignments_subtype ON assignments(assignment_subtype);
CREATE INDEX idx_writing_assignments ON writing_assignments(assignment_id);
CREATE INDEX idx_writing_submissions_assignment ON writing_submissions(assignment_id);
CREATE INDEX idx_writing_submissions_student ON writing_submissions(student_id);
CREATE INDEX idx_content_events_submission ON content_events(submission_id);
CREATE INDEX idx_content_events_type ON content_events(event_type);
CREATE INDEX idx_research_assignments ON research_assignments(assignment_id);
CREATE INDEX idx_research_submissions_assignment ON research_submissions(assignment_id);
CREATE INDEX idx_research_submissions_student ON research_submissions(student_id);
CREATE INDEX idx_ai_conversations_assignment ON student_ai_conversations(research_assignment_id);
CREATE INDEX idx_ai_conversations_student ON student_ai_conversations(student_id);

-- Enable RLS
ALTER TABLE writing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for writing_assignments

-- Teachers can manage writing assignments in their classes
CREATE POLICY "Teachers can manage writing assignments" ON writing_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = writing_assignments.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- Students can read writing assignments in their classes
CREATE POLICY "Students can read writing assignments" ON writing_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE a.id = writing_submissions.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

-- RLS Policies for writing_submissions

-- Students can manage their own writing submissions
CREATE POLICY "Students can manage their writing submissions" ON writing_submissions
FOR ALL USING (
    student_id = auth.uid()
);

-- Teachers can read all submissions in their classes
CREATE POLICY "Teachers can read writing submissions" ON writing_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = writing_submissions.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- Teachers can update grading information
CREATE POLICY "Teachers can grade writing submissions" ON writing_submissions
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = writing_submissions.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- RLS Policies for content_events

-- Students can manage content events for their submissions
CREATE POLICY "Students can manage content events" ON content_events
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM writing_submissions ws
        WHERE ws.id = content_events.submission_id
        AND ws.student_id = auth.uid()
    )
);

-- Teachers can read content events in their classes
CREATE POLICY "Teachers can read content events" ON content_events
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM writing_submissions ws
        JOIN assignments a ON ws.assignment_id = a.id
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE ws.id = content_events.submission_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- RLS Policies for research_assignments

-- Teachers can manage research assignments in their classes
CREATE POLICY "Teachers can manage research assignments" ON research_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = research_assignments.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- Students can read research assignments
CREATE POLICY "Students can read research assignments" ON research_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN class_members cm ON a.class_id = cm.class_id
        WHERE a.id = research_submissions.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

-- RLS Policies for research_submissions

-- Students can manage their own research submissions
CREATE POLICY "Students can manage their research submissions" ON research_submissions
FOR ALL USING (
    student_id = auth.uid()
);

-- Teachers can read all research submissions in their classes
CREATE POLICY "Teachers can read research submissions" ON research_submissions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = research_submissions.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- Teachers can update grading information
CREATE POLICY "Teachers can grade research submissions" ON research_submissions
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE a.id = research_submissions.assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);

-- RLS Policies for student_ai_conversations

-- Students can manage their own AI conversations
CREATE POLICY "Students can manage their AI conversations" ON student_ai_conversations
FOR ALL USING (
    student_id = auth.uid()
);

-- Teachers can read AI conversations for assignments in their classes
CREATE POLICY "Teachers can read AI conversations" ON student_ai_conversations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM research_assignments ra
        JOIN assignments a ON ra.assignment_id = a.id
        JOIN classes c ON a.class_id = c.id
        JOIN organization_members om ON c.organization_id = om.organization_id
        WHERE ra.id = student_ai_conversations.research_assignment_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'teacher')
    )
);
