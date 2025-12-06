-- Migration: Notification System
-- Creates complete notification system for WeaveMind LMS
-- Following existing naming conventions and multi-tenant architecture

-- 1) Create notification-related enum types
CREATE TYPE notification_type AS ENUM (
    'course_update',
    'assignment_due',
    'new_discussion',
    'discussion_reply',
    'grade_posted',
    'class_announcement',
    'system_alert',
    'ai_assistance',
    'material_shared',
    'deadline_reminder',
    'feedback_received',
    'peer_message'
);

CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE delivery_method AS ENUM ('in_app', 'email', 'push');

CREATE TYPE notification_scope AS ENUM ('organization', 'class', 'individual');

-- 2) Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core notification data
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Notification content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'system_alert',
    priority notification_priority NOT NULL DEFAULT 'normal',
    scope notification_scope NOT NULL DEFAULT 'individual',

    -- Context and relationships
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    discussion_thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
    discussion_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,

    -- Generic reference for future expansion
    related_type TEXT,
    related_id UUID,

    -- Delivery tracking
    delivery_methods JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
    delivery_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_delivery JSONB DEFAULT '[]'::jsonb,

    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Expiration and scheduling
    expires_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT notifications_organization_scope_check CHECK (
        (scope = 'organization' AND class_id IS NULL) OR
        (scope = 'class' AND class_id IS NOT NULL) OR
        (scope = 'individual' AND class_id IS NULL)
    ),
    CONSTRAINT notifications_delivery_methods_check CHECK (
        jsonb_typeof(delivery_methods) = 'array'
    ),
    CONSTRAINT notifications_delivery_status_check CHECK (
        jsonb_typeof(delivery_status) = 'object'
    ),
    CONSTRAINT notifications_failed_delivery_check CHECK (
        jsonb_typeof(failed_delivery) = 'array'
    )
);

-- 3) Create notification_preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Scope and context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

    -- Preference type (user-wide, org-wide, or class-wide)
    scope notification_scope NOT NULL DEFAULT 'individual',

    -- Notification type and preferences
    notification_type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',

    -- Delivery method preferences (JSONB for flexibility)
    delivery_preferences JSONB NOT NULL DEFAULT '{"in_app": true, "email": false, "push": false}'::jsonb,

    -- Category-level preferences
    category_preferences JSONB DEFAULT '{}'::jsonb,

    -- Quiet hours and do-not-disturb
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone TEXT DEFAULT 'UTC',

    -- Do not disturb periods
    dnd_enabled BOOLEAN DEFAULT FALSE,
    dnd_start_date DATE,
    dnd_end_date DATE,

    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT notification_preferences_scope_check CHECK (
        (scope = 'organization' AND organization_id IS NOT NULL AND class_id IS NULL) OR
        (scope = 'class' AND class_id IS NOT NULL AND organization_id IS NOT NULL) OR
        (scope = 'individual' AND organization_id IS NULL AND class_id IS NULL)
    ),
    CONSTRAINT notification_preferences_delivery_prefs_check CHECK (
        jsonb_typeof(delivery_preferences) = 'object'
    ),
    CONSTRAINT notification_preferences_category_prefs_check CHECK (
        jsonb_typeof(category_preferences) = 'object'
    ),
    CONSTRAINT notification_preferences_unique_check UNIQUE(
        user_id, notification_type, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(class_id, '00000000-0000-0000-0000-000000000000'::UUID), scope
    )
);

-- 4) Create notification_queue table for batch processing
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Queue metadata
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    delivery_method delivery_method NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),

    -- Queue execution
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error_message TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,

    -- Results
    sent_at TIMESTAMP WITH TIME ZONE,
    response_data JSONB,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for queue processing
    CONSTRAINT notification_queue_unique_notification_method UNIQUE(notification_id, delivery_method)
);

-- 5) Create notification_read_status table for detailed read tracking
CREATE TABLE notification_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core relationship
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Read status by delivery method
    read_by_method JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Additional metadata
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT notification_read_status_unique_notification_user UNIQUE(notification_id, user_id),
    CONSTRAINT notification_read_status_read_by_method_check CHECK (
        jsonb_typeof(read_by_method) = 'object'
    )
);

