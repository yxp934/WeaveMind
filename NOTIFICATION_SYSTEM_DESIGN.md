# WeaveMind LMS 通知系统数据模型设计

## 概述

本文档详细描述了WeaveMind LMS通知系统的完整数据模型设计。该系统基于现有的多租户架构，提供灵活、高效的通知管理功能，支持多种通知类型、交付方式和用户偏好设置。

## 核心设计原则

### 1. 多租户架构
- 基于组织的权限隔离
- 支持组织级、班级级和个人级通知
- 遵循现有的RLS安全策略

### 2. 灵活的通知类型
- 支持12种预定义通知类型
- 可扩展的枚举类型设计
- 优先级和范围控制

### 3. 多渠道交付
- 应用内通知 (in_app)
- 邮件通知 (email)
- 推送通知 (push)
- JSONB配置支持未来扩展

### 4. 用户个性化
- 细粒度的通知偏好控制
- 静默时间和免打扰功能
- 按组织和班级独立设置

## 数据库表结构

### 1. notifications（通知主表）

**用途**: 存储所有通知的核心信息

**关键字段**:
- `id`: UUID主键
- `user_id`: 通知接收者
- `organization_id`: 组织ID（多租户隔离）
- `type`: 通知类型（12种预定义类型）
- `priority`: 优先级（low/normal/high/urgent）
- `scope`: 作用范围（organization/class/individual）
- `delivery_methods`: 交付方式数组
- `delivery_status`: 交付状态跟踪
- `is_read/read_at`: 已读状态和读取时间
- `is_archived/archived_at`: 归档状态和归档时间
- `expires_at`: 过期时间（自动清理）

**索引优化**:
- `idx_notifications_unread`: 快速查询未读通知
- `idx_notifications_user_priority`: 按用户和优先级查询
- `idx_notifications_created`: 按时间倒序查询

### 2. notification_preferences（通知偏好表）

**用途**: 存储用户对不同类型通知的偏好设置

**关键字段**:
- `user_id`: 用户ID
- `organization_id/class_id`: 可选的组织/班级范围
- `notification_type`: 通知类型
- `delivery_preferences`: JSONB格式的交付偏好
- `quiet_hours_*`: 静默时间设置
- `dnd_*`: 免打扰时间段

**设计特点**:
- 支持用户级、组织级、班级级三级偏好
- JSONB字段提供最大灵活性
- 唯一约束防止重复设置

### 3. notification_queue（通知队列表）

**用途**: 管理批量通知处理和重试机制

**关键字段**:
- `notification_id`: 关联通知ID
- `delivery_method`: 具体的交付方式
- `status`: 队列状态（pending/processing/sent/failed/cancelled）
- `attempts/max_attempts`: 重试次数控制
- `next_attempt_at`: 下次重试时间
- `ast_error_at`:error_message/l 错误跟踪

**功能**:
- 支持批量处理
- 自动重试机制
- 详细的错误跟踪

### 4. notification_read_status（通知阅读状态表）

**用途**: 详细跟踪用户对通知的阅读行为

**关键字段**:
- `notification_id/user_id`: 关联通知和用户
- `read_by_method`: 按交付方式的阅读状态
- `user_agent/ip_address`: 技术信息记录
- `metadata`: 额外的元数据

### 5. notification_templates（通知模板表）

**用途**: 存储可重用的通知模板

**关键字段**:
- `name`: 模板名称
- `title_template/content_template`: 模板内容（支持变量）
- `email_*_template`: 邮件专用模板
- `push_*_template`: 推送专用模板
- `variables`: 支持的变量列表
- `version`: 版本控制

## 索引策略

### 查询优化索引
```sql
-- 核心查询索引
CREATE INDEX idx_notifications_unread ON notifications(user_id)
WHERE is_read = FALSE AND is_archived = FALSE;

CREATE INDEX idx_notifications_user_priority ON priority DESC, created notifications(user_id,_at DESC);

-- 复合查询索引
CREATE INDEX idx_notifications_org_class ON notifications(organization_id, class_id)
WHERE class_id IS NOT NULL;

-- JSONB字段索引
CREATE INDEX idx_notifications_delivery_methods ON notifications USING GIN(delivery_methods);
```

### 队列处理索引
```sql
CREATE INDEX idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_for);
CREATE INDEX idx_notification_queue_next_attempt ON notification_queue(next_attempt_at)
WHERE status = 'pending';
```

## RLS安全策略

### 1. 通知访问控制
- **SELECT**: 用户只能查看自己的通知
- **INSERT**: 教师可以创建班级/组织通知，系统可创建任何通知
- **UPDATE**: 用户可标记自己的通知为已读/归档
- **DELETE**: 用户可软删除自己的通知

