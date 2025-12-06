-- Migration: Settings Management System
-- Creates comprehensive settings and onboarding system for WeaveMind LMS
-- Following existing naming conventions and multi-tenant architecture

-- 1) Create enum types for settings management
CREATE TYPE settings_scope AS ENUM ('system', 'organization', 'user');
CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE setting_data_type AS ENUM ('boolean', 'string', 'number', 'json', 'array');

-- 2) Create user_settings table for flexible user preferences
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core identification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Settings scope and context
    scope settings_scope NOT NULL DEFAULT 'user',
    setting_category TEXT NOT NULL, -- 'interface', 'ai', 'notifications', 'learning', 'accessibility'
    setting_key TEXT NOT NULL, -- 'theme', 'language', 'ai_response_speed', etc.

    -- Setting value and metadata
    setting_value JSONB NOT NULL,
    data_type setting_data_type NOT NULL DEFAULT 'json',
    default_value JSONB,
    is_encrypted BOOLEAN DEFAULT FALSE,

    -- Inheritance and overrides
    parent_setting_id UUID REFERENCES user_settings(id) ON DELETE CASCADE,
    override_level INTEGER DEFAULT 0, -- 0=user, 1=organization, 2=system
    can_override BOOLEAN DEFAULT TRUE,

    -- Version control and audit
    version INTEGER NOT NULL DEFAULT 1,
    previous_version UUID REFERENCES user_settings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    -- Validation and constraints
    validation_schema JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Metadata
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints for proper scoping
    CONSTRAINT user_settings_scope_check CHECK (
        (scope = 'system' AND user_id IS NULL AND organization_id IS NULL) OR
        (scope = 'organization' AND user_id IS NULL AND organization_id IS NOT NULL) OR
        (scope = 'user' AND user_id IS NOT NULL AND organization_id IS NULL)
    ),
    CONSTRAINT user_settings_inheritance_check CHECK (
        (scope = 'system' AND parent_setting_id IS NULL) OR
        (scope = 'organization' AND parent_setting_id IS NOT NULL) OR
        (scope = 'user' AND parent_setting_id IS NOT NULL)
    ),
    CONSTRAINT user_settings_value_type_check CHECK (
        jsonb_typeof(setting_value) = CASE
            WHEN data_type = 'boolean' THEN 'boolean'
            WHEN data_type = 'string' THEN 'string'
            WHEN data_type = 'number' THEN 'number'
            WHEN data_type = 'json' THEN 'object'
            WHEN data_type = 'array' THEN 'array'
            ELSE 'object'
        END
    ),
    CONSTRAINT user_settings_version_check CHECK (version > 0),
    CONSTRAINT user_settings_override_level_check CHECK (override_level >= 0),

    -- Unique constraint for setting uniqueness per scope
    CONSTRAINT user_settings_unique_per_scope UNIQUE(
        setting_category,
        setting_key,
        COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::UUID),
        scope
    )
);

-- 3) Create onboarding_templates table for reusable onboarding flows
CREATE TABLE onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template metadata
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    target_roles user_role[] NOT NULL, -- Array of roles this template applies to
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,

    -- Template structure
    flow_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of steps with order, conditions, etc.
    estimated_duration_minutes INTEGER, -- Estimated time to complete
    prerequisites JSONB DEFAULT '[]'::jsonb, -- Array of prerequisite conditions

    -- Localization support
    translations JSONB DEFAULT '{}'::jsonb, -- Key-value pairs of language->translated content

    -- Template configuration
    settings JSONB DEFAULT '{}'::jsonb, -- Settings to apply during onboarding
    analytics JSONB DEFAULT '{}'::jsonb, -- Tracking and analytics configuration

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT onboarding_templates_flow_data_check CHECK (
        jsonb_typeof(flow_data) = 'array'
    ),
    CONSTRAINT onboarding_templates_translations_check CHECK (
        jsonb_typeof(translations) = 'object'
    ),
    CONSTRAINT onboarding_templates_prerequisites_check CHECK (
        jsonb_typeof(prerequisites) = 'array'
    ),
    CONSTRAINT onboarding_templates_settings_check CHECK (
        jsonb_typeof(settings) = 'object'
    )
);