-- 6) Create notification_templates table for reusable templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template metadata
    name TEXT NOT NULL UNIQUE,
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',

    -- Template content (supports variables)
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    email_subject_template TEXT,
    email_body_template TEXT,
    push_title_template TEXT,
    push_body_template TEXT,

    -- Template configuration
    default_delivery_methods JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
    default_metadata JSONB DEFAULT '{}'::jsonb,

    -- Template versioning and status
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    variables JSONB DEFAULT '[]'::jsonb,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT notification_templates_delivery_methods_check CHECK (
        jsonb_typeof(default_delivery_methods) = 'array'
    ),
    CONSTRAINT notification_templates_variables_check CHECK (
        jsonb_typeof(variables) = 'array'
    )
);

-- 7) Create indexes for performance optimization

-- Primary lookup indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_class ON notifications(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_scope ON notifications(scope);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Status and read tracking indexes
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE AND is_archived = FALSE;
CREATE INDEX idx_notifications_archived ON notifications(user_id, archived_at DESC) WHERE is_archived = TRUE;
CREATE INDEX idx_notifications_read_at ON notifications(user_id, read_at DESC) WHERE read_at IS NOT NULL;

-- Context and relationship indexes
CREATE INDEX idx_notifications_course ON notifications(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_notifications_assignment ON notifications(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_notifications_discussion_thread ON notifications(discussion_thread_id) WHERE discussion_thread_id IS NOT NULL;
CREATE INDEX idx_notifications_discussion_post ON notifications(discussion_post_id) WHERE discussion_post_id IS NOT NULL;

-- Delivery and expiration indexes
CREATE INDEX idx_notifications_delivery_methods ON notifications USING GIN(delivery_methods);
CREATE INDEX idx_notifications_delivery_status ON notifications USING GIN(delivery_status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Notification preferences indexes
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_org ON notification_preferences(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_notification_preferences_class ON notification_preferences(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_notification_preferences_type ON notification_preferences(notification_type);
CREATE INDEX idx_notification_preferences_scope ON notification_preferences(scope);
CREATE INDEX idx_notification_preferences_active ON notification_preferences(user_id, is_active) WHERE is_active = TRUE;

-- Notification queue indexes
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_next_attempt ON notification_queue(next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_notification ON notification_queue(notification_id);

-- Notification read status indexes
CREATE INDEX idx_notification_read_status_user ON notification_read_status(user_id);
CREATE INDEX idx_notification_read_status_notification ON notification_read_status(notification_id);
CREATE INDEX idx_notification_read_status_read_at ON notification_read_status(user_id, read_at DESC);

-- Notification templates indexes
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = TRUE;

-- Composite indexes for complex queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE AND is_archived = FALSE;
CREATE INDEX idx_notifications_user_priority ON notifications(user_id, priority DESC, created_at DESC);
CREATE INDEX idx_notifications_org_class ON notifications(organization_id, class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_notification_preferences_user_type ON notification_preferences(user_id, notification_type);
CREATE INDEX idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_for);

-- 8) Enable RLS on all notification tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- 9) Create RLS policies for notifications
DO $$
BEGIN
    -- SELECT policy: Users can view their own notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notifications'
            AND policyname = 'Users can view their own notifications'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own notifications"
                ON notifications FOR SELECT
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- INSERT policy: System and authorized users can create notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notifications'
            AND policyname = 'Authorized users can create notifications'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Authorized users can create notifications"
                ON notifications FOR INSERT
                WITH CHECK (
                    -- System-created notifications (created_by is NULL)
                    created_by IS NULL
                    OR
                    -- Teachers creating class/organization notifications
                    (
                        created_by = auth.uid()
                        AND (
                            -- Organization-level notifications
                            (scope = 'organization' AND class_id IS NULL AND organization_id IN (
                                SELECT organization_id FROM organization_members
                                WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
                            ))
                            OR
                            -- Class-level notifications
                            (scope = 'class' AND class_id IN (
                                SELECT class_id FROM class_members
                                WHERE user_id = auth.uid() AND role = 'teacher'
                            ))
                            OR
                            -- Individual notifications (any class member can send to students)
                            (scope = 'individual' AND class_id IN (
                                SELECT class_id FROM class_members
                                WHERE user_id = auth.uid()
                            ))
                        )
                    )
                );
        $$;
    END IF;

    -- UPDATE policy: Users can update their own notification status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notifications'
            AND policyname = 'Users can update their own notification status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own notification status"
                ON notifications FOR UPDATE
                USING (
                    user_id = auth.uid()
                    AND (
                        -- Users can mark their own notifications as read/archived
                        is_read IS DISTINCT FROM OLD.is_read
                        OR is_archived IS DISTINCT FROM OLD.is_archived
                    )
                );
        $$;
    END IF;

    -- DELETE policy: Users can delete their own notifications (soft delete via archiving)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notifications'
            AND policyname = 'Users can archive their own notifications'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can archive their own notifications"
                ON notifications FOR DELETE
                USING (
                    user_id = auth.uid()
                    AND is_archived = FALSE
                );
        $$;
    END IF;
END$$;

-- 10) Create RLS policies for notification_preferences
DO $$
BEGIN
    -- SELECT policy: Users can view their own preferences
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_preferences'
            AND policyname = 'Users can view their own preferences'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own preferences"
                ON notification_preferences FOR SELECT
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- INSERT policy: Users can create their own preferences
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_preferences'
            AND policyname = 'Users can create their own preferences'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can create their own preferences"
                ON notification_preferences FOR INSERT
                WITH CHECK (user_id = auth.uid());
        $$;
    END IF;

    -- UPDATE policy: Users can update their own preferences
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_preferences'
            AND policyname = 'Users can update their own preferences'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own preferences"
                ON notification_preferences FOR UPDATE
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- DELETE policy: Users can delete their own preferences
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_preferences'
            AND policyname = 'Users can delete their own preferences'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can delete their own preferences"
                ON notification_preferences FOR DELETE
                USING (user_id = auth.uid());
        $$;
    END IF;
END$$;

-- 11) Create RLS policies for notification_queue
DO $$
BEGIN
    -- SELECT policy: Users can view their notification queue status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_queue'
            AND policyname = 'Users can view their notification queue status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their notification queue status"
                ON notification_queue FOR SELECT
                USING (
                    notification_id IN (
                        SELECT id FROM notifications WHERE user_id = auth.uid()
                    )
                );
        $$;
    END IF;

    -- INSERT policy: System can manage notification queue
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_queue'
            AND policyname = 'System can manage notification queue'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can manage notification queue"
                ON notification_queue FOR INSERT
                WITH CHECK (TRUE);
        $$;
    END IF;

    -- UPDATE policy: System and services can update queue status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_queue'
            AND policyname = 'System can update notification queue status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can update notification queue status"
                ON notification_queue FOR UPDATE
                USING (TRUE);
        $$;
    END IF;

    -- DELETE policy: System can clean up completed queue entries
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_queue'
            AND policyname = 'System can clean up notification queue'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can clean up notification queue"
                ON notification_queue FOR DELETE
                USING (status IN ('sent', 'cancelled'));
        $$;
    END IF;
END$$;

-- 12) Create RLS policies for notification_read_status
DO $$
BEGIN
    -- SELECT policy: Users can view their own read status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_read_status'
            AND policyname = 'Users can view their own read status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own read status"
                ON notification_read_status FOR SELECT
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- INSERT policy: Users can create their own read status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_read_status'
            AND policyname = 'Users can create their own read status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can create their own read status"
                ON notification_read_status FOR INSERT
                WITH CHECK (user_id = auth.uid());
        $$;
    END IF;

    -- UPDATE policy: Users can update their own read status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_read_status'
            AND policyname = 'Users can update their own read status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own read status"
                ON notification_read_status FOR UPDATE
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- DELETE policy: Users can delete their own read status
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_read_status'
            AND policyname = 'Users can delete their own read status'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can delete their own read status"
                ON notification_read_status FOR DELETE
                USING (user_id = auth.uid());
        $$;
    END IF;
END$$;

-- 13) Create RLS policies for notification_templates
DO $$
BEGIN
    -- SELECT policy: Authenticated users can view active templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_templates'
            AND policyname = 'Users can view active notification templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view active notification templates"
                ON notification_templates FOR SELECT
                USING (is_active = TRUE);
        $$;
    END IF;

    -- INSERT policy: System and authorized users can create templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_templates'
            AND policyname = 'System can create notification templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can create notification templates"
                ON notification_templates FOR INSERT
                WITH CHECK (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;

    -- UPDATE policy: Template creators and system can update templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_templates'
            AND policyname = 'Template creators can update notification templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Template creators can update notification templates"
                ON notification_templates FOR UPDATE
                USING (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;

    -- DELETE policy: Template creators and system can delete templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'notification_templates'
            AND policyname = 'Template creators can delete notification templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Template creators can delete notification templates"
                ON notification_templates FOR DELETE
                USING (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;
END$$;

-- 14) Create trigger function for updating notification read status
CREATE OR REPLACE FUNCTION update_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track read status when notification is marked as read
    IF NEW.is_read = TRUE AND (OLD.is_read IS DISTINCT FROM NEW.is_read) THEN
        INSERT INTO notification_read_status (
            notification_id,
            user_id,
            read_at,
            metadata
        )
        VALUES (
            NEW.id,
            NEW.user_id,
            COALESCE(NEW.read_at, NOW()),
            jsonb_build_object(
                'read_method', 'in_app',
                'timestamp', NOW(),
                'triggered_by', 'notification_update'
            )
        )
        ON CONFLICT (notification_id, user_id)
        DO UPDATE SET
            read_at = COALESCE(NEW.read_at, NOW()),
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15) Create trigger for notification read status updates
DROP TRIGGER IF EXISTS trigger_update_notification_read_status ON notifications;
CREATE TRIGGER trigger_update_notification_read_status
    AFTER UPDATE ON notifications
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = TRUE)
    EXECUTE FUNCTION update_notification_read_status();

-- 16) Create function for automatic notification cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive expired notifications
    UPDATE notifications
    SET is_archived = TRUE,
        archived_at = NOW(),
        updated_at = NOW()
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND is_archived = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Clean up old notification queue entries (older than 30 days)
    DELETE FROM notification_queue
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND status IN ('sent', 'cancelled', 'failed');

    -- Clean up old read status entries (older than 1 year)
    DELETE FROM notification_read_status
    WHERE created_at < NOW() - INTERVAL '1 year';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 17) Create function for batch notification processing
