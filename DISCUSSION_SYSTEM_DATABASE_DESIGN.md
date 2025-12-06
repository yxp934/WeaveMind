# WeaveMind LMS 讨论系统数据模型设计

## 概述

本文档详细描述了WeaveMind LMS讨论系统的完整数据模型设计，基于现有的多租户架构，支持班级级别的讨论功能。

## 架构设计原则

### 1. 多租户架构兼容性
- 遵循现有的组织-班级-课程层级结构
- 基于现有的RLS（Row Level Security）策略
- 保持与现有数据模型的命名规范一致

### 2. 功能完整性
- 支持4种讨论类型：general、course、assignment、announcement
- 支持嵌套回复（最多10层深度）
- 支持多种内容类型：text、markdown、code
- 支持帖子反应（点赞、点踩等）

### 3. 性能优化
- 合理的索引策略
- 自动化的计数器更新
- 视图化的常用查询

## 数据模型详细设计

### 1. 讨论线程表 (discussion_threads)

**用途**：存储讨论线程的基本信息

**关键字段**：
- `id`: UUID主键
- `class_id`: 关联班级，支持多租户隔离
- `course_id`: 可选，关联课程（当type='course'时）
- `assignment_id`: 可选，关联作业（当type='assignment'时）
- `type`: 讨论类型（general/course/assignment/announcement）
- `is_pinned`: 是否置顶
- `is_locked`: 是否锁定
- `is_public`: 是否公开
- `last_activity_at`: 最后活动时间（用于排序）
- `post_count`: 帖子总数（缓存字段）

**约束**：
- 课程类型讨论必须关联课程和班级
- 作业类型讨论必须关联课程和作业
- 一般和公告类型讨论只关联班级

### 2. 讨论帖子表 (discussion_posts)

**用途**：存储讨论帖子的详细内容

**关键字段**：
- `id`: UUID主键
- `thread_id`: 关联讨论线程
- `parent_post_id`: 父帖子ID（支持嵌套回复）
- `user_id`: 发帖用户
- `title`: 帖子标题（根帖子必需）
- `content`: 帖子内容
- `post_type`: 内容类型（text/markdown/code）
- `attachments`: 附件JSONB数组
- `depth`: 嵌套深度（0-10）
- `reply_count`: 回复数量（缓存字段）
- `like_count`: 点赞数（缓存字段）
- `dislike_count`: 点踩数（缓存字段）
- `is_edited`: 是否已编辑
- `edit_count`: 编辑次数

**特性**：
- 支持无限层嵌套（限制10层）
- 软删除机制（is_deleted标记）
- 自动深度计算
- 附件支持（JSONB格式）

### 3. 讨论参与者表 (discussion_participants)

**用途**：跟踪用户对讨论线程的参与情况

**关键字段**：
- `id`: UUID主键
- `thread_id`: 关联讨论线程
- `user_id`: 用户ID
- `notification_level`: 通知级别（none/normal/high）
- `last_read_at`: 最后阅读时间
- `post_count`: 用户在该线程的发帖数
- `first_post_at`: 首次发帖时间
- `last_post_at`: 最后发帖时间
- `is_muted`: 是否静音
- `is_banned`: 是否被禁言

**用途**：
- 用户阅读进度跟踪
- 通知级别控制
- 参与度统计
- 禁言管理

### 4. 讨论反应表 (discussion_reactions)

**用途**：存储用户对帖子的反应

**关键字段**：
- `id`: UUID主键
- `post_id`: 关联帖子
- `user_id`: 用户ID
- `reaction_type`: 反应类型（like/dislike/helpful/confusing）

**特性**：
- 支持多种反应类型
- 用户-帖子-反应类型唯一约束
- 自动计数更新

## 索引策略

### 主要索引
```sql
-- 线程查询优化
CREATE INDEX idx_discussion_threads_class ON discussion_threads(class_id);
CREATE INDEX idx_discussion_threads_activity ON discussion_threads(last_activity_at DESC);
CREATE INDEX idx_discussion_threads_pinned ON discussion_threads(is_pinned DESC);

-- 帖子查询优化
CREATE INDEX idx_discussion_posts_thread ON discussion_posts(thread_id);
CREATE INDEX idx_discussion_posts_parent ON discussion_posts(parent_post_id);
CREATE INDEX idx_discussion_posts_created ON discussion_posts(created_at DESC);
CREATE INDEX idx_discussion_posts_thread_created ON discussion_posts(thread_id, created_at DESC);

-- 参与者查询优化
CREATE INDEX idx_discussion_participants_thread ON discussion_participants(thread_id);
CREATE INDEX idx_discussion_participants_user ON discussion_participants(user_id);

-- 反应查询优化
CREATE INDEX idx_discussion_reactions_post ON discussion_reactions(post_id);
```

