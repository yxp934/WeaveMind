# WeaveMind LMS 后端架构分析与未来需求报告

## 执行摘要

WeaveMind LMS当前已具备完整的多租户LMS基础架构，包括AI驱动的课程生成系统、角色基础访问控制和完整的数据库架构。前端重构需要新增讨论系统、通知系统、设置管理和增强的AI工具调用功能。后端需要相应的数据模型扩展、API端点增强和AI工具系统升级。

## 1. 当前后端架构状态分析

### 1.1 数据库架构（21个迁移已完成）

**核心实体已实现：**
- ✅ organizations, organization_members（多租户基础）
- ✅ classes, class_members（班级管理）
- ✅ courses, chapters, components（课程内容体系）
- ✅ assignments, submissions（作业系统）
- ✅ files（文件管理）
- ✅ learning_events（学习事件追踪）
- ✅ student_ai_conversations（AI对话记录）
- ✅ **course_compression_context（课程压缩上下文系统）**

**最新迁移特性：**
- **021_course_compression_context_system.sql**: 完整的课程级别压缩上下文系统
  - `course_compression_context` 表：存储课程级别压缩上下文
  - `context_extraction_events` 表：追踪提取事件
  - 完整的RLS策略和索引优化
  - 自动版本管理和质量评分

### 1.2 AI系统架构

**当前AI工具系统（Phase 5已完成）：**
- ✅ **Course Generation Orchestrator**: Builder/Critic双智能体系统
- ✅ **6个AI编辑工具**:
  1. `insertComponent` - 插入组件
  2. `moveComponent` - 移动组件
  3. `deleteComponent` - 删除组件
  4. `updateComponentContent` - 更新组件内容
  5. `addExamplesToConcept` - 添加概念示例
  6. `getCourseStructure` - 获取课程结构

**当前API端点：**
- ✅ `/api/ai/course-chat` - 课程对话
- ✅ `/api/ai/course-edit` - 课程编辑
- ✅ `/api/ai/generate-outline` - 生成大纲
- ✅ `/api/ai/generate-class-schedule` - 生成班级日程
- ✅ `/api/ai/generate-session-content` - 生成会话内容
- ✅ `/api/ai/save-session-content` - 保存会话内容
- ✅ `/api/ai/session-content-chat` - 会话内容对话
- ✅ `/api/ai/schedule-chat` - 日程对话

### 1.3 认证与授权

**当前实现：**
- ✅ Supabase Auth集成
- ✅ 角色基础访问控制（owner, teacher, student）
- ✅ 单角色强制执行
- ✅ 基于组织的租户隔离
- ✅ RLS策略完整覆盖

**路由保护：**
- `/teacher/*` - 教师端路由保护
- `/student/*` - 学生端路由保护
- `/role-select` - 首次登录角色选择

## 2. 前端重构需求分析

### 2.1 新功能需求
1. **讨论系统** - 班级讨论、帖子、回复
2. **通知系统** - 实时通知、用户偏好
3. **设置管理** - 用户设置、偏好配置
4. **增强AI界面** - 工具调用、数据格式管理
5. **自学习者角色** - 新用户类型支持

## 3. 数据模型缺口分析

### 3.1 讨论系统数据模型

需要新增表：

```sql
-- 讨论线程表
CREATE TABLE discussion_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('general', 'course', 'assignment', 'announcement')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 讨论帖子表
CREATE TABLE discussion_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'code')),
  attachments JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN DEFAULT FALSE,
  edit_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 讨论参与表
CREATE TABLE discussion_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  notification_level VARCHAR(20) DEFAULT 'normal' CHECK (notification_level IN ('none', 'normal', 'high')),
  UNIQUE(thread_id, user_id)
);
```

**索引需求：**
```sql
CREATE INDEX idx_discussion_threads_class ON discussion_threads(class_id);
CREATE INDEX idx_discussion_threads_type ON discussion_threads(type);
CREATE INDEX idx_discussion_posts_thread ON discussion_posts(thread_id);
CREATE INDEX idx_discussion_posts_parent ON discussion_posts(parent_post_id);
CREATE INDEX idx_discussion_participants_user ON discussion_participants(user_id);
```