-- 4) Create onboarding_progress table for tracking user progress
CREATE TABLE onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core relationship
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,

    -- Progress tracking
    status onboarding_status NOT NULL DEFAULT 'not_started',
    current_step_index INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER DEFAULT 0,

    -- Timing information
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Step-specific data
    step_data JSONB DEFAULT '[]'::jsonb, -- Array of step completion data
    skipped_steps JSONB DEFAULT '[]'::jsonb, -- Array of skipped step indices
    failed_steps JSONB DEFAULT '[]'::jsonb, -- Array of failed step indices

    -- Progress metadata
    completion_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_steps > 0 THEN (completed_steps::NUMERIC / total_steps::NUMERIC) * 100
            ELSE 0
        END
    ) STORED,
    user_agent TEXT,
    ip_address INET,

    -- Audit and tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints
    CONSTRAINT onboarding_progress_step_data_check CHECK (
        jsonb_typeof(step_data) = 'array'
    ),
    CONSTRAINT onboarding_progress_skipped_steps_check CHECK (
        jsonb_typeof(skipped_steps) = 'array'
    ),
    CONSTRAINT onboarding_progress_failed_steps_check CHECK (
        jsonb_typeof(failed_steps) = 'array'
    ),
    CONSTRAINT onboarding_progress_percentage_check CHECK (
        completion_percentage >= 0 AND completion_percentage <= 100
    ),
    CONSTRAINT onboarding_progress_unique_user_template UNIQUE(user_id, template_id)
);

-- 5) Create settings_audit_log table for tracking changes
CREATE TABLE settings_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Audit metadata
    setting_id UUID NOT NULL REFERENCES user_settings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Change tracking
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
    old_value JSONB,
    new_value JSONB,
    changed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Context information
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_id TEXT,

    -- Audit metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT, -- Reason for the change
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6) Create organization_default_settings table for organization-level defaults
CREATE TABLE organization_default_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core relationship
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL,

    -- Default value
    default_value JSONB NOT NULL,
    data_type setting_data_type NOT NULL DEFAULT 'json',
    description TEXT,

    -- Inheritance and override settings
    can_user_override BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1, -- Higher priority overrides lower priority

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT organization_default_settings_value_type_check CHECK (
        jsonb_typeof(default_value) = CASE
            WHEN data_type = 'boolean' THEN 'boolean'
            WHEN data_type = 'string' THEN 'string'
            WHEN data_type = 'number' THEN 'number'
            WHEN data_type = 'json' THEN 'object'
            WHEN data_type = 'array' THEN 'array'
            ELSE 'object'
        END
    ),
    CONSTRAINT organization_default_settings_unique UNIQUE(
        organization_id,
        setting_category,
        setting_key
    )
);

-- 7) Create indexes for performance optimization

-- User settings indexes
CREATE INDEX idx_user_settings_user ON user_settings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_settings_org ON user_settings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_user_settings_scope ON user_settings(scope);
CREATE INDEX idx_user_settings_category ON user_settings(setting_category);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX idx_user_settings_active ON user_settings(is_active, is_deleted) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_user_settings_updated ON user_settings(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_user_settings_user_category ON user_settings(user_id, setting_category) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_settings_org_category ON user_settings(organization_id, setting_category) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_user_settings_inheritance ON user_settings(parent_setting_id, override_level);

-- Onboarding templates indexes
CREATE INDEX idx_onboarding_templates_active ON onboarding_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_onboarding_templates_roles ON onboarding_templates USING GIN(target_roles);
CREATE INDEX idx_onboarding_templates_version ON onboarding_templates(version);

-- Onboarding progress indexes
CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_org ON onboarding_progress(organization_id);
CREATE INDEX idx_onboarding_progress_template ON onboarding_progress(template_id);
CREATE INDEX idx_onboarding_progress_status ON onboarding_progress(status);
CREATE INDEX idx_onboarding_progress_last_activity ON onboarding_progress(last_activity_at DESC);
CREATE INDEX idx_onboarding_progress_incomplete ON onboarding_progress(user_id) WHERE status IN ('not_started', 'in_progress');

-- Composite indexes for onboarding
CREATE INDEX idx_onboarding_progress_user_template ON onboarding_progress(user_id, template_id);
CREATE INDEX idx_onboarding_progress_org_template ON onboarding_progress(organization_id, template_id);

-- Settings audit log indexes
CREATE INDEX idx_settings_audit_log_setting ON settings_audit_log(setting_id);
CREATE INDEX idx_settings_audit_log_user ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_org ON settings_audit_log(organization_id);
CREATE INDEX idx_settings_audit_log_action ON settings_audit_log(action);
CREATE INDEX idx_settings_audit_log_created ON settings_audit_log(created_at DESC);

-- Organization default settings indexes
CREATE INDEX idx_org_default_settings_org ON organization_default_settings(organization_id);
CREATE INDEX idx_org_default_settings_category ON organization_default_settings(setting_category);
CREATE INDEX idx_org_default_settings_priority ON organization_default_settings(organization_id, priority DESC);

-- Composite indexes for organization defaults
CREATE INDEX idx_org_default_settings_org_category ON organization_default_settings(organization_id, setting_category);

-- 8) Enable RLS on all settings tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_default_settings ENABLE ROW LEVEL SECURITY;

