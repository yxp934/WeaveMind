# WeaveMind LMS - 通知系统API开发需求

## 项目概述
为WeaveMind LMS开发完整的通知系统API端点，基于现有的Next.js 15 + TypeScript + Supabase架构。

## 数据库架构
通知系统的数据库迁移已完成（文件：/Users/yxp/Documents/WeaveMind/supabase/migrations/023_notification_system.sql），包含以下核心表：

### 核心表结构
1. **notifications** - 通知主表
   - id, user_id, organization_id, title, content, type, priority, scope
   - class_id, course_id, assignment_id等关联字段
   - is_read, read_at, is_archived, archived_at
   - delivery_methods, delivery_status
   - expires_at, scheduled_for

2. **notification_preferences** - 通知偏好设置
   - user_id, organization_id, class_id
   - notification_type, priority
   - delivery_preferences (JSONB)
   - quiet_hours, dnd设置

3. **notification_queue** - 通知队列
   - notification_id, delivery_method, status
   - scheduled_for, attempts, error处理

4. **notification_read_status** - 详细阅读状态
   - notification_id, user_id
   - read_by_method (JSONB)

5. **notification_templates** - 通知模板
   - 预定义的模板系统

### 枚举类型
- notification_type: 'course_update', 'assignment_due', 'new_discussion', 'discussion_reply', 'grade_posted', 'class_announcement', 'system_alert', 'ai_assistance', 'material_shared', 'deadline_reminder', 'feedback_received', 'peer_message'
- notification_priority: 'low', 'normal', 'high', 'urgent'
- delivery_method: 'in_app', 'email', 'push'
- notification_scope: 'organization', 'class', 'individual'

## API端点需求（8个）

### 1. 通知管理API
- **GET /api/notifications** - 获取用户通知列表
  - 支持分页（page, limit）
  - 过滤选项：未读/已读/归档 (status: unread/read/archived/all)
  - 按类型过滤 (type)
  - 按优先级过滤 (priority)
  - 按时间范围过滤 (date_from, date_to)
  - 排序选项 (sort: created_at_desc/created_at_asc/priority_desc)

- **PUT /api/notifications/[id]/read** - 标记通知为已读
  - 单个通知标记为已读
  - 验证通知属于当前用户

- **PUT /api/notifications/read-all** - 批量标记所有通知为已读
  - 支持按范围：全部/未读/特定类型
  - 支持批量操作

- **DELETE /api/notifications/[id]** - 删除通知（软删除）
  - 将通知标记为已归档
  - 验证权限

### 2. 通知偏好设置API
- **GET /api/notifications/preferences** - 获取用户通知偏好设置
  - 返回用户的所有偏好设置
  - 支持按范围过滤 (scope: individual/organization/class)

- **PUT /api/notifications/preferences** - 更新通知偏好设置
  - 更新delivery_preferences
  - 设置quiet_hours和dnd
  - 按notification_type设置偏好

### 3. 通知发送API（仅教师）
- **POST /api/notifications/send** - 发送通知给用户或班级
  - 仅限教师权限
  - 支持单个用户或整个班级
  - 支持定时发送
  - 支持多种delivery_method

### 4. 通知统计API
- **GET /api/notifications/summary** - 获取通知统计摘要
  - 未读通知总数
  - 按优先级分布
  - 按类型分布
  - 最近活动
  - 使用数据库函数get_user_notification_summary()

## 技术要求

### 1. 代码结构
- **API路由位置**: `/Users/yxp/Documents/WeaveMind/app/api/notifications/`
- **工具库位置**: `/Users/yxp/Documents/WeaveMind/lib/notifications/`
- **类型定义**: `/Users/yxp/Documents/WeaveMind/lib/notifications/types.ts`

### 2. 依赖和导入
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
```

### 3. 验证模式（Zod Schemas）
为每个API端点创建完整的输入验证模式，包括：
- 分页参数验证
- 日期范围验证
- 枚举值验证（notification_type, priority等）
- JSON字段验证
- 必填字段检查

### 4. 错误处理
遵循现有API模式：
```typescript
try {
  // 业务逻辑
  return NextResponse.json({ data, message: 'Success' })
} catch (error: any) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: error.message || 'Internal server error' },
    { status: 500 }
  )
}
```

### 5. 权限检查
- 使用Supabase Auth验证用户身份
- 验证用户角色（教师/学生）
- 检查RLS策略权限
- 确保用户只能操作自己的数据

### 6. 数据库操作
- 使用Supabase客户端进行所有数据库操作
- 利用现有的RLS策略
- 使用适当的索引优化查询
- 支持事务操作（必要时）

### 7. 响应格式
统一JSON响应格式：
```typescript
// 成功响应
{
  success: true,
  data: {...},
  message?: string
}

// 错误响应
{
  error: string,
  details?: any
}
```

### 8. 分页实现
- 标准分页：{ page: number, limit: number }
- 返回格式：{ data: [], pagination: { page, limit, total, totalPages } }

### 9. 实时更新支持
- 考虑Supabase Realtime集成
- 为future扩展准备

### 10. 日志记录
- 记录关键操作
- 错误日志详细记录
- 性能监控点

## 现有代码模式参考

### API路由模式
参考文件：`/Users/yxp/Documents/WeaveMind/app/api/compression-context/[classId]/route.ts`
```typescript
export async function GET(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const classId = params.classId
    // 验证参数
    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 业务逻辑
    const data = await /* 数据库操作 */
    
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 验证模式参考
参考文件：`/Users/yxp/Documents/WeaveMind/lib/ai/editing-tool-definitions.ts`
```typescript
import { z } from 'zod'

const schema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
  field3: z.enum(['option1', 'option2'])
})
```

## 预期文件结构
```
/Users/yxp/Documents/WeaveMind/app/api/notifications/
├── route.ts                          # GET /api/notifications
├── read-all/
│   └── route.ts                      # PUT /api/notifications/read-all
├── [id]/
│   ├── read/
│   │   └── route.ts                  # PUT /api/notifications/[id]/read
│   └── route.ts                      # DELETE /api/notifications/[id]
├── preferences/
│   └── route.ts                      # GET/PUT /api/notifications/preferences
├── send/
│   └── route.ts                      # POST /api/notifications/send
└── summary/
    └── route.ts                      # GET /api/notifications/summary

/Users/yxp/Documents/WeaveMind/lib/notifications/
├── types.ts                          # TypeScript类型定义
├── schemas.ts                        # Zod验证模式
├── validators.ts                     # 验证工具函数
├── queries.ts                        # 数据库查询函数
└── utils.ts                          # 通用工具函数
```

## 开发步骤
1. 创建类型定义和验证模式
2. 实现数据库查询工具函数
3. 创建各个API路由文件
4. 实现输入验证和错误处理
5. 添加权限检查
6. 测试所有端点
7. 性能优化
8. 文档完善

## 注意事项
- 严格遵循现有的代码风格和模式
- 确保所有操作都符合RLS策略
- 处理边界情况和异常情况
- 优化数据库查询性能
- 保持代码可读性和可维护性
- 添加必要的注释
- 考虑future扩展性