### 3.2 通知系统数据模型

需要新增表：

```sql
-- 通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  -- 通知内容
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'course_update', 'assignment_due', 'new_discussion', 'discussion_reply',
    'grade_posted', 'class_announcement', 'system_alert', 'ai_assistance'
  )),

  -- 关联数据
  related_type VARCHAR(50), -- 'course', 'assignment', 'thread', 'post'
  related_id UUID,

  -- 状态
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,

  -- 设置
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'push')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知偏好表
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- 通知类型偏好
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  delivery_methods JSONB DEFAULT '["in_app"]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id, notification_type)
);
```

**索引需求：**
```sql
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### 3.3 设置管理数据模型

需要新增表：

```sql
-- 用户设置表
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- 界面设置
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'zh-CN' CHECK (language IN ('zh-CN', 'en-US')),
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',

  -- AI设置
  ai_response_speed VARCHAR(20) DEFAULT 'balanced' CHECK (ai_response_speed IN ('fast', 'balanced', 'thorough')),
  ai_suggestions_enabled BOOLEAN DEFAULT TRUE,
  ai_language_preference VARCHAR(10) DEFAULT 'same' CHECK (ai_language_preference IN ('same', 'zh-CN', 'en-US')),

  -- 通知设置
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  discussion_notifications BOOLEAN DEFAULT TRUE,
  assignment_reminders BOOLEAN DEFAULT TRUE,

  -- 学习设置
  auto_save_progress BOOLEAN DEFAULT TRUE,
  show_translations BOOLEAN DEFAULT FALSE,
  font_size VARCHAR(20) DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id)
);

-- 引导流程状态表
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- 引导步骤
  step_name VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  step_data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, organization_id, step_name)
);
```

### 3.4 自学习者角色支持

需要修改现有表：

```sql
-- 修改 profiles 表添加自学习者角色
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'student', 'self_learner'));

-- 自学习者专属表
CREATE TABLE self_learner_pathways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 路径信息
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject_area VARCHAR(100),
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER DEFAULT 0,

  -- 进度
  progress_percentage DECIMAL(5,2) DEFAULT 0.0,
  current_step INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自学习者课程收藏表