-- 9) Create RLS policies for user_settings
DO $$
BEGIN
    -- SELECT policy: Users can view their own settings, org admins can view org defaults
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'user_settings'
            AND policyname = 'Users can view their own settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own settings"
                ON user_settings FOR SELECT
                USING (
                    -- User's own settings
                    (scope = 'user' AND user_id = auth.uid())
                    OR
                    -- Organization-level settings (for context)
                    (scope = 'organization' AND organization_id IN (
                        SELECT organization_id FROM organization_members
                        WHERE user_id = auth.uid()
                    ))
                    OR
                    -- System-level settings (read-only)
                    (scope = 'system')
                );
        $$;
    END IF;

    -- INSERT policy: Users can create their own settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'user_settings'
            AND policyname = 'Users can create their own settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can create their own settings"
                ON user_settings FOR INSERT
                WITH CHECK (
                    user_id = auth.uid()
                    AND scope = 'user'
                );
        $$;
    END IF;

    -- UPDATE policy: Users can update their own settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'user_settings'
            AND policyname = 'Users can update their own settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own settings"
                ON user_settings FOR UPDATE
                USING (user_id = auth.uid() AND scope = 'user');
        $$;
    END IF;

    -- DELETE policy: Users can delete their own settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'user_settings'
            AND policyname = 'Users can delete their own settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can delete their own settings"
                ON user_settings FOR DELETE
                USING (user_id = auth.uid() AND scope = 'user');
        $$;
    END IF;
END$$;

-- 10) Create RLS policies for onboarding_templates
DO $$
BEGIN
    -- SELECT policy: All authenticated users can view active templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_templates'
            AND policyname = 'Users can view active onboarding templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view active onboarding templates"
                ON onboarding_templates FOR SELECT
                USING (is_active = TRUE);
        $$;
    END IF;

    -- INSERT policy: System and authorized users can create templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_templates'
            AND policyname = 'System can create onboarding templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can create onboarding templates"
                ON onboarding_templates FOR INSERT
                WITH CHECK (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;

    -- UPDATE policy: Template creators can update templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_templates'
            AND policyname = 'Template creators can update onboarding templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Template creators can update onboarding templates"
                ON onboarding_templates FOR UPDATE
                USING (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;

    -- DELETE policy: Template creators can delete templates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_templates'
            AND policyname = 'Template creators can delete onboarding templates'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Template creators can delete onboarding templates"
                ON onboarding_templates FOR DELETE
                USING (
                    created_by IS NULL
                    OR created_by = auth.uid()
                );
        $$;
    END IF;
END$$;

-- 11) Create RLS policies for onboarding_progress
DO $$
BEGIN
    -- SELECT policy: Users can view their own onboarding progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_progress'
            AND policyname = 'Users can view their own onboarding progress'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own onboarding progress"
                ON onboarding_progress FOR SELECT
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- INSERT policy: Users can create their own onboarding progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_progress'
            AND policyname = 'Users can create their own onboarding progress'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can create their own onboarding progress"
                ON onboarding_progress FOR INSERT
                WITH CHECK (user_id = auth.uid());
        $$;
    END IF;

    -- UPDATE policy: Users can update their own onboarding progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_progress'
            AND policyname = 'Users can update their own onboarding progress'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can update their own onboarding progress"
                ON onboarding_progress FOR UPDATE
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- DELETE policy: Users can delete their own onboarding progress
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'onboarding_progress'
            AND policyname = 'Users can delete their own onboarding progress'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can delete their own onboarding progress"
                ON onboarding_progress FOR DELETE
                USING (user_id = auth.uid());
        $$;
    END IF;
END$$;

-- 12) Create RLS policies for settings_audit_log
DO $$
BEGIN
    -- SELECT policy: Users can view their own settings audit log
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'settings_audit_log'
            AND policyname = 'Users can view their own settings audit log'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Users can view their own settings audit log"
                ON settings_audit_log FOR SELECT
                USING (user_id = auth.uid());
        $$;
    END IF;

    -- INSERT policy: System can create audit log entries
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'settings_audit_log'
            AND policyname = 'System can create settings audit log entries'
    ) THEN
        EXECUTE $$
            CREATE POLICY "System can create settings audit log entries"
                ON settings_audit_log FOR INSERT
                WITH CHECK (TRUE);
        $$;
    END IF;

    -- UPDATE policy: No updates to audit log (append-only)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'settings_audit_log'
            AND policyname = 'No updates to settings audit log'
    ) THEN
        EXECUTE $$
            CREATE POLICY "No updates to settings audit log"
                ON settings_audit_log FOR UPDATE
                USING (FALSE);
        $$;
    END IF;

    -- DELETE policy: No deletions from audit log (append-only)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'settings_audit_log'
            AND policyname = 'No deletions from settings audit log'
    ) THEN
        EXECUTE $$
            CREATE POLICY "No deletions from settings audit log"
                ON settings_audit_log FOR DELETE
                USING (FALSE);
        $$;
    END IF;
