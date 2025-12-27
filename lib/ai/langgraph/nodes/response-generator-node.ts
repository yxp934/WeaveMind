import { ChatbotState } from "../chatbot-state";
import { AIMessage } from "@langchain/core/messages";
import { encode as encodeToon } from "@toon-format/toon";

/**
 * 响应生成节点 - 恢复选择题问答模式
 * 修复版本：提供结构化的交互体验，包含选择题和引导性回复
 */
export function responseGeneratorNode(state: ChatbotState): {
  messages: any[];
  response: any;
} {
  // 获取最新的AI响应消息
  const lastMessage = state.messages[state.messages.length - 1];

  // 关键修复1: 处理没有AI消息的情况，提供智能默认响应
  if (!(lastMessage instanceof AIMessage)) {
    const defaultResponse = generateIntelligentDefaultResponse(state);
    return {
      messages: state.messages,
      response: defaultResponse,
    };
  }

  // 关键修复2: 提取AI消息中的额外信息
  const aiContent = lastMessage.content;
  const additionalKwargs = lastMessage.additional_kwargs || {};

  // 关键修复3: 生成结构化的响应，包含选择题和引导信息
  const structuredResponse = generateStructuredResponse(
    state,
    aiContent,
    additionalKwargs,
  );

  const agentState = (state.metadata as any)?.agentState || null;
  const metadataForClient = {
    ...(structuredResponse.metadata || {}),
    agentState,
  };

  // Wrap message as TOON (no markdown fence). Keep metadata echoed.
  const toonPayload = {
    intent: state.intent?.type || "general_chat",
    status: "ok",
    message: structuredResponse.message,
    choices: structuredResponse.choices || null,
    toolsUsed: structuredResponse.toolsUsed || [],
    missing_fields: structuredResponse.metadata?.missingInfo || [],
    pending_tool_call: structuredResponse.metadata?.pendingToolCall || null,
    agent_state: agentState,
    metadata: metadataForClient,
  };
  const toonString = renderToon(toonPayload);

  return {
    messages: state.messages,
    response: {
      ...structuredResponse,
      metadata: metadataForClient,
      // 修复：只返回message字段，不返回完整TOON格式
      // 前端期望自然语言内容，不是TOON格式
    },
  };
}

/**
 * 生成智能默认响应
 */
function generateIntelligentDefaultResponse(state: ChatbotState): any {
  const intent = state.intent?.type || "unknown";
  const workflowType = state.currentWorkflow?.type;
  const knownClassId =
    (state.metadata as any)?.selectedClassId ||
    (state.metadata as any)?.classId ||
    null;

  // 根据当前状态生成合适的默认响应
  if (workflowType && state.currentWorkflow?.status === "active") {
    return {
      message: `我正在帮您${getWorkflowDisplayName(workflowType)}。请继续提供相关信息或选择以下选项：`,
      choices: generateWorkflowChoices(workflowType, state),
      toolsUsed: [],
      metadata: {
        intent: "continue_workflow",
        userRole: state.userRole,
        workflowType,
        currentStep: state.currentWorkflow?.step,
        workflowStatus: state.currentWorkflow?.status,
        classId: knownClassId,
        courseTopic: state.courseInfo?.topic,
        knownInfo: state.courseInfo,
        missingInfo: getMissingInfo(state),
        suggestedActions: ["continue_workflow", "restart_workflow"],
        availableActions: ["continue_workflow", "restart_workflow", "help"],
        suggestions: ["继续当前工作流", "重新开始", "获取帮助"],
        progress: calculateProgress(state),
        conversationId: state.conversationId,
        sessionId: state.sessionId,
        contextPreserved: true,
        workflowActive: true,
      },
    };
  }

  // 通用对话的默认响应
  return {
    message: `我很乐意帮您！请告诉我您想要做什么：\n\n请选择以下选项之一，或直接描述您的需求：`,
    choices: [
      {
        id: "create_course",
        text: "创建新课程",
        description: "创建一个完整的教学课程",
      },
      {
        id: "generate_outline",
        text: "生成课程大纲",
        description: "基于主题生成详细的教学大纲",
      },
      {
        id: "create_assignment",
        text: "创建作业",
        description: "设计测验、写作或研究作业",
      },
      {
        id: "a2a_optimization",
        text: "A2A内容优化",
        description: "使用AI优化现有课程内容",
      },
      {
        id: "content_generation",
        text: "生成教学内容",
        description: "创建具体的教学材料",
      },
    ],
    toolsUsed: [],
    metadata: {
      intent: "general_chat",
      userRole: state.userRole,
      availableActions: [
        "create_course",
        "generate_outline",
        "create_assignment",
        "a2a_optimization",
        "content_generation",
      ],
      suggestedActions: ["choose_option", "describe_request"],
      suggestions: ["创建课程", "生成大纲", "创建作业"],
      workflowType: null,
      currentStep: null,
      classId: knownClassId,
      courseTopic: null,
      knownInfo: null,
      missingInfo: ["user_intent"],
      progress: 0,
      conversationId: state.conversationId,
      sessionId: state.sessionId,
      contextPreserved: true,
    },
  };
}

