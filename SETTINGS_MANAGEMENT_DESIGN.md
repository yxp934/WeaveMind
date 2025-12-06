# WeaveMind LMS 设置管理系统数据模型设计

## 概述

基于现有的WeaveMind LMS数据库架构，我设计了一个完整的设置管理系统数据模型，支持用户设置管理和引导流程追踪。该设计遵循了现有的多租户架构模式，使用UUID主键，并包含完整的RLS策略和安全控制。

## 核心表结构

### 1. user_settings（用户设置表）
```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    scope settings_scope NOT NULL DEFAULT 'user',
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    data_type setting_data_type NOT NULL DEFAULT 'json',
    parent_setting_id UUID REFERENCES user_settings(id),
    override_level INTEGER DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE
);
```

**特性：**
- 支持三级设置继承：系统 → 组织 → 用户
- 灵活的JSONB存储适应不同数据类型
- 版本控制支持设置历史追踪
- 软删除机制确保数据安全

### 2. onboarding_progress（引导流程状态表）
```sql
CREATE TABLE onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users CASCADE,
   (id) ON DELETE organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id),
    status onboarding_status NOT NULL DEFAULT 'not_started',
    current_step_index INTEGER DEFAULT 0,
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER DEFAULT 0,
    completion_percentage NUMERIC(5,2) GENERATED ALWAYS AS (...) STORED,
    step_data JSONB DEFAULT '[]'::jsonb
);
```

**特性：**
- 多步骤引导流程追踪
- 自动计算完成百分比
- 支持跳过和失败步骤记录
- 角色特定的引导模板

### 3. onboarding_templates（引导流程模板表）
```sql
CREATE TABLE onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    target_roles user_role[] NOT NULL,
    flow_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    translations JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb
);
```

### 4. settings_audit_log（设置审计日志表）
```sql
CREATE TABLE settings_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_id UUID NOT NULL REFERENCES user_settings(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. organization_default_settings（组织默认设置表）
```sql
CREATE TABLE organization_default_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    setting_category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    default_value JSONB NOT NULL,
    can_user_override BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1
);
```

## 设置分类和默认值

### 界面设置（interface）
- `theme`: "light" | "dark" | "auto"（默认："light"）
- `language`: 语言代码（默认："en"）
- `timezone`: 时区（默认："UTC"）
- `font_size`: 字体大小（默认：14）

### AI设置（ai）
- `ai_response_speed`: "fast" | "normal" | "detailed"（默认："normal"）
- `ai_suggestions_enabled`: boolean（默认：true）
- `ai_language_preference`: AI响应语言偏好（默认："en"）

### 通知设置（notifications）
- `email_notifications`: boolean（默认：true）
- `push_notifications`: boolean（默认：true）
- `discussion_notifications`: boolean（默认：true）
- `assignment_reminders`: boolean（默认：true）

### 学习设置（learning）
- `auto_save_progress`: boolean（默认：true）
- `show_translations`: boolean（默认：false）

## 索引策略

### 主要索引
```sql
-- 用户设置查询优化
CREATE INDEX idx_user_settings_user ON user_settings(user_id);
CREATE INDEX idx_user_settings_category ON user_settings(setting_category);
CREATE INDEX idx_user_settings_active ON user_settings(is_active, is_deleted);

-- 引导进度追踪
CREATE INDEX idx_onboarding_progress_user ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_incomplete ON onboarding_progress(user_id) WHERE status IN ('not_started', 'in_progress');

