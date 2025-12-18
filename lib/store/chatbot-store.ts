import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseModelResponse } from "@/lib/ai/langgraph/utils/model-response";

function extractMessageFromToon(raw: string): string | null {
  if (!raw) return null;
  const begin = raw.indexOf("---BEGIN_TOON---");
  const end = raw.indexOf("---END_TOON---");
  const segment =
    begin !== -1 && end !== -1 && end > begin
      ? raw.slice(begin + "---BEGIN_TOON---".length, end)
      : raw;
  const match = segment.match(/(^|\n)message:\s*(.*)(\n|$)/);
  if (!match?.[2]) return null;
  const value = match[2].trim();
  return value.replace(/^"(.*)"$/, "$1").trim() || null;
}

// 消息类型定义
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  metadata?: {
    sessionId?: string;
    userRole?: "teacher" | "student" | "self-learner";
    classId?: string;
    courseId?: string;
    pendingToolCall?: {
      id: string;
      toolName: string;
      input: Record<string, any>;
    } | null;
    pendingToolCallId?: string | null;
    confirmationRequired?: boolean;
    confirmationExecuted?: boolean;
    silentUserMessage?: boolean;
    confirmToolCall?: {
      id: string;
      toolName: string;
      input: Record<string, any>;
    };
    organizationId?: string;
    selectedClassId?: string;
    selectedSessionId?: string;
    selectedAssignmentId?: string;
    selectedContexts?: any;
    agentState?: any;
  };
}

// 工具调用类型定义
export interface ToolCall {
  tool: string;
  args: any;
  result?: any;
  status: "pending" | "running" | "completed" | "error";
  error?: string;
}

// 工作流状态类型定义
export interface WorkflowState {
  id: string;
  type:
    | "outline_generation"
    | "a2a_session"
    | "course_editing"
    | "general_chat";
  status: "idle" | "running" | "completed" | "error";
  progress: number;
  currentStep: string;
  totalSteps: number;
  data: any;
  startTime?: Date;
  endTime?: Date;
}

// AI工具类型定义
export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category:
    | "course"
    | "discussion"
    | "assessment"
    | "progress"
    | "communication"
    | "analysis"
    | "workflow";
  requiresContext?: boolean;
  maxIterations?: number;
}

// 聊天机器人状态接口
interface ChatbotStore {
  // 状态
  messages: ChatMessage[];
  workflow: WorkflowState | null;
  tools: AITool[];
  isLoading: boolean;
  error: string | null;
  currentSessionId: string | null;
  availableTools: AITool[];
  streamingMessage: string | null;
  userRole: "teacher" | "student" | "self-learner";
  conversationId: string | null;

  // 操作方法
  sendMessage: (content: string, metadata?: any) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  // 工作流操作
  startWorkflow: (type: WorkflowState["type"], data?: any) => void;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  completeWorkflow: () => void;
  cancelWorkflow: () => void;

  // 工具操作
  callTool: (toolName: string, args: any) => Promise<void>;
  updateToolCall: (toolCallId: string, updates: Partial<ToolCall>) => void;
  getAvailableTools: (userRole?: string) => AITool[];

  // Outline generation specific methods
  generateOutline: (requirements: any, options?: any) => Promise<void>;
  updateOutlineProgress: (step: string, progress: number) => void;
  saveOutline: (outlineData: any) => Promise<void>;
  loadOutlineFromClass: (classId: string) => Promise<void>;

  // A2A会话生成方法
  startA2ASession: (config: any) => Promise<void>;
  updateA2AProgress: (
    step: string,
    progress: number,
    agent?: "teacher" | "student",
  ) => void;
  getA2ASessionStatus: (sessionId: string) => Promise<any>;
  cancelA2ASession: () => void;

  // 工具方法
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSessionId: (sessionId: string | null) => void;
  setStreamingMessage: (message: string | null) => void;

  // 重置状态
  reset: () => void;
}

