# WeaveMind Assignment Enhancement Plan

## Overview
扩展WeaveMind LMS的assignment功能，添加三种新的assignment类型：
1. 基于现有session的generate功能
2. Writing作业（简单格式编辑）
3. Research作业（带AI对话）

## Current State Analysis

### Existing Assignment System
- ✅ 数据库架构：assignments, assignment_questions, assignment_iterations等表
- ✅ AI生成系统：支持mcq, fill_blank, code, linking问题类型
- ✅ 基础的AssignmentGenerationDialog组件
- ❌ 存在问题：对话框不完整，表单字段缺失，无错误处理

### Test Report Findings
- 创建assignment对话框只有3个按钮：Back, Create Assignment, Cancel
- 缺少表单字段或上下文选择
- 点击"Create Assignment"无响应
- 无加载状态或错误反馈
- 无法到达"Test with Student Agent"按钮

## New Assignment Types Specification

### Type 1: Session-Based Assignment (基于现有session的generate功能)
**功能**：用户选择已有session进行assignment创建流程
- 复用现有的AssignmentGenerationDialog
- 修复对话框功能问题
- 添加session选择界面
- 保持现有的AI生成工作流

### Type 2: Writing Assignment (Writing作业)
**功能**：老师设置要求，学生可用简单格式编辑
- 支持富文本编辑（大小、加粗、斜体、下划线）
- 记录复制黏贴次数，防止抄袭
- 老师可查看学生提交内容
- 评分系统

**数据库扩展**：
```sql
-- Assignment subtypes
CREATE TYPE assignment_subtype AS ENUM ('ai_generated', 'writing', 'research');

-- Writing assignment details
CREATE TABLE writing_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  word_limit INTEGER,
  format_requirements TEXT,
  plagiarism_check BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student writing submissions
CREATE TABLE writing_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  copy_paste_count INTEGER DEFAULT 0,
  word_count INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- Copy-paste tracking
CREATE TABLE content_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES writing_submissions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'copy', 'paste'
  source_info TEXT, -- track where copied from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Type 3: Research Assignment (Research作业)
**功能**：类似writing，但提供AI对话框
- 支持AI聊天对话
- 学生可创建对话并保存
- 记录复制黏贴和AI聊天内容
- AI交互历史追踪

**数据库扩展**：
```sql
-- Research assignment details
CREATE TABLE research_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  word_limit INTEGER,
  research_guidelines TEXT,
  ai_assistance_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student research submissions
CREATE TABLE research_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  research_notes TEXT, -- AI conversation summary
  word_count INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

-- AI conversations
CREATE TABLE student_ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_assignment_id UUID NOT NULL REFERENCES research_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title TEXT,
  messages JSONB NOT NULL DEFAULT '[]', -- {role, content, timestamp}[]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## UI/UX Design

### Assignment Creation Dialog (重构)
```
┌─────────────────────────────────────────┐
│  Create New Assignment                  │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  [卡片] Session-Based Generation     │ │
│  │  选择现有session，AI自动生成题目      │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  [卡片] Writing Assignment           │ │
│  │  创建写作作业，支持格式编辑           │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  [卡片] Research Assignment          │ │
│  │  创建研究作业，带AI辅助对话           │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Student Assignment Interface

#### Writing Assignment
- 富文本编辑器（使用@tiptap/react或类似）
- 字数统计
- 复制黏贴计数器
- 提交按钮

#### Research Assignment
- 富文本编辑器
- AI聊天对话界面
- 对话历史显示
- 提交功能

## API Design

### 新增API端点
```
POST /api/assignments/writing/create
POST /api/assignments/research/create
GET  /api/assignments/{id}/submissions
POST /api/assignments/{id}/submissions/writing
POST /api/assignments/{id}/submissions/research
GET  /api/assignments/{id}/submissions/{studentId}
POST /api/ai/research-chat/{assignmentId}
GET  /api/ai/research-chat/{assignmentId}/conversations
POST /api/tracking/copy-paste
```

### 现有API修改
```
POST /api/assignments/generate - 修复现有功能
GET  /api/assignments/sessions - 获取可选择的session列表
```

## Development Plan

### Phase 1: Database Migration
- 创建migration文件
- 设置新表和RLS策略
- 测试数据库完整性

### Phase 2: Backend API开发
- 实现所有新API端点
- 集成AI对话功能（使用现有Vercel AI SDK）
- 实现复制黏贴追踪
- 添加RLS策略

### Phase 3: 前端组件开发
- 重构AssignmentGenerationDialog
- 创建Card-based选择界面
- 开发Writing Assignment界面
- 开发Research Assignment界面
- 创建AI聊天组件
- 开发教师端Submission查看界面

### Phase 4: 测试
- 单元测试
- 集成测试
- E2E测试（Playwright）
- 生产环境测试

## Technical Stack
- Frontend: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Next.js API Routes + Supabase
- AI: Vercel AI SDK (已集成)
- Rich Text Editor: @tiptap/react 或类似
- Testing: Playwright (已配置)

## Security Considerations
- 所有API端点需要proper authentication
- 学生只能访问自己的submissions
- 教师只能访问自己班级的submissions
- AI对话内容需要proper sanitization
- 复制黏贴追踪数据需要脱敏

## Performance Considerations
- 分页加载submissions
- AI对话消息按需加载
- 富文本编辑器懒加载
- 静态生成可能的页面

## Success Criteria
1. ✅ 三种assignment类型都能正常创建
2. ✅ 学生能正常提交Writing和Research作业
3. ✅ 老师能正确查看所有submissions
4. ✅ AI对话功能正常工作
5. ✅ 复制黏贴追踪功能正常
6. ✅ 所有功能在生产环境测试通过

## Timeline
- 数据库设计：立即开始
- 后端开发：并行进行
- 前端开发：并行进行
- 测试：开发完成后
- 部署：测试通过后

---
*Created: 2025-12-04*
*Project: WeaveMind LMS Enhancement*
