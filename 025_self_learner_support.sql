-- Migration 025: Self-Learner Role Support
-- This migration adds comprehensive support for self-learners in WeaveMind LMS
-- including personalized learning pathways, favorites, activities tracking, 
-- and public course access control.

-- =====================================================
-- 1. EXTEND ROLE SYSTEM FOR SELF-LEARNERS
-- =====================================================

-- Add self_learner to user_role enum type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'self_learner';

-- Update profiles table to include self_learner role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('teacher', 'student', 'self_learner'));

-- Update organization_members role type to include self_learner (user_role enum is already updated above)
-- The constraint will automatically use the updated enum type

-- =====================================================
-- 2. SELF-LEARNER PATHWAYS TABLE
-- =====================================================

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

-- Pathway items for organizing course content
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking for pathway items
CREATE TABLE IF NOT EXISTS self_learner_pathway_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pathway_id UUID NOT NULL REFERENCES self_learner_pathways(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(pathway_id, user_id)
);

-- =====================================================
-- 3. SELF-LEARNER FAVORITES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS self_learner_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    favorite_type TEXT NOT NULL CHECK (favorite_type IN ('course', 'class', 'chapter', 'component')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure at least one of course_id or class_id is present
    CONSTRAINT valid_favorite_reference CHECK (
        (course_id IS NOT NULL AND class_id IS NULL) OR 
        (course_id IS NULL AND class_id IS NOT NULL)
    ),
    -- Prevent duplicate favorites
    UNIQUE(user_id, course_id, class_id, favorite_type)
);

-- =====================================================
-- 4. SELF-LEARNER ACTIVITIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS self_learner_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'view_course', 'complete_chapter', 'complete_component', 
        'start_assignment', 'complete_assignment', 'start_pathway', 
        'complete_pathway', 'add_favorite', 'remove_favorite',
        'study_session_start', 'study_session_end', 'achievement_unlocked'
    )),
    entity_id UUID, -- Can reference course_id, chapter_id, component_id, etc.
    entity_type TEXT, -- 'course', 'chapter', 'component', 'assignment', 'pathway'
    duration_minutes INTEGER, -- For study sessions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PUBLIC COURSE ACCESS CONTROL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public_course_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_publicly_accessible BOOLEAN DEFAULT FALSE,
    access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'limited_interaction', 'full_access')),
    allow_downloads BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT FALSE,
    max_concurrent_users INTEGER, -- NULL means unlimited
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id)
);

