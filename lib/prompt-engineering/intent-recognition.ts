/**
 * 智能意图识别提示词工程
 * 负责识别用户的真实意图并引导到相应的工作流
 */

export interface IntentPattern {
  keywords: string[]
  intent: string
  workflowType: string
  confidence: number
}

export interface RecognitionResult {
  intent: string
  workflowType: string
  confidence: number
  suggestedResponse: string
}

/**
 * 意图识别核心提示词
 */
export const INTENT_RECOGNITION_SYSTEM_PROMPT = `
你是一个专业的AI教育助手，专门负责理解用户的需求并引导到正确的工作流。

你的核心职责：
1. 准确识别用户的真实意图
2. 根据意图引导到相应的工作流
3. 提供友好的引导和建议

## 6个核心工作流任务：

### 1. 创建课程 (create_course)
- 关键词：创建课程、我要上课、做课程、新建课程、课程安排、教学计划
- 用户想要创建一个新的课程，需要通过8步对话收集信息：
  - 课程主题和目标
  - 课程节数（4/8/12节）
  - 上课频率（每周1-3次）
  - 上课日期
  - 开始日期
  - 上课时间
  - 课程时长
  - 每节课主题

### 2. 创建课程节次 (create_session)
- 关键词：创建节次、新建课时、添加课程、上课时间、课时安排
- 用户想要为现有课程创建具体的课程节次

### 3. 生成课程大纲 (generate_outline)
- 关键词：生成大纲、做课程大纲、课程结构、教学大纲
- 用户想要基于课程主题和节数生成详细的教学大纲

### 4. 创建作业 (create_assignment)
- 关键词：创建作业、做作业、布置作业、作业题目
- 用户想要创建作业，支持三种类型：
  - 测验题目 (quiz)
  - 写作作业 (writing)
  - 研究作业 (research)

### 5. A2A内容优化 (a2a_optimization)
- 关键词：优化内容、改进课程、内容完善、质量提升、A2A
- 用户想要通过AI对AI的方式优化课程内容质量

### 6. 内容生成 (content_generation)
- 关键词：生成内容、创建材料、制作内容、教学材料
- 用户想要生成具体的教学内容

## 意图识别规则：

1. **直接匹配**：如果用户明确提到工作流关键词，直接识别
2. **语义匹配**：根据用户描述的意图进行语义理解
3. **上下文推断**：结合对话历史和上下文推断真实意图
4. **歧义消解**：如果多个意图可能，询问用户确认

## 响应策略：

- **识别成功**：直接开始相应工作流
- **需要澄清**：礼貌询问具体需求
- **多重匹配**：列出可能的选项让用户选择
- **无法识别**：引导用户描述需求，提供建议

## 回应格式：
- 先确认识别的意图
- 简要说明将进行的工作
- 开始第一步询问或操作
- 保持友好和专业的语调
`

/**
 * 工作流引导提示词
 */
export const WORKFLOW_GUIDANCE_PROMPTS = {
  create_course: {
    welcome: "你好！我很乐意帮你创建一个完整的课程。让我们通过8个简单的问题来规划你的课程。",
    first_question: "首先，请告诉我：\n\n**这门课程的主题和主要学习目标是什么？**\n\n例如：\"高中物理 - 力学基础\" 或 \"Python编程入门课程\"",
    encouragement: "很好！让我继续收集信息。"
  },

  create_session: {
    welcome: "我来帮你为课程创建具体的课程节次。",
    first_question: "请提供以下信息：\n\n1. 课程标题\n2. 希望安排的时间\n3. 课程时长\n4. 主要内容要点"
  },

  generate_outline: {
    welcome: "我来帮你生成详细的课程大纲。",
    first_question: "请提供：\n\n1. 课程标题\n2. 课程描述\n3. 计划有多少节课\n4. 每节课的主题（如果有的话）"
  },

  create_assignment: {
    welcome: "我来帮你创建作业。",
    first_question: "请告诉我：\n\n1. 作业类型（测验/写作/研究）\n2. 作业主题\n3. 难度要求\n4. 期望的题目数量（如果是测验）"
  },

  a2a_optimization: {
    welcome: "我将使用A2A（AI对AI）方式帮你优化课程内容质量。",
    first_question: "请提供：\n\n1. 要优化的课程内容\n2. 优化目标（更生动/更清晰/更深入等）\n3. 目标受众"
  },

  content_generation: {
    welcome: "我来帮你生成具体的教学内容。",
    first_question: "请告诉我：\n\n1. 内容类型（PPT/讲义/练习等）\n2. 主题内容\n3. 目标受众\n4. 内容长度要求"
  }
}

/**
 * 意图识别函数
 */
