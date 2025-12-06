-- Migration: Discussion System
-- Creates complete discussion system for WeaveMind LMS
-- Following existing naming conventions and multi-tenant architecture

-- 1) Create discussion thread type enum
CREATE TYPE discussion_thread_type AS ENUM ('general', 'course', 'assignment', 'announcement');
CREATE TYPE discussion_post_type AS ENUM ('text', 'markdown', 'code');
CREATE TYPE notification_level AS ENUM ('none', 'normal', 'high');

-- 2) Create discussion_threads table
CREATE TABLE discussion_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Thread metadata
    title TEXT NOT NULL,
    description TEXT,
    type discussion_thread_type NOT NULL DEFAULT 'general',

    -- Thread status
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,

    -- Activity tracking
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    post_count INTEGER DEFAULT 0,

    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT discussion_threads_course_check CHECK (
        (type = 'course' AND course_id IS NOT NULL AND assignment_id IS NULL) OR
        (type = 'assignment' AND course_id IS NOT NULL AND assignment_id IS NOT NULL) OR
        (type = 'general' AND course_id IS NULL AND assignment_id IS NULL) OR
        (type = 'announcement' AND course_id IS NULL AND assignment_id IS NULL)
    )
);

-- 3) Create discussion_posts table
CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Post content
    title TEXT,
    content TEXT NOT NULL,
    post_type discussion_post_type NOT NULL DEFAULT 'text',
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Post status
    is_edited BOOLEAN DEFAULT FALSE,
    edit_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Threading support
    depth INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    -- Activity tracking
    last_reply_at TIMESTAMP WITH TIME ZONE,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT discussion_posts_depth_check CHECK (depth >= 0 AND depth <= 10),
    CONSTRAINT discussion_posts_title_check CHECK (
        (parent_post_id IS NULL AND title IS NOT NULL) OR
        (parent_post_id IS NOT NULL AND title IS NULL)
    )
);

-- 4) Create discussion_participants table
CREATE TABLE discussion_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Participation tracking
    notification_level notification_level NOT NULL DEFAULT 'normal',
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    post_count INTEGER DEFAULT 0,

    -- Engagement metrics
    first_post_at TIMESTAMP WITH TIME ZONE,
    last_post_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_muted BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,

    -- Audit fields
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(thread_id, user_id)
);

-- 5) Create discussion_reactions table (for post likes/dislikes)
CREATE TABLE discussion_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'helpful', 'confusing')),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(post_id, user_id, reaction_type)
);

-- 6) Create indexes for performance optimization
-- Primary lookup indexes
CREATE INDEX idx_discussion_threads_class ON discussion_threads(class_id);
CREATE INDEX idx_discussion_threads_course ON discussion_threads(course_id);
CREATE INDEX idx_discussion_threads_assignment ON discussion_threads(assignment_id);
CREATE INDEX idx_discussion_threads_org ON discussion_threads(organization_id);
CREATE INDEX idx_discussion_threads_type ON discussion_threads(type);
CREATE INDEX idx_discussion_threads_pinned ON discussion_threads(is_pinned DESC);
CREATE INDEX idx_discussion_threads_activity ON discussion_threads(last_activity_at DESC);

-- Post indexes
CREATE INDEX idx_discussion_posts_thread ON discussion_posts(thread_id);
CREATE INDEX idx_discussion_posts_parent ON discussion_posts(parent_post_id);
CREATE INDEX idx_discussion_posts_user ON discussion_posts(user_id);
CREATE INDEX idx_discussion_posts_created ON discussion_posts(created_at DESC);
CREATE INDEX idx_discussion_posts_depth ON discussion_posts(depth);
CREATE INDEX idx_discussion_posts_undeleted ON discussion_posts(is_deleted) WHERE is_deleted = FALSE;

-- Participant indexes
CREATE INDEX idx_discussion_participants_thread ON discussion_participants(thread_id);
CREATE INDEX idx_discussion_participants_user ON discussion_participants(user_id);
CREATE INDEX idx_discussion_participants_notification ON discussion_participants(notification_level);
CREATE INDEX idx_discussion_participants_read ON discussion_participants(last_read_at);

-- Reaction indexes
CREATE INDEX idx_discussion_reactions_post ON discussion_reactions(post_id);
CREATE INDEX idx_discussion_reactions_user ON discussion_reactions(user_id);
CREATE INDEX idx_discussion_reactions_type ON discussion_reactions(reaction_type);