// A2A状态轮询辅助函数
const pollA2AStatus = async (
  generationId: string,
  getState: any,
  setState: any,
) => {
  const poll = async () => {
    try {
      const response = await fetch(
        `/api/ai/session/generate?id=${generationId}`,
      );
      if (!response.ok) return;

      const data = await response.json();
      const generation = data.generation;

      if (!generation) return;

      // 更新工作流进度
      const progress =
        (generation.current_iteration / generation.max_iterations) * 100;
      setState((state: any) => ({
        workflow: state.workflow
          ? {
              ...state.workflow,
              progress,
              data: {
                ...state.workflow.data,
                currentIteration: generation.current_iteration,
                builderFeedback: generation.builder_feedback,
                criticFeedback: generation.critic_feedback,
                status: generation.status,
              },
            }
          : null,
      }));

      // 如果完成，停止轮询
      if (generation.status === "completed" || generation.status === "failed") {
        // 添加完成消息
        const { addMessage } = getState();
        addMessage({
          role: "system",
          content:
            generation.status === "completed"
              ? `A2A会话生成完成！共进行了${generation.current_iteration}轮迭代。`
              : `A2A会话生成失败：${generation.error_message}`,
        });
        return;
      }

      // 继续轮询
      setTimeout(poll, 2000); // 每2秒轮询一次
    } catch (error) {
      console.error("A2A状态轮询失败:", error);
    }
  };

  poll();
};

// 默认AI工具配置
const DEFAULT_TOOLS: AITool[] = [
  // 课程管理工具
  {
    id: "generate_course",
    name: "生成课程",
    description: "基于大纲自动生成完整课程内容",
    icon: undefined,
    category: "course",
  },
  {
    id: "edit_chapter",
    name: "编辑章节",
    description: "智能编辑和优化课程章节内容",
    icon: undefined,
    category: "course",
  },
  {
    id: "create_assessment",
    name: "创建评估",
    description: "自动生成课程评估和练习题",
    icon: undefined,
    category: "assessment",
  },

  // 讨论管理工具
  {
    id: "create_discussion",
    name: "创建讨论",
    description: "智能创建讨论话题和引导问题",
    icon: undefined,
    category: "discussion",
  },
  {
    id: "moderate_thread",
    name: "管理讨论",
    description: "智能管理讨论线程和回复",
    icon: undefined,
    category: "communication",
  },
  {
    id: "generate_insights",
    name: "生成洞察",
    description: "分析讨论内容并生成见解",
    icon: undefined,
    category: "analysis",
  },

  // 学习分析工具
  {
    id: "analyze_progress",
    name: "分析进度",
    description: "分析学习进度并提供建议",
    icon: undefined,
    category: "progress",
  },
  {
    id: "personalize_path",
    name: "个性化路径",
    description: "为学生定制学习路径",
    icon: undefined,
    category: "progress",
  },
  {
    id: "generate_report",
    name: "生成报告",
    description: "生成学习分析报告",
    icon: undefined,
    category: "analysis",
  },

  // 沟通工具
  {
    id: "send_notification",
    name: "发送通知",
    description: "智能通知学生和教师",
    icon: undefined,
    category: "communication",
  },
  {
    id: "schedule_meeting",
    name: "安排会议",
    description: "智能安排师生会议时间",
    icon: null,
    category: "communication",
  },
  {
    id: "send_message",
    name: "发送消息",
    description: "批量发送个性化消息",
    icon: null,
    category: "communication",
  },

  // 评估工具
  {
    id: "grade_assignment",
    name: "评分作业",
    description: "智能评分和反馈",
    icon: null,
    category: "assessment",
  },
  {
    id: "generate_feedback",
    name: "生成反馈",
    description: "为学习者生成个性化反馈",
    icon: null,
    category: "assessment",
  },
  {
    id: "optimize_content",
    name: "优化内容",
    description: "优化课程内容以提高效果",
    icon: null,
    category: "analysis",
  },

  // 工作流工具
  {
    id: "outline_generator",
    name: "大纲生成器",
    description: "生成课程大纲和学习计划",
    icon: null,
    category: "workflow",
    requiresContext: true,
  },
  {
    id: "a2a_session",
    name: "A2A会话生成",
    description: "启动Agent-to-Agent内容优化",
    icon: null,
    category: "workflow",
    maxIterations: 5,
  },
  {
    id: "workflow_manager",
    name: "工作流管理",
    description: "管理和监控工作流进度",
    icon: null,
    category: "workflow",
  },
];