-- Public course access logs
CREATE TABLE IF NOT EXISTS public_course_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous access
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'comment', 'interaction')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Pathway indexes
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_user ON self_learner_pathways(user_id);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_public ON self_learner_pathways(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_difficulty ON self_learner_pathways(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_self_learner_pathways_created ON self_learner_pathways(created_at DESC);

-- Pathway items indexes
CREATE INDEX IF NOT EXISTS idx_pathway_items_pathway ON self_learner_pathway_items(pathway_id);
CREATE INDEX IF NOT EXISTS idx_pathway_items_course ON self_learner_pathway_items(course_id);
CREATE INDEX IF NOT EXISTS idx_pathway_items_chapter ON self_learner_pathway_items(chapter_id);
CREATE INDEX IF NOT EXISTS idx_pathway_items_component ON self_learner_pathway_items(component_id);
CREATE INDEX IF NOT EXISTS idx_pathway_items_order ON self_learner_pathway_items(pathway_id, order_index);

-- Pathway progress indexes
CREATE INDEX IF NOT EXISTS idx_pathway_progress_user ON self_learner_pathway_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_pathway_progress_pathway ON self_learner_pathway_progress(pathway_id);
CREATE INDEX IF NOT EXISTS idx_pathway_progress_activity ON self_learner_pathway_progress(last_activity_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON self_learner_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_course ON self_learner_favorites(course_id);
CREATE INDEX IF NOT EXISTS idx_favorites_class ON self_learner_favorites(class_id);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON self_learner_favorites(favorite_type);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user ON self_learner_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON self_learner_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON self_learner_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON self_learner_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_type ON self_learner_activities(user_id, activity_type, created_at DESC);

-- Public course access indexes
CREATE INDEX IF NOT EXISTS idx_public_course_access_course ON public_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_public_course_access_public ON public_course_access(is_publicly_accessible) WHERE is_publicly_accessible = TRUE;

-- Public access logs indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_course ON public_course_access_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public_course_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON public_course_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_course_created ON public_course_access_logs(course_id, created_at DESC);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all self-learner tables
ALTER TABLE self_learner_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_pathway_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_pathway_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_learner_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_course_access_logs ENABLE ROW LEVEL SECURITY;

-- Self-learner pathways policies
DO $$
BEGIN
    -- Users can view their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathways' 
        AND policyname = 'Users can view their own pathways'
    ) THEN
        CREATE POLICY "Users can view their own pathways"
            ON self_learner_pathways FOR SELECT
            USING (user_id = auth.uid());
    END IF;
    
    -- Users can create their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathways' 
        AND policyname = 'Users can create their own pathways'
    ) THEN
        CREATE POLICY "Users can create their own pathways"
            ON self_learner_pathways FOR INSERT
            WITH CHECK (user_id = auth.uid());
    END IF;
    
    -- Users can update their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathways' 
        AND policyname = 'Users can update their own pathways'
    ) THEN
        CREATE POLICY "Users can update their own pathways"
            ON self_learner_pathways FOR UPDATE
            USING (user_id = auth.uid());
    END IF;
    
    -- Users can delete their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathways' 
        AND policyname = 'Users can delete their own pathways'
    ) THEN
        CREATE POLICY "Users can delete their own pathways"
            ON self_learner_pathways FOR DELETE
            USING (user_id = auth.uid());
    END IF;
    
    -- Public pathways are viewable by all authenticated users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathways' 
        AND policyname = 'Public pathways are viewable by all'
    ) THEN
        CREATE POLICY "Public pathways are viewable by all"
            ON self_learner_pathways FOR SELECT
            USING (is_public = TRUE);
    END IF;
END$$;

-- Self-learner pathway items policies
DO $$
BEGIN
    -- Users can view items from their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathway_items' 
        AND policyname = 'Users can view items from their own pathways'
    ) THEN
        CREATE POLICY "Users can view items from their own pathways"
            ON self_learner_pathway_items FOR SELECT
            USING (
                pathway_id IN (
                    SELECT id FROM self_learner_pathways 
                    WHERE user_id = auth.uid() OR is_public = TRUE
                )
            );
    END IF;
    
    -- Users can modify items from their own pathways
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathway_items' 
        AND policyname = 'Users can modify items from their own pathways'
    ) THEN
        CREATE POLICY "Users can modify items from their own pathways"
            ON self_learner_pathway_items FOR ALL
            USING (
                pathway_id IN (
                    SELECT id FROM self_learner_pathways 
                    WHERE user_id = auth.uid()
                )
            )
            WITH CHECK (
                pathway_id IN (
                    SELECT id FROM self_learner_pathways 
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END$$;

-- Self-learner pathway progress policies
DO $$
BEGIN
    -- Users can view their own progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathway_progress' 
        AND policyname = 'Users can view their own progress'
    ) THEN
        CREATE POLICY "Users can view their own progress"
            ON self_learner_pathway_progress FOR SELECT
            USING (user_id = auth.uid());
    END IF;
    
    -- Users can update their own progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_pathway_progress' 
        AND policyname = 'Users can update their own progress'
    ) THEN
        CREATE POLICY "Users can update their own progress"
            ON self_learner_pathway_progress FOR ALL
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END$$;

-- Self-learner favorites policies
DO $$
BEGIN
    -- Users can manage their own favorites
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_favorites' 
        AND policyname = 'Users can manage their own favorites'
    ) THEN
        CREATE POLICY "Users can manage their own favorites"
            ON self_learner_favorites FOR ALL
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END$$;

-- Self-learner activities policies
DO $$
BEGIN
    -- Users can view their own activities
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_activities' 
        AND policyname = 'Users can view their own activities'
    ) THEN
        CREATE POLICY "Users can view their own activities"
            ON self_learner_activities FOR SELECT
            USING (user_id = auth.uid());
    END IF;
    
    -- Users can create their own activities
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'self_learner_activities' 
        AND policyname = 'Users can create their own activities'
    ) THEN
        CREATE POLICY "Users can create their own activities"
            ON self_learner_activities FOR INSERT
            WITH CHECK (user_id = auth.uid());
    END IF;
