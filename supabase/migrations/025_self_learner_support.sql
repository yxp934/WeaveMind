-- Migration 025: Self-Learner Role Support
-- Purpose: Add self-learner role support and related data model

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Extend user_role enum to include self_learner
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'self_learner';

-- 2. Update profiles table role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('teacher', 'student', 'self_learner'));

-- 3. Create self_learner_pathways table
CREATE TABLE IF NOT EXISTS self_learner_pathways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration_hours INTEGER NOT NULL CHECK (estimated_duration_hours > 0),
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create self_learner_pathway_items table
CREATE TABLE IF NOT EXISTS self_learner_pathway_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pathway_id UUID NOT NULL REFERENCES self_learner_pathways(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    component_id UUID REFERENCES components(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'chapter', 'component')),
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 30,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT pathway_items_reference_check CHECK (
        (course_id IS NOT NULL AND chapter_id IS NULL AND component_id IS NULL) OR
        (course_id IS NOT NULL AND chapter_id IS NOT NULL AND component_id IS NULL) OR
        (course_id IS NOT NULL AND chapter_id IS NOT NULL AND component_id IS NOT NULL)
    )
);

-- 5. Create self_learner_pathway_progress table
CREATE TABLE IF NOT EXISTS self_learner_pathway_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pathway_id UUID NOT NULL REFERENCES self_learner_pathways(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_items INTEGER DEFAULT 0,
    completed_items INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    total_estimated_minutes INTEGER DEFAULT 0,
    actual_learning_minutes INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pathway_id, user_id)
);

-- 6. Create self_learner_favorites table
CREATE TABLE IF NOT EXISTS self_learner_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    component_id UUID REFERENCES components(id) ON DELETE CASCADE,
    favorite_type TEXT NOT NULL CHECK (favorite_type IN ('course', 'class', 'chapter', 'component')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id, class_id, chapter_id, component_id),
    CONSTRAINT favorites_reference_check CHECK (
        (course_id IS NOT NULL AND class_id IS NULL AND chapter_id IS NULL AND component_id IS NULL) OR
        (course_id IS NOT NULL AND class_id IS NOT NULL AND chapter_id IS NULL AND component_id IS NULL) OR
        (course_id IS NOT NULL AND class_id IS NOT NULL AND chapter_id IS NOT NULL AND component_id IS NULL) OR
        (course_id IS NOT NULL AND class_id IS NOT NULL AND chapter_id IS NOT NULL AND component_id IS NOT NULL)
    )
);

-- 7. Create self_learner_activities table
CREATE TABLE IF NOT EXISTS self_learner_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pathway_id UUID REFERENCES self_learner_pathways(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'view_course', 'complete_chapter', 'complete_component', 'start_learning_session',
        'end_learning_session', 'add_to_favorites', 'create_pathway', 'update_pathway',
        'achieve_milestone', 'receive_achievement', 'update_progress'
    )),
    metadata JSONB DEFAULT '{}'::jsonb,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create public_course_access table
CREATE TABLE IF NOT EXISTS public_course_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'limited_interaction', 'full_access')),
    max_concurrent_users INTEGER DEFAULT 100,
    allow_downloads BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    requires_registration BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id)
);

