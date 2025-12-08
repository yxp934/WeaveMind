# WeaveMind 关键文件索引

## 📋 文档索引

| 文档名称 | 路径 | 描述 |
|---------|------|------|
| 详细分析报告 | `/OUTLINE_AND_A2A_SESSION_ANALYSIS_REPORT.md` | 全面的功能分析报告 |
| 总结文档 | `/ANALYSIS_SUMMARY.md` | 核心要点总结 |
| 数据流程图 | `/DATA_FLOW_DIAGRAMS.md` | Mermaid流程图 |
| AI会话修复报告 | `/AI_SESSION_TOPIC_PARSING_FIX.md` | 会话主题解析问题修复 |
| 会话数量修复报告 | `/SESSION_COUNT_REDUCTION_FIX.md` | 会话数量解析问题修复 |

---

## 🎯 核心功能文件

### Outline Generation

#### API层
| 文件 | 路径 | 功能 |
|------|------|------|
| generate-outline | `/app/api/ai/generate-outline/route.ts` | 生成课程大纲 |
| edit-outline | `/app/api/ai/edit-outline/route.ts` | 编辑课程大纲 |
| class-outline | `/app/api/classes/[id]/outline/route.ts` | 保存班级大纲 |

#### 组件层
| 文件 | 路径 | 功能 |
|------|------|------|
| ClassOutlineAssistant | `/components/ai/class-outline-assistant.tsx` | 大纲助手包装组件 |
| ClassOutlineAssistantWrapper | `/components/ai/class-outline-assistant-wrapper.tsx` | 大纲助手容器 |
| OutlineEditor | `/components/ai/outline-editor.tsx` | 大纲编辑器 |
| CourseChat | `/components/ai/course-chat.tsx` | 课程对话组件 |

#### AI逻辑层
| 文件 | 路径 | 功能 |
|------|------|------|
| prompts.ts | `/lib/ai/prompts.ts` | AI提示词模板 |

### A2A Session Generation

#### API层
| 文件 | 路径 | 功能 |
|------|------|------|
| generate-session-content | `/app/api/ai/generate-session-content/route.ts` | A2A生成会话内容 |
| save-session-content | `/app/api/ai/save-session-content/route.ts` | 保存会话内容 |
| generation-runs | `/app/api/ai/generation-runs/route.ts` | 生成任务管理 |
| generation-runs-accept | `/app/api/ai/generation-runs/[id]/accept/route.ts` | 接受生成结果 |
| generation-runs-discard | `/app/api/ai/generation-runs/[id]/discard/route.ts` | 丢弃生成结果 |

#### 组件层
| 文件 | 路径 | 功能 |
|------|------|------|
| CourseSessionsWrapper | `/components/ai/course-sessions-wrapper.tsx` | 会话包装组件 |
| CourseSessionsList | `/components/ai/course-sessions-list.tsx` | 会话列表 |
| ClassSessionsWrapper | `/components/ai/class-sessions-wrapper.tsx` | 班级会话包装 |
| A2ARefinementVisualizer | `/components/ai/a2a-refinement-visualizer.tsx` | A2A迭代可视化 |
| SessionContentDialog | `/components/ai/session-content-dialog.tsx` | 会话内容对话框 |
| SessionsList | `/components/ai/sessions-list.tsx` | 会话列表通用组件 |

#### AI逻辑层
| 文件 | 路径 | 功能 |
|------|------|------|
| course-generation-orchestrator | `/lib/ai/course-generation-orchestrator.ts` | A2A核心编排器 |
| editing-tool-definitions | `/lib/ai/editing-tool-definitions.ts` | AI工具定义 |
| course-editing-tools | `/lib/ai/course-editing-tools.ts` | 课程编辑工具 |

### Schedule Generation

#### API层
| 文件 | 路径 | 功能 |
|------|------|------|
| generate-class-schedule | `/app/api/ai/generate-class-schedule/route.ts` | 生成班级课程表 |
| generate-schedule | `/app/api/ai/generate-schedule/route.ts` | 生成课程表 |
| schedule-chat | `/app/api/ai/schedule-chat/route.ts` | 课程表对话 |
| course-chat | `/app/api/ai/course-chat/route.ts` | 课程对话 |

#### 组件层
| 文件 | 路径 | 功能 |
|------|------|------|
| ScheduleAssistantWrapper | `/components/ai/schedule-assistant-wrapper.tsx` | 课程表助手包装 |
| ClassScheduleAssistantWrapper | `/components/ai/class-schedule-assistant-wrapper.tsx` | 班级课程表助手 |
| ScheduleChat | `/components/ai/schedule-chat.tsx` | 课程表对话 |

---

## 🗄️ 数据库相关文件

### 迁移文件
| 文件 | 路径 | 功能 |
|------|------|------|
| ai_generation_and_outlines | `/supabase/migrations/009_ai_generation_and_outlines.sql` | AI生成和大纲表 |
| add_class_id_to_course_outlines | `/supabase/migrations/015_add_class_id_to_course_outlines.sql` | 添加班级ID到大纲 |
| add_posted_field_to_course_sessions | `/supabase/migrations/016_add_posted_field_to_course_sessions.sql` | 添加发布字段 |
| assignment_generation_system | `/supabase/migrations/018_assignment_generation_system.sql` | 作业生成系统 |