CREATE OR REPLACE FUNCTION process_notification_batch(
    p_batch_size INTEGER DEFAULT 100,
    p_delivery_method delivery_method DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    queue_record RECORD;
BEGIN
    -- Process notifications from queue
    FOR queue_record IN
        SELECT nq.id, nq.notification_id, nq.delivery_method, n.status
        FROM notification_queue nq
        JOIN notifications n ON nq.notification_id = n.id
        WHERE nq.status = 'pending'
          AND nq.scheduled_for <= NOW()
          AND (p_delivery_method IS NULL OR nq.delivery_method = p_delivery_method)
          AND n.expires_at IS NULL OR n.expires_at > NOW()
        ORDER BY nq.scheduled_for ASC
        LIMIT p_batch_size
    LOOP
        -- Mark as processing
        UPDATE notification_queue
        SET status = 'processing',
            updated_at = NOW()
        WHERE id = queue_record.id;

        -- Update notification delivery status
        UPDATE notifications
        SET
            delivery_status = jsonb_set(
                delivery_status,
                ARRAY[queue_record.delivery_method::text],
                '"processing"'
            ),
            updated_at = NOW()
        WHERE id = queue_record.notification_id;

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 18) Create function for getting user notification summary
CREATE OR REPLACE FUNCTION get_user_notification_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT jsonb_build_object(
        'total_unread', (
            SELECT COUNT(*) FROM notifications
            WHERE user_id = p_user_id AND is_read = FALSE AND is_archived = FALSE
        ),
        'total_archived', (
            SELECT COUNT(*) FROM notifications
            WHERE user_id = p_user_id AND is_archived = TRUE
        ),
        'by_priority', (
            SELECT jsonb_object_agg(priority, count)
            FROM (
                SELECT priority, COUNT(*) as count
                FROM notifications
                WHERE user_id = p_user_id AND is_read = FALSE AND is_archived = FALSE
                GROUP BY priority
            ) priority_counts
        ),
        'by_type', (
            SELECT jsonb_object_agg(type, count)
            FROM (
                SELECT type, COUNT(*) as count
                FROM notifications
                WHERE user_id = p_user_id AND is_read = FALSE AND is_archived = FALSE
                GROUP BY type
            ) type_counts
        ),
        'recent_activity', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'title', title,
                    'type', type,
                    'priority', priority,
                    'created_at', created_at
                )
                ORDER BY created_at DESC
                LIMIT 5
            )
            FROM notifications
            WHERE user_id = p_user_id AND is_read = FALSE
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 19) Create function for creating bulk notifications
CREATE OR REPLACE FUNCTION create_bulk_notifications(
    p_notifications JSONB
)
RETURNS INTEGER AS $$
DECLARE
    notification_record JSONB;
    created_count INTEGER := 0;
    notification_id UUID;
