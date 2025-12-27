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
  return {
    message: "当前响应异常，请稍后重试。",
    toolsUsed: [],
    metadata: {
      intent: "error",
      userRole: state.userRole,
      timestamp: new Date().toISOString(),
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

  const choices = Array.isArray(additionalKwargs?.choices)
    ? additionalKwargs.choices
    : [];

  // 关键修复5: 永远以工作流节点生成的AI内容为准，避免意图识别阶段的suggestedResponse覆盖导致“已创建/已保存”等幻觉
  let message = aiContent;

  const missingInfo = getMissingInfo(state);

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
      suggestedActions: state.metadata?.suggestedActions || [],
      availableActions: state.metadata?.availableActions || [],
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