-- Composite indexes for complex queries
CREATE INDEX idx_discussion_posts_thread_created ON discussion_posts(thread_id, created_at DESC);
CREATE INDEX idx_discussion_participants_thread_notification ON discussion_participants(thread_id, notification_level);

-- 7) Enable RLS on all discussion tables
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_reactions ENABLE ROW LEVEL SECURITY;

-- 8) Create RLS policies for discussion_threads
DO $$
BEGIN
    -- SELECT policy: Class members can view discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_threads'
            AND policyname = 'Class members can view discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Class members can view discussion threads"
                ON discussion_threads FOR SELECT
                USING (
                    class_id IN (
                        SELECT class_id FROM class_members WHERE user_id = auth.uid()
                    )
                    AND (
                        is_public = TRUE
                        OR created_by = auth.uid()
                        OR class_id IN (
                            SELECT class_id FROM class_members
                            WHERE user_id = auth.uid() AND role = 'teacher'
                        )
                    )
                );
        $$;
    END IF;

    -- INSERT policy: Teachers and class members can create discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_threads'
            AND policyname = 'Teachers can create discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Teachers can create discussion threads"
                ON discussion_threads FOR INSERT
                WITH CHECK (
                    created_by = auth.uid()
                    AND class_id IN (
                        SELECT class_id FROM class_members
                        WHERE user_id = auth.uid() AND role = 'teacher'
                    )
                );
        $$;
    END IF;

    -- UPDATE policy: Thread creators and teachers can update discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_threads'
            AND policyname = 'Thread creators and teachers can update discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Thread creators and teachers can update discussion threads"
                ON discussion_threads FOR UPDATE
                USING (
                    created_by = auth.uid()
                    OR class_id IN (
                        SELECT class_id FROM class_members
                        WHERE user_id = auth.uid() AND role = 'teacher'
                    )
                );
        $$;
    END IF;

    -- DELETE policy: Thread creators and teachers can delete discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_threads'
            AND policyname = 'Thread creators and teachers can delete discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Thread creators and teachers can delete discussion threads"
                ON discussion_threads FOR DELETE
                USING (
                    created_by = auth.uid()
                    OR class_id IN (
                        SELECT class_id FROM class_members
                        WHERE user_id = auth.uid() AND role = 'teacher'
                    )
                );
        $$;
    END IF;
END$$;

-- 9) Create RLS policies for discussion_posts
DO $$
BEGIN
    -- SELECT policy: Users can view posts in accessible discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_posts'
            AND policyname = 'Users can view posts in accessible discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view posts in accessible discussion threads"
                ON discussion_posts FOR SELECT
                USING (
                    thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                        AND (
                            dt.is_public = TRUE
                            OR dt.created_by = auth.uid()
                            OR dt.class_id IN (
                                SELECT class_id FROM class_members
                                WHERE user_id = auth.uid() AND role = 'teacher'
                            )
                        )
                    )
                );
        $$;
    END IF;

    -- INSERT policy: Class members can create discussion posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_posts'
            AND policyname = 'Class members can create discussion posts'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Class members can create discussion posts"
                ON discussion_posts FOR INSERT
                WITH CHECK (
                    user_id = auth.uid()
                    AND thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                        AND dt.is_locked = FALSE
                    )
                );
        $$;
    END IF;

    -- UPDATE policy: Post creators can update their own posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_posts'
            AND policyname = 'Post creators can update their own posts'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Post creators can update their own posts"
                ON discussion_posts FOR UPDATE
                USING (
                    user_id = auth.uid()
                    AND thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                    )
                );
        $$;
    END IF;

    -- DELETE policy: Post creators and teachers can delete posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_posts'
            AND policyname = 'Post creators and teachers can delete posts'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Post creators and teachers can delete posts"
                ON discussion_posts FOR DELETE
                USING (
                    user_id = auth.uid()
                    OR thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members
                            WHERE user_id = auth.uid() AND role = 'teacher'
                        )
                    )
                );
        $$;
    END IF;
END$$;