END$$;

-- 13) Create RLS policies for organization_default_settings
DO $$
BEGIN
    -- SELECT policy: Organization members can view their org's default settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'organization_default_settings'
            AND policyname = 'Org members can view org default settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Org members can view org default settings"
                ON organization_default_settings FOR SELECT
                USING (organization_id IN (
                    SELECT organization_id FROM organization_members
                    WHERE user_id = auth.uid()
                ));
        $$;
    END IF;

    -- INSERT policy: Organization owners can create default settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'organization_default_settings'
            AND policyname = 'Org owners can create default settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Org owners can create default settings"
                ON organization_default_settings FOR INSERT
                WITH CHECK (
                    organization_id IN (
                        SELECT organization_id FROM organization_members
                        WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
                    )
                    AND created_by = auth.uid()
                );
        $$;
    END IF;

    -- UPDATE policy: Organization owners can update default settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'organization_default_settings'
            AND policyname = 'Org owners can update default settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Org owners can update default settings"
                ON organization_default_settings FOR UPDATE
                USING (
                    organization_id IN (
                        SELECT organization_id FROM organization_members
                        WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
                    )
                );
        $$;
    END IF;

    -- DELETE policy: Organization owners can delete default settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'organization_default_settings'
            AND policyname = 'Org owners can delete default settings'
    ) THEN
        EXECUTE $$
            CREATE POLICY "Org owners can delete default settings"
                ON organization_default_settings FOR DELETE
                USING (
                    organization_id IN (
                        SELECT organization_id FROM organization_members
                        WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
                    )
                );
        $$;
    END IF;
END$$;

