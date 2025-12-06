# WeaveMind LMS API端点文档

## 项目概述

本文档描述了为WeaveMind LMS新开发的设置管理和自学习者API端点。这些端点提供了完整的用户设置管理功能和自学习者学习路径管理功能。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **数据库**: Supabase (PostgreSQL)
- **验证**: Zod
- **认证**: Supabase Auth

## API端点列表

### 设置管理API（4个端点）

#### 1. GET /api/settings
**功能**: 获取用户设置（支持组织和用户级别设置）

**查询参数**:
- `scope` (可选): 设置作用域 - 'system' | 'organization' | 'user'
- `organization_id` (可选): 组织ID
- `category` (可选): 设置分类
- `limit` (可选): 分页限制，默认10，最大100
- `offset` (可选): 分页偏移量，默认0

**响应格式**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "organization_id": "uuid",
      "scope": "user",
      "setting_category": "preferences",
      "setting_key": "theme",
      "setting_value": "dark",
      "data_type": "string",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

#### 2. PUT /api/settings
**功能**: 更新用户设置

**请求体**:
```json
{
  "scope": "user",
  "setting_category": "preferences",
  "setting_key": "theme",
  "setting_value": "light",
  "data_type": "string",
  "description": "用户主题偏好"
}
```

**响应格式**:
```json
{
  "data": {
    "id": "uuid",
    "setting_key": "theme",
    "setting_value": "light",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 3. GET /api/onboarding/progress
**功能**: 获取用户引导进度

**查询参数**:
- `template_id` (可选): 引导模板ID
- `status` (可选): 引导状态 - 'not_started' | 'in_progress' | 'completed' | 'skipped'
- `limit` (可选): 分页限制
- `offset` (可选): 分页偏移量

**响应格式**:
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "template_id": "uuid",
    "status": "in_progress",
    "current_step_index": 1,
    "total_steps": 5,
    "completed_steps": 1,
    "completion_percentage": 20.0,
    "step_data": [],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 4. PUT /api/onboarding/progress
**功能**: 更新引导步骤进度

**请求体**:
```json
{
  "template_id": "uuid",
  "status": "in_progress",
  "current_step_index": 2,
  "completed_steps": 2,
  "step_data": [
    {
      "step": 1,
      "completed": true,
      "completed_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 自学习者API（6个端点）

#### 5. GET /api/self-learner/pathways
**功能**: 获取用户学习路径列表

**查询参数**:
- `is_public` (可选): 是否公开
- `difficulty_level` (可选): 难度级别 - 'beginner' | 'intermediate' | 'advanced'
- `user_id` (可选): 用户ID（查看其他用户的公开路径）
- `limit` (可选): 分页限制
- `offset` (可选): 分页偏移量

**响应格式**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "My Learning Path",
      "description": "A test learning pathway",
      "difficulty_level": "beginner",
      "estimated_duration_hours": 10,
      "is_public": false,
      "tags": ["test", "learning"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

#### 6. POST /api/self-learner/pathways
**功能**: 创建新的学习路径

**请求体**:
```json
{
  "title": "My Learning Path",
  "description": "A test learning pathway",
  "difficulty_level": "beginner",
  "estimated_duration_hours": 10,
  "is_public": false,
  "tags": ["test", "learning"]
}
```

**响应格式**:
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "My Learning Path",
    "description": "A test learning pathway",
    "difficulty_level": "beginner",
    "estimated_duration_hours": 10,
    "is_public": false,
    "tags": ["test", "learning"],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 7. PUT /api/self-learner/pathways/[id]
**功能**: 更新学习路径

**路径参数**:
- `id`: 学习路径ID

**请求体**:
```json
{
  "title": "Updated Learning Path",
  "description": "Updated description",
  "is_public": true
}
```

**响应格式**: 与创建路径相同

#### 8. DELETE /api/self-learner/pathways/[id]
**功能**: 删除学习路径

**路径参数**:
- `id`: 学习路径ID

**响应格式**:
```json
{
  "data": {
    "message": "Learning pathway deleted successfully",
    "deleted_pathway": {
      "id": "uuid",
      "title": "My Learning Path"
    }
  }
}
```

#### 9. GET /api/self-learner/favorites
**功能**: 获取收藏的课程和班级

**查询参数**:
- `favorite_type` (可选): 收藏类型 - 'course' | 'class' | 'chapter' | 'component'
- `limit` (可选): 分页限制
- `offset` (可选): 分页偏移量

**响应格式**:
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "course_id": "uuid",
      "class_id": null,
      "favorite_type": "course",
      "notes": "Great course!",
      "created_at": "2024-01-01T00:00:00Z",
      "primary_object": {
        "id": "uuid",
        "title": "Course Title",
        "description": "Course description"
      },
      "primary_type": "course"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

#### 10. POST /api/self-learner/favorites
**功能**: 添加收藏

**请求体**:
```json
{
  "favorite_type": "course",
  "course_id": "uuid",
  "notes": "Great course!"
}
```

**响应格式**:
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "course_id": "uuid",
    "favorite_type": "course",
    "notes": "Great course!",
    "created_at": "2024-01-01T00:00:00Z",
    "primary_object": {
      "id": "uuid",
      "title": "Course Title"
    },
    "primary_type": "course"
  }
}
```

## 通用特性

### 认证和授权
- 所有端点都需要有效的Supabase认证token
- 基于RLS（行级安全）策略的数据访问控制
- 用户只能访问自己的数据（除非查看公开内容）

### 错误处理
- 统一的错误响应格式
- 详细的错误信息和状态码
- 开发环境下的详细错误堆栈

### 输入验证
- 使用Zod进行严格的输入验证
- 支持批量操作验证
- 详细的验证错误信息

### 分页支持
- 所有列表端点支持分页
- 一致的分页响应格式
- 可配置的分页大小（最大100条）

### 日志记录
- 所有API请求的详细日志记录
- 错误日志包含上下文信息
- 客户端IP地址和用户代理记录

## 文件结构

```
lib/
├── types/
│   └── api.ts              # API类型定义
├── validators/
│   └── api.ts              # Zod验证模式
└── utils/
    └── api.ts              # 通用API工具函数

app/api/
├── settings/
│   └── route.ts            # 设置管理端点
├── onboarding/
│   └── progress/
│       └── route.ts        # 引导进度端点
└── self-learner/
    ├── favorites/
    │   └── route.ts        # 收藏管理端点
    └── pathways/
        ├── route.ts        # 学习路径列表和创建
        └── [id]/
            └── route.ts    # 学习路径更新和删除
```

## 测试

项目包含测试脚本 `test-api-endpoints.js`，可以用于验证所有API端点的功能。

```bash
node test-api-endpoints.js
```

## 部署

所有API端点都已集成到现有的Next.js应用中，会随着主应用的部署自动部署。

## 安全考虑

1. **认证**: 所有端点都需要有效的认证token
2. **授权**: 基于用户角色和RLS策略的访问控制
3. **输入验证**: 严格的输入验证防止注入攻击
4. **错误处理**: 不暴露敏感的数据库信息
5. **日志记录**: 记录所有API请求用于审计

## 性能优化

1. **数据库索引**: 所有查询字段都有适当的索引
2. **分页**: 支持大数据集的分页查询
3. **连接池**: 使用Supabase的连接池
4. **查询优化**: 最小化数据库查询次数

## 后续扩展

这些API端点为以下功能提供了基础：

1. 用户个性化设置管理
2. 引导流程管理
3. 自学习者学习路径管理
4. 收藏和偏好系统
5. 学习活动跟踪

可以基于这些端点构建更复杂的业务逻辑和用户界面。