-- 9. Create public_course_access_logs table
CREATE TABLE IF NOT EXISTS public_course_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'comment', 'enroll')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_user ON self_learner_pathways(user_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_public ON self_learner_pathways(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_self_learner_pathway_items_pathway ON self_learner_pathway_items(pathway_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathway_items_order ON self_learner_pathway_items(pathway_id, order_index);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathway_items_type ON self_learner_pathway_items(item_type);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathway_progress_user ON self_learner_pathway_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_favorites_user ON self_learner_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_favorites_type ON self_learner_favorites(favorite_type);
CREATE INDEX IF NOT EXISTS idx_self_learner_activities_user ON self_learner_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_activities_pathway ON self_learner_activities(pathway_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_activities_type ON self_learner_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_public_course_access_course ON public_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_public_course_access_logs_course ON public_course_access_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_public_course_access_logs_user ON public_course_access_logs(user_id);

-- Enable RLS
ALTER TABLE self_learner_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_pathway_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_pathway_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_course_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for self_learner_pathways
CREATE POLICY "Users can view their own pathways" ON self_learner_pathways
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own pathways" ON self_learner_pathways
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pathways" ON self_learner_pathways
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pathways" ON self_learner_pathways
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public pathways" ON self_learner_pathways
    FOR SELECT USING (is_public = TRUE);

-- RLS Policies for self_learner_pathway_items
CREATE POLICY "Users can view items of their pathways" ON self_learner_pathway_items
    FOR SELECT USING (
        pathway_id IN (
            SELECT id FROM self_learner_pathways WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage items of their pathways" ON self_learner_pathway_items
    FOR ALL USING (
        pathway_id IN (
            SELECT id FROM self_learner_pathways WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for self_learner_pathway_progress
CREATE POLICY "Users can view their own progress" ON self_learner_pathway_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own progress" ON self_learner_pathway_progress
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for self_learner_favorites
CREATE POLICY "Users can manage their own favorites" ON self_learner_favorites
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for self_learner_activities
CREATE POLICY "Users can view their own activities" ON self_learner_activities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own activities" ON self_learner_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for public_course_access
CREATE POLICY "Anyone can view public course access" ON public_course_access
    FOR SELECT USING (TRUE);

CREATE POLICY "Course creators can manage public access" ON public_course_access
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses WHERE created_by = auth.uid()
        )
    );

-- RLS Policies for public_course_access_logs
CREATE POLICY "Users can view their own access logs" ON public_course_access_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Course creators can view their course access logs" ON public_course_access_logs
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "System can insert access logs" ON public_course_access_logs
    FOR INSERT WITH CHECK (TRUE);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_self_learner_pathways_updated_at BEFORE UPDATE ON self_learner_pathways
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_self_learner_pathway_items_updated_at BEFORE UPDATE ON self_learner_pathway_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_self_learner_pathway_progress_updated_at BEFORE UPDATE ON self_learner_pathway_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_course_access_updated_at BEFORE UPDATE ON public_course_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for progress calculation
CREATE OR REPLACE FUNCTION calculate_pathway_progress(pathway_uuid UUID, user_uuid UUID)
RETURNS TABLE(
    total_items INTEGER,
    completed_items INTEGER,
    progress_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_items,
        SUM(CASE WHEN spi.is_completed THEN 1 ELSE 0 END)::INTEGER as completed_items,
        ROUND(
            (COUNT(*)::DECIMAL / NULLIF(SUM(CASE WHEN spi.is_completed THEN 1 ELSE 0 END), 0)) * 100,
            2
        ) as progress_percentage
    FROM self_learner_pathway_items spi
    WHERE spi.pathway_id = pathway_uuid;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE OR REPLACE VIEW self_learner_pathways_with_progress AS
SELECT 
    slp.*,
    slpp.progress_percentage,
    slpp.completed_items,
    slpp.total_items,
    slpp.last_activity_at
FROM self_learner_pathways slp
LEFT JOIN self_learner_pathway_progress slpp ON slp.id = slpp.pathway_id AND slp.user_id = slpp.user_id;

-- Grant permissions
GRANT ALL ON self_learner_pathways TO authenticated;
GRANT ALL ON self_learner_pathway_items TO authenticated;
GRANT ALL ON self_learner_pathway_progress TO authenticated;
GRANT ALL ON self_learner_favorites TO authenticated;
GRANT ALL ON self_learner_activities TO authenticated;
GRANT SELECT ON public_course_access TO authenticated;
GRANT INSERT ON public_course_access_logs TO authenticated;
GRANT SELECT ON public_course_access_logs TO authenticated;