/**
 * 生成结构化响应
 */
function generateStructuredResponse(
  state: ChatbotState,
  aiContent: string,
  additionalKwargs: any,
): any {
  const intent = state.intent?.type || "unknown";
  const workflowType = state.currentWorkflow?.type;
  const knownClassId =
    (state.metadata as any)?.selectedClassId ||
    (state.metadata as any)?.classId ||
    null;

  // 关键修复4: 为不同工作流生成相应的选择题
  let choices: any[] = [];
  if (workflowType === "course_creation") {
    choices = generateCourseCreationChoices(state);
  } else if (intent === "course_creation") {
    choices = [
      {
        id: "topic_clarification",
        text: "明确课程主题",
        description: "详细说明要创建的课程主题和目标",
      },
      {
        id: "quick_course",
        text: "快速创建课程",
        description: "使用默认设置快速创建基础课程",
      },
      {
        id: "from_outline",
        text: "基于大纲创建",
        description: "先生成大纲再创建课程",
      },
    ];
  } else if (intent === "outline_generation") {
    choices = [
      {
        id: "provide_details",
        text: "提供课程详情",
        description: "详细描述课程主题、目标受众等",
      },
      {
        id: "quick_outline",
        text: "快速生成大纲",
        description: "基于简单描述生成大纲",
      },
      {
        id: "template_based",
        text: "使用模板",
        description: "基于现有模板生成大纲",
      },
    ];
  }

  // 关键修复5: 永远以工作流节点生成的AI内容为准，避免意图识别阶段的suggestedResponse覆盖导致“已创建/已保存”等幻觉
  let message = aiContent;

  // 如果没有choices但确实存在缺失信息，生成引导性问题
  const missingInfo = getMissingInfo(state);
  if (choices.length === 0 && missingInfo.length > 0) {
    message += "\n\n" + generateGuidedQuestions(missingInfo);
  }

  return {
    message,
    choices: choices.length > 0 ? choices : undefined,
    toolsUsed: state.metadata?.toolsUsed || [],
    metadata: {
      // 基本信息
      intent,
      userRole: state.userRole,
      timestamp: state.metadata?.timestamp,
      reasoning: state.metadata?.reasoning,

      // 工作流信息
      workflowType,
      currentStep: state.currentWorkflow?.step,
      workflowStatus: state.currentWorkflow?.status,
      classId: knownClassId,

      // 课程信息
      courseTopic: state.courseInfo?.topic,
      knownInfo: state.courseInfo,
      missingInfo: getMissingInfo(state),

      // 交互信息
      suggestedActions: state.metadata?.suggestions || ["continue_workflow"],
      availableActions: state.metadata?.availableActions || [
        "continue_workflow",
        "restart",
        "help",
      ],
      suggestions: state.metadata?.suggestions || [],

      // 进度信息
      progress: calculateProgress(state),

      // 会话信息
      conversationId: state.conversationId,
      sessionId: state.sessionId,

      // 关键修复6: 添加上下文保持信息
      contextPreserved: true,
      messagesCount: state.messages.length,
      workflowActive: state.currentWorkflow?.status === "active",

      // 🔧 关键修复：传递数据库操作标志
      requiresDatabaseAction: state.metadata?.requiresDatabaseAction,
      actionType: state.metadata?.actionType,
      actionData: state.metadata?.actionData,

      // ReAct/agent state persistence (teacher sidebar)
      agentState: (state.metadata as any)?.agentState || null,
    },
  };
}

function renderToon(obj: Record<string, any>): string {
  // Use official encoder to ensure strings/newlines are escaped correctly.
  return `---BEGIN_TOON---\n${encodeToon(obj)}\n---END_TOON---`;
}

/**
 * 生成课程创建相关的选择题
 */
function generateCourseCreationChoices(state: ChatbotState): any[] {
  const missingInfo = getMissingInfo(state);

  const choices = [];

  if (missingInfo.includes("course_topic")) {
    choices.push({
      id: "provide_topic",
      text: "提供课程主题",
      description: "告诉我您想创建的课程主题和学习目标",
    });
  }

  if (missingInfo.includes("course_duration")) {
    choices.push({
      id: "set_duration",
      text: "设置课程时长",
      description: "选择课程总时长（4节、8节、12节等）",
    });
  }

  if (missingInfo.includes("sessions_per_week")) {
    choices.push({
      id: "set_frequency",
      text: "设置上课频率",
      description: "确定每周上课次数",
    });
  }

  choices.push({
    id: "use_defaults",
    text: "使用默认设置",
    description: "快速创建课程，使用推荐的默认值",
  });

  choices.push({
    id: "restart_flow",
    text: "重新开始",
    description: "重新开始课程创建流程",
  });

  return choices;
}

/**
 * 生成工作流相关的选择题
 */