export function recognizeIntent(userMessage: string, conversationHistory: any[] = []): RecognitionResult {
  const message = userMessage.toLowerCase()

  // 创建课程意图
  if (matchIntent(message, ['创建课程', '我要上课', '做课程', '新建课程', '课程安排', '教学计划', 'start a course', 'create a course', 'new course'])) {
    return {
      intent: 'create_course',
      workflowType: 'create_course',
      confidence: 0.9,
      suggestedResponse: "好的！我来帮你创建一个完整的课程。让我们通过8个简单的问题来规划你的课程。"
    }
  }

  // 创建课程节次意图
  if (matchIntent(message, ['创建节次', '新建课时', '添加课程', '上课时间', '课时安排', 'create session', 'add class'])) {
    return {
      intent: 'create_session',
      workflowType: 'create_session',
      confidence: 0.85,
      suggestedResponse: "好的！我来帮你为课程创建具体的课程节次。"
    }
  }

  // 生成大纲意图
  if (matchIntent(message, ['生成大纲', '做课程大纲', '课程结构', '教学大纲', 'generate outline', 'course outline'])) {
    return {
      intent: 'generate_outline',
      workflowType: 'generate_outline',
      confidence: 0.9,
      suggestedResponse: "好的！我来帮你生成详细的课程大纲。"
    }
  }

  // 创建作业意图
  if (matchIntent(message, ['创建作业', '做作业', '布置作业', '作业题目', 'create assignment', 'make homework'])) {
    return {
      intent: 'create_assignment',
      workflowType: 'create_assignment',
      confidence: 0.85,
      suggestedResponse: "好的！我来帮你创建作业。请问你想要创建什么类型的作业？"
    }
  }

  // A2A优化意图
  if (matchIntent(message, ['优化内容', '改进课程', '内容完善', '质量提升', 'A2A', 'optimize content', 'improve course'])) {
    return {
      intent: 'a2a_optimization',
      workflowType: 'a2a_optimization',
      confidence: 0.8,
      suggestedResponse: "好的！我将使用A2A（AI对AI）方式帮你优化课程内容质量。"
    }
  }

  // 内容生成意图
  if (matchIntent(message, ['生成内容', '创建材料', '制作内容', '教学材料', 'generate content', 'create materials'])) {
    return {
      intent: 'content_generation',
      workflowType: 'content_generation',
      confidence: 0.75,
      suggestedResponse: "好的！我来帮你生成具体的教学内容。"
    }
  }

  // 默认回应，无法识别
  return {
    intent: 'unknown',
    workflowType: '',
    confidence: 0.1,
    suggestedResponse: "我很乐意帮你！请告诉我你想要做什么：\n\n• 创建新课程\n• 生成课程大纲\n• 创建作业\n• 优化课程内容\n• 生成教学内容\n\n请描述你的具体需求，我会引导你完成。"
  }
}

/**
 * 匹配意图关键词 - 支持中英文混合匹配，优先精确匹配
 */
function matchIntent(message: string, keywords: string[]): boolean {
  const normalizedMessage = message.toLowerCase()

  // 按关键词长度排序，优先匹配更长的关键词
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)

  return sortedKeywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase()

    // 1. 直接匹配（最高优先级）
    if (normalizedMessage.includes(normalizedKeyword)) {
      return true
    }

    // 2. 移除标点符号和空格后匹配
    const cleanMessage = normalizedMessage.replace(/[，。！？、\s]/g, '')
    const cleanKeyword = normalizedKeyword.replace(/[，。！？、\s]/g, '')

    if (cleanMessage.includes(cleanKeyword) || cleanKeyword.includes(cleanMessage)) {
      return true
    }

    // 3. 模糊匹配：只对长度>=3的关键词进行模糊匹配，避免误匹配
    if (cleanKeyword.length >= 3) {
      // 检查关键词的连续字符片段
      for (let i = 0; i <= cleanKeyword.length - 3; i++) {
        const part = cleanKeyword.slice(i, i + 3)
        if (cleanMessage.includes(part)) {
          return true
        }
      }
    }

    return false
  })
}

/**
 * 获取工作流引导提示
 */
export function getWorkflowGuidance(workflowType: string): any {
  return WORKFLOW_GUIDANCE_PROMPTS[workflowType as keyof typeof WORKFLOW_GUIDANCE_PROMPTS] || {
    welcome: "我来帮你处理这个需求。",
    first_question: "请提供更多详细信息。"
  }
}

/**
 * 处理歧义情况
 */
export function handleAmbiguousIntent(userMessage: string): string {
  const suggestions = [
    "我想帮你创建课程，请说：\"创建课程\"",
    "我也可以帮你生成大纲，请说：\"生成大纲\"",
    "或者创建作业，请说：\"创建作业\"",
    "如果你不确定要做什么，请描述你的需求，我来帮你选择合适的功能。"
  ]

  return `我注意到你的需求可能涉及多个功能。请选择你想要的：\n\n${suggestions.join('\n\n')}`
}