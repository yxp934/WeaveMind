# WeaveMind 页面功能完整描述

## 目录

1. [公共页面](#公共页面)
2. [教师端页面](#教师端页面)
3. [学生端页面](#学生端页面)
4. [页面跳转关系图](#页面跳转关系图)

---

## 公共页面

### 1. 首页 (Landing Page)

**页面内容**：
- 顶部：WeaveMind (因材织学) 大标题
- 副标题：AI-driven Intelligent Learning Management System
- 两个大按钮：
  - "Login" - 蓝色按钮
  - "Sign Up" - 白色边框按钮

**页面功能**：
- 展示品牌和产品定位
- 提供登录和注册入口

**页面跳转**：
- 点击 "Login" → 跳转到登录页
- 点击 "Sign Up" → 跳转到注册页

**视觉效果**：
- 全屏居中布局
- 蓝色到紫色渐变背景
- 简洁大气的设计

---

### 2. 登录页 (Login Page)

**页面内容**：
- 顶部：WeaveMind logo 和 "Welcome Back" 标题
- 登录表单：
  - Email 输入框
  - Password 输入框
  - "Login" 提交按钮
- 底部：没有账号？链接到注册页

**页面功能**：
- 用户输入邮箱和密码
- 验证登录信息
- 显示错误提示（如果登录失败）
- 登录成功后自动跳转

**页面跳转**：
- 登录成功 → 跳转到角色选择页
- 点击 "Sign up" 链接 → 跳转到注册页

**错误处理**：
- 邮箱或密码错误时，显示红色提示框
- 提示框内容：具体错误信息

**加载状态**：
- 提交后按钮文字变为 "Logging in..."
- 按钮禁用，防止重复提交

---

### 3. 注册页 (Signup Page)

**页面内容**：
- 顶部：WeaveMind logo 和 "Create Account" 标题
- 注册表单：
  - Email 输入框
  - Password 输入框
  - Confirm Password 输入框
  - "Sign Up" 提交按钮
- 底部：已有账号？链接到登录页

**页面功能**：
- 用户输入邮箱和密码
- 验证密码匹配
- 验证密码长度（至少 6 个字符）
- 创建新账号
- 显示错误提示（如果注册失败）

**页面跳转**：
- 注册成功 → 跳转到角色选择页
- 点击 "Login" 链接 → 跳转到登录页

**错误处理**：
- 密码不匹配：显示 "Passwords do not match"
- 密码太短：显示 "Password must be at least 6 characters"
- 邮箱已存在：显示相应错误信息

**加载状态**：
- 提交后按钮文字变为 "Creating account..."
- 按钮禁用

---

### 4. 角色选择页 (Role Selection)

**页面内容**：
- 顶部：WeaveMind logo 和 "Choose Your Role" 标题
- 副标题：This choice is permanent and cannot be changed later
- 两个大卡片（并排显示）：
  
  **教师卡片**：
  - 图标：👨‍🏫
  - 标题：Teacher
  - 描述：Create and manage courses, track student progress, and provide personalized learning experiences
  - 按钮："Continue as Teacher"
  
  **学生卡片**：
  - 图标：🎓
  - 标题：Student
  - 描述：Access courses, learn at your own pace, and get AI-powered assistance throughout your learning journey
  - 按钮："Continue as Student"

**页面功能**：
- 用户选择自己的角色（教师或学生）
- 角色一旦选择，永久生效，无法更改
- 如果用户已有角色，自动跳转到对应仪表板

**页面跳转**：
- 选择 Teacher → 跳转到教师仪表板
- 选择 Student → 跳转到学生仪表板
- 已有角色 → 自动跳转到对应仪表板

**重要提示**：
- 页面顶部有警告文字，提醒用户角色不可更改
- 卡片设计清晰，帮助用户理解两种角色的区别

---

## 教师端页面

### 5. 教师仪表板 (Teacher Dashboard)

**页面内容**：

**顶部导航栏**：
- 左侧：WeaveMind logo + "Teacher Dashboard" 文字
- 右侧：用户邮箱 + "Sign Out" 按钮

**统计卡片区域**（4 个卡片横排）：
1. **Organizations 卡片**
   - 图标：🏢
   - 数字：组织数量
   - 标题："Organizations"

2. **Classes 卡片**
   - 图标：👥
   - 数字：班级数量
   - 标题："Classes"

3. **Courses 卡片**
   - 图标：📚
   - 数字：课程数量
   - 标题："Courses"

4. **Analytics 卡片**（特殊样式，渐变背景）
   - 图标：📊
   - 标题："Analytics"
   - 描述："View student progress and insights"
   - 按钮："View Analytics"

**组织列表区域**：
- 标题："My Organizations"
- "Create Organization" 按钮（蓝色）
- 组织卡片列表：
  - 每个卡片显示：组织名称、描述、班级数量
  - "View Details" 按钮

**页面功能**：
- 查看所有统计数据概览
- 快速访问分析功能
- 管理组织
- 创建新组织

**页面跳转**：
- 点击 "Sign Out" → 退出登录，跳转到首页
- 点击 "View Analytics" → 跳转到分析仪表板
- 点击 "Create Organization" → 跳转到创建组织页面
- 点击组织卡片的 "View Details" → 跳转到组织详情页

---

### 6. 创建组织页 (Create Organization)

**页面内容**：
- 顶部："← Back to Dashboard" 返回链接
- 标题："Create New Organization"
- 表单：
  - Organization Name 输入框
  - Description 多行文本框
  - "Create Organization" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 输入组织名称和描述
- 创建新组织
- 取消操作返回仪表板

**页面跳转**：
- 点击 "← Back to Dashboard" → 返回教师仪表板
- 点击 "Cancel" → 返回教师仪表板
- 创建成功 → 跳转到新创建的组织详情页

---

### 7. 组织详情页 (Organization Detail)

**页面内容**：
- 顶部："← Back to Dashboard" 返回链接
- 组织信息卡片：
  - 组织名称（大标题）
  - 组织描述
  - 创建时间
- 班级列表区域：
  - 标题："Classes in this Organization"
  - "Create Class" 按钮（蓝色）
  - 班级卡片列表：
    - 每个卡片显示：班级名称、描述、邀请码、学生数量、课程数量
    - "View Details" 按钮

**页面功能**：
- 查看组织详细信息
- 查看该组织下的所有班级
- 创建新班级

**页面跳转**：
- 点击 "← Back to Dashboard" → 返回教师仪表板
- 点击 "Create Class" → 跳转到创建班级页面
- 点击班级卡片的 "View Details" → 跳转到班级详情页

---

### 8. 创建班级页 (Create Class)

**页面内容**：
- 顶部："← Back to Organization" 返回链接
- 标题："Create New Class"
- 表单：
  - Class Name 输入框
  - Description 多行文本框
  - "Create Class" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 输入班级名称和描述
- 创建新班级
- 系统自动生成邀请码
- 取消操作返回组织详情页

**页面跳转**：
- 点击 "← Back to Organization" → 返回组织详情页
- 点击 "Cancel" → 返回组织详情页
- 创建成功 → 跳转到新创建的班级详情页

---

### 9. 班级详情页 (Class Detail)

**页面内容**：
- 顶部："← Back to Organization" 返回链接
- 班级信息卡片：
  - 班级名称（大标题）
  - 班级描述
  - 邀请码（高亮显示，供学生加入使用）
  - 学生数量统计

**课程区域**：
- 标题："Courses"
- 两个创建按钮：
  - "Create Course Manually" - 手动创建
  - "Create with AI" - AI 辅助创建（蓝色高亮）
- 课程卡片列表：
  - 每个卡片显示：
    - 课程标题
    - 课程描述
    - 发布状态（Published / Draft）
    - 章节数量
    - "View Details" 按钮

**作业区域**：
- 标题："Assignments"
- "Create Assignment" 按钮
- 作业卡片列表：
  - 每个卡片显示：
    - 作业标题
    - 作业描述
    - 截止日期
    - 提交数量
    - "View Submissions" 按钮

**页面功能**：
- 查看班级详细信息
- 显示邀请码供学生加入
- 管理课程（手动创建或 AI 创建）
- 管理作业
- 查看课程和作业列表

**页面跳转**：
- 点击 "← Back to Organization" → 返回组织详情页
- 点击 "Create Course Manually" → 跳转到手动创建课程页面
- 点击 "Create with AI" → 跳转到 AI 创建课程页面
- 点击课程卡片的 "View Details" → 跳转到课程详情页
- 点击 "Create Assignment" → 跳转到创建作业页面
- 点击作业卡片的 "View Submissions" → 跳转到作业提交列表页

---

### 10. 手动创建课程页 (Create Course Manually)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 标题："Create New Course"
- 表单：
  - Course Title 输入框
  - Description 多行文本框
  - Target Audience 输入框（目标受众）
  - Prerequisites 多行文本框（前置知识）
  - Published 复选框（是否发布）
  - "Create Course" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 输入课程基本信息
- 设置目标受众和前置知识
- 选择是否立即发布
- 创建课程后可继续添加章节和内容

**页面跳转**：
- 点击 "← Back to Class" → 返回班级详情页
- 点击 "Cancel" → 返回班级详情页
- 创建成功 → 跳转到新创建的课程详情页

---

### 11. AI 创建课程页 (Create Course with AI)

**页面内容**：

**阶段 1：对话收集需求**
- 标题："Create Course with AI - Step 1: Requirements"
- AI 聊天界面：
  - 消息列表（用户消息在右侧蓝色气泡，AI 消息在左侧白色气泡）
  - 输入框："Type your message..."
  - "Send" 按钮
  - "Generate Outline" 按钮（需求充足后显示）

**阶段 2：生成大纲中**
- 加载动画（旋转圆圈）
- 文字："Generating course outline..."

**阶段 3：编辑大纲**
- 标题："Create Course with AI - Step 2: Review Outline"
- 大纲编辑器：
  - 课程标题和描述（可编辑）
  - 章节列表（可拖拽排序）：
    - 每个章节显示：标题、描述、课时列表
    - 每个课时显示：标题、描述
  - 自然语言编辑输入框："Tell AI how to modify the outline..."
  - "Apply Changes" 按钮
  - "Save Outline" 按钮（蓝色）
  - "Cancel" 按钮

**页面功能**：

**阶段 1 功能**：
- 与 AI 对话，描述课程需求
- AI 提问收集信息（目标受众、学习目标、时长等）
- AI 判断需求是否充足
- 需求充足后启用 "Generate Outline" 按钮

**阶段 2 功能**：
- 显示加载状态
- 后台 AI 生成课程大纲

**阶段 3 功能**：
- 查看 AI 生成的大纲
- 拖拽章节和课时重新排序
- 使用自然语言指令修改大纲（例如："在第二章后添加一章关于实践的内容"）
- 保存大纲并创建课程

**页面跳转**：
- 点击 "Cancel" → 返回班级详情页
- 点击 "Save Outline" → 创建课程，跳转到课程详情页

**交互流程**：
1. 用户与 AI 对话 → 2. 点击 "Generate Outline" → 3. 等待生成 → 4. 编辑大纲 → 5. 保存

---

### 12. 课程详情页 (Course Detail)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 课程信息卡片：
  - 课程标题（大标题）
  - 课程描述
  - 目标受众
  - 前置知识
  - 发布状态
  - "Edit Course" 按钮
  - "Toggle Publish Status" 按钮

**章节列表区域**：
- 标题："Chapters"
- "Add Chapter" 按钮
- 章节卡片列表：
  - 每个卡片显示：
    - 章节标题
    - 章节描述
    - 组件数量
    - 顺序编号
    - "View Details" 按钮

**AI 功能区域**（右侧边栏或底部）：

**AI 课程助手**：
- 标题："AI Course Assistant"
- 功能选项卡：
  - "Generate Content" - 生成章节内容
  - "Edit Course" - AI 编辑工具

**生成内容面板**：
- "Start AI Generation" 按钮
- 生成任务列表：
  - 每个任务显示：状态（Pending/Running/Completed/Failed）
  - 章节结果列表：
    - 每章显示：迭代次数、Builder 和 Critic 对话记录
    - "View Dialogue" 展开按钮
- "Accept AI Content" 按钮（生成完成后显示）

**AI 编辑工具面板**：
- 6 种编辑操作选项：
  1. Add Chapter - 添加章节
  2. Delete Chapter - 删除章节
  3. Reorder Chapters - 重排章节
  4. Add Component - 添加组件
  5. Delete Component - 删除组件
  6. Modify Component - 修改组件
- 自然语言输入框："Tell AI what to do..."
- "Execute" 按钮
- AI 响应显示区域
- "Clear" 按钮

**页面功能**：
- 查看课程详细信息
- 编辑课程基本信息
- 切换发布状态
- 管理章节
- 使用 AI 生成章节内容（Builder + Critic 双智能体迭代）
- 使用 AI 编辑工具进行自然语言编辑

**AI 生成内容流程**：
1. 点击 "Start AI Generation"
2. 系统为每个章节启动 Builder + Critic 迭代
3. 实时显示生成进度和对话记录
4. 每章至少迭代 3 次
5. 生成完成后点击 "Accept AI Content"
6. 内容写入课程，刷新页面显示章节和组件

**AI 编辑工具流程**：
1. 输入自然语言指令（例如："在第二章后添加一个关于实践的章节"）
2. 点击 "Execute"
3. AI 理解指令并执行操作
4. 显示操作结果
5. 刷新页面查看变化

**页面跳转**：
- 点击 "← Back to Class" → 返回班级详情页
- 点击 "Edit Course" → 跳转到编辑课程页面
- 点击 "Add Chapter" → 跳转到创建章节页面
- 点击章节卡片的 "View Details" → 跳转到章节详情页

---

### 13. 编辑课程页 (Edit Course)

**页面内容**：
- 顶部："← Back to Course" 返回链接
- 标题："Edit Course"
- 表单（预填充当前值）：
  - Course Title 输入框
  - Description 多行文本框
  - Target Audience 输入框
  - Prerequisites 多行文本框
  - Published 复选框
  - "Save Changes" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 修改课程基本信息
- 保存更改
- 取消操作返回课程详情页

**页面跳转**：
- 点击 "← Back to Course" → 返回课程详情页
- 点击 "Cancel" → 返回课程详情页
- 保存成功 → 返回课程详情页

---

### 14. 创建章节页 (Create Chapter)

**页面内容**：
- 顶部："← Back to Course" 返回链接
- 标题："Create New Chapter"
- 表单：
  - Chapter Title 输入框
  - Description 多行文本框
  - Order 数字输入框（章节顺序）
  - "Create Chapter" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 输入章节标题和描述
- 设置章节顺序
- 创建新章节

**页面跳转**：
- 点击 "← Back to Course" → 返回课程详情页
- 点击 "Cancel" → 返回课程详情页
- 创建成功 → 跳转到新创建的章节详情页

---

### 15. 章节详情页 (Chapter Detail)

**页面内容**：
- 顶部："← Back to Course" 返回链接
- 章节信息卡片：
  - 章节标题（大标题）
  - 章节描述
  - 顺序编号
  - "Edit Chapter" 按钮

**组件列表区域**：
- 标题："Learning Components"
- "Add Component" 按钮（蓝色）
- 组件卡片列表：
  - 每个卡片显示：
    - 类型图标（📝 文本 / 🖼️ 图片 / 🎥 视频 / ❓ 问题 / 🎮 交互）
    - 组件标题
    - 内容预览（前 100 字符）
    - 顺序编号
    - "Edit" 按钮
    - "Delete" 按钮

**页面功能**：
- 查看章节详细信息
- 编辑章节
- 管理学习组件
- 添加新组件
- 编辑或删除现有组件

**页面跳转**：
- 点击 "← Back to Course" → 返回课程详情页
- 点击 "Edit Chapter" → 跳转到编辑章节页面
- 点击 "Add Component" → 跳转到创建组件页面
- 点击组件卡片的 "Edit" → 跳转到编辑组件页面
- 点击 "Delete" → 弹出确认对话框，确认后删除组件

---

### 16. 创建组件页 (Create Component)

**页面内容**：
- 顶部："← Back to Chapter" 返回链接
- 标题："Create New Learning Component"

**组件类型选择区域**（网格布局，5 个大卡片）：
1. **📝 Text** - 文本内容
2. **🖼️ Image** - 图片内容
3. **🎥 Video** - 视频内容
4. **❓ Question** - 问题/测验
5. **🎮 Interactive** - 交互式内容

**表单区域**（根据选择的类型显示不同字段）：

**Text 类型表单**：
- Title 输入框
- Content 富文本编辑器
- Order 数字输入框

**Image 类型表单**：
- Title 输入框
- Image URL 输入框
- Description 多行文本框
- Order 数字输入框

**Video 类型表单**：
- Title 输入框
- Video URL 输入框
- Description 多行文本框
- Order 数字输入框

**Question 类型表单**：
- Question 输入框
- Option 1 输入框
- Option 2 输入框
- Option 3 输入框
- Option 4 输入框
- Correct Answer 下拉选择（1/2/3/4）
- Order 数字输入框

**Interactive 类型表单**：
- Title 输入框
- Description 多行文本框
- Order 数字输入框

**底部按钮**：
- "Create Component" 提交按钮
- "Cancel" 取消按钮

**页面功能**：
- 选择组件类型
- 根据类型填写不同的表单
- 设置组件顺序
- 创建新组件

**交互流程**：
1. 点击组件类型卡片（卡片高亮显示选中状态）
2. 下方显示对应的表单
3. 填写表单
4. 点击 "Create Component" 创建

**页面跳转**：
- 点击 "← Back to Chapter" → 返回章节详情页
- 点击 "Cancel" → 返回章节详情页
- 创建成功 → 返回章节详情页

---

### 17. 编辑组件页 (Edit Component)

**页面内容**：
- 顶部："← Back to Chapter" 返回链接
- 标题："Edit Component"
- 组件类型显示（不可更改）
- 表单（预填充当前值，字段与创建时相同）
- "Save Changes" 提交按钮
- "Cancel" 取消按钮

**页面功能**：
- 修改组件内容
- 保存更改
- 取消操作返回章节详情页

**页面跳转**：
- 点击 "← Back to Chapter" → 返回章节详情页
- 点击 "Cancel" → 返回章节详情页
- 保存成功 → 返回章节详情页

---

### 18. 创建作业页 (Create Assignment)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 标题："Create New Assignment"
- 表单：
  - Assignment Title 输入框
  - Description 多行文本框
  - Due Date 日期选择器
  - Max Points 数字输入框（满分）
  - "Create Assignment" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 输入作业标题和描述
- 设置截止日期
- 设置满分分数
- 创建新作业

**页面跳转**：
- 点击 "← Back to Class" → 返回班级详情页
- 点击 "Cancel" → 返回班级详情页
- 创建成功 → 跳转到作业详情页

---

### 19. 作业详情页 (Assignment Detail)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 作业信息卡片：
  - 作业标题（大标题）
  - 作业描述
  - 截止日期
  - 满分分数
  - "Edit Assignment" 按钮

**提交列表区域**：
- 标题："Student Submissions"
- 统计信息：已提交 / 总学生数
- 提交卡片列表：
  - 每个卡片显示：
    - 学生邮箱
    - 提交时间
    - 评分状态（Graded / Pending）
    - 分数（如已评分）
    - "Grade Submission" 按钮

**页面功能**：
- 查看作业详细信息
- 编辑作业
- 查看所有学生提交
- 批改提交

**页面跳转**：
- 点击 "← Back to Class" → 返回班级详情页
- 点击 "Edit Assignment" → 跳转到编辑作业页面
- 点击 "Grade Submission" → 跳转到批改提交页面

---

### 20. 批改提交页 (Grade Submission)

**页面内容**：
- 顶部："← Back to Assignment" 返回链接
- 标题："Grade Submission"
- 学生信息：
  - 学生邮箱
  - 提交时间
- 提交内容显示：
  - 学生提交的文本内容
- 评分表单：
  - Score 数字输入框（0 到满分）
  - Feedback 多行文本框（教师反馈）
  - "Submit Grade" 提交按钮
  - "Cancel" 取消按钮

**页面功能**：
- 查看学生提交内容
- 输入分数
- 输入反馈意见
- 提交评分

**页面跳转**：
- 点击 "← Back to Assignment" → 返回作业详情页
- 点击 "Cancel" → 返回作业详情页
- 提交成功 → 返回作业详情页

---

### 21. Analytics 分析仪表板 (Analytics Dashboard)

**页面内容**：
- 顶部："← Back to Dashboard" 返回链接
- 标题："Analytics Dashboard"

**班级选择器**：
- 下拉菜单："Select a class..."
- 显示所有教师的班级列表

**风险学生面板**（选择班级后显示）：
- 标题："⚠️ At-Risk Students"
- 副标题："Students who may need additional support"
- 学生卡片列表：
  - 每个卡片显示：
    - 学生邮箱
    - 风险原因（例如："Low completion rate: 25%"、"No activity in 8 days"）
    - "View Details" 按钮

**班级进度表格**（风险学生下方）：
- 标题："Class Progress Overview"
- 表格列：
  - Student（学生邮箱）
  - Components Viewed（查看组件数）
  - Components Completed（完成组件数）
  - Completion Rate（完成率百分比）
  - Avg Time per Component（平均时长）
  - Last Active（最后活跃时间）
  - Actions（"View Details" 按钮）

**学生详情视图**（点击学生后显示，替换表格）：
- 顶部："← Back to Class Progress" 返回链接
- 学生邮箱（大标题）
- 统计卡片：
  - 查看组件数
  - 完成组件数
  - 完成率
  - 平均时长

**组件进度表格**：
- 标题："Component-Level Progress"
- 表格列：
  - Component（组件标题）
  - Type（类型图标）
  - Status（Completed / Viewed / Not Started）
  - Time Spent（花费时间）
  - Last Accessed（最后访问时间）

**最近活动时间线**：
- 标题："Recent Activity"
- 活动列表：
  - 每条显示：事件类型、组件名称、时间戳

**页面功能**：
- 选择班级查看分析数据
- 识别需要关注的风险学生
- 查看班级所有学生的进度概览
- 深入查看单个学生的详细进度
- 实时更新数据（学生学习时自动刷新）

**交互流程**：
1. 选择班级
2. 查看风险学生（如有）
3. 查看班级进度表格
4. 点击学生的 "View Details"
5. 查看学生详细进度
6. 点击 "← Back to Class Progress" 返回表格

**页面跳转**：
- 点击 "← Back to Dashboard" → 返回教师仪表板
- 点击风险学生的 "View Details" → 显示学生详情视图
- 点击表格中的 "View Details" → 显示学生详情视图
- 点击 "← Back to Class Progress" → 返回班级进度表格

**实时更新**：
- 当学生学习时，数据自动刷新
- 无需手动刷新页面
- 使用 Supabase Realtime 订阅实现

---

## 学生端页面

### 22. 学生仪表板 (Student Dashboard)

**页面内容**：

**顶部导航栏**：
- 左侧：WeaveMind logo + "Student Dashboard" 文字
- 右侧：用户邮箱 + "Sign Out" 按钮

**统计卡片区域**（3 个卡片横排）：
1. **My Classes 卡片**
   - 图标：👥
   - 数字：已加入班级数量
   - 标题："My Classes"

2. **Active Courses 卡片**
   - 图标：📚
   - 数字：活跃课程数量
   - 标题："Active Courses"

3. **Assignments 卡片**
   - 图标：📝
   - 数字：作业数量
   - 标题："Assignments"

**加入班级区域**：
- 标题："Join a Class"
- 表单：
  - Invitation Code 输入框
  - "Join Class" 提交按钮

**班级列表区域**：
- 标题："My Classes"
- 班级卡片列表：
  - 每个卡片显示：
    - 班级名称
    - 组织名称
    - 课程数量
    - 作业数量
    - "View Class" 按钮

**页面功能**：
- 查看所有统计数据概览
- 输入邀请码加入新班级
- 查看已加入的所有班级
- 访问班级详情

**页面跳转**：
- 点击 "Sign Out" → 退出登录，跳转到首页
- 输入邀请码并点击 "Join Class" → 加入成功后刷新页面
- 点击班级卡片的 "View Class" → 跳转到学生班级详情页

---

### 23. 学生班级详情页 (Student Class Detail)

**页面内容**：
- 顶部："← Back to Dashboard" 返回链接
- 班级信息卡片：
  - 班级名称（大标题）
  - 班级描述
  - 组织名称

**课程列表区域**：
- 标题："Available Courses"
- 课程卡片列表（仅显示已发布的课程）：
  - 每个卡片显示：
    - 课程标题
    - 课程描述
    - 章节数量
    - "View Course" 按钮

**作业列表区域**：
- 标题："Assignments"
- 作业卡片列表：
  - 每个卡片显示：
    - 作业标题
    - 作业描述
    - 截止日期
    - 提交状态（Submitted / Pending）
    - 分数（如已评分）
    - "View Assignment" 按钮

**页面功能**：
- 查看班级信息
- 查看所有已发布的课程
- 查看所有作业
- 访问课程学习
- 查看作业详情

**页面跳转**：
- 点击 "← Back to Dashboard" → 返回学生仪表板
- 点击课程卡片的 "View Course" → 跳转到学生课程学习页
- 点击作业卡片的 "View Assignment" → 跳转到学生作业详情页

---

### 24. 学生课程学习页 (Student Course Learning)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 课程信息卡片：
  - 课程标题（大标题）
  - 课程描述
  - 目标受众
  - 前置知识

**章节列表区域**（可折叠的章节卡片）：
- 每个章节卡片：
  - 章节标题（点击展开/收起）
  - 章节描述
  - 展开后显示该章节的所有组件

**组件显示**（章节展开后）：
- 每个组件根据类型显示不同内容：

**📝 Text 组件**：
- 组件标题
- 文本内容（段落格式）
- "Mark as Complete" 按钮

**🖼️ Image 组件**：
- 组件标题
- 图片显示
- 图片描述
- "Mark as Complete" 按钮

**🎥 Video 组件**：
- 组件标题
- 视频 URL 显示
- 视频描述
- "Mark as Complete" 按钮

**❓ Question 组件**：
- 问题文本
- 4 个选项（单选按钮）
- "Submit Answer" 按钮
- 答案反馈（正确/错误）

**🎮 Interactive 组件**：
- 组件标题
- 交互内容描述
- "Mark as Complete" 按钮

**组件级 AI 助手**（每个组件下方）：
- "💬 Ask AI Assistant" 按钮（点击展开/收起）
- 展开后显示：
  - 聊天消息列表（用户消息右侧蓝色，AI 消息左侧灰色）
  - 输入框："Ask a question about this component..."
  - "Send" 按钮
  - 加载动画（AI 回复时显示三个跳动的圆点）

**页面功能**：
- 查看课程信息
- 按章节顺序学习
- 展开/收起章节
- 查看不同类型的学习组件
- 标记组件为已完成
- 回答问题并获得反馈
- 使用 AI 助手提问
- 系统自动记录学习事件（打开组件、完成组件、提问、获得答案）

**AI 助手功能**：
- 针对当前组件内容提问
- AI 流式回复（逐字显示）
- 保存对话历史
- Enter 键发送，Shift+Enter 换行

**学习事件记录**：
- 打开组件时记录 `component_open` 事件
- 点击 "Mark as Complete" 时记录 `component_complete` 事件和学习时长
- 提问时记录 `ai_question_asked` 事件
- AI 回复时记录 `ai_question_answered` 事件

**页面跳转**：
- 点击 "← Back to Class" → 返回学生班级详情页

**交互流程**：
1. 查看课程信息
2. 点击章节标题展开
3. 阅读/观看组件内容
4. 点击 "💬 Ask AI Assistant" 展开聊天框
5. 输入问题并发送
6. 查看 AI 流式回复
7. 点击 "Mark as Complete" 标记完成
8. 继续下一个组件

---

### 25. 学生作业详情页 (Student Assignment Detail)

**页面内容**：
- 顶部："← Back to Class" 返回链接
- 作业信息卡片：
  - 作业标题（大标题）
  - 作业描述
  - 截止日期
  - 满分分数

**提交状态区域**：

**未提交状态**：
- 提示："You haven't submitted this assignment yet"
- 提交表单：
  - Content 多行文本框（提交内容）
  - "Submit Assignment" 提交按钮

**已提交未评分状态**：
- 提示："Assignment submitted, waiting for grading"
- 提交时间显示
- 提交内容显示（只读）

**已评分状态**：
- 提示："Assignment graded"
- 分数显示（大字体，例如："85 / 100"）
- 提交时间
- 提交内容显示
- 教师反馈显示

**页面功能**：
- 查看作业详细信息
- 提交作业内容
- 查看提交状态
- 查看评分和反馈

**页面跳转**：
- 点击 "← Back to Class" → 返回学生班级详情页
- 提交成功 → 刷新页面显示已提交状态

---

## 页面跳转关系图

### 教师端完整导航流程

```
首页
 ↓ 登录
登录页
 ↓ 登录成功
角色选择页
 ↓ 选择 Teacher
教师仪表板 ←─────────────────────┐
 ├─→ 创建组织页                    │
 │    ↓ 创建成功                   │
 ├─→ 组织详情页                    │
 │    ├─→ 创建班级页               │
 │    │    ↓ 创建成功              │
 │    └─→ 班级详情页 ←─────────┐   │
 │         ├─→ 手动创建课程页   │   │
 │         │    ↓ 创建成功      │   │
 │         ├─→ AI 创建课程页    │   │
 │         │    ↓ 保存大纲      │   │
 │         ├─→ 课程详情页 ←──┐  │   │
 │         │    ├─→ 编辑课程页 │  │   │
 │         │    ├─→ 创建章节页 │  │   │
 │         │    │    ↓ 创建成功│  │   │
 │         │    └─→ 章节详情页 │  │   │
 │         │         ├─→ 创建组件页 │   │
 │         │         ├─→ 编辑组件页 │   │
 │         │         └─────────┘  │   │
 │         ├─→ 创建作业页          │   │
 │         │    ↓ 创建成功         │   │
 │         └─→ 作业详情页          │   │
 │              └─→ 批改提交页     │   │
 │                   └─────────────┘   │
 └─→ Analytics 分析仪表板              │
      └──────────────────────────────┘
```

### 学生端完整导航流程

```
首页
 ↓ 登录
登录页
 ↓ 登录成功
角色选择页
 ↓ 选择 Student
学生仪表板 ←──────────────┐
 ├─ 输入邀请码加入班级     │
 │   ↓ 加入成功（刷新）    │
 └─→ 学生班级详情页 ←───┐ │
      ├─→ 学生课程学习页  │ │
      │    └─────────────┘ │
      └─→ 学生作业详情页   │
           └───────────────┘
```

### 关键页面间的快捷跳转

**教师端**：
- 所有详情页都有 "← Back to XXX" 返回上一级
- 教师仪表板可直接跳转到 Analytics
- 课程详情页可预览学生课程学习页

**学生端**：
- 所有详情页都有 "← Back to XXX" 返回上一级
- 学生仪表板是主要入口

---

## 页面视觉风格总结

### 整体风格
- **简洁现代**：大量留白，清晰的层次结构
- **卡片式设计**：所有内容模块都使用卡片容器
- **蓝紫色主题**：Indigo 系列作为主色调
- **渐变背景**：公共页面使用蓝色到紫色渐变

### 导航栏
- **固定顶部**：所有仪表板页面都有顶部导航栏
- **左侧品牌**：WeaveMind logo + 页面标题
- **右侧用户**：用户邮箱 + Sign Out 按钮
- **白色背景**：导航栏使用白色背景，带阴影

### 按钮样式
- **主要按钮**：蓝色背景，白色文字，圆角
- **次要按钮**：白色背景，蓝色边框，蓝色文字
- **危险按钮**：红色背景（删除操作）
- **悬停效果**：颜色加深，平滑过渡

### 卡片样式
- **白色背景**：所有卡片使用白色背景
- **圆角边框**：8px 圆角
- **轻微阴影**：提升层次感
- **悬停效果**：背景变浅，边框变蓝

### 表单样式
- **标签在上**：每个输入框上方有标签
- **圆角输入框**：6px 圆角
- **聚焦效果**：蓝色边框高亮
- **错误提示**：红色背景提示框

### 统计卡片
- **大数字**：统计数字使用大字体
- **图标装饰**：每个卡片有对应图标
- **网格布局**：横向排列，响应式

### 列表样式
- **卡片列表**：每个项目是一个卡片
- **网格布局**：多列显示（响应式）
- **间距统一**：卡片间距一致

### 加载状态
- **旋转圆圈**：蓝色边框旋转动画
- **跳动圆点**：三个圆点依次跳动（AI 输入时）
- **按钮文字变化**："Loading..." / "Submitting..." 等

### 消息气泡（AI 聊天）
- **用户消息**：右对齐，蓝色背景，白色文字，圆角
- **AI 消息**：左对齐，白色背景，灰色边框，圆角
- **流式显示**：AI 消息逐字出现

### 状态徽章
- **Published**：绿色背景
- **Draft**：黄色背景
- **Pending**：黄色背景
- **Running**：蓝色背景
- **Completed**：绿色背景
- **Failed**：红色背景
- **Graded**：绿色背景

### 图标使用
- **组件类型**：📝 🖼️ 🎥 ❓ 🎮
- **统计卡片**：🏢 👥 📚 📊 📝
- **角色选择**：👨‍🏫 🎓
- **AI 助手**：💬

---

## 特殊交互说明

### 1. 拖拽排序（大纲编辑器）
- **可拖拽元素**：章节卡片、课时卡片
- **拖拽时**：元素半透明，显示拖拽光标
- **放置时**：元素插入到目标位置
- **视觉反馈**：拖拽过程中目标位置高亮

### 2. 折叠/展开（学生课程页）
- **章节标题**：点击展开/收起章节内容
- **展开状态**：显示下箭头图标，内容可见
- **收起状态**：显示右箭头图标，内容隐藏
- **动画效果**：平滑展开/收起动画

### 3. AI 流式响应
- **开始输入**：显示三个跳动圆点
- **逐字显示**：AI 回复逐字出现
- **自动滚动**：新内容出现时自动滚动到底部
- **完成提示**：回复完成后停止动画

### 4. 实时更新（Analytics）
- **自动刷新**：学生学习时数据自动更新
- **无闪烁**：数据平滑更新，不重新加载页面
- **即时反馈**：教师可实时看到学生进度变化

### 5. 表单验证
- **即时验证**：输入时即时检查
- **错误提示**：输入框下方显示红色错误文字
- **成功提示**：绿色对勾或成功消息
- **禁用提交**：验证失败时禁用提交按钮

### 6. 确认对话框
- **删除操作**：弹出确认对话框
- **对话框内容**：警告文字 + 确认/取消按钮
- **确认后**：执行删除操作
- **取消后**：关闭对话框，不执行操作

### 7. 组件类型选择
- **网格布局**：5 个类型卡片横向排列
- **点击选择**：卡片高亮显示（蓝色边框）
- **表单切换**：下方表单根据选择的类型变化
- **单选限制**：只能选择一个类型

### 8. AI 生成进度显示
- **任务列表**：显示所有章节生成任务
- **状态更新**：实时更新每个任务的状态
- **对话记录**：可展开查看 Builder 和 Critic 对话
- **进度条**：显示整体生成进度（可选）

---

## 页面响应式设计说明

### 桌面端（大屏幕）
- **导航栏**：水平布局，左右分布
- **统计卡片**：4 列或 3 列横向排列
- **卡片列表**：3 列网格布局
- **表单**：单列，最大宽度限制
- **聊天界面**：固定宽度，居中显示

### 平板端（中等屏幕）
- **导航栏**：水平布局，可能换行
- **统计卡片**：2 列排列
- **卡片列表**：2 列网格布局
- **表单**：单列，宽度适应
- **聊天界面**：全宽显示

### 移动端（小屏幕）
- **导航栏**：垂直布局，堆叠显示
- **统计卡片**：1 列垂直排列
- **卡片列表**：1 列垂直排列
- **表单**：全宽显示
- **聊天界面**：全宽显示
- **按钮**：全宽显示

---

## 总结

本文档详细描述了 WeaveMind 系统的所有 **25 个页面**，包括：

### 页面分类
- **公共页面**：4 个（首页、登录、注册、角色选择）
- **教师页面**：17 个（仪表板、组织管理、班级管理、课程管理、章节管理、组件管理、作业管理、分析）
- **学生页面**：4 个（仪表板、班级、课程学习、作业）

### 每个页面包含
1. **页面内容**：详细列出页面上的所有元素
2. **页面功能**：说明用户可以执行的操作
3. **页面跳转**：明确所有导航路径
4. **交互流程**：复杂功能的步骤说明
5. **视觉效果**：布局、颜色、动画描述

### 核心功能流程
1. **AI 课程创建**：对话收集需求 → 生成大纲 → 编辑大纲 → AI 生成内容 → 接受内容
2. **学生学习**：加入班级 → 查看课程 → 学习组件 → AI 助手提问 → 完成标记
3. **教师分析**：选择班级 → 查看风险学生 → 查看进度 → 查看详情 → 实时更新

### 特色功能
- **AI 双智能体**：Builder + Critic 迭代生成高质量内容
- **组件级 AI 助手**：每个学习组件都有专属 AI 助手
- **实时分析**：教师可实时监控学生学习进度
- **自然语言编辑**：使用自然语言指令编辑课程
- **流式 AI 响应**：AI 回复逐字显示，提升体验

---

**文档版本**：v1.0
**最后更新**：2025-11-27
**页面总数**：25 个
**作者**：WeaveMind Development Team