function generateWorkflowChoices(
  workflowType: string,
  state: ChatbotState,
): any[] {
  switch (workflowType) {
    case "course_creation":
      return generateCourseCreationChoices(state);
    case "outline_generation":
      return [
        {
          id: "provide_details",
          text: "提供更多详情",
          description: "补充课程相关信息",
        },
        {
          id: "generate_now",
          text: "立即生成",
          description: "基于现有信息生成大纲",
        },
        {
          id: "restart",
          text: "重新开始",
          description: "重新开始大纲生成流程",
        },
      ];
    case "assignment_creation":
      return [
        {
          id: "quiz_assignment",
          text: "创建测验",
          description: "设计多项选择题测验",
        },
        {
          id: "writing_assignment",
          text: "创建写作作业",
          description: "设计写作类作业",
        },
        {
          id: "research_assignment",
          text: "创建研究作业",
          description: "设计研究性作业",
        },
      ];
    default:
      return [
        {
          id: "continue",
          text: "继续当前流程",
          description: "继续完成当前工作",
        },
        { id: "restart", text: "重新开始", description: "重新开始整个流程" },
      ];
  }
}

/**
 * 生成引导性问题
 */
function generateGuidedQuestions(missingInfo: string[]): string {
  const questions = [];

  if (missingInfo.includes("course_topic")) {
    questions.push("📚 **课程主题**：您想创建什么主题的课程？");
  }
  if (missingInfo.includes("course_duration")) {
    questions.push(
      "⏰ **课程时长**：您希望课程持续多长时间？（如：4节、8节、12节）",
    );
  }
  if (missingInfo.includes("sessions_per_week")) {
    questions.push("📅 **上课频率**：您计划每周上几次课？");
  }
  if (missingInfo.includes("target_audience")) {
    questions.push("👥 **目标学员**：这门课程面向哪些学员？");
  }
  if (missingInfo.includes("difficulty_level")) {
    questions.push("🎯 **难度级别**：课程难度如何？（初级、中级、高级）");
  }

  return "请回答以下问题，或者选择上方的选项：\n\n" + questions.join("\n\n");
}

/**
 * 获取工作流显示名称
 */
function getWorkflowDisplayName(workflowType: string): string {
  const names = {
    course_creation: "创建课程",
    outline_generation: "生成大纲",
    assignment_creation: "创建作业",
    a2a_optimization: "优化内容",
    content_generation: "生成内容",
  };
  return names[workflowType as keyof typeof names] || "处理任务";
}

/**
 * 计算缺失信息
 */
function getMissingInfo(state: ChatbotState): string[] {
  // Entity management is not a course-building workflow; do not ask course slot questions.
  if (
    state.intent?.type === "entity_management" ||
    state.currentWorkflow?.type === "entity_management" ||
    state.intent?.type === "react_agent" ||
    state.currentWorkflow?.type === "react_agent"
  ) {
    return [];
  }

  if (!state.courseInfo) {
    return [
      "course_topic",
      "course_duration",
      "sessions_per_week",
      "target_audience",
      "difficulty_level",
      "course_type",
    ];
  }

  const missing: string[] = [];
  const courseInfo = state.courseInfo;

  if (!courseInfo.topic) missing.push("course_topic");
  if (!courseInfo.duration) missing.push("course_duration");
  if (!courseInfo.sessionsPerWeek) missing.push("sessions_per_week");
  if (!courseInfo.targetAudience) missing.push("target_audience");
  if (!courseInfo.difficultyLevel) missing.push("difficulty_level");
  if (!courseInfo.courseType) missing.push("course_type");

  return missing;
}

/**
 * 计算进度百分比
 */
function calculateProgress(state: ChatbotState): number {
  if (!state.currentWorkflow) {
    return 0;
  }

  const totalFields = 6; // courseInfo总共6个字段
  const knownFields = state.courseInfo
    ? Object.keys(state.courseInfo).length
    : 0;

  // 根据工作流状态调整进度
  let baseProgress = (knownFields / totalFields) * 80; // 最大80%

  switch (state.currentWorkflow.step) {
    case "info_collection":
      return baseProgress;
    case "course_generation":
      return 90;
    case "completed":
      return 100;
    case "error":
      return Math.max(baseProgress - 20, 0);
    default:
      return baseProgress;
  }
}

/**
 * 错误处理节点
 */
export function errorHandlerNode(
  state: ChatbotState,
  error: Error,
): Partial<ChatbotState> {
  console.error("聊天机器人错误:", error);

  // 添加错误消息到对话历史
  const errorMessage = new AIMessage({
    content: `抱歉，处理您的请求时出现了错误：${error.message}。请重新描述您的需求，或尝试其他操作。`,
    additional_kwargs: {
      error: true,
      errorMessage: error.message,
    },
  });

  return {
    ...state,
    messages: [...state.messages, errorMessage],
    currentWorkflow: state.currentWorkflow
      ? {
          ...state.currentWorkflow,
          status: "paused",
          step: "error",
        }
      : undefined,
    metadata: {
      ...state.metadata,
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      suggestions: ["重新开始", "联系技术支持"],
      availableActions: ["restart", "support"],
    },
  };
}