END$$;

-- Public course access policies
DO $$
BEGIN
    -- Course creators can manage public access settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'public_course_access' 
        AND policyname = 'Course creators can manage public access'
    ) THEN
        CREATE POLICY "Course creators can manage public access"
            ON public_course_access FOR ALL
            USING (
                course_id IN (
                    SELECT id FROM courses 
                    WHERE created_by = auth.uid()
                )
            )
            WITH CHECK (
                course_id IN (
                    SELECT id FROM courses 
                    WHERE created_by = auth.uid()
                )
            );
    END IF;
    
    -- Anyone can view public course access settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'public_course_access' 
        AND policyname = 'Anyone can view public access settings'
    ) THEN
        CREATE POLICY "Anyone can view public access settings"
            ON public_course_access FOR SELECT
            USING (is_publicly_accessible = TRUE);
    END IF;
END$$;

-- Public course access logs policies
DO $$
BEGIN
    -- Course creators can view access logs for their courses
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'public_course_access_logs' 
        AND policyname = 'Course creators can view access logs'
    ) THEN
        CREATE POLICY "Course creators can view access logs"
            ON public_course_access_logs FOR SELECT
            USING (
                course_id IN (
                    SELECT id FROM courses 
                    WHERE created_by = auth.uid()
                )
            );
    END IF;
    
    -- Users can view their own access logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'public_course_access_logs' 
        AND policyname = 'Users can view their own access logs'
    ) THEN
        CREATE POLICY "Users can view their own access logs"
            ON public_course_access_logs FOR SELECT
            USING (user_id = auth.uid());
    END IF;
    
    -- Anyone can create access logs (for anonymous access)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' 
        AND tablename = 'public_course_access_logs' 
        AND policyname = 'Anyone can create access logs'
    ) THEN
        CREATE POLICY "Anyone can create access logs"
            ON public_course_access_logs FOR INSERT
            WITH CHECK (TRUE);
    END IF;
END$$;

-- =====================================================
-- 8. TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.self_learner_pathways'::regclass
        AND tgname = 'self_learner_pathways_updated_at'
    ) THEN
        CREATE TRIGGER self_learner_pathways_updated_at
            BEFORE UPDATE ON self_learner_pathways
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.self_learner_pathway_items'::regclass
        AND tgname = 'self_learner_pathway_items_updated_at'
    ) THEN
        CREATE TRIGGER self_learner_pathway_items_updated_at
            BEFORE UPDATE ON self_learner_pathway_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.self_learner_pathway_progress'::regclass
        AND tgname = 'self_learner_pathway_progress_updated_at'
    ) THEN
        CREATE TRIGGER self_learner_pathway_progress_updated_at
            BEFORE UPDATE ON self_learner_pathway_progress
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.public_course_access'::regclass
        AND tgname = 'public_course_access_updated_at'
    ) THEN
        CREATE TRIGGER public_course_access_updated_at
            BEFORE UPDATE ON public_course_access
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Function to automatically create pathway progress when pathway is created
CREATE OR REPLACE FUNCTION create_pathway_progress()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO self_learner_pathway_progress (pathway_id, user_id, total_items)
    VALUES (NEW.id, NEW.user_id, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.self_learner_pathways'::regclass
        AND tgname = 'create_pathway_progress_trigger'
    ) THEN
        CREATE TRIGGER create_pathway_progress_trigger
            AFTER INSERT ON self_learner_pathways
            FOR EACH ROW
            EXECUTE FUNCTION create_pathway_progress();
    END IF;
END$$;

-- Function to update pathway progress when items are completed
CREATE OR REPLACE FUNCTION update_pathway_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_total_items INTEGER;
    v_completed_items INTEGER;
    v_progress_percentage NUMERIC(5,2);
    v_pathway_user_id UUID;