BEGIN
    -- Loop through notification array
    FOR notification_record IN SELECT * FROM jsonb_array_elements(p_notifications)
    LOOP
        INSERT INTO notifications (
            user_id,
            organization_id,
            class_id,
            course_id,
            assignment_id,
            discussion_thread_id,
            discussion_post_id,
            title,
            content,
            type,
            priority,
            scope,
            delivery_methods,
            metadata,
            scheduled_for,
            expires_at,
            created_by
        ) VALUES (
            (notification_record->>'user_id')::UUID,
            (notification_record->>'organization_id')::UUID,
            CASE WHEN notification_record ? 'class_id' THEN (notification_record->>'class_id')::UUID ELSE NULL END,
            CASE WHEN notification_record ? 'course_id' THEN (notification_record->>'course_id')::UUID ELSE NULL END,
            CASE WHEN notification_record ? 'assignment_id' THEN (notification_record->>'assignment_id')::UUID ELSE NULL END,
            CASE WHEN notification_record ? 'discussion_thread_id' THEN (notification_record->>'discussion_thread_id')::UUID ELSE NULL END,
            CASE WHEN notification_record ? 'discussion_post_id' THEN (notification_record->>'discussion_post_id')::UUID ELSE NULL END,
            notification_record->>'title',
            notification_record->>'content',
            (notification_record->>'type')::notification_type,
            COALESCE((notification_record->>'priority')::notification_priority, 'normal'),
            COALESCE((notification_record->>'scope')::notification_scope, 'individual'),
            COALESCE(notification_record->'delivery_methods', '["in_app"]'::jsonb),
            COALESCE(notification_record->'metadata', '{}'::jsonb),
            CASE WHEN notification_record ? 'scheduled_for' THEN (notification_record->>'scheduled_for')::timestamp WITH TIME ZONE ELSE NULL END,
            CASE WHEN notification_record ? 'expires_at' THEN (notification_record->>'expires_at')::timestamp WITH TIME ZONE ELSE NULL END,
            CASE WHEN notification_record ? 'created_by' THEN (notification_record->>'created_by')::UUID ELSE auth.uid() END
        )
        RETURNING id INTO notification_id;

        -- Create queue entries for each delivery method
        INSERT INTO notification_queue (notification_id, delivery_method, scheduled_for)
        SELECT
            notification_id,
            delivery_method,
            COALESCE((notification_record->>'scheduled_for')::timestamp WITH TIME ZONE, NOW())
        FROM jsonb_array_elements_text(
            COALESCE(notification_record->'delivery_methods', '["in_app"]'::jsonb)
        ) AS delivery_method;

        created_count := created_count + 1;
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- 20) Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_notification_read_status() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_batch(INTEGER, delivery_method) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_bulk_notifications(JSONB) TO authenticated;