-- 10) Create RLS policies for discussion_participants
DO $$
BEGIN
    -- SELECT policy: Users can view participants of accessible threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_participants'
            AND policyname = 'Users can view participants of accessible threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view participants of accessible threads"
                ON discussion_participants FOR SELECT
                USING (
                    thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                    )
                );
        $$;
    END IF;

    -- INSERT policy: Class members can join discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_participants'
            AND policyname = 'Class members can join discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Class members can join discussion threads"
                ON discussion_participants FOR INSERT
                WITH CHECK (
                    user_id = auth.uid()
                    AND thread_id IN (
                        SELECT dt.id FROM discussion_threads dt
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                    )
                );
        $$;
    END IF;

    -- UPDATE policy: Users can update their own participation settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_participants'
            AND policyname = 'Users can update their own participation settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own participation settings"
                ON discussion_participants FOR UPDATE
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- DELETE policy: Users can leave discussion threads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_participants'
            AND policyname = 'Users can leave discussion threads'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can leave discussion threads"
                ON discussion_participants FOR DELETE
                USING (user_id = auth.uid());
        $$;
    END IF;
END$$;

-- 11) Create RLS policies for discussion_reactions
DO $$
BEGIN
    -- SELECT policy: Users can view reactions on accessible posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_reactions'
            AND policyname = 'Users can view reactions on accessible posts'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view reactions on accessible posts"
                ON discussion_reactions FOR SELECT
                USING (
                    post_id IN (
                        SELECT dp.id FROM discussion_posts dp
                        JOIN discussion_threads dt ON dp.thread_id = dt.id
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                    )
                );
        $$;
    END IF;

    -- INSERT policy: Users can create reactions on posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_reactions'
            AND policyname = 'Users can create reactions on posts'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can create reactions on posts"
                ON discussion_reactions FOR INSERT
                WITH CHECK (
                    user_id = auth.uid()
                    AND post_id IN (
                        SELECT dp.id FROM discussion_posts dp
                        JOIN discussion_threads dt ON dp.thread_id = dt.id
                        WHERE dt.class_id IN (
                            SELECT class_id FROM class_members WHERE user_id = auth.uid()
                        )
                    )
                );
        $$;
    END IF;

    -- UPDATE policy: Users can update their own reactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_reactions'
            AND policyname = 'Users can update their own reactions'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own reactions"
                ON discussion_reactions FOR UPDATE
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- DELETE policy: Users can delete their own reactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'discussion_reactions'
            AND policyname = 'Users can delete their own reactions'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can delete their own reactions"
                ON discussion_reactions FOR DELETE
                USING (user_id = auth.uid());
        $$;
    END IF;
END$$;

-- 12) Create trigger function for updating thread activity
CREATE OR REPLACE FUNCTION update_thread_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update thread's last_activity_at and post_count
    UPDATE discussion_threads
    SET
        last_activity_at = NEW.created_at,
        post_count = (
            SELECT COUNT(*) FROM discussion_posts
            WHERE thread_id = NEW.thread_id AND is_deleted = FALSE
        ),
        updated_at = NEW.created_at
    WHERE id = NEW.thread_id;

    -- Update participant's post count and timestamps
    INSERT INTO discussion_participants (thread_id, user_id, post_count, first_post_at, last_post_at)
    VALUES (
        NEW.thread_id,
        NEW.user_id,
        1,
        NEW.created_at,
        NEW.created_at
    )
    ON CONFLICT (thread_id, user_id)
    DO UPDATE SET
        post_count = discussion_participants.post_count + 1,
        last_post_at = NEW.created_at,
        updated_at = NEW.created_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13) Create trigger for thread activity updates
DROP TRIGGER IF EXISTS trigger_update_thread_activity ON discussion_posts;
CREATE TRIGGER trigger_update_thread_activity
    AFTER INSERT ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_activity();

-- 14) Create trigger function for updating post counts
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent's reply count
    IF NEW.parent_post_id IS NOT NULL THEN
        UPDATE discussion_posts
        SET
            reply_count = (
                SELECT COUNT(*) FROM discussion_posts
                WHERE parent_post_id = NEW.parent_post_id AND is_deleted = FALSE
            ),
            last_reply_at = NEW.created_at,
            updated_at = NEW.created_at
        WHERE id = NEW.parent_post_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15) Create trigger for post reply counts
DROP TRIGGER IF EXISTS trigger_update_post_reply_count ON discussion_posts;
CREATE TRIGGER trigger_update_post_reply_count
    AFTER INSERT ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_reply_count();

