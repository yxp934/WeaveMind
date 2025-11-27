# WeaveMind 前端重构完整指南 / Frontend Reconstruction Complete Guide

## 📋 目录 / Table of Contents

1. [技术栈 / Tech Stack](#技术栈--tech-stack)
2. [页面路由结构 / Page Routing Structure](#页面路由结构--page-routing-structure)
3. [UI 组件库 / UI Component Library](#ui-组件库--ui-component-library)
4. [页面详细说明 / Page Details](#页面详细说明--page-details)
5. [动画与过渡效果 / Animations & Transitions](#动画与过渡效果--animations--transitions)
6. [导航与跳转逻辑 / Navigation & Routing Logic](#导航与跳转逻辑--navigation--routing-logic)

---

## 技术栈 / Tech Stack

### 核心框架 / Core Framework
- **Next.js 15** - App Router (服务端组件 + 客户端组件)
- **React 19** - 最新版本
- **TypeScript 5** - 类型安全

### 样式系统 / Styling System
- **Tailwind CSS 3.4** - 实用优先的 CSS 框架
- **自定义 CSS 变量** - 主题颜色定义在 `globals.css`
- **响应式设计** - 移动优先，使用 `sm:`, `md:`, `lg:` 断点

### UI 组件 / UI Components
- **shadcn/ui 风格** - 自定义实现的基础组件
- **无外部 UI 库依赖** - 所有组件都是自己实现

### 状态管理 / State Management
- **React Hooks** - `useState`, `useEffect`, `useRef`
- **URL 状态** - 使用 Next.js 路由参数
- **无全局状态库** - 不使用 Redux/Zustand

---

## 页面路由结构 / Page Routing Structure

### 公共页面 / Public Pages

#### 1. **首页 / Landing Page** - `/`
- **文件**: `app/page.tsx`
- **类型**: 服务端组件
- **功能**: 
  - 展示 WeaveMind 品牌
  - 提供登录/注册入口
- **布局**:
  - 全屏居中
  - 渐变背景 (`bg-gradient-to-br from-blue-50 to-indigo-100`)
  - 大标题 + 副标题 + 两个按钮

#### 2. **登录页 / Login Page** - `/auth/login`
- **文件**: `app/auth/login/page.tsx`
- **类型**: 客户端组件 (`"use client"`)
- **功能**:
  - 邮箱 + 密码登录
  - 错误提示
  - 跳转到注册页链接
- **表单字段**:
  - Email (type="email", required)
  - Password (type="password", required)
- **提交后**: 跳转到 `/role-select`

#### 3. **注册页 / Signup Page** - `/auth/signup`
- **文件**: `app/auth/signup/page.tsx`
- **类型**: 客户端组件
- **功能**:
  - 邮箱 + 密码 + 确认密码
  - 密码验证 (最少 6 字符)
  - 密码匹配验证
- **表单字段**:
  - Email
  - Password
  - Confirm Password
- **提交后**: 跳转到 `/role-select`

#### 4. **角色选择页 / Role Selection** - `/role-select`
- **文件**: `app/role-select/page.tsx`
- **类型**: 客户端组件
- **功能**:
  - 选择 Teacher 或 Student 角色
  - 角色一旦选择不可更改
  - 自动检测已有角色并跳转
- **布局**:
  - 两列卡片 (Teacher 👨‍🏫 / Student 🎓)
  - 每个卡片包含图标、标题、描述、按钮
- **选择后**: 跳转到 `/teacher` 或 `/student`

---

### 教师端页面 / Teacher Pages

#### 5. **教师仪表板 / Teacher Dashboard** - `/teacher`
- **文件**: `app/teacher/page.tsx`
- **类型**: 服务端组件
- **功能**:
  - 显示组织、班级、课程统计
  - 列出所有组织
  - 提供创建组织入口
  - Analytics 入口 (📊 Analytics 卡片)
- **导航栏**:
  - 左侧: WeaveMind logo + "Teacher Dashboard"
  - 右侧: 用户邮箱 + Sign Out 按钮
- **统计卡片** (4 个):
  1. Organizations (组织数量)
  2. Classes (班级数量)
  3. Courses (课程数量)
  4. 📊 Analytics (渐变背景，点击跳转)

#### 6. **组织详情页 / Organization Detail** - `/teacher/organizations/[id]`
- **文件**: `app/teacher/organizations/[id]/page.tsx`
- **功能**:
  - 显示组织信息
  - 列出该组织下的所有班级
  - 提供创建班级入口

#### 7. **班级详情页 / Class Detail** - `/teacher/classes/[id]`
- **文件**: `app/teacher/classes/[id]/page.tsx`
- **功能**:
  - 显示班级信息
  - 列出该班级的所有课程
  - 列出该班级的所有作业
  - 提供创建课程、作业入口
- **课程列表**: 显示标题、描述、发布状态、章节数

#### 8. **课程详情页 / Course Detail** - `/teacher/courses/[id]`
- **文件**: `app/teacher/courses/[id]/page.tsx`
- **功能**:
  - 显示课程信息
  - 列出所有章节
  - 提供编辑课程、添加章节入口
  - **AI 功能**:
    - AI 课程助手 (生成大纲)
    - AI 章节内容生成 (Builder + Critic)
    - AI 编辑工具 (6 种编辑操作)
- **章节列表**: 显示标题、描述、组件数量

#### 9. **章节详情页 / Chapter Detail** - `/teacher/chapters/[id]`
- **文件**: `app/teacher/chapters/[id]/page.tsx`
- **功能**:
  - 显示章节信息
  - 列出所有学习组件
  - 提供添加组件入口
- **组件类型图标**:
  - 📝 Text (文本)
  - 🖼️ Image (图片)
  - 🎥 Video (视频)
  - ❓ Question (问题)
  - 🎮 Interactive (交互)
- **组件卡片**: 显示类型、标题、内容预览、顺序、编辑按钮

#### 10. **创建组件页 / Create Component** - `/teacher/chapters/[id]/components/new`
- **文件**: `app/teacher/chapters/[id]/components/new/page.tsx`
- **类型**: 客户端组件
- **功能**:
  - 选择组件类型 (5 种)
  - 根据类型显示不同表单
- **组件类型选择**: 网格布局，点击高亮
- **表单字段** (根据类型):
  - **Text**: 标题 + 富文本内容
  - **Image**: 标题 + 图片 URL + 描述
  - **Video**: 标题 + 视频 URL + 描述
  - **Question**: 问题 + 选项 + 正确答案
  - **Interactive**: 标题 + 描述

#### 11. **AI 课程创建页 / AI Course Creation** - `/teacher/courses/new-ai`
- **文件**: `app/teacher/courses/new-ai/page.tsx`
- **类型**: 客户端组件
- **功能**: 三步流程
  1. **Chat 阶段**: 与 AI 对话收集需求
  2. **Generating 阶段**: 显示加载动画
  3. **Outline 阶段**: 编辑大纲
- **步骤切换**: `step` 状态控制显示内容

#### 12. **Analytics 页面 / Analytics Dashboard** - `/teacher/analytics`
- **文件**: `app/teacher/analytics/page.tsx`
- **类型**: 服务端组件
- **功能**:
  - 选择班级
  - 显示风险学生 (At-Risk Students)
  - 显示班级进度 (Class Progress)
  - 显示学生详情 (Student Detail)
- **实时更新**: 使用 Supabase Realtime 订阅

---

### 学生端页面 / Student Pages

#### 13. **学生仪表板 / Student Dashboard** - `/student`
- **文件**: `app/student/page.tsx`
- **类型**: 服务端组件
- **功能**:
  - 显示班级、课程、作业统计
  - 列出所有已加入的班级
  - 提供加入班级表单 (邀请码)
- **导航栏**:
  - 左侧: WeaveMind logo + "Student Dashboard"
  - 右侧: 用户邮箱 + Sign Out 按钮
- **统计卡片** (3 个):
  1. My Classes (班级数量)
  2. Active Courses (活跃课程)
  3. Assignments (作业数量)

#### 14. **学生班级页 / Student Class** - `/student/classes/[id]`
- **文件**: `app/student/classes/[id]/page.tsx`
- **功能**:
  - 显示班级信息
  - 列出该班级的所有已发布课程
  - 列出该班级的所有作业
- **课程卡片**: 显示标题、描述、章节数、View Course 按钮

#### 15. **学生课程页 / Student Course** - `/student/courses/[id]`
- **文件**: `app/student/courses/[id]/page.tsx`
- **功能**:
  - 显示课程信息
  - 列出所有章节
  - 每个章节展开显示所有组件
  - **组件级 AI 助手**: 每个组件下方有聊天界面
- **章节卡片**: 可折叠，显示标题、描述
- **组件显示**: 根据类型渲染不同内容
  - Text: 段落文本
  - Image: 图片 + 描述
  - Video: 视频播放器
  - Question: 问题 + 选项
  - Interactive: 交互内容
- **AI 助手**: 可折叠聊天框，实时流式响应

---

## UI 组件库 / UI Component Library

### 基础组件 / Base Components

#### 1. **Button** - `components/ui/button.tsx`
- **变体 / Variants**:
  - `default`: 蓝色背景 (`bg-indigo-600`)
  - `outline`: 蓝色边框 (`border-2 border-indigo-600`)
  - `ghost`: 透明背景，悬停灰色 (`hover:bg-gray-100`)
- **样式**: 圆角 (`rounded-md`)，过渡效果 (`transition-colors`)
- **状态**: 禁用时半透明 (`disabled:opacity-50`)

#### 2. **Input** - `components/ui/input.tsx`
- **样式**:
  - 边框 (`border border-gray-300`)
  - 圆角 (`rounded-md`)
  - 聚焦时蓝色环 (`focus-visible:ring-2 focus-visible:ring-indigo-600`)
- **占位符**: 灰色 (`placeholder:text-gray-500`)

#### 3. **Label** - `components/ui/label.tsx`
- **样式**: 小字体 (`text-sm`)，中等粗细 (`font-medium`)

#### 4. **Textarea** - `components/ui/textarea.tsx`
- **样式**: 与 Input 类似，最小高度 80px (`min-h-[80px]`)

#### 5. **Card** - `components/ui/card.tsx`
- **子组件**:
  - `Card`: 容器 (`rounded-lg border shadow-sm`)
  - `CardHeader`: 头部 (`p-6`)
  - `CardTitle`: 标题
  - `CardDescription`: 描述
  - `CardContent`: 内容 (`p-6`)
  - `CardFooter`: 底部

---

### AI 组件 / AI Components

#### 6. **CourseChat** - `components/ai/course-chat.tsx`
- **功能**: 与 AI 对话收集课程需求
- **消息显示**:
  - 用户消息: 右对齐，蓝色背景 (`bg-indigo-600 text-white`)
  - AI 消息: 左对齐，白色背景 (`bg-white border`)
- **流式响应**: 使用 ReadableStream 逐字显示
- **自动滚动**: 新消息时滚动到底部
- **生成大纲按钮**: 需求充足时启用

#### 7. **OutlineEditor** - `components/ai/outline-editor.tsx`
- **功能**: 编辑课程大纲
- **拖拽排序**: 章节和课时可拖拽重排
- **自然语言编辑**: 输入指令让 AI 修改大纲
- **章节卡片**: 显示标题、描述、课时列表
- **操作按钮**: Save / Cancel

#### 8. **AIGenerationPanel** - `components/ai/ai-generation-panel.tsx`
- **功能**: 启动 Builder + Critic 内容生成
- **运行列表**: 显示所有生成任务
- **状态显示**:
  - `pending`: 黄色徽章
  - `running`: 蓝色徽章
  - `completed`: 绿色徽章
  - `failed`: 红色徽章
- **章节结果**: 显示每章生成进度、对话记录
- **接受按钮**: 将 AI 生成内容写入课程

#### 9. **CourseEditorAssistant** - `components/ai/course-editor-assistant.tsx`
- **功能**: 6 种 AI 编辑操作
  1. 添加章节
  2. 删除章节
  3. 重排章节
  4. 添加组件
  5. 删除组件
  6. 修改组件
- **输入框**: 自然语言指令
- **预览**: 显示 AI 响应、工具调用、结果
- **清除按钮**: 重置状态

#### 10. **ComponentAIAssistant** - `components/student/component-ai-assistant.tsx`
- **功能**: 学生组件级 AI 助手
- **可折叠**: 点击按钮展开/收起
- **消息显示**:
  - 用户: 右对齐蓝色
  - AI: 左对齐灰色
- **加载动画**: 三个跳动的圆点
- **流式响应**: 实时显示 AI 回复
- **Enter 发送**: Shift+Enter 换行

#### 11. **ComponentDisplay** - `components/student/component-display.tsx`
- **功能**: 渲染学习组件内容
- **类型渲染**:
  - **Text**: 白色卡片，段落文本
  - **Image**: 图片 + 描述
  - **Video**: 视频 URL 显示
  - **Question**: 问题 + 选项列表
  - **Interactive**: 紫色背景卡片
- **学习事件记录**:
  - 组件打开时记录 `component_open`
  - 组件完成时记录 `component_complete`
- **AI 助手集成**: 每个组件下方显示 AI 助手

---

### Analytics 组件 / Analytics Components

#### 12. **AnalyticsDashboard** - `components/teacher/analytics-dashboard.tsx`
- **功能**: 教师分析仪表板容器
- **班级选择器**: 下拉菜单选择班级
- **子组件**:
  - AtRiskStudents (风险学生)
  - ClassProgressView (班级进度)
  - StudentDetailView (学生详情)
- **状态管理**: 选中班级 ID、选中学生 ID

#### 13. **AtRiskStudents** - `components/teacher/at-risk-students.tsx`
- **功能**: 显示需要关注的学生
- **实时更新**: 订阅 `learning_events` 表变化
- **风险指标**:
  - 低完成率 (< 30%)
  - 长时间无活动 (> 7 天)
  - 低平均时长 (< 30 秒)
- **学生卡片**: 显示邮箱、问题描述、查看详情按钮

#### 14. **ClassProgressView** - `components/teacher/class-progress-view.tsx`
- **功能**: 显示班级所有学生进度
- **表格列**:
  - Student (学生邮箱)
  - Components Viewed (查看组件数)
  - Components Completed (完成组件数)
  - Completion Rate (完成率 %)
  - Avg Time per Component (平均时长)
  - Last Active (最后活跃时间)
  - Actions (查看详情按钮)
- **排序**: 按完成率降序

#### 15. **StudentDetailView** - `components/teacher/student-detail-view.tsx`
- **功能**: 显示单个学生详细进度
- **组件进度表**: 每个组件的查看/完成状态
- **最近活动**: 时间线显示最近学习事件
- **返回按钮**: 返回班级进度视图

---

## 动画与过渡效果 / Animations & Transitions

### CSS 动画 / CSS Animations

#### 1. **加载旋转器 / Loading Spinner**
```css
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
```
- **使用场景**:
  - 登录/注册加载
  - 课程大纲生成
  - AI 内容生成
  - 数据加载
- **样式**: 圆形边框，底部边框旋转

#### 2. **跳动圆点 / Bouncing Dots**
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
</div>
```
- **使用场景**: AI 正在输入时
- **样式**: 三个圆点，延迟跳动

#### 3. **渐变背景 / Gradient Background**
```css
bg-gradient-to-br from-blue-50 to-indigo-100
```
- **使用场景**:
  - 首页
  - 登录页
  - 注册页
  - 角色选择页
- **方向**: 从左上到右下 (`to-br`)

#### 4. **悬停过渡 / Hover Transitions**
```css
transition-colors hover:bg-indigo-700
```
- **使用场景**: 所有按钮、链接、卡片
- **效果**: 颜色平滑过渡

#### 5. **卡片悬停 / Card Hover**
```css
hover:bg-gray-50 hover:border-indigo-600 transition
```
- **使用场景**:
  - 课程卡片
  - 班级卡片
  - 组件卡片
- **效果**: 背景变浅，边框变蓝

### JavaScript 动画 / JavaScript Animations

#### 6. **自动滚动 / Auto Scroll**
```tsx
const messagesEndRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```
- **使用场景**:
  - AI 聊天界面
  - 消息列表
- **效果**: 新消息时平滑滚动到底部

#### 7. **流式文本显示 / Streaming Text**
```tsx
const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  assistantMessage += chunk

  setMessages(prev => prev.map(m =>
    m.id === assistantMessageId
      ? { ...m, content: assistantMessage }
      : m
  ))
}
```
- **使用场景**: AI 响应
- **效果**: 逐字显示，模拟打字效果

#### 8. **拖拽排序 / Drag and Drop**
```tsx
<div
  draggable
  onDragStart={(e) => handleDragStart(e, index)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={(e) => handleDrop(e, index)}
>
```
- **使用场景**: 大纲编辑器
- **效果**: 拖拽章节/课时重新排序

---

## 导航与跳转逻辑 / Navigation & Routing Logic

### 认证流程 / Authentication Flow

```
未登录用户访问 /teacher 或 /student
  ↓
middleware 检测到未认证
  ↓
重定向到 /auth/login
  ↓
登录成功
  ↓
跳转到 /role-select
  ↓
选择角色 (Teacher/Student)
  ↓
跳转到 /teacher 或 /student
```

### 角色检查 / Role Verification

```
用户访问 /teacher
  ↓
middleware 检查 profiles.role
  ↓
如果 role = 'student'
  ↓
重定向到 /student
```

**特殊规则**: 教师可以预览学生课程页 (`/student/courses/[id]`)

### 页面跳转关系 / Page Navigation Map

#### 教师端 / Teacher Flow

```
/teacher (仪表板)
  ├─ /teacher/organizations/new (创建组织)
  ├─ /teacher/organizations/[id] (组织详情)
  │   └─ /teacher/classes/new (创建班级)
  ├─ /teacher/classes/[id] (班级详情)
  │   ├─ /teacher/courses/new (手动创建课程)
  │   ├─ /teacher/courses/new-ai (AI 创建课程)
  │   └─ /teacher/assignments/new (创建作业)
  ├─ /teacher/courses/[id] (课程详情)
  │   ├─ /teacher/courses/[id]/edit (编辑课程)
  │   └─ /teacher/chapters/new (创建章节)
  ├─ /teacher/chapters/[id] (章节详情)
  │   └─ /teacher/chapters/[id]/components/new (创建组件)
  ├─ /teacher/components/[id]/edit (编辑组件)
  ├─ /teacher/assignments/[id] (作业详情)
  │   └─ /teacher/submissions/[id] (批改提交)
  └─ /teacher/analytics (分析仪表板)
```

#### 学生端 / Student Flow

```
/student (仪表板)
  ├─ Join Class (输入邀请码)
  ├─ /student/classes/[id] (班级详情)
  │   ├─ /student/courses/[id] (课程学习)
  │   └─ /student/assignments/[id] (作业详情)
  └─ /student/submissions/new (提交作业)
```

### 返回导航 / Back Navigation

所有详情页都有 "← Back to XXX" 按钮：

- **课程详情** → 返回班级详情
- **章节详情** → 返回课程详情
- **组件编辑** → 返回章节详情
- **作业详情** → 返回班级详情
- **Analytics** → 返回教师仪表板

使用 Next.js `Link` 组件实现：
```tsx
<Link href={`/teacher/courses/${courseId}`}>
  <Button variant="ghost">← Back to Course</Button>
</Link>
```

---

## 响应式设计 / Responsive Design

### 断点系统 / Breakpoint System

- **sm**: 640px (小屏幕)
- **md**: 768px (中等屏幕)
- **lg**: 1024px (大屏幕)

### 常见响应式模式 / Common Responsive Patterns

#### 1. **网格布局 / Grid Layout**
```css
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
```
- 移动端: 1 列
- 平板: 2 列
- 桌面: 3 列

#### 2. **导航栏 / Navigation Bar**
```css
flex flex-col sm:flex-row items-start sm:items-center gap-3
```
- 移动端: 垂直排列
- 桌面: 水平排列

#### 3. **容器宽度 / Container Width**
```css
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```
- 最大宽度 1280px
- 自动居中
- 响应式内边距

---

## 颜色系统 / Color System

### 主色调 / Primary Colors

- **Indigo 600**: `#4F46E5` - 主要按钮、链接
- **Indigo 700**: `#4338CA` - 悬停状态
- **Indigo 50**: `#EEF2FF` - 浅色背景

### 中性色 / Neutral Colors

- **Gray 50**: `#F9FAFB` - 页面背景
- **Gray 100**: `#F3F4F6` - 卡片悬停
- **Gray 200**: `#E5E7EB` - 边框
- **Gray 500**: `#6B7280` - 次要文本
- **Gray 600**: `#4B5563` - 描述文本
- **Gray 700**: `#374151` - 主要文本
- **Gray 900**: `#111827` - 标题

### 状态色 / Status Colors

- **Red 50/600/700**: 错误、删除
- **Yellow 50/600/700**: 警告、待处理
- **Green 50/600/700**: 成功、完成
- **Blue 50/600/700**: 信息、运行中
- **Purple 50/600/700**: 交互组件

---

## 表单处理 / Form Handling

### 表单验证 / Form Validation

#### 客户端验证 / Client-side Validation

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")

  // 验证逻辑
  if (password !== confirmPassword) {
    setError("Passwords do not match")
    return
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters")
    return
  }

  // 提交逻辑
  setLoading(true)
  try {
    // API 调用
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

#### 错误显示 / Error Display

```tsx
{error && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
    {error}
  </div>
)}
```

### 加载状态 / Loading States

#### 按钮加载 / Button Loading

```tsx
<Button type="submit" disabled={loading}>
  {loading ? "Loading..." : "Submit"}
</Button>
```

#### 页面加载 / Page Loading

```tsx
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
```

---

## 数据获取模式 / Data Fetching Patterns

### 服务端组件 / Server Components

```tsx
export default async function Page() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("class_id", classId)

  return <div>{/* 渲染数据 */}</div>
}
```

### 客户端组件 / Client Components

```tsx
'use client'

export function Component() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const response = await fetch('/api/endpoint')
      const data = await response.json()
      setData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return <div>{/* 渲染数据 */}</div>
}
```

### 实时订阅 / Realtime Subscriptions

```tsx
useEffect(() => {
  const supabase = createClient()

  const channel = supabase
    .channel('table_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'learning_events',
      },
      () => {
        loadData() // 重新加载数据
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

---

## 关键交互流程 / Key Interaction Flows

### 1. AI 课程创建流程 / AI Course Creation Flow

```
教师点击 "Create AI Course"
  ↓
进入 /teacher/courses/new-ai
  ↓
Step 1: Chat 阶段
  - 用户输入课程需求
  - AI 提问收集信息
  - 需求充足后显示 "Generate Outline" 按钮
  ↓
点击 "Generate Outline"
  ↓
Step 2: Generating 阶段
  - 显示加载动画
  - 调用 /api/ai/generate-outline
  - 等待 AI 生成大纲
  ↓
Step 3: Outline 阶段
  - 显示大纲编辑器
  - 可拖拽排序章节
  - 可自然语言编辑
  - 点击 "Save Outline"
  ↓
保存成功
  ↓
跳转到课程详情页 /teacher/courses/[id]
  ↓
显示 "AI Generation Panel"
  ↓
点击 "Start AI Generation"
  ↓
后台 BullMQ 任务开始
  - Builder 生成内容
  - Critic 评审
  - 迭代 3 次
  ↓
生成完成
  ↓
点击 "Accept AI Content"
  ↓
内容写入课程
  ↓
刷新页面，显示章节和组件
```

### 2. 学生学习流程 / Student Learning Flow

```
学生登录
  ↓
进入 /student
  ↓
输入邀请码加入班级
  ↓
点击班级卡片
  ↓
进入 /student/classes/[id]
  ↓
查看课程列表
  ↓
点击 "View Course"
  ↓
进入 /student/courses/[id]
  ↓
查看章节列表
  ↓
展开章节
  ↓
查看组件内容
  - 自动记录 component_open 事件
  ↓
阅读/观看内容
  ↓
点击 "Mark as Complete"
  - 记录 component_complete 事件
  - 记录学习时长
  ↓
点击 "💬 Ask AI Assistant"
  ↓
展开 AI 聊天框
  ↓
输入问题
  - 记录 ai_question_asked 事件
  ↓
AI 流式响应
  - 记录 ai_question_answered 事件
  ↓
继续学习下一个组件
```

### 3. 教师分析流程 / Teacher Analytics Flow

```
教师进入 /teacher/analytics
  ↓
选择班级
  ↓
查看 "At-Risk Students" 面板
  - 显示需要关注的学生
  - 低完成率、长时间无活动等
  ↓
查看 "Class Progress" 表格
  - 所有学生的进度概览
  - 完成率、平均时长、最后活跃时间
  ↓
点击学生行的 "View Details"
  ↓
显示 "Student Detail View"
  - 组件级进度
  - 最近活动时间线
  ↓
点击 "← Back to Class Progress"
  ↓
返回班级进度视图
  ↓
实时更新
  - Supabase Realtime 订阅
  - 学生学习时自动刷新数据
```

---

## 特殊功能实现 / Special Features Implementation

### 1. 流式 AI 响应 / Streaming AI Response

**服务端** (`app/api/student/ai-chat/route.ts`):
```tsx
import { streamText } from 'ai'

const result = streamText({
  model: openai.chat(MODEL_NAME),
  messages: [...],
})

return result.toDataStreamResponse()
```

**客户端** (`components/student/component-ai-assistant.tsx`):
```tsx
const response = await fetch('/api/student/ai-chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  // 解析 data: 前缀的流式数据
  const lines = chunk.split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      if (data.type === 'text-delta') {
        assistantMessage += data.textDelta
        // 更新 UI
      }
    }
  }
}
```

### 2. 拖拽排序 / Drag and Drop Reordering

```tsx
const [draggedItem, setDraggedItem] = useState<number | null>(null)

const handleDragStart = (e: React.DragEvent, index: number) => {
  setDraggedItem(index)
  e.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

const handleDrop = (e: React.DragEvent, targetIndex: number) => {
  e.preventDefault()

  if (draggedItem === null) return

  const newItems = [...items]
  const [removed] = newItems.splice(draggedItem, 1)
  newItems.splice(targetIndex, 0, removed)

  setItems(newItems)
  setDraggedItem(null)
}
```

### 3. 自然语言编辑 / Natural Language Editing

```tsx
const handleNaturalLanguageEdit = async () => {
  const response = await fetch('/api/ai/edit-outline', {
    method: 'POST',
    body: JSON.stringify({
      chapters: currentChapters,
      instruction: userInstruction,
    }),
  })

  const { chapters: updatedChapters } = await response.json()
  setChapters(updatedChapters)
}
```

---

## 性能优化建议 / Performance Optimization Tips

### 1. 服务端组件优先 / Prefer Server Components

- 默认使用服务端组件
- 只在需要交互时使用 `"use client"`
- 减少客户端 JavaScript 体积

### 2. 图片优化 / Image Optimization

```tsx
import Image from 'next/image'

<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
/>
```

### 3. 代码分割 / Code Splitting

```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})
```

### 4. 缓存策略 / Caching Strategy

```tsx
// 服务端组件自动缓存
export const revalidate = 60 // 60 秒后重新验证

// 客户端使用 SWR 或 React Query
```

---

## 总结 / Summary

WeaveMind 前端采用 **Next.js 15 App Router** 架构，结合 **Tailwind CSS** 实现响应式设计。系统分为**教师端**和**学生端**两个主要模块，通过 **Supabase** 实现认证和数据管理。

### 核心特点 / Key Features

1. **AI 驱动**: 课程生成、内容编辑、学生助手
2. **实时分析**: 教师可实时监控学生学习进度
3. **流式响应**: AI 对话采用流式传输，提升用户体验
4. **组件化设计**: 可复用的 UI 组件库
5. **响应式布局**: 适配移动端、平板、桌面

### 技术亮点 / Technical Highlights

- **服务端渲染**: 提升首屏加载速度和 SEO
- **客户端交互**: 丰富的动画和过渡效果
- **实时订阅**: Supabase Realtime 实现数据同步
- **类型安全**: TypeScript 全栈类型检查
- **无障碍设计**: 语义化 HTML 和 ARIA 属性

---

## 附录 / Appendix

### 完整页面列表 / Complete Page List

**公共页面 (5)**:
1. `/` - 首页
2. `/auth/login` - 登录
3. `/auth/signup` - 注册
4. `/role-select` - 角色选择
5. `/auth/signout` - 登出 (API 路由)

**教师页面 (15+)**:
1. `/teacher` - 仪表板
2. `/teacher/organizations/new` - 创建组织
3. `/teacher/organizations/[id]` - 组织详情
4. `/teacher/classes/new` - 创建班级
5. `/teacher/classes/[id]` - 班级详情
6. `/teacher/courses/new` - 手动创建课程
7. `/teacher/courses/new-ai` - AI 创建课程
8. `/teacher/courses/[id]` - 课程详情
9. `/teacher/courses/[id]/edit` - 编辑课程
10. `/teacher/chapters/new` - 创建章节
11. `/teacher/chapters/[id]` - 章节详情
12. `/teacher/chapters/[id]/components/new` - 创建组件
13. `/teacher/components/[id]/edit` - 编辑组件
14. `/teacher/assignments/new` - 创建作业
15. `/teacher/assignments/[id]` - 作业详情
16. `/teacher/submissions/[id]` - 批改提交
17. `/teacher/analytics` - 分析仪表板

**学生页面 (5)**:
1. `/student` - 仪表板
2. `/student/classes/[id]` - 班级详情
3. `/student/courses/[id]` - 课程学习
4. `/student/assignments/[id]` - 作业详情
5. `/student/submissions/new` - 提交作业

**总计**: 25+ 页面

### UI 组件列表 / UI Components List

**基础组件 (5)**:
1. Button
2. Input
3. Label
4. Textarea
5. Card (含 Header, Title, Description, Content, Footer)

**AI 组件 (5)**:
1. CourseChat
2. OutlineEditor
3. AIGenerationPanel
4. CourseEditorAssistant
5. ComponentAIAssistant

**学生组件 (2)**:
1. ComponentDisplay
2. JoinClassForm

**教师组件 (4)**:
1. AnalyticsDashboard
2. AtRiskStudents
3. ClassProgressView
4. StudentDetailView

**总计**: 16 个主要组件

---

**文档版本**: v1.0
**最后更新**: 2025-11-27
**作者**: WeaveMind Development Team


