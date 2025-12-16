import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// 定义聊天机器人状态接口
export interface ChatbotState {
  // 消息历史
  messages: BaseMessage[];

  // 用户信息
  userRole: "teacher" | "student" | "self_learner";
  userId?: string;

  // 对话上下文
  conversationId: string;
  sessionId: string;

  // 当前工作流状态
  currentWorkflow?: {
    type:
      | "course_creation"
      | "outline_generation"
      | "assignment_creation"
      | "a2a_optimization"
      | "content_generation"
      | "continue_workflow"
      | "entity_management"
      | "react_agent";
    // 真实实现里会出现更多中间态（如等待确认/已确认等）
    status:
      | "active"
      | "completed"
      | "paused"
      | "awaiting_confirmation"
      | "confirmed"
      | "error";
    step: string;
    data: Record<string, any>;
  };

  // 课程创建相关数据
  courseInfo?: {
    topic: string;
    duration: string;
    sessionsPerWeek: string;
    targetAudience: string;
    difficultyLevel: string;
    courseType: string;
    teachingMethod?: string;
    assessmentType?: string;
  };

  // 意图识别结果
  intent?: {
    type: string;
    confidence: number;
    parameters: Record<string, any>;
  };

  // 响应元数据
  metadata?: {
    timestamp: string;
    toolsUsed: string[];
    suggestions: string[];
    availableActions: string[];
    // 允许工作流节点/路由携带额外元数据（DB操作标志、上下文实体、调试信息等）
    [key: string]: any;
  };
}

// 初始状态创建函数
// 关键修复：sessionId 必须与 conversationId 一致，确保上下文连续性
export function createInitialState(
  conversationId: string,
  userRole: "teacher" | "student" | "self_learner",
  userId?: string,
  existingSessionId?: string, // 新增：允许传入已有的 sessionId
): ChatbotState {
  // 使用传入的 sessionId 或 conversationId，而不是生成新的随机 ID
  // 这样可以保持多轮对话的上下文连续性
  const sessionId = existingSessionId || conversationId;

  return {
    messages: [],
    userRole,
    userId,
    conversationId,
    sessionId, // 使用固定的 sessionId，不再生成随机值
    metadata: {
      timestamp: new Date().toISOString(),
      toolsUsed: [],
      suggestions: [],
      availableActions: [],
    },
  };
}

// 状态更新辅助函数
export function updateWorkflow(
  state: ChatbotState,
  workflowData: Partial<ChatbotState["currentWorkflow"]>,
): ChatbotState {
  return {
    ...state,
    currentWorkflow: state.currentWorkflow
      ? {
          ...state.currentWorkflow,
          ...workflowData,
        }
      : undefined,
  };
}

export function updateCourseInfo(
  state: ChatbotState,
  courseData: Partial<ChatbotState["courseInfo"]>,
): ChatbotState {
  return {
    ...state,
    courseInfo: state.courseInfo
      ? {
          ...state.courseInfo,
          ...courseData,
        }
      : (courseData as ChatbotState["courseInfo"]),
  };
}

export function addMessage(
  state: ChatbotState,
  message: BaseMessage,
): ChatbotState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}