-- 14) Create trigger function for settings audit logging
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log setting changes
    INSERT INTO settings_audit_log (
        setting_id,
        user_id,
        organization_id,
        action,
        old_value,
        new_value,
        changed_fields,
        metadata
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        COALESCE(NEW.organization_id, OLD.organization_id),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        CASE
            WHEN TG_OP = 'UPDATE' THEN array_agg(
                CASE
                    WHEN OLD.setting_value IS DISTINCT FROM NEW.setting_value THEN 'setting_value'
                    WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN 'is_active'
                    WHEN OLD.updated_at IS DISTINCT FROM NEW.updated_at THEN 'updated_at'
                    ELSE NULL
                END
            ) FILTER (WHERE value IS NOT NULL)
            ELSE NULL
        END,
        jsonb_build_object(
            'trigger_operation', TG_OP,
            'trigger_time', NOW(),
            'session_id', current_setting('app.session_id', true),
            'request_id', current_setting('app.request_id', true)
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 15) Create triggers for audit logging
DROP TRIGGER IF EXISTS trigger_settings_audit_log ON user_settings;
CREATE TRIGGER trigger_settings_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION log_settings_change();

-- 16) Create function for getting user settings with inheritance
CREATE OR REPLACE FUNCTION get_user_settings_with_inheritance(
    p_user_id UUID,
    p_organization_id UUID DEFAULT NULL,
    p_category TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT jsonb_object_agg(setting_key, setting_value) INTO result
    FROM (
        -- User settings (highest priority)
        SELECT setting_key, setting_value
        FROM user_settings
        WHERE user_id = p_user_id
          AND scope = 'user'
          AND is_active = TRUE
          AND is_deleted = FALSE
          AND (p_category IS NULL OR setting_category = p_category)

        UNION ALL

        -- Organization default settings (medium priority)
        SELECT od.setting_key, od.default_value as setting_value
        FROM organization_default_settings od
        WHERE od.organization_id = p_organization_id
          AND od.setting_key NOT IN (
            -- Exclude user-overridden settings
            SELECT setting_key FROM user_settings
            WHERE user_id = p_user_id
              AND scope = 'user'
              AND is_active = TRUE
              AND is_deleted = FALSE
              AND (p_category IS NULL OR setting_category = p_category)
          )
          AND (p_category IS NULL OR od.setting_category = p_category)
          AND od.can_user_override = TRUE

        UNION ALL

        -- System default settings (lowest priority)
        SELECT setting_key, default_value as setting_value
        FROM user_settings
        WHERE scope = 'system'
          AND is_active = TRUE
          AND is_deleted = FALSE
          AND (p_category IS NULL OR setting_category = p_category)
          AND setting_key NOT IN (
            -- Exclude user or org overridden settings
            SELECT setting_key FROM user_settings
            WHERE user_id = p_user_id
              AND scope = 'user'
              AND is_active = TRUE
              AND is_deleted = FALSE
              AND (p_category IS NULL OR setting_category = p_category)
          )
          AND setting_key NOT IN (
            SELECT setting_key FROM organization_default_settings
            WHERE organization_id = p_organization_id
              AND (p_category IS NULL OR setting_category = p_category)
          )

        ORDER BY setting_key
    ) inherited_settings;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 17) Create function for updating user settings with inheritance handling
CREATE OR REPLACE FUNCTION update_user_setting(
    p_user_id UUID,
    p_category TEXT,
    p_key TEXT,
    p_value JSONB,
    p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    setting_id UUID;
    existing_setting RECORD;
    org_default JSONB;
    system_default JSONB;
BEGIN
    -- Check if user setting already exists
    SELECT * INTO existing_setting
    FROM user_settings
    WHERE user_id = p_user_id
      AND setting_category = p_category
      AND setting_key = p_key
      AND scope = 'user'
      AND is_active = TRUE;

    -- Get organization default if exists
    SELECT default_value INTO org_default
    FROM organization_default_settings
    WHERE organization_id = p_organization_id
      AND setting_category = p_category
      AND setting_key = p_key
      AND can_user_override = TRUE;

    -- Get system default if exists
    SELECT default_value INTO system_default
    FROM user_settings
    WHERE scope = 'system'
      AND setting_category = p_category
      AND setting_key = p_key
      AND is_active = TRUE
      AND is_deleted = FALSE;

    IF existing_setting.id IS NOT NULL THEN
        -- Update existing setting
        UPDATE user_settings
        SET
            setting_value = p_value,
            updated_at = NOW(),
            updated_by = auth.uid(),
            version = version + 1
        WHERE id = existing_setting.id
        RETURNING id INTO setting_id;
    ELSE
        -- Create new setting
        INSERT INTO user_settings (
            user_id,
            scope,
            setting_category,
            setting_key,
            setting_value,
            data_type,
            parent_setting_id,
            override_level
        ) VALUES (
            p_user_id,
            'user',
            p_category,
            p_key,
            p_value,
            CASE
                WHEN jsonb_typeof(p_value) = 'boolean' THEN 'boolean'
                WHEN jsonb_typeof(p_value) = 'string' THEN 'string'
                WHEN jsonb_typeof(p_value) = 'number' THEN 'number'
                WHEN jsonb_typeof(p_value) = 'array' THEN 'array'
                ELSE 'json'
            END,
            -- Set parent to org default or system default
            (SELECT id FROM user_settings
             WHERE scope = 'system'
               AND setting_category = p_category
               AND setting_key = p_key
               AND is_active = TRUE
               AND is_deleted = FALSE
             LIMIT 1),
            0
        )
        RETURNING id INTO setting_id;
    END IF;

    RETURN setting_id;
END;
$$ LANGUAGE plpgsql;

-- 18) Create function for managing onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
    p_user_id UUID,
    p_template_id UUID,
    p_step_index INTEGER,
    p_action TEXT, -- 'complete', 'skip', 'fail'
    p_step_data JSONB DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    progress_record RECORD;
    template_record RECORD;
    new_status onboarding_status;
    new_completed_steps INTEGER;
    new_skipped_steps JSONB;
    new_failed_steps JSONB;