---

## 🔧 工具和配置

### 队列系统
| 文件 | 路径 | 功能 |
|------|------|------|
| ai-generation-queue | `/lib/queue/ai-generation-queue.ts` | AI生成队列 |
| ai-generation-worker | `/workers/ai-generation-worker.ts` | AI生成工作进程 |

### Supabase配置
| 文件 | 路径 | 功能 |
|------|------|------|
| server client | `/lib/supabase/server.ts` | 服务器端客户端 |
| admin client | `/lib/supabase/admin.ts` | 管理员客户端 |
| middleware | `/lib/supabase/middleware.ts` | 认证中间件 |

---

## 📊 页面和路由

### 教师页面
| 文件 | 路径 | 功能 |
|------|------|------|
| ClassDetailClient | `/app/teacher/classes/[id]/ClassDetailClient.tsx` | 班级详情客户端 |
| SessionDetailClient | `/app/teacher/sessions/[id]/SessionDetailClient.tsx` | 会话详情客户端 |
| NewSessionClient | `/app/teacher/classes/[id]/sessions/new/NewSessionClient.tsx` | 新建会话客户端 |
| TeacherDashboardClient | `/app/teacher/TeacherDashboardClient.tsx` | 教师仪表板客户端 |

### 学生页面
| 文件 | 路径 | 功能 |
|------|------|------|
| CourseSessionsDisplay | `/components/student/course-sessions-display.tsx` | 学生会话显示 |

---

## 🔍 工具文件搜索

### 按功能搜索
```bash
# 搜索Outline相关文件
grep -r "outline" /Users/yxp/Documents/WeaveMind --include="*.tsx" --include="*.ts" | head -20

# 搜索A2A相关文件
grep -r "A2A\|teacher.*agent\|student.*agent" /Users/yxp/Documents/WeaveMind --include="*.tsx" --include="*.ts" | head -20

# 搜索Session相关文件
grep -r "session" /Users/yxp/Documents/WeaveMind --include="*.tsx" --include="*.ts" | grep -v node_modules | head -20

# 搜索AI相关文件
find /Users/yxp/Documents/WeaveMind -path "*/ai/*" -name "*.ts" -o -path "*/ai/*" -name "*.tsx"
```

### 按文件名搜索
```bash
# 查找所有API路由
find /Users/yxp/Documents/WeaveMind/app/api -name "route.ts"

# 查找所有组件
find /Users/yxp/Documents/WeaveMind/components -name "*.tsx"

# 查找所有工具文件
find /Users/yxp/Documents/WeaveMind/lib -name "*.ts"
```

---

## 📌 关键代码位置

### A2A Orchestrator
- **位置**: `/lib/ai/course-generation-orchestrator.ts`
- **关键函数**:
  - `runCourseGeneration()` - 主入口
  - `runChapterGeneration()` - 章节生成
  - `buildBuilderPrompt()` - Teacher提示词
  - `buildCriticPrompt()` - Student提示词

### AI响应解析
- **位置**: `/app/api/ai/generate-class-schedule/route.ts:47-75`
- **功能**: 修复AI响应解析问题
- **关键代码**:
  ```typescript
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
  }
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
  ```

### 会话数量解析
- **位置**: `/app/api/ai/generate-class-schedule/route.ts:40-87`
- **功能**: 7种匹配模式解析会话数量
- **关键代码**: 7个正则表达式模式

### 拖拽排序（未完成）
- **位置**: `/components/ai/outline-editor.tsx:41-44`
- **TODO**: 需要实现实际排序逻辑

---

## 🔐 权限和安全

### RLS策略
- **位置**: `/supabase/migrations/009_ai_generation_and_outlines.sql:57-178`
- **功能**: 行级安全策略

### 权限验证
- **模式**: 在所有API中统一实现
- **示例**: `/app/api/ai/generate-outline/route.ts:12-18`

---

## 🧪 测试文件

### Playwright测试
```bash
# 测试文件位置
/Users/yxp/Documents/WeaveMind/playwright-report/index.html
```

---

## 📝 开发指南

### 新增AI功能步骤
1. 在 `/lib/ai/prompts.ts` 添加提示词模板
2. 在 `/lib/ai/` 创建编排器
3. 在 `/app/api/ai/` 创建API路由
4. 在 `/components/ai/` 创建UI组件
5. 添加相应的数据库迁移

### 修改提示词
1. 找到对应的 `build*Prompt` 函数
2. 在 `/lib/ai/prompts.ts` 中修改
3. 测试AI响应格式

### 调试AI调用
```typescript
console.log('AI Response:', text)
console.log('Parsed JSON:', parsed)
```

---

## 🚀 部署相关

### 环境变量
```bash
VERCEL_GATEWAY_KEY=xxx
REDIS_URL=redis://xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 构建命令
```bash
npm run build
npm run dev
npm run ai-worker
```

---

**更新日期**: 2025-12-08  
**文件数量**: 50+ 核心文件  
**覆盖范围**: 全部AI相关功能
