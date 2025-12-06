-- Migration: Settings Management System (Simplified)
-- Creates comprehensive settings and onboarding system for WeaveMind LMS

-- 1) Create enum types
CREATE TYPE settings_scope AS ENUM ('system', 'organization', 'user');
CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
CREATE TYPE setting_data_type AS ENUM ('boolean', 'string', 'number', 'json', 'array');

-- 2) Create user_settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    scope settings_scope NOT NULL DEFAULT 'user',
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    data_type setting_data_type NOT NULL DEFAULT 'json',
    default_value JSONB,
    parent_setting_id UUID REFERENCES user_settings(id) ON DELETE CASCADE,
    override_level INTEGER DEFAULT 0,
    can_override BOOLEAN DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    validation_schema JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT user_settings_scope_check CHECK (
        (scope = 'system' AND user_id IS NULL AND organization_id IS NULL) OR
        (scope = 'organization' AND user_id IS NULL AND organization_id IS NOT NULL) OR
        (scope = 'user' AND user_id IS NOT NULL AND organization_id IS NULL)
    )
);

-- 3) Create onboarding_templates table
CREATE TABLE onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    target_roles user_role[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    flow_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_duration_minutes INTEGER,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    translations JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    analytics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4) Create onboarding_progress table
CREATE TABLE onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    status onboarding_status NOT NULL DEFAULT 'not_started',
    current_step_index INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    step_data JSONB DEFAULT '[]'::jsonb,
    skipped_steps JSONB DEFAULT '[]'::jsonb,
    failed_steps JSONB DEFAULT '[]'::jsonb,
    completion_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN total_steps > 0 THEN (completed_steps::NUMERIC / total_steps::NUMERIC) * 100
            ELSE 0
        END
    ) STORED,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT onboarding_progress_unique_user_template UNIQUE(user_id, template_id)
);

-- 5) Create settings_audit_log table
CREATE TABLE settings_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_id UUID NOT NULL REFERENCES user_settings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
    old_value JSONB,
    new_value JSONB,
    changed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 6) Create organization_default_settings table
CREATE TABLE organization_default_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    default_value JSONB NOT NULL,
    data_type setting_data_type NOT NULL DEFAULT 'json',
    description TEXT,
    can_user_override BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT organization_default_settings_unique UNIQUE(
        organization_id,
        setting_category,
        setting_key
    )
);

-- 7) Create indexes
CREATE INDEX idx_user_settings_user ON user_settings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_settings_org ON user_settings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_user_settings_category ON user_settings(setting_category);
CREATE INDEX idx_user_settings_active ON user_settings(is_active, is_deleted) WHERE is_active = TRUE AND is_deleted = FALSE;
CREATE INDEX idx_onboarding_templates_active ON onboarding_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_template ON onboarding_progress(template_id);
CREATE INDEX idx_onboarding_progress_status ON onboarding_progress(status);
CREATE INDEX idx_settings_audit_log_user ON settings_audit_log(user_id);
CREATE INDEX idx_org_default_settings_org ON organization_default_settings(organization_id);

-- 8) Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_default_settings ENABLE ROW LEVEL SECURITY;

-- 9) Create RLS Policies
CREATE POLICY "Users can manage their own settings" ON user_settings
    FOR ALL USING (
        (scope = 'user' AND user_id = auth.uid()) OR
        (scope = 'organization' AND organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
        ))
    );

CREATE POLICY "Users can view active templates" ON onboarding_templates
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can manage their own onboarding progress" ON onboarding_progress
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own audit log" ON settings_audit_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage default settings" ON organization_default_settings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- 10) Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON onboarding_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_default_settings_updated_at BEFORE UPDATE ON organization_default_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11) Grant permissions
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON onboarding_templates TO authenticated;
GRANT ALL ON onboarding_progress TO authenticated;
GRANT ALL ON settings_audit_log TO authenticated;
GRANT ALL ON organization_default_settings TO authenticated;