BEGIN
    -- Get onboarding progress
    SELECT * INTO progress_record
    FROM onboarding_progress
    WHERE user_id = p_user_id
      AND template_id = p_template_id;

    -- Get template data
    SELECT * INTO template_record
    FROM onboarding_templates
    WHERE id = p_template_id
      AND is_active = TRUE;

    IF template_record.id IS NULL THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;

    IF progress_record.id IS NULL THEN
        -- Create new progress record
        INSERT INTO onboarding_progress (
            user_id,
            organization_id,
            template_id,
            status,
            current_step_index,
            total_steps,
            started_at,
            step_data
        ) VALUES (
            p_user_id,
            p_organization_id,
            p_template_id,
            'in_progress',
            p_step_index,
            jsonb_array_length(template_record.flow_data),
            NOW(),
            jsonb_build_array(p_step_data)
        );

        progress_record := (
            SELECT * FROM onboarding_progress
            WHERE user_id = p_user_id
              AND template_id = p_template_id
        );
    END IF;

    -- Update based on action
    CASE p_action
        WHEN 'complete' THEN
            new_status := CASE
                WHEN p_step_index >= (progress_record.total_steps - 1) THEN 'completed'
                ELSE 'in_progress'
            END;
            new_completed_steps := progress_record.completed_steps + 1;
            new_skipped_steps := progress_record.skipped_steps;
            new_failed_steps := progress_record.failed_steps;

        WHEN 'skip' THEN
            new_status := progress_record.status;
            new_completed_steps := progress_record.completed_steps;
            new_skipped_steps := jsonb_array_append(
                COALESCE(progress_record.skipped_steps, '[]'::jsonb),
                p_step_index
            );
            new_failed_steps := progress_record.failed_steps;

        WHEN 'fail' THEN
            new_status := 'in_progress';
            new_completed_steps := progress_record.completed_steps;
            new_skipped_steps := progress_record.skipped_steps;
            new_failed_steps := jsonb_array_append(
                COALESCE(progress_record.failed_steps, '[]'::jsonb),
                p_step_index
            );
        ELSE
            RAISE EXCEPTION 'Invalid action: %', p_action;
    END CASE;

    -- Update progress record
    UPDATE onboarding_progress
    SET
        status = new_status,
        current_step_index = CASE
            WHEN p_action = 'complete' AND p_step_index >= (total_steps - 1) THEN current_step_index
            WHEN p_action = 'complete' THEN p_step_index + 1
            ELSE current_step_index
        END,
        completed_steps = new_completed_steps,
        skipped_steps = new_skipped_steps,
        failed_steps = new_failed_steps,
        completed_at = CASE
            WHEN new_status = 'completed' THEN NOW()
            ELSE completed_at
        END,
        last_activity_at = NOW(),
        step_data = jsonb_set(
            COALESCE(step_data, '[]'::jsonb),
            ARRAY[p_step_index::text],
            p_step_data
        )
    WHERE id = progress_record.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 19) Create function for getting user onboarding status