-- 21) Create views for common queries

-- View for user notifications with context
CREATE OR REPLACE VIEW user_notifications_with_context AS
SELECT
    n.id,
    n.title,
    n.content,
    n.type,
    n.priority,
    n.scope,
    n.is_read,
    n.read_at,
    n.is_archived,
    n.archived_at,
    n.created_at,
    n.updated_at,
    -- Context information
    c.name as class_name,
    crs.title as course_title,
    a.title as assignment_title,
    dt.title as discussion_thread_title,
    -- User context
    u.email as user_email,
    -- Read status
    nrs.read_at as detailed_read_at,
    nrs.read_by_method
FROM notifications n
LEFT JOIN classes c ON n.class_id = c.id
LEFT JOIN courses crs ON n.course_id = crs.id
LEFT JOIN assignments a ON n.assignment_id = a.id
LEFT JOIN discussion_threads dt ON n.discussion_thread_id = dt.id
LEFT JOIN auth.users u ON n.user_id = u.id
LEFT JOIN notification_read_status nrs ON n.id = nrs.notification_id AND nrs.user_id = n.user_id;

-- View for notification queue with details
CREATE OR REPLACE VIEW notification_queue_with_details AS
SELECT
    nq.id,
    nq.notification_id,
    nq.delivery_method,
    nq.status,
    nq.scheduled_for,
    nq.attempts,
    nq.max_attempts,
    nq.next_attempt_at,
    nq.error_message,
    nq.last_error_at,
    nq.sent_at,
    nq.response_data,
    nq.created_at,
    nq.updated_at,
    -- Notification details
    n.title as notification_title,
    n.type as notification_type,
    n.priority as notification_priority,
    n.user_id,
    u.email as user_email