### 2. 偏好设置控制
- 用户完全控制自己的偏好设置
- 支持个人级、组织级、班级级独立设置
- 防止跨组织访问

### 3. 队列管理
- 系统级管理权限
- 用户可查看自己通知的队列状态
- 自动清理已完成条目

## 触发器和自动化

### 1. 阅读状态自动跟踪
```sql
CREATE TRIGGER trigger_update_notification_read_status
    AFTER UPDATE ON notifications
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = TRUE)
    EXECUTE FUNCTION update_notification_read_status();
```

### 2. 自动清理机制
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
BEGIN
    -- 归档过期通知
    UPDATE notifications
    SET is_archived = TRUE, archived_at = NOW()
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### 3. 批量处理函数
```sql
CREATE OR REPLACE FUNCTION process_notification_batch(
    p_batch_size INTEGER DEFAULT 100,
    p_delivery_method delivery_method DEFAULT NULL
)
RETURNS INTEGER AS $$
-- 处理队列中的待发送通知
$$ LANGUAGE plpgsql;
```

## 实时功能支持

### Supabase Realtime
- 为`notifications`和`notification_queue`表启用实时更新
- 支持实时通知推送
- 客户端可订阅通知变化

### 触发器支持
```sql
CREATE TRIGGER notification_realtime_changes
    AFTER INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION get_notification_changes();
```

## 性能优化策略

### 1. 查询优化
- 使用部分索引减少索引大小
- 复合索引优化常用查询模式
- JSONB字段使用GIN索引

### 2. 批量操作
- 支持批量创建通知
- 队列批量处理机制
- 自动化清理减少表大小

### 3. 缓存友好
- 通知统计视图预计算
- 用户通知摘要函数
- 减少实时计算负载

## 安全考虑

### 1. 数据隔离
- RLS策略确保用户只能访问自己的数据
- 多租户架构防止跨组织访问
- 教师权限范围控制

### 2. 防止滥用
- 通知频率限制（通过队列控制）
- 自动过期和清理机制
- 批量操作审核日志

### 3. 隐私保护
- 敏感信息脱敏存储
- 用户可完全控制通知偏好
- 数据自动清理（1年后删除阅读记录）

## 扩展性设计

### 1. 新通知类型
- 枚举类型易于扩展
- 模板系统支持新类型
- 保持向后兼容性

### 2. 新交付方式
- JSONB配置支持任意新方式
- 队列系统自动适配
- 无需修改表结构

### 3. 国际化支持
- 模板变量系统
- 多语言模板支持
- 时区自动处理

## 使用示例

### 1. 创建单条通知
```sql
INSERT INTO notifications (
    user_id, organization_id, title, content,
    type, priority, delivery_methods
) VALUES (
    'user-uuid', 'org-uuid', 'New Assignment',
    'You have a new assignment due tomorrow',
    'assignment_due', 'high', '["in_app", "push"]'::jsonb
);
```

### 2. 设置用户偏好
```sql
INSERT INTO notification_preferences (
    user_id, notification_type, delivery_preferences
) VALUES (
    'user-uuid', 'assignment_due',
    '{"in_app": true, "email": true, "push": false}'::jsonb
);
```

### 3. 获取用户通知摘要
```sql
SELECT get_user_notification_summary('user-uuid');
```

### 4. 批量创建通知
```sql
SELECT create_bulk_notifications('[
    {
        "user_id": "user1-uuid",
        "organization_id": "org-uuid",
        "title": "Course Updated",
        "content": "New content available",
        "type": "course_update",
        "delivery_methods": ["in_app"]
    }
]'::jsonb);
```

## 监控和维护

### 1. 统计视图
```sql
-- 通知统计概览
SELECT * FROM notification_statistics
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### 2. 队列监控
```sql
-- 查看队列状态
SELECT status, COUNT(*)
FROM notification_queue
GROUP BY status;
```

### 3. 定期维护
```sql
-- 清理过期数据
SELECT cleanup_expired_notifications();

-- 处理队列
SELECT process_notification_batch(100);
```

## 总结

这个通知系统设计具有以下优势：

1. **完整性**: 涵盖通知创建、分发、跟踪、清理全生命周期
2. **灵活性**: 支持多种通知类型和交付方式，易于扩展
3. **安全性**: 完善的RLS策略和多租户隔离
4. **性能**: 优化的索引和查询策略
5. **可维护性**: 清晰的表结构和丰富的自动化功能
6. **用户体验**: 细粒度的偏好设置和实时更新

该设计为WeaveMind LMS提供了企业级的通知管理能力，支持平台的规模化发展。