CREATE OR REPLACE FUNCTION get_user_onboarding_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT jsonb_object_agg(template_name, template_data) INTO result
    FROM (
        SELECT
            ot.name as template_name,
            jsonb_build_object(
                'status', op.status,
                'progress', op.completion_percentage,
                'current_step', op.current_step_index,
                'total_steps', op.total_steps,
                'started_at', op.started_at,
                'completed_at', op.completed_at,
                'last_activity', op.last_activity_at,
                'can_resume', (
                    op.status IN ('not_started', 'in_progress')
                    AND ot.is_active = TRUE
                )
            ) as template_data
        FROM onboarding_templates ot
        LEFT JOIN onboarding_progress op ON ot.id = op.template_id AND op.user_id = p_user_id
        WHERE ot.is_active = TRUE
          AND (
            -- Include templates for user's roles
            p_user_id IN (
                SELECT user_id FROM organization_members
                WHERE role = ANY(ot.target_roles)
            )
            OR
            -- Include templates that apply to all roles
            ot.target_roles = ARRAY['owner', 'teacher', 'student']::user_role[]
          )
        ORDER BY ot.name
    ) onboarding_data;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 20) Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_settings_with_inheritance(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_setting(UUID, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_onboarding_progress(UUID, UUID, INTEGER, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_status(UUID) TO authenticated;

-- 21) Create views for common queries

-- View for user settings with inheritance context
CREATE OR REPLACE VIEW user_settings_with_context AS
SELECT
    us.id,
    us.user_id,
    us.organization_id,
    us.scope,
    us.setting_category,
    us.setting_key,
    us.setting_value,
    us.data_type,
    us.is_active,
    us.updated_at,
    u.email as user_email,
    o.name as organization_name,
    -- Inheritance context
    CASE
        WHEN us.scope = 'user' THEN 'user_override'
        WHEN us.scope = 'organization' THEN 'organization_default'
        WHEN us.scope = 'system' THEN 'system_default'
    END as inheritance_level
FROM user_settings us
LEFT JOIN auth.users u ON us.user_id = u.id
LEFT JOIN organizations o ON us.organization_id = o.id
WHERE us.is_active = TRUE AND us.is_deleted = FALSE;

-- View for onboarding progress with template details
CREATE OR REPLACE VIEW onboarding_progress_with_templates AS
SELECT
    op.id,
    op.user_id,
    op.organization_id,
    op.template_id,
    op.status,
    op.current_step_index,
    op.total_steps,
    op.completed_steps,
    op.completion_percentage,
    op.started_at,
    op.completed_at,
    op.last_activity_at,
    op.step_data,
    op.skipped_steps,
    op.failed_steps,
    -- Template details
    ot.name as template_name,
    ot.description as template_description,
    ot.target_roles,
    ot.estimated_duration_minutes,
    -- User context
    u.email as user_email,
    o.name as organization_name
FROM onboarding_progress op
JOIN onboarding_templates ot ON op.template_id = ot.id
LEFT JOIN auth.users u ON op.user_id = u.id
LEFT JOIN organizations o ON op.organization_id = o.id
WHERE ot.is_active = TRUE;

-- Grant view permissions
GRANT SELECT ON user_settings_with_context TO authenticated;
GRANT SELECT ON onboarding_progress_with_templates TO authenticated;

-- 22) Insert default onboarding templates
INSERT INTO onboarding_templates (name, description, target_roles, flow_data, settings, estimated_duration_minutes)
VALUES
    -- Teacher onboarding template
    (
        'Teacher Onboarding',
        'Complete onboarding flow for new teachers',
        ARRAY['teacher', 'owner']::user_role[],
        '[
            {
                "id": 1,
                "title": "Welcome to WeaveMind",
                "description": "Get familiar with the platform",
                "type": "welcome",
                "estimated_minutes": 5,
                "required": true
            },
            {
                "id": 2,
                "title": "Create Your First Organization",
                "description": "Set up your school or institution",
                "type": "action",
                "action": "create_organization",
                "estimated_minutes": 10,
                "required": true
            },
            {
                "id": 3,
                "title": "Create Your First Class",
                "description": "Set up your first class",
                "type": "action",
                "action": "create_class",
                "estimated_minutes": 15,
                "required": true
            },
            {
                "id": 4,
                "title": "Explore AI Course Generation",
                "description": "Learn about AI-powered course creation",
                "type": "tutorial",
                "action": "ai_course_demo",
                "estimated_minutes": 20,
                "required": false
            },
            {
                "id": 5,
                "title": "Setup Notification Preferences",
                "description": "Configure how you want to be notified",
                "type": "settings",
                "action": "notification_settings",
                "estimated_minutes": 5,
                "required": false
            }
        ]'::jsonb,
        '{"theme": "light", "language": "en", "ai_suggestions_enabled": true}'::jsonb,
        55
    ),
    -- Student onboarding template
    (
        'Student Onboarding',
        'Complete onboarding flow for new students',
        ARRAY['student']::user_role[],
        '[
            {
                "id": 1,
                "title": "Welcome to WeaveMind",
                "description": "Get familiar with the learning platform",
                "type": "welcome",
                "estimated_minutes": 5,
                "required": true
            },
            {
                "id": 2,
                "title": "Join a Class",
                "description": "Join your first class using a code",
                "type": "action",
                "action": "join_class",
                "estimated_minutes": 10,
                "required": true
            },
            {
                "id": 3,
                "title": "Explore Your Dashboard",
                "description": "Learn to navigate your student dashboard",
                "type": "tutorial",
                "action": "dashboard_tour",
                "estimated_minutes": 15,
                "required": false
            },
            {
                "id": 4,
                "title": "Setup AI Assistant",
                "description": "Configure your AI learning assistant",
                "type": "settings",
                "action": "ai_assistant_setup",
                "estimated_minutes": 10,
                "required": false
            },
            {
                "id": 5,
                "title": "Complete Your Profile",
                "description": "Add personal information and preferences",
                "type": "profile",
                "action": "complete_profile",
                "estimated_minutes": 5,
                "required": false
            }
        ]'::jsonb,
        '{"theme": "light", "language": "en", "ai_response_speed": "normal", "show_translations": true}'::jsonb,
        45
    );