CREATE TABLE self_learner_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, course_id),
  UNIQUE(user_id, class_id)
);
```

## 4. AI工具系统增强

### 4.1 新增AI工具类别

需要扩展当前的6个课程编辑工具，新增以下类别：

#### 4.1.1 讨论管理工具

```typescript
export const discussionManagementTools = {
  createDiscussionThread: tool({
    description: 'Create a new discussion thread in a class',
    inputSchema: z.object({
      classId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['general', 'course', 'assignment', 'announcement'])
    }),
    execute: async ({ classId, title, description, type }) => {
      // Implementation
    }
  }),

  createDiscussionPost: tool({
    description: 'Create a new post in a discussion thread',
    inputSchema: z.object({
      threadId: z.string(),
      content: z.string(),
      contentType: z.enum(['text', 'markdown', 'code']).default('text'),
      parentPostId: z.string().optional()
    }),
    execute: async ({ threadId, content, contentType, parentPostId }) => {
      // Implementation
    }
  }),

  moderateDiscussion: tool({
    description: 'Moderate discussion content (pin, lock, delete)',
    inputSchema: z.object({
      threadId: z.string(),
      action: z.enum(['pin', 'unpin', 'lock', 'unlock', 'delete']),
      reason: z.string().optional()
    }),
    execute: async ({ threadId, action, reason }) => {
      // Implementation
    }
  })
}
```

#### 4.1.2 通知管理工具

```typescript
export const notificationManagementTools = {
  sendNotification: tool({
    description: 'Send notification to users',
    inputSchema: z.object({
      userIds: z.array(z.string()),
      title: z.string(),
      content: z.string(),
      type: z.enum(['course_update', 'assignment_due', 'new_discussion', 'grade_posted']),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
    }),
    execute: async ({ userIds, title, content, type, priority }) => {
      // Implementation
    }
  }),

  updateNotificationPreferences: tool({
    description: 'Update user notification preferences',
    inputSchema: z.object({
      userId: z.string(),
      preferences: z.object({
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
        discussionNotifications: z.boolean(),
        assignmentReminders: z.boolean()
      })
    }),
    execute: async ({ userId, preferences }) => {
      // Implementation
    }
  })
}
```

#### 4.1.3 设置管理工具

```typescript
export const settingsManagementTools = {
  updateUserSettings: tool({
    description: 'Update user settings and preferences',
    inputSchema: z.object({
      userId: z.string(),
      organizationId: z.string().optional(),
      settings: z.object({
        theme: z.enum(['light', 'dark', 'auto']).optional(),
        language: z.enum(['zh-CN', 'en-US']).optional(),
        aiResponseSpeed: z.enum(['fast', 'balanced', 'thorough']).optional(),
        aiSuggestionsEnabled: z.boolean().optional()
      })
    }),
    execute: async ({ userId, organizationId, settings }) => {
      // Implementation
    }
  }),

  manageOnboardingProgress: tool({
    description: 'Track and update onboarding progress',
    inputSchema: z.object({
      userId: z.string(),
      stepName: z.string(),
      completed: z.boolean(),
      stepData: z.record(z.any()).optional()
    }),
    execute: async ({ userId, stepName, completed, stepData }) => {
      // Implementation
    }
  })
}
```

#### 4.1.4 班级管理工具

```typescript
export const classManagementTools = {
  createClass: tool({
    description: 'Create a new class with settings',
    inputSchema: z.object({
      organizationId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      settings: z.object({
        allowSelfEnrollment: z.boolean().default(false),
        maxStudents: z.number().optional(),
        classCode: z.string().optional()
      })
    }),
    execute: async ({ organizationId, name, description, settings }) => {
      // Implementation
    }
  }),

  manageClassMembers: tool({
    description: 'Add or remove students from class',
    inputSchema: z.object({
      classId: z.string(),
      action: z.enum(['add', 'remove']),
      userIds: z.array(z.string())
    }),
    execute: async ({ classId, action, userIds }) => {
      // Implementation
    }
  })
}
```

### 4.2 AI工具调用增强

**当前问题：**
- 工具定义分散在不同文件中
- 缺乏统一的工具注册机制
- 没有工具使用审计日志

**解决方案：**

1. **统一工具注册中心：**
```typescript
// /lib/ai/tool-registry.ts
export const AI_TOOL_REGISTRY = {
  course: courseEditingTools,
  discussion: discussionManagementTools,
  notification: notificationManagementTools,
  settings: settingsManagementTools,
  class: classManagementTools
}

export function getAllTools() {
  return Object.values(AI_TOOL_REGISTRY).flat()
}
```

2. **工具使用审计：**
```sql
CREATE TABLE ai_tool_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tool_name VARCHAR(100) NOT NULL,
  tool_category VARCHAR(50) NOT NULL,
  input_parameters JSONB,
  output_result JSONB,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5. API端点扩展需求

### 5.1 讨论系统API

```typescript
// 讨论线程管理
POST /api/discussions/threads - 创建讨论线程
GET /api/discussions/threads - 获取讨论线程列表
GET /api/discussions/threads/[id] - 获取特定讨论线程
PUT /api/discussions/threads/[id] - 更新讨论线程
DELETE /api/discussions/threads/[id] - 删除讨论线程

// 帖子管理
POST /api/discussions/threads/[threadId]/posts - 创建帖子
GET /api/discussions/threads/[threadId]/posts - 获取帖子列表
PUT /api/discussions/posts/[id] - 更新帖子
DELETE /api/discussions/posts/[id] - 删除帖子

// 讨论参与
GET /api/discussions/threads/[threadId]/participants - 获取参与者列表
POST /api/discussions/threads/[threadId]/read - 标记为已读
```

### 5.2 通知系统API

```typescript
// 通知管理
GET /api/notifications - 获取用户通知列表
PUT /api/notifications/[id]/read - 标记通知为已读
PUT /api/notifications/read-all - 批量标记已读
DELETE /api/notifications/[id] - 删除通知

// 通知偏好
GET /api/notifications/preferences - 获取通知偏好
PUT /api/notifications/preferences - 更新通知偏好

// 通知发送（仅教师）
POST /api/notifications/send - 发送通知
```