FROM notification_queue nq
JOIN notifications n ON nq.notification_id = n.id
LEFT JOIN auth.users u ON n.user_id = u.id;

-- View for notification statistics
CREATE OR REPLACE VIEW notification_statistics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    type,
    priority,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_notifications,
    COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications,
    COUNT(CASE WHEN is_archived = TRUE THEN 1 END) as archived_notifications,
    AVG(CASE WHEN read_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (read_at - created_at))/3600.0
        ELSE NULL END) as avg_read_time_hours
FROM notifications
GROUP BY DATE_TRUNC('day', created_at), type, priority
ORDER BY date DESC, type, priority;

-- Grant view permissions
GRANT SELECT ON user_notifications_with_context TO authenticated;
GRANT SELECT ON notification_queue_with_details TO authenticated;
GRANT SELECT ON notification_statistics TO authenticated;

-- 22) Insert default notification templates
INSERT INTO notification_templates (name, type, priority, title_template, content_template, email_subject_template, email_body_template, push_title_template, push_body_template, default_delivery_methods, variables)
VALUES
    ('Course Update', 'course_update', 'normal', 'Course Updated: {{course_title}}', 'The course "{{course_title}}" has been updated with new content.', 'Course Update: {{course_title}}', 'The course "{{course_title}}" has been updated with new content. Please review the changes.', 'Course Updated', '{{course_title}} has new content!', '["in_app", "email"]'::jsonb, '["course_title", "instructor_name"]'::jsonb),

    ('Assignment Due', 'assignment_due', 'high', 'Assignment Due Soon: {{assignment_title}}', 'Your assignment "{{assignment_title}}" is due on {{due_date}}.', 'Assignment Due: {{assignment_title}}', 'Your assignment "{{assignment_title}}" is due on {{due_date}}. Please submit your work.', 'Assignment Due', '{{assignment_title}} is due {{due_date}}!', '["in_app", "push"]'::jsonb, '["assignment_title", "due_date", "class_name"]'::jsonb),

    ('New Discussion', 'new_discussion', 'normal', 'New Discussion: {{thread_title}}', 'A new discussion thread "{{thread_title}}" has been started in {{class_name}}.', 'New Discussion: {{thread_title}}', 'A new discussion thread "{{thread_title}}" has been started in {{class_name}}. Join the conversation!', 'New Discussion', '{{thread_title}} started in {{class_name}}', '["in_app"]'::jsonb, '["thread_title", "class_name", "author_name"]'::jsonb),

    ('Grade Posted', 'grade_posted', 'high', 'Grade Posted: {{assignment_title}}', 'Your grade for "{{assignment_title}}" has been posted. Score: {{score}}', 'Grade Posted: {{assignment_title}}', 'Your grade for "{{assignment_title}}" has been posted. Score: {{score}}. Check your feedback in the assignment details.', 'Grade Posted', '{{assignment_title}}: {{score}}', '["in_app", "email"]'::jsonb, '["assignment_title", "score", "class_name"]'::jsonb),

    ('System Alert', 'system_alert', 'urgent', 'System Alert: {{alert_title}}', '{{alert_content}}', 'System Alert: {{alert_title}}', '{{alert_content}}', 'System Alert', '{{alert_title}}', '["in_app", "email", "push"]'::jsonb, '["alert_title", "alert_content"]'::jsonb);

-- 23) Create functions for Realtime support
CREATE OR REPLACE FUNCTION get_notification_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Return the notification data for realtime updates
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create realtime triggers for live notification updates
DROP TRIGGER IF EXISTS notification_realtime_changes ON notifications;
CREATE TRIGGER notification_realtime_changes
    AFTER INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION get_notification_changes();

-- 24) Final setup and permissions
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable realtime for notification tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_queue;