-- 16) Create function for updating discussion_reactions counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE discussion_posts
        SET
            like_count = (
                SELECT COUNT(*) FROM discussion_reactions
                WHERE post_id = NEW.post_id AND reaction_type = 'like'
            ),
            dislike_count = (
                SELECT COUNT(*) FROM discussion_reactions
                WHERE post_id = NEW.post_id AND reaction_type = 'dislike'
            ),
            updated_at = NOW()
        WHERE id = NEW.post_id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE discussion_posts
        SET
            like_count = (
                SELECT COUNT(*) FROM discussion_reactions
                WHERE post_id = OLD.post_id AND reaction_type = 'like'
            ),
            dislike_count = (
                SELECT COUNT(*) FROM discussion_reactions
                WHERE post_id = OLD.post_id AND reaction_type = 'dislike'
            ),
            updated_at = NOW()
        WHERE id = OLD.post_id;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 17) Create triggers for reaction count updates
DROP TRIGGER IF EXISTS trigger_update_reaction_counts ON discussion_reactions;
CREATE TRIGGER trigger_update_reaction_counts
    AFTER INSERT OR DELETE ON discussion_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_reaction_counts();

-- 18) Create function for automatic participant joining
CREATE OR REPLACE FUNCTION auto_join_discussion_thread()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-join user to thread when they create first post
    INSERT INTO discussion_participants (thread_id, user_id, joined_at)
    VALUES (NEW.thread_id, NEW.user_id, NOW())
    ON CONFLICT (thread_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 19) Create trigger for automatic participant joining
DROP TRIGGER IF EXISTS trigger_auto_join_thread ON discussion_posts;
CREATE TRIGGER trigger_auto_join_thread
    BEFORE INSERT ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION auto_join_discussion_thread();

-- 20) Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_thread_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION update_post_reply_count() TO authenticated;
GRANT EXECUTE ON FUNCTION update_reaction_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_join_discussion_thread() TO authenticated;

-- 21) Create views for common queries

-- View for thread summary with participant count
CREATE OR REPLACE VIEW discussion_thread_summary AS
SELECT
    dt.id,
    dt.title,
    dt.type,
    dt.is_pinned,
    dt.is_locked,
    dt.is_public,
    dt.post_count,
    dt.last_activity_at,
    dt.created_at,
    dp.post_count as user_post_count,
    dp.notification_level,
    dp.last_read_at,
    dp.joined_at
FROM discussion_threads dt
LEFT JOIN discussion_participants dp ON dt.id = dp.thread_id AND dp.user_id = auth.uid();

-- View for post thread with nested structure
CREATE OR REPLACE VIEW discussion_post_tree AS
WITH RECURSIVE post_tree AS (
    -- Base case: root posts
    SELECT
        dp.id,
        dp.thread_id,
        dp.parent_post_id,
        dp.user_id,
        dp.title,
        dp.content,
        dp.post_type,
        dp.depth,
        dp.reply_count,
        dp.like_count,
        dp.dislike_count,
        dp.is_edited,
        dp.is_deleted,
        dp.created_at,
        dp.updated_at,
        au.email as user_email,
        cm.role as user_class_role,
        ARRAY[]::UUID[] as ancestors,
        0 as ancestor_count
    FROM discussion_posts dp
    JOIN auth.users au ON dp.user_id = au.id
    JOIN class_members cm ON dp.user_id = cm.user_id AND cm.class_id = (
        SELECT class_id FROM discussion_threads WHERE id = dp.thread_id
    )
    WHERE dp.parent_post_id IS NULL AND dp.is_deleted = FALSE

    UNION ALL

    -- Recursive case: replies
    SELECT
        dp.id,
        dp.thread_id,
        dp.parent_post_id,
        dp.user_id,
        dp.title,
        dp.content,
        dp.post_type,
        dp.depth,
        dp.reply_count,
        dp.like_count,
        dp.dislike_count,
        dp.is_edited,
        dp.is_deleted,
        dp.created_at,
        dp.updated_at,
        au.email as user_email,
        cm.role as user_class_role,
        pt.ancestors || dp.parent_post_id,
        pt.ancestor_count + 1
    FROM discussion_posts dp
    JOIN auth.users au ON dp.user_id = au.id
    JOIN class_members cm ON dp.user_id = cm.user_id AND cm.class_id = (
        SELECT class_id FROM discussion_threads WHERE id = dp.thread_id
    )
    JOIN post_tree pt ON dp.parent_post_id = pt.id
    WHERE dp.is_deleted = FALSE AND pt.ancestor_count < 10
)
SELECT * FROM post_tree;

-- Grant view permissions
GRANT SELECT ON discussion_thread_summary TO authenticated;
GRANT SELECT ON discussion_post_tree TO authenticated;