// 创建聊天机器人状态存储
export const useChatbotStore = create<ChatbotStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      messages: [],
      workflow: null,
      tools: DEFAULT_TOOLS,
      isLoading: false,
      error: null,
      currentSessionId: null,
      availableTools: DEFAULT_TOOLS,
      streamingMessage: null,
      userRole: "teacher",
      conversationId: null,

      // 消息操作
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id:
            message.id ||
            `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id
              ? {
                  ...msg,
                  ...updates,
                  metadata: updates.metadata
                    ? { ...(msg.metadata || {}), ...(updates.metadata || {}) }
                    : msg.metadata,
                }
              : msg,
          ),
        }));
      },

      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // 发送消息 - 使用真正的流式AI + LangGraph逻辑
      sendMessage: async (content, metadata = {}) => {
        const { addMessage, setLoading, setError, setStreamingMessage } = get();
        const streamRequested = metadata.stream === true;

        // Non-stream path: used for tool confirmation UI + more reliable responses
        if (!streamRequested) {
          try {
            setLoading(true);
            setError(null);
            setStreamingMessage(null);

            if (!metadata.silentUserMessage) {
              // Add user message
              addMessage({
                role: "user",
                content,
                metadata,
              });
            }

            // Placeholder assistant message
            const aiMessageId = `msg_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            addMessage({
              id: aiMessageId,
              role: "assistant",
              content: "",
              timestamp: new Date(),
              metadata: { ...metadata, isStreaming: false },
            });

            const conversationHistory = (get().messages || [])
              .filter((m) => m.role !== "system")
              .slice(-50)
              .map((msg) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
                timestamp:
                  msg.timestamp instanceof Date
                    ? msg.timestamp.toISOString()
                    : new Date(msg.timestamp).toISOString(),
                toolsUsed: msg.toolCalls?.map((tool) => tool.tool) || [],
                metadata: msg.metadata,
              }));

            const normalizedUserRole = (
              metadata.userRole ||
              get().userRole ||
              "teacher"
            ).replace("self-learner", "self_learner");

            const postBody = JSON.stringify({
              message: content,
              context: {
                courseId: metadata.courseId,
                classId: metadata.classId,
                organizationId: metadata.organizationId,
                userRole: normalizedUserRole as any,
                selectedClassId: metadata.selectedClassId,
                selectedSessionId: metadata.selectedSessionId,
                selectedAssignmentId: metadata.selectedAssignmentId,
                selectedContexts: metadata.selectedContexts,
                confirmToolCall: metadata.confirmToolCall,
                conversationHistory,
              },
              stream: false,
            });

            // All requests must retry on disconnect/errors:
            // wait 5s, retry up to 5 attempts.
            const isToolExecution = Boolean(metadata.confirmToolCall?.id);
            const runFetch = async () => {
              const controller = new AbortController();
              const timeoutMs = isToolExecution ? 30_000 : 60_000;
              const timer = setTimeout(() => controller.abort(), timeoutMs);
              try {
                return await fetch("/api/ai/chat", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: postBody,
                  signal: controller.signal,
                });
              } finally {
                clearTimeout(timer);
              }
            };
            let response: Response;
            let lastError: any = null;
            for (let attempt = 1; attempt <= 5; attempt++) {
              try {
                response = await runFetch();
                lastError = null;
                break;
              } catch (err) {
                lastError = err;
                if (attempt >= 5) break;
                await new Promise((r) => setTimeout(r, 5000));
              }
            }
            if (!response) {
              throw lastError || new Error("Network error");
            }

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
              throw new Error(
                data?.error?.message ||
                  `Chat error: ${response.status} ${response.statusText}`,
              );
            }

            const rawMessage = data?.data?.message || "";
            let displayMessage = rawMessage;
            let parsed: any = null;

            // 如果原始消息是TOON格式，才进行解析
            if (rawMessage.includes('---BEGIN_TOON---') || rawMessage.includes('---END_TOON---')) {
              try {
                parsed = parseModelResponse(rawMessage);
                if (parsed?.message && typeof parsed.message === "string") {
                  displayMessage = parsed.message;
                }
              } catch (error) {
                console.warn('TOON解析失败，使用原始消息:', error);
                // 解析失败则使用原始消息
              }
            } else {
              // 纯文本消息直接使用
              displayMessage = rawMessage;
            }

            const pendingToolCall =
              parsed?.pending_tool_call ||
              data?.data?.metadata?.pendingToolCall ||
              null;

            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: displayMessage,
                      metadata: {
                        ...(msg.metadata || {}),
                        ...(data?.data?.metadata || {}),
                        pendingToolCall,
                        pendingToolCallId:
                          data?.data?.metadata?.pendingToolCallId ||
                          pendingToolCall?.id ||
                          null,
                        confirmationRequired:
                          Boolean(data?.data?.metadata?.confirmationRequired) ||
                          Boolean(pendingToolCall),
                      },
                    }
                  : msg,
              ),
              isLoading: false,
              streamingMessage: null,
            }));
          } catch (err: any) {
            setLoading(false);
            setStreamingMessage(null);
            const isAbort =
              err?.name === "AbortError" || /aborted/i.test(err?.message || "");
            const friendly = isAbort
              ? "请求超时，请稍后重试。"
              : err?.message || "请求失败";
            setError(friendly);
            addMessage({
              role: "system",
              content: friendly,
            });
          }

          return;
        }

        // 在整个发送流程作用域内维护累积内容，便于在catch中访问
        let accumulatedContent = "";
        let hasStreamContent = false;
        // 在整个函数作用域内维护AI消息ID，避免在catch中访问块级变量导致的引用错误
        let aiMessageId: string | null = null;

        // 当流式请求因为超时/连接被关闭而失败时，自动切换到异步队列 + 轮询模式
        const startAsyncFallback = async () => {
          try {
            console.log("[CHAT] 流式请求失败，切换到异步后台处理...");
            setError(null);
            setStreamingMessage(null);

            // 重新获取最近对话历史，构造异步请求上下文
            const state = get();
            const asyncConversationHistory = (state.messages || [])
              .slice(-50)
              .map((msg) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
                timestamp:
                  msg.timestamp instanceof Date
                    ? msg.timestamp.toISOString()
                    : new Date(msg.timestamp).toISOString(),
              }));

            const asyncUserRole =
              (metadata.userRole as
                | "teacher"
                | "student"
                | "self-learner"
                | undefined) ||
              (state.userRole as
                | "teacher"
                | "student"
                | "self-learner"
                | undefined) ||
              "teacher";

            const asyncBody = JSON.stringify({
              message: content,
              context: {
                courseId: metadata.courseId,
                classId: metadata.classId,
                organizationId: metadata.organizationId,
                userRole: asyncUserRole,
                conversationHistory: asyncConversationHistory,
              },
            });

            const asyncResponse = await fetch("/api/ai/chat-async", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: asyncBody,
            });

            if (!asyncResponse.ok) {
              throw new Error(`Async chat error: ${asyncResponse.status}`);
            }

            const asyncData = await asyncResponse.json();

            if (!asyncData.success || !asyncData.data?.jobId) {
              throw new Error(
                asyncData.error || "异步任务创建失败，请稍后重试。",
              );
            }

            const jobId: string = asyncData.data.jobId;

            // 更新当前AI消息为“后台处理中”
            set((state) => {
              const targetId =
                aiMessageId ||
                state.messages
                  .slice()
                  .reverse()
                  .find(
                    (msg) =>
                      msg.role === "assistant" &&
                      (msg.metadata as any)?.isStreaming,
                  )?.id;

              if (!targetId) {
                return state;
              }

              return {
                messages: state.messages.map((msg) =>
                  msg.id === targetId
                    ? {
                        ...msg,
                        content:
                          "当前请求较复杂，我已切换为后台处理模式，请稍后片刻，我会在完成后更新本条回复。\n\n（任务ID：" +
                          jobId +
                          "）",
                        metadata: {
                          ...msg.metadata,
                          isStreaming: true,
                          asyncJobId: jobId,
                        },
                      }
                    : msg,
                ),
              };
            });

            // 轮询任务状态
            const pollIntervalMs = 2000;
            const maxAttempts = 60; // 最长约2分钟

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise((resolve) =>
                setTimeout(resolve, pollIntervalMs),
              );

              const statusResponse = await fetch(
                `/api/ai/chat-status/${asyncData.data.jobId}`,
              );

              if (!statusResponse.ok) {
                continue;
              }

              const statusData = await statusResponse.json();
              if (!statusData.success || !statusData.data) {
                continue;
              }

              const job = statusData.data as any;

              if (job.status === "completed" && job.result?.message) {
                const finalMessage: string = job.result.message;

                set((state) => {
                  const targetId =
                    aiMessageId ||
                    state.messages
                      .slice()
                      .reverse()
                      .find(
                        (msg) =>
                          msg.role === "assistant" &&
                          (msg.metadata as any)?.asyncJobId === jobId,
                      )?.id;

                  if (!targetId) {
                    return state;
                  }

                  return {
                    messages: state.messages.map((msg) =>
                      msg.id === targetId
                        ? {
                            ...msg,
                            content: finalMessage,
                            metadata: {
                              ...msg.metadata,
                              ...(job.result.metadata || {}),
                              isStreaming: false,
                              asyncJobId: jobId,
                            },
                          }
                        : msg,
                    ),
                  };
                });

                setStreamingMessage(null);
                setLoading(false);
                setError(null);
                return;
              }

              if (job.status === "failed") {
                const errorMessage: string =
                  job.error || "后台处理任务失败，请稍后重试。";

                set((state) => {
                  const targetId =
                    aiMessageId ||
                    state.messages
                      .slice()
                      .reverse()
                      .find(
                        (msg) =>
                          msg.role === "assistant" &&
                          (msg.metadata as any)?.asyncJobId === jobId,
                      )?.id;

                  if (!targetId) {
                    return state;
                  }

                  return {
                    messages: state.messages.map((msg) =>
                      msg.id === targetId
                        ? {
                            ...msg,
                            content: errorMessage,
                            metadata: {
                              ...msg.metadata,
                              isStreaming: false,
                              asyncJobId: jobId,
                              error: job.error,
                            },
                          }
                        : msg,
                    ),
                  };
                });

                setStreamingMessage(null);
                setLoading(false);
                setError(errorMessage);
                return;
              }
            }

            // 超时兜底
            set((state) => {
              const targetId =
                aiMessageId ||
                state.messages
                  .slice()
                  .reverse()
                  .find(
                    (msg) =>
                      msg.role === "assistant" &&
                      (msg.metadata as any)?.asyncJobId ===
                        asyncData.data.jobId,
                  )?.id;

              if (!targetId) {
                return state;
              }

              return {
                messages: state.messages.map((msg) =>
                  msg.id === targetId
                    ? {
                        ...msg,
                        content:
                          "抱歉，后台处理时间过长，请稍后重试或简化您的请求。",
                        metadata: {
                          ...msg.metadata,
                          isStreaming: false,
                          asyncJobId: asyncData.data.jobId,
                        },
                      }
                    : msg,
                ),
              };
            });

            setStreamingMessage(null);
            setLoading(false);
            setError("后台处理超时，请稍后重试。");
          } catch (fallbackError) {
            console.error("异步后台处理失败:", fallbackError);
            setStreamingMessage(null);
            setLoading(false);
            setError(
              fallbackError instanceof Error
                ? fallbackError.message
                : "后台处理失败",
            );

            addMessage({
              role: "system",
              content: "抱歉，后台处理您的请求失败，请稍后重试。",
            });
          }
        };

        try {
          setLoading(true);
          setError(null);
          setStreamingMessage("");

          // 添加用户消息
          addMessage({
            role: "user",
            content,
            metadata,
          });

          // 创建空的AI消息占位符
          aiMessageId = `msg_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          addMessage({
            id: aiMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            metadata: { ...metadata, isStreaming: true },
          });

          // 获取对话历史
          const conversationHistory = (get().messages || [])
            .slice(-50)
            .map((msg) => ({
              role: msg.role === "assistant" ? "assistant" : "user",
              content: msg.content,
              timestamp:
                msg.timestamp instanceof Date
                  ? msg.timestamp.toISOString()
                  : new Date(msg.timestamp).toISOString(),
              toolsUsed: msg.toolCalls?.map((tool) => tool.tool) || [],
              metadata: msg.metadata,
            }));

          // 使用流式API调用AI - 支持LangGraph和流式输出
          const normalizedUserRole = (
            metadata.userRole ||
            get().userRole ||
            "teacher"
          ).replace("self-learner", "self_learner");

          const postBody = JSON.stringify({
            message: content,
            context: {
              courseId: metadata.courseId,
              classId: metadata.classId,
              organizationId: metadata.organizationId,
              userRole: normalizedUserRole as any,
              selectedClassId: metadata.selectedClassId,
              selectedSessionId: metadata.selectedSessionId,
              selectedAssignmentId: metadata.selectedAssignmentId,
              selectedContexts: metadata.selectedContexts,
              conversationHistory,
            },
          });

          let response: Response | null = null;
          let lastError: any = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              response = await fetch("/api/ai/chat-stream", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: postBody,
              });
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              break;
            } catch (err) {
              lastError = err;
              if (attempt === 3) {
                throw err;
              }
              await new Promise((r) => setTimeout(r, 500 * attempt));
            }
          }

          // 处理流式响应
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("无法读取流式响应");
          }

          const decoder = new TextDecoder();
          let streamingMessageId = aiMessageId;

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    switch (data.type) {
                      case "start":
                        console.log("[STREAM] 开始流式处理:", data.requestId);
                        break;

                      case "progress":
                        console.log(
                          "[STREAM] 进度更新:",
                          data.progress,
                          data.message,
                        );
                        break;

                      case "streaming":
                        // 累积流式内容
                        accumulatedContent = data.content;
                        hasStreamContent = true;
                        setStreamingMessage(accumulatedContent);

                        // 实时更新消息内容
                        set((state) => ({
                          messages: state.messages.map((msg) =>
                            msg.id === streamingMessageId
                              ? { ...msg, content: accumulatedContent }
                              : msg,
                          ),
                        }));
                        break;

                      case "complete":
                        // 流式完成，更新最终内容
                        const finalContent = data.data.message;
                        console.log(
                          "[STREAM] 流式完成，内容长度:",
                          finalContent.length,
                        );

                        set((state) => ({
                          messages: state.messages.map((msg) =>
                            msg.id === streamingMessageId
                              ? {
                                  ...msg,
                                  content: finalContent,
                                  metadata: {
                                    ...msg.metadata,
                                    ...data.data.metadata,
                                    isStreaming: false,
                                  },
                                }
                              : msg,
                          ),
                        }));

                        setStreamingMessage(null);
                        setLoading(false);
                        break;

                      case "error":
                        // 将错误作为助手回复展示，避免重复系统错误提示
                        accumulatedContent = data.error || "流式处理出错";
                        hasStreamContent = true;
                        set((state) => ({
                          messages: state.messages.map((msg) =>
                            msg.id === streamingMessageId
                              ? {
                                  ...msg,
                                  content: accumulatedContent,
                                  metadata: {
                                    ...msg.metadata,
                                    ...data.metadata,
                                    isStreaming: false,
                                    error: data.error,
                                  },
                                }
                              : msg,
                          ),
                        }));
                        setStreamingMessage(null);
                        setLoading(false);
                        break;

                      case "end":
                        console.log("[STREAM] 流式处理结束");
                        return;
                    }
                  } catch (parseError) {
                    console.warn(
                      "[STREAM] 解析流式数据失败:",
                      parseError,
                      line,
                    );
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // 保存对话到数据库（后台异步，不阻塞主流程）
          (async () => {
            try {
              const messages = [...get().messages];
              const conversationId = get().conversationId;

              const saveResponse = await fetch("/api/ai/conversations/save", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  conversationId,
                  title: conversationId
                    ? undefined
                    : (messages[0]?.content?.slice(0, 50) || "AI对话") + "...",
                  messages: messages.map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp:
                      msg.timestamp instanceof Date
                        ? msg.timestamp.toISOString()
                        : new Date(msg.timestamp).toISOString(),
                    metadata: msg.metadata,
                    toolsUsed: msg.toolCalls?.map((tool) => tool.tool) || [],
                  })),
                  context: {
                    userRole: get().userRole || "teacher",
                    organizationId: metadata.organizationId,
                    courseId: metadata.courseId,
                    classId: metadata.classId,
                  },
                }),
              });

              if (saveResponse.ok) {
                const saveData = await saveResponse.json();
                if (saveData.data?.conversationId) {
                  set({ conversationId: saveData.data.conversationId });
                }
              } else {
                // 保存失败但不阻断主流程
                const errorText = await saveResponse.text();
                console.warn("保存对话失败:", saveResponse.status, errorText);
              }
            } catch (saveError) {
              console.warn("保存对话异常:", saveError);
              // 不影响主流程
            }
          })();
        } catch (error) {
          console.error("发送消息失败:", error);
          setStreamingMessage(null);

          try {
            if (!hasStreamContent) {
              // 没有任何流式内容，通常意味着连接在生成早期就被关闭，切换到异步队列处理
              await startAsyncFallback();
              return;
            }

            // 已有部分内容，则保留部分结果并提示连接中断
            setError(error instanceof Error ? error.message : "发送消息失败");

            if (accumulatedContent && hasStreamContent) {
              // 如果已收到部分内容，保留现有消息并标记为部分完成
              set((state) => {
                // 优先使用当前AI消息ID，如果不存在则回退到最后一个assistant流式消息
                const targetId =
                  aiMessageId ||
                  state.messages
                    .slice()
                    .reverse()
                    .find(
                      (msg) =>
                        msg.role === "assistant" &&
                        (msg.metadata as any)?.isStreaming,
                    )?.id;

                if (!targetId) {
                  return state;
                }

                return {
                  messages: state.messages.map((msg) =>
                    msg.id === targetId
                      ? {
                          ...msg,
                          content:
                            accumulatedContent +
                            "\n\n（连接中断，已返回部分结果）",
                          metadata: {
                            ...msg.metadata,
                            isStreaming: false,
                            error:
                              error instanceof Error
                                ? error.message
                                : String(error),
                          },
                        }
                      : msg,
                  ),
                };
              });
            } else {
              // 完全失败才追加系统错误
              addMessage({
                role: "system",
                content: "抱歉，发送消息时出现错误。请稍后重试。",
              });
            }
          } catch (updateError) {
            console.warn("更新流式失败消息时出错:", updateError);
          }

          setLoading(false);
        }
      },

      // 工作流操作
      startWorkflow: (type, data = {}) => {
        const workflow: WorkflowState = {
          id: `workflow_${Date.now()}`,
          type,
          status: "running",
          progress: 0,
          currentStep: "初始化",
          totalSteps: 1,
          data,
          startTime: new Date(),
        };

        set({ workflow });
      },

      updateWorkflow: (updates) => {
        set((state) => ({
          workflow: state.workflow ? { ...state.workflow, ...updates } : null,
        }));
      },

      completeWorkflow: () => {
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                status: "completed",
                progress: 100,
                endTime: new Date(),
              }
            : null,
        }));
      },

      cancelWorkflow: () => {
        set({ workflow: null });
      },

      // 工具操作
      callTool: async (toolName, args) => {
        const { addMessage, updateWorkflow, setError } = get();

        try {
          setError(null);

          // 更新工作流进度
          updateWorkflow({
            currentStep: `调用工具: ${toolName}`,
            progress: Math.min(100, (get().workflow?.progress || 0) + 10),
          });

          // 调用工具API
          const response = await fetch("/api/ai/tools/call", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              toolName,
              args,
              sessionId: get().currentSessionId,
            }),
          });

          if (!response.ok) {
            throw new Error(`工具调用失败: ${response.status}`);
          }

          const data = await response.json();

          // 添加工具执行结果消息
          addMessage({
            role: "system",
            content: `工具 "${toolName}" 执行完成`,
            toolCalls: [
              {
                tool: toolName,
                args,
                result: data.result,
                status: "completed",
              },
            ],
          });

          return data.result;
        } catch (error) {
          console.error("工具调用失败:", error);
          setError(error instanceof Error ? error.message : "工具调用失败");

          // 添加错误消息
          addMessage({
            role: "system",
            content: `工具 "${toolName}" 执行失败`,
            toolCalls: [
              {
                tool: toolName,
                args,
                status: "error",
                error: error instanceof Error ? error.message : "未知错误",
              },
            ],
          });
        }
      },

      updateToolCall: (toolCallId, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) => ({
            ...msg,
            toolCalls: msg.toolCalls?.map((call, index) =>
              index.toString() === toolCallId ? { ...call, ...updates } : call,
            ),
          })),
        }));
      },

      getAvailableTools: (userRole = "teacher") => {
        const { tools } = get();

        if (userRole === "teacher") {
          return tools; // 教师可以使用所有工具
        } else if (userRole === "student") {
          return tools.filter((tool) =>
            [
              "analyze_progress",
              "personalize_path",
              "generate_report",
              "generate_feedback",
            ].includes(tool.id),
          );
        } else {
          return tools.filter((tool) =>
            ["personalize_path", "generate_report"].includes(tool.id),
          );
        }
      },

      // Outline generation specific implementations
      generateOutline: async (requirements, options = {}) => {
        const { addMessage, updateWorkflow, setError } = get();

        try {
          setError(null);

          // Start outline generation workflow
          get().startWorkflow("outline_generation", {
            requirements,
            ...options,
          });

          // Update progress
          get().updateOutlineProgress("analyzing", 20);

          // Call outline generation tool
          const result = await get().callTool("generate_outline", {
            requirements,
            class_id: options.classId,
            save_to_class: options.saveToClass || false,
          });

          // Update progress to completion
          get().updateOutlineProgress("finalizing", 100);
          get().completeWorkflow();

          // Add success message
          addMessage({
            role: "system",
            content: "大纲生成完成！您可以查看和编辑生成的大纲。",
            toolCalls: [
              {
                tool: "generate_outline",
                args: { requirements },
                result,
                status: "completed",
              },
            ],
          });

          return result;
        } catch (error) {
          console.error("Outline generation failed:", error);
          setError(
            error instanceof Error
              ? error.message
              : "Outline generation failed",
          );

          addMessage({
            role: "system",
            content: "大纲生成失败，请重试。",
            toolCalls: [
              {
                tool: "generate_outline",
                args: { requirements },
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            ],
          });
        }
      },

      updateOutlineProgress: (step, progress) => {
        get().updateWorkflow({
          currentStep: step,
          progress: Math.min(100, Math.max(0, progress)),
        });
      },

      saveOutline: async (outlineData) => {
        const { addMessage } = get();

        try {
          // This would typically save to the backend
          addMessage({
            role: "system",
            content: `大纲已保存到${outlineData.class_id ? "班级" : "本地"}。`,
          });

          return outlineData;
        } catch (error) {
          console.error("Save outline failed:", error);
          throw error;
        }
      },

      loadOutlineFromClass: async (classId) => {
        const { addMessage, setError } = get();

        try {
          setError(null);

          // This would typically load from the backend
          const response = await fetch(`/api/ai/outline/${classId}`);

          if (!response.ok) {
            throw new Error("Failed to load outline");
          }

          const outlineData = await response.json();

          addMessage({
            role: "system",
            content: "已加载班级大纲。",
          });

          return outlineData;
        } catch (error) {
          console.error("Load outline failed:", error);
          setError(
            error instanceof Error ? error.message : "Failed to load outline",
          );

          addMessage({
            role: "system",
            content: "加载大纲失败。",
          });

          throw error;
        }
      },

      // A2A会话生成实现
      startA2ASession: async (config) => {
        const { addMessage, updateWorkflow, setError, setLoading } = get();

        try {
          setLoading(true);
          setError(null);

          // 启动A2A工作流
          get().startWorkflow("a2a_session", config);

          // 调用A2A会话生成API
          const response = await fetch("/api/ai/session/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              session_id: config.sessionId,
              max_iterations: config.iterations || 3,
              requirements: config,
            }),
          });

          if (!response.ok) {
            throw new Error(`A2A会话启动失败: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            // 添加成功消息
            addMessage({
              role: "system",
              content: `A2A会话生成已开始，共${config.iterations || 3}轮迭代。`,
              toolCalls: [
                {
                  tool: "a2a_session_generation",
                  args: config,
                  result: data.generation,
                  status: "completed",
                },
              ],
            });

            // 开始轮询状态
            const unsubscribe = useChatbotStore.subscribe(
              (state) => state.workflow,
              (workflow) => {
                if (
                  workflow?.status === "completed" ||
                  workflow?.status === "failed"
                ) {
                  unsubscribe();
                }
              },
            );

            // 启动轮询
            pollA2AStatus(data.generation.id, get, set);
          } else {
            throw new Error(data.error || "A2A会话生成失败");
          }
        } catch (error) {
          console.error("A2A会话启动失败:", error);
          setError(error instanceof Error ? error.message : "A2A会话启动失败");

          addMessage({
            role: "system",
            content: "A2A会话启动失败，请重试。",
            toolCalls: [
              {
                tool: "a2a_session_generation",
                args: config,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              },
            ],
          });
        } finally {
          setLoading(false);
        }
      },

      updateA2AProgress: (step, progress, agent) => {
        get().updateWorkflow({
          currentStep: step,
          progress: Math.min(100, Math.max(0, progress)),
          data: {
            ...get().workflow?.data,
            currentAgent: agent,
            currentStep: step,
          },
        });
      },

      getA2ASessionStatus: async (sessionId) => {
        try {
          const response = await fetch(
            `/api/ai/session/generate?session_id=${sessionId}`,
          );

          if (!response.ok) {
            throw new Error(`获取A2A状态失败: ${response.status}`);
          }

          const data = await response.json();
          return data.generation;
        } catch (error) {
          console.error("获取A2A状态失败:", error);
          throw error;
        }
      },

      cancelA2ASession: () => {
        get().cancelWorkflow();
        get().addMessage({
          role: "system",
          content: "A2A会话已取消。",
        });
      },

      // 工具方法
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      setConversationId: (conversationId) => set({ conversationId }),
      setStreamingMessage: (message) => set({ streamingMessage: message }),

      // 重置状态
      reset: () =>
        set({
          messages: [],
          workflow: null,
          isLoading: false,
          error: null,
          currentSessionId: null,
          streamingMessage: null,
          userRole: "teacher",
          conversationId: null,
        }),
    }),
    {
      name: "chatbot-store",
      partialize: (state) => ({
        messages: state.messages.slice(-50), // 只保存最近50条消息
        currentSessionId: state.currentSessionId,
        userRole: state.userRole,
        conversationId: state.conversationId,
      }),
    },
  ),
);

export default useChatbotStore;
