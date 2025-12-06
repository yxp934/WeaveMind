-- Migration: AI Usage Logs
-- Creates AI usage logging system for WeaveMind LMS
-- Following existing naming conventions and multi-tenant architecture

-- 1) Create ai_usage_logs table for tracking AI service usage
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core identification
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,

    -- Action details
    action TEXT NOT NULL, -- 'chat', 'discussion_suggest_topics', 'settings_optimize', etc.
    input_data JSONB,
    output_data JSONB,

    -- Performance metrics
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    model_used TEXT,

    -- Error tracking
    error_message TEXT,
    error_code TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for performance
    CONSTRAINT ai_usage_logs_user_org_check CHECK (
        (user_id IS NOT NULL AND organization_id IS NOT NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

-- 2) Create ai_conversations table for chat history
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Core identification
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Conversation metadata
    title TEXT,
    context JSONB, -- course_id, class_id, user_role, etc.
    message_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,

    -- Status tracking
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3) Create indexes for performance optimization
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_organization_id ON ai_usage_logs(organization_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_action ON ai_usage_logs(action);
CREATE INDEX idx_ai_usage_logs_request_id ON ai_usage_logs(request_id);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_organization_id ON ai_conversations(organization_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);
CREATE INDEX idx_ai_conversations_active ON ai_conversations(is_active) WHERE is_active = true;

-- 4) Create function for getting discussion threads analysis
CREATE OR REPLACE FUNCTION get_discussion_threads_analysis(
    organization_id UUID,
    filter_thread_id UUID DEFAULT NULL,
    filter_course_id UUID DEFAULT NULL,
    filter_class_id UUID DEFAULT NULL
)
RETURNS TABLE (
    thread_id UUID,
    title TEXT,
    post_count INTEGER,
    participant_count INTEGER,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    engagement_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.id as thread_id,
        dt.title,
        dt.post_count,
        COALESCE(dp.participant_count, 0) as participant_count,
        dt.last_activity_at,
        CASE
            WHEN dt.post_count = 0 THEN 0
            WHEN dt.post_count < 5 THEN 0.3
            WHEN dt.post_count < 10 THEN 0.6
            WHEN dt.post_count < 20 THEN 0.8
            ELSE 1.0
        END * CASE
            WHEN dp.participant_count < 2 THEN 0.5
            WHEN dp.participant_count < 5 THEN 0.7
            WHEN dp.participant_count < 10 THEN 0.9
            ELSE 1.0
        END as engagement_score
    FROM discussion_threads dt
    LEFT JOIN (
        SELECT thread_id, COUNT(*) as participant_count
        FROM discussion_participants
        GROUP BY thread_id
    ) dp ON dt.id = dp.thread_id
    WHERE dt.organization_id = get_discussion_threads_analysis.organization_id
      AND (filter_thread_id IS NULL OR dt.id = filter_thread_id)
      AND (filter_course_id IS NULL OR dt.course_id = filter_course_id)
      AND (filter_class_id IS NULL OR dt.class_id = filter_class_id)
    ORDER BY dt.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Create RLS policies for ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI usage logs
CREATE POLICY "Users can view own AI usage logs" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all AI usage logs
CREATE POLICY "Service role can manage AI usage logs" ON ai_usage_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 6) Create RLS policies for ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own conversations
CREATE POLICY "Users can manage own conversations" ON ai_conversations
    FOR ALL USING (auth.uid() = user_id);

-- Teachers can view conversations in their organization
CREATE POLICY "Teachers can view org conversations" ON ai_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = auth.uid()
              AND om2.user_id = ai_conversations.user_id
              AND om1.role IN ('owner', 'teacher')
              AND om2.role IN ('owner', 'teacher', 'student')
        )
    );

-- Service role can manage all conversations
CREATE POLICY "Service role can manage conversations" ON ai_conversations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 7) Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_usage_logs_updated_at
    BEFORE UPDATE ON ai_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8) Create function to clean old AI usage logs
CREATE OR REPLACE FUNCTION cleanup_old_ai_usage_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_usage_logs
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ai_usage_logs TO authenticated;
GRANT SELECT, INSERT ON ai_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_discussion_threads_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_ai_usage_logs TO service_role;

-- Add comments for documentation
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI service usage including requests, responses, and performance metrics';
COMMENT ON TABLE ai_conversations IS 'Stores AI conversation history for chat functionality';
COMMENT ON FUNCTION get_discussion_threads_analysis IS 'Analyzes discussion thread engagement and participation';
COMMENT ON FUNCTION cleanup_old_ai_usage_logs IS 'Removes AI usage logs older than specified retention period';