BEGIN
    -- Get the pathway user_id
    SELECT user_id INTO v_pathway_user_id
    FROM self_learner_pathways
    WHERE id = NEW.pathway_id;
    
    -- Update total items count
    SELECT COUNT(*) INTO v_total_items
    FROM self_learner_pathway_items
    WHERE pathway_id = NEW.pathway_id;
    
    -- Update completed items count
    SELECT COUNT(*) INTO v_completed_items
    FROM self_learner_pathway_items
    WHERE pathway_id = NEW.pathway_id AND is_completed = TRUE;
    
    -- Calculate progress percentage
    IF v_total_items > 0 THEN
        v_progress_percentage := (v_completed_items::NUMERIC / v_total_items::NUMERIC) * 100;
    ELSE
        v_progress_percentage := 0;
    END IF;
    
    -- Update or insert progress record
    INSERT INTO self_learner_pathway_progress (
        pathway_id, 
        user_id, 
        total_items, 
        completed_items, 
        progress_percentage,
        completed_at
    )
    VALUES (
        NEW.pathway_id,
        v_pathway_user_id,
        v_total_items,
        v_completed_items,
        v_progress_percentage,
        CASE WHEN v_progress_percentage = 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (pathway_id, user_id)
    DO UPDATE SET
        total_items = EXCLUDED.total_items,
        completed_items = EXCLUDED.completed_items,
        progress_percentage = EXCLUDED.progress_percentage,
        completed_at = EXCLUDED.completed_at,
        last_activity_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.self_learner_pathway_items'::regclass
        AND tgname = 'update_pathway_progress_trigger'
    ) THEN
        CREATE TRIGGER update_pathway_progress_trigger
            AFTER UPDATE OF is_completed ON self_learner_pathway_items
            FOR EACH ROW
            EXECUTE FUNCTION update_pathway_progress();
    END IF;
END$$;

-- =====================================================
-- 9. DEFAULT DATA INITIALIZATION
-- =====================================================

-- Insert sample self-learner pathways (for demonstration purposes)
-- These can be created by administrators or the system

-- Sample pathway templates
INSERT INTO self_learner_pathways (id, user_id, title, description, difficulty_level, estimated_duration_hours, is_public, tags)
VALUES 
    -- This would normally be created by users, not inserted as default data
    -- Keeping this as example structure only
    (uuid_generate_v4(), (SELECT id FROM auth.users LIMIT 1), 'Sample Programming Pathway', 'Learn programming fundamentals', 'beginner', 40, true, ARRAY['programming', 'basics']),
    (uuid_generate_v4(), (SELECT id FROM auth.users LIMIT 1), 'Advanced Web Development', 'Master modern web development', 'advanced', 80, true, ARRAY['web', 'javascript', 'react'])
ON CONFLICT DO NOTHING;

-- Update organization_members table to allow self_learner role
-- This is handled by the constraint update above

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE self_learner_pathways IS 'Personalized learning pathways created by self-learners';
COMMENT ON TABLE self_learner_pathway_items IS 'Items within learning pathways (courses, chapters, components)';
COMMENT ON TABLE self_learner_pathway_progress IS 'Progress tracking for learning pathways';
COMMENT ON TABLE self_learner_favorites IS 'User favorites for courses and classes';
COMMENT ON TABLE self_learner_activities IS 'Activity log for self-learner actions';
COMMENT ON TABLE public_course_access IS 'Controls for making courses publicly accessible';
COMMENT ON TABLE public_course_access_logs IS 'Access logs for public courses';

COMMENT ON COLUMN self_learner_pathways.difficulty_level IS 'Difficulty level: beginner, intermediate, or advanced';
COMMENT ON COLUMN self_learner_pathways.estimated_duration_hours IS 'Estimated time to complete the pathway in hours';
COMMENT ON COLUMN self_learner_pathways.is_public IS 'Whether this pathway is visible to other users';
COMMENT ON COLUMN self_learner_pathway_items.item_type IS 'Type of content: course, chapter, or component';
COMMENT ON COLUMN self_learner_pathway_items.estimated_duration_minutes IS 'Estimated time to complete this item in minutes';
COMMENT ON COLUMN self_learner_pathway_items.is_completed IS 'Whether this pathway item has been completed';
COMMENT ON COLUMN self_learner_favorites.favorite_type IS 'Type of favorited item: course, class, chapter, or component';
COMMENT ON COLUMN self_learner_activities.activity_type IS 'Type of activity performed by the user';
COMMENT ON COLUMN public_course_access.access_level IS 'Level of access: view, limited_interaction, or full_access';