-- 23) Insert default system settings
INSERT INTO user_settings (scope, setting_category, setting_key, setting_value, data_type, default_value, description)
VALUES
    -- Interface settings
    ('system', 'interface', 'theme', '"light"'::jsonb, 'string', '"light"'::jsonb, 'Default theme for new users'),
    ('system', 'interface', 'language', '"en"'::jsonb, 'string', '"en"'::jsonb, 'Default language'),
    ('system', 'interface', 'timezone', '"UTC"'::jsonb, 'string', '"UTC"'::jsonb, 'Default timezone'),
    ('system', 'interface', 'font_size', '14'::jsonb, 'number', '14'::jsonb, 'Default font size'),

    -- AI settings
    ('system', 'ai', 'ai_response_speed', '"normal"'::jsonb, 'string', '"normal"'::jsonb, 'Default AI response speed'),
    ('system', 'ai', 'ai_suggestions_enabled', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Enable AI suggestions by default'),
    ('system', 'ai', 'ai_language_preference', '"en"'::jsonb, 'string', '"en"'::jsonb, 'Default AI language preference'),

    -- Notification settings
    ('system', 'notifications', 'email_notifications', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Enable email notifications by default'),
    ('system', 'notifications', 'push_notifications', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Enable push notifications by default'),
    ('system', 'notifications', 'discussion_notifications', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Enable discussion notifications by default'),
    ('system', 'notifications', 'assignment_reminders', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Enable assignment reminder notifications by default'),

    -- Learning settings
    ('system', 'learning', 'auto_save_progress', 'true'::jsonb, 'boolean', 'true'::jsonb, 'Auto save learning progress by default'),
    ('system', 'learning', 'show_translations', 'false'::jsonb, 'boolean', 'false'::jsonb, 'Show translations by default');

-- 24) Create functions for Realtime support
CREATE OR REPLACE FUNCTION get_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Return the settings data for realtime updates
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create realtime triggers for live settings updates
DROP TRIGGER IF EXISTS settings_realtime_changes ON user_settings;
CREATE TRIGGER settings_realtime_changes
    AFTER INSERT OR UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION get_settings_changes();

-- 25) Final setup and permissions
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable realtime for settings tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_progress;

-- 26) Create indexes for GIN operations on JSONB columns
CREATE INDEX idx_user_settings_value_gin ON user_settings USING GIN(setting_value);
CREATE INDEX idx_user_settings_metadata_gin ON user_settings USING GIN(metadata);
CREATE INDEX idx_onboarding_progress_step_data_gin ON onboarding_progress USING GIN(step_data);
CREATE INDEX idx_onboarding_progress_metadata_gin ON onboarding_progress USING GIN(metadata);
CREATE INDEX idx_settings_audit_log_metadata_gin ON settings_audit_log USING GIN(metadata);

-- 27) Create function for cleaning up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_settings_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up audit logs older than 2 years
    DELETE FROM settings_audit_log
    WHERE created_at < NOW() - INTERVAL '2 years';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_settings_audit_logs() TO authenticated;