-- 审计日志查询
CREATE INDEX idx_settings_audit_log_user ON settings_audit_log(user_id);
CREATE INDEX idx_settings_audit_log_created ON settings_audit_log(created_at DESC);
```

### 复合索引
```sql
CREATE INDEX idx_user_settings_user_category ON user_settings(user_id, setting_category);
CREATE INDEX idx_onboarding_progress_user_template ON onboarding_progress(user_id, template_id);
```

## RLS（行级安全）策略

### 用户设置安全
- **SELECT**: 用户只能查看自己的设置、组织默认设置（上下文）、系统设置（只读）
- **INSERT/UPDATE/DELETE**: 用户只能管理自己的设置

### 引导进度隐私
- **完整控制**: 用户完全控制自己的引导进度数据
- **匿名化**: 组织管理员无法查看具体的引导内容

### 组织默认设置管理
- **查看权限**: 组织成员可以查看组织默认设置
- **管理权限**: 只有组织所有者和教师可以修改组织默认设置

## 核心功能函数

### 1. 设置继承管理
```sql
get_user_settings_with_inheritance(p_user_id, p_organization_id, p_category)
```
- 按优先级合并：用户设置 → 组织默认 → 系统默认
- 支持分类过滤
- 返回完整的设置值映射

### 2. 设置更新处理
```sql
update_user_setting(p_user_id, p_category, p_key, p_value, p_organization_id)
```
- 智能创建/更新用户设置
- 处理继承关系
- 自动版本控制

### 3. 引导流程管理
```sql
update_onboarding_progress(p_user_id, p_template_id, p_step_index, p_action, p_step_data)
```
- 支持完成/跳过/失败操作
- 自动状态更新
- 进度追踪

### 4. 引导状态查询
```sql
get_user_onboarding_status(p_user_id)
```
- 获取用户所有引导模板的状态
- 包含进度和恢复能力信息

## 预设引导模板

### 教师引导流程
1. **欢迎介绍**（5分钟，必需）
2. **创建组织**（10分钟，必需）
3. **创建班级**（15分钟，必需）
4. **AI课程生成演示**（20分钟，可选）
5. **通知偏好设置**（5分钟，可选）

### 学生引导流程
1. **欢迎介绍**（5分钟，必需）
2. **加入班级**（10分钟，必需）
3. **仪表板导览**（15分钟，可选）
4. **AI助手配置**（10分钟，可选）
5. **完善个人资料**（5分钟，可选）

## 性能优化特性

### 1. JSONB索引
- 为JSONB字段创建GIN索引
- 支持快速JSON查询和过滤

### 2. 物化视图
- `user_settings_with_context`: 包含继承上下文的用户设置
- `onboarding_progress_with_templates`: 包含模板详情的引导进度

### 3. 分区策略建议
- 对审计日志表按时间分区（每月）
- 对引导进度表按组织分区（大型部署）

## 实时功能支持

- 启用Supabase Realtime支持
- 设置变更实时推送
- 引导进度实时更新

## 维护和清理

### 自动清理函数
```sql
cleanup_old_settings_audit_logs()
```
- 清理2年前的审计日志
- 保持数据库性能

### 数据保留策略
- 审计日志：2年
- 软删除设置：永久保留（可恢复）
- 完成引导进度：永久保留（分析用途）

## 扩展性考虑

### 1. 新设置类型
- 通过enum轻松添加新的数据类型
- JSONB字段支持任意复杂配置

### 2. 新引导步骤类型
- 模板系统支持自定义步骤类型
- 灵活的动作系统

### 3. 多语言支持
- 引导模板支持翻译
- 设置描述支持本地化

## 安全考虑

### 1. 数据加密
- 敏感设置可标记为加密存储
- 审计日志记录所有变更

### 2. 权限控制
- 细粒度的RLS策略
- 最小权限原则

### 3. 变更追踪
- 完整的审计日志
- IP地址和用户代理记录

## 部署说明

1. 运行迁移脚本：`024_settings_management_system.sql`
2. 创建默认引导模板
3. 设置系统默认配置
4. 启用实时功能
5. 配置权限策略

## 使用示例

### 设置用户主题
```sql
SELECT update_user_setting(
    'user-uuid',
    'interface',
    'theme',
    '"dark"',
    'org-uuid'
);
```

### 获取用户完整设置
```sql
SELECT get_user_settings_with_inheritance(
    'user-uuid',
    'org-uuid',
    NULL  -- 获取所有类别
);
```

### 完成引导步骤
```sql
SELECT update_onboarding_progress(
    'user-uuid',
    'template-uuid',
    2,  -- 步骤索引
    'complete',
    '{"result": "success", "data": {}}'
);
```

这个设计提供了完整的设置管理功能，支持复杂的继承关系、引导流程追踪、安全控制和高性能查询。