### 5.3 设置管理API

```typescript
// 用户设置
GET /api/settings - 获取用户设置
PUT /api/settings - 更新用户设置

// 引导流程
GET /api/onboarding/progress - 获取引导进度
PUT /api/onboarding/progress - 更新引导步骤
DELETE /api/onboarding/progress/[stepName] - 重置引导步骤
```

### 5.4 增强的AI聊天API

```typescript
// 统一AI对话端点
POST /api/ai/chat - 主要AI对话端点（支持工具调用）

// 特定功能端点
POST /api/ai/discussion-assistant - 讨论助手
POST /api/ai/notification-manager - 通知管理助手
POST /api/ai/settings-advisor - 设置建议助手
POST /api/ai/class-optimizer - 班级优化助手
```

### 5.5 自学习者API

```typescript
// 学习路径
GET /api/self-learner/pathways - 获取学习路径
POST /api/self-learner/pathways - 创建学习路径
PUT /api/self-learner/pathways/[id] - 更新学习路径

// 课程收藏
GET /api/self-learner/favorites - 获取收藏课程
POST /api/self-learner/favorites - 添加收藏
DELETE /api/self-learner/favorites/[id] - 取消收藏

// 公开课程访问
GET /api/public/courses - 获取公开课程列表
GET /api/public/classes - 获取公开班级列表
```

## 6. 认证与授权变更

### 6.1 角色系统扩展

**新增自学习者角色：**
- 允许访问公开课程和班级
- 限制管理功能访问
- 独立的权限检查逻辑

**权限矩阵：**

| 功能 | Teacher | Student | Self-Learner |
|------|---------|---------|--------------|
| 创建班级 | ✅ | ❌ | ❌ |
| 创建课程 | ✅ | ❌ | ❌ |
| 发起讨论 | ✅ | ✅ | ✅ |
| 管理讨论 | ✅ | ❌ | ❌ |
| 发送通知 | ✅ | ❌ | ❌ |
| 查看进度 | ✅ | ✅ | ✅ (仅自己) |
| 访问设置 | ✅ | ✅ | ✅ |
| 自定义学习路径 | ❌ | ❌ | ✅ |

### 6.2 RLS策略增强

**讨论系统RLS：**
```sql
-- 讨论线程访问控制
CREATE POLICY "Users can view discussions for their classes"
  ON discussion_threads FOR SELECT
  USING (
    class_id IN (
      SELECT class_id FROM class_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create discussions"
  ON discussion_threads FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND class_id IN (
      SELECT class_id FROM class_members
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );
```