### 复合索引
- `idx_discussion_posts_thread_created`: 线程内帖子按时间排序
- `idx_discussion_participants_thread_notification`: 线程参与者按通知级别查询

## RLS安全策略

### 讨论线程权限
- **查看权限**：班级成员可查看公开线程和创建的线程
- **创建权限**：教师可以创建讨论线程
- **修改权限**：线程创建者和教师可以修改
- **删除权限**：线程创建者和教师可以删除

### 讨论帖子权限
- **查看权限**：在可访问线程中的所有帖子
- **创建权限**：班级成员可在未锁定线程中发帖
- **修改权限**：发帖者可以修改自己的帖子
- **删除权限**：发帖者和教师可以删除帖子

### 讨论参与者权限
- **查看权限**：可访问线程的参与者
- **加入权限**：班级成员可以加入讨论
- **修改权限**：用户可以修改自己的参与设置
- **离开权限**：用户可以离开讨论

### 讨论反应权限
- **查看权限**：可访问帖子上的反应
- **创建权限**：班级成员可以添加反应
- **修改权限**：用户可以修改自己的反应
- **删除权限**：用户可以删除自己的反应

## 自动化触发器

### 1. 线程活动更新 (`update_thread_activity`)
- 新帖子发布时自动更新线程的最后活动时间
- 自动更新线程帖子总数
- 自动更新参与者统计信息

### 2. 回复计数更新 (`update_post_reply_count`)
- 新回复时自动更新父帖子的回复计数
- 自动更新最后回复时间

### 3. 反应计数更新 (`update_reaction_counts`)
- 添加/删除反应时自动更新帖子的点赞/点踩数

### 4. 自动参与者加入 (`auto_join_discussion_thread`)
- 用户首次发帖时自动加入讨论参与者

## 视图支持

### 1. 线程摘要视图 (`discussion_thread_summary`)
- 提供线程基本信息和用户参与状态
- 包含用户发帖数和最后阅读时间
- 支持前端快速加载线程列表

### 2. 帖子树形视图 (`discussion_post_tree`)
- 递归构建帖子层次结构
- 限制最大深度（10层）
- 包含用户信息和班级角色
- 支持前端树形展示

## 性能优化特性

### 1. 缓存字段
- `post_count`: 避免实时COUNT查询
- `reply_count`: 避免递归计数
- `like_count/dislike_count`: 避免聚合查询
- `last_activity_at`: 快速排序

### 2. 软删除
- `is_deleted` 字段避免物理删除
- 保留数据完整性和审计跟踪
- 查询时自动过滤已删除内容

### 3. 分层深度限制
- 最大10层嵌套防止性能问题
- 防止无限递归查询

## 扩展性考虑

### 1. 内容类型扩展
- `post_type` 枚举可扩展新类型
- `attachments` JSONB支持任意附件结构

### 2. 反应类型扩展
- `reaction_type` 枚举可添加新反应
- 现有触发器自动处理新类型

### 3. 通知系统扩展
- `notification_level` 支持细粒度通知控制
- 可集成到现有通知系统

### 4. 权限扩展
- `is_muted`、`is_banned` 支持内容管理
- 可扩展更多moderation功能

## 数据完整性

### 1. 外键约束
- 所有关联字段都有外键约束
- CASCADE删除保持数据一致性

### 2. 检查约束
- 深度限制检查
- 内容类型验证
- 业务逻辑验证（如类型与关联关系）

### 3. 唯一约束
- 参与者唯一性 (thread_id, user_id)
- 反应唯一性 (post_id, user_id, reaction_type)

## 迁移文件位置

- 文件路径：`/supabase/migrations/022_discussion_system.sql`
- 迁移编号：022（基于现有的21个迁移）
- 包含：完整的DDL、索引、RLS策略、触发器、视图

## 使用示例

### 创建讨论线程
```sql
INSERT INTO discussion_threads (
    class_id, course_id, organization_id,
    title, description, type,
    created_by
) VALUES (
    'class-uuid', 'course-uuid', 'org-uuid',
    '第一章讨论', '关于第一章内容的讨论', 'course',
    'user-uuid'
);
```

### 发布帖子
```sql
INSERT INTO discussion_posts (
    thread_id, user_id, title, content, post_type
) VALUES (
    'thread-uuid', 'user-uuid', '问题', '这里有个问题...', 'text'
);
```

### 回复帖子
```sql
INSERT INTO discussion_posts (
    thread_id, parent_post_id, user_id, content, post_type
) VALUES (
    'thread-uuid', 'parent-post-uuid', 'user-uuid', '我来回答...', 'text'
);
```

### 添加反应
```sql
INSERT INTO discussion_reactions (
    post_id, user_id, reaction_type
) VALUES (
    'post-uuid', 'user-uuid', 'like'
);
```

这个数据模型设计完全遵循WeaveMind LMS现有的架构模式，提供了一个功能完整、性能优化、安全可靠的讨论系统基础。