**通知系统RLS：**
```sql
-- 通知访问控制
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

## 7. 实时功能需求

### 7.1 实时讨论

**WebSocket集成：**
- 使用Supabase Realtime监听讨论更新
- 新帖子实时推送给在线用户
- 在线用户状态显示

**实现方案：**
```typescript
// 实时订阅
const subscription = supabase
  .channel(`discussion:${threadId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'discussion_posts',
    filter: `thread_id=eq.${threadId}`
  }, (payload) => {
    // 处理新帖子
  })
  .subscribe()
```

### 7.2 实时通知

**通知推送：**
- 实时通知显示
- 浏览器通知API集成
- 移动推送通知（未来）

**实现方案：**
```typescript
// 通知订阅
const notificationSubscription = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // 显示通知
    showNotification(payload.new)
  })
  .subscribe()
```

## 8. 安全考虑

### 8.1 讨论系统安全

**内容审核：**
- 敏感词过滤
- 恶意内容检测
- 举报机制

**实现方案：**
```typescript
// 内容审核中间件
export async function validateDiscussionContent(content: string) {
  // 敏感词检测
  const sensitiveWords = await getSensitiveWords()
  if (containsSensitiveWords(content, sensitiveWords)) {
    throw new Error('Content contains inappropriate language')
  }

  // 长度限制
  if (content.length > 10000) {
    throw new Error('Content exceeds maximum length')
  }

  return true
}
```

### 8.2 AI工具调用安全

**速率限制：**
- 每用户每分钟工具调用次数限制
- 防止AI工具滥用

**实现方案：**
```typescript
// 速率限制中间件
export const rateLimit = {
  aiTools: {
    windowMs: 60 * 1000, // 1分钟
    max: 30, // 最多30次调用
    message: 'Too many AI tool calls'
  }
}
```

### 8.3 数据访问控制

**细粒度权限：**
- 班级级别数据隔离
- 组织级别数据隔离
- 用户级别数据隔离

**实现方案：**
```sql
-- 增强的RLS策略
CREATE POLICY "Data isolation by organization and class"
  ON all_tables FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
    AND (
      class_id IS NULL OR class_id IN (
        SELECT class_id FROM class_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

## 9. 性能优化

### 9.1 数据库优化

**索引策略：**
- 复合索引优化常见查询
- 分区表优化大数据量
- 物化视图缓存复杂查询

**实现方案：**
```sql
-- 复合索引
CREATE INDEX idx_discussions_active ON discussion_threads(class_id, type, last_activity_at DESC);
CREATE INDEX idx_notifications_unread_priority ON notifications(user_id, is_read, priority, created_at DESC);

-- 分区表（如果数据量过大）
CREATE TABLE notifications_partitioned (
  LIKE notifications INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 物化视图
CREATE MATERIALIZED VIEW class_activity_summary AS
SELECT
  class_id,
  COUNT(*) as total_discussions,
  COUNT(DISTINCT created_by) as active_users,
  MAX(last_activity_at) as last_activity
FROM discussion_threads
GROUP BY class_id;
```

### 9.2 缓存策略

**Redis缓存：**
- 讨论线程列表缓存
- 用户设置缓存
- AI响应缓存

**实现方案：**
```typescript
// Redis缓存中间件
export async function getCachedDiscussions(classId: string) {
  const cacheKey = `discussions:${classId}`
  const cached = await redis.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const discussions = await fetchDiscussions(classId)
  await redis.setex(cacheKey, 300, JSON.stringify(discussions)) // 5分钟缓存

  return discussions
}
```

## 10. 实施建议

### 10.1 开发阶段规划

**阶段1：数据模型扩展（2周）**
1. 创建讨论系统相关表
2. 创建通知系统相关表
3. 创建设置管理相关表
4. 添加自学习者角色支持
5. 实施RLS策略

**阶段2：API端点开发（3周）**
1. 开发讨论系统API
2. 开发通知系统API
3. 开发设置管理API
4. 开发自学习者API
5. 增强AI聊天API

**阶段3：AI工具系统升级（2周）**
1. 实现新增AI工具类别
2. 建立统一工具注册中心
3. 实施工具使用审计
4. 集成工具调用监控

**阶段4：实时功能实现（2周）**
1. 集成Supabase Realtime
2. 实现实时讨论
3. 实现实时通知
4. 优化WebSocket性能

**阶段5：安全与性能优化（1周）**
1. 实施内容审核
2. 配置速率限制
3. 优化数据库索引
4. 实施缓存策略

### 10.2 风险评估

**高风险项：**
- 实时功能性能瓶颈
- AI工具调用安全漏洞
- 大量并发讨论性能问题

**缓解措施：**
- 性能测试和压力测试
- 安全审计和渗透测试
- 分阶段部署和监控

### 10.3 测试策略

**单元测试：**
- API端点测试
- 数据库操作测试
- AI工具调用测试

**集成测试：**
- 端到端工作流测试
- 实时功能测试
- 权限控制测试

**性能测试：**
- 负载测试
- 压力测试
- 并发测试

## 11. 总结

WeaveMind LMS的后端架构已经具备了坚实的基础，包括完整的数据库设计、AI系统和认证机制。前端重构需要的数据模型扩展和API增强是可行的，且不会影响现有功能。

**关键建议：**
1. 优先实施数据模型扩展，建立完整的基础设施
2. 分阶段实施API端点，确保稳定性
3. 重点关注AI工具系统的安全性和性能
4. 实施全面的测试策略，确保质量
5. 持续监控和优化性能

通过这些改进，WeaveMind LMS将能够支持现代化的AI驱动学习管理体验，包括讨论、通知、设置和增强的AI功能。
