import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 消息类型定义
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  metadata?: {
    sessionId?: string;
    userRole?: 'teacher' | 'student' | 'self-learner';
    classId?: string;
    courseId?: string;
  };
}

// 工具调用类型定义
export interface ToolCall {
  tool: string;
  args: any;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

// 工作流状态类型定义
export interface WorkflowState {
  id: string;
  type: 'outline_generation' | 'a2a_session' | 'course_editing' | 'general_chat';
  status: 'idle' | 'running' | 'completed' | 'error';
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
  category: 'course' | 'discussion' | 'assessment' | 'progress' | 'communication' | 'analysis' | 'workflow';
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

  // 操作方法
  sendMessage: (content: string, metadata?: any) => Promise<void>;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  // 工作流操作
  startWorkflow: (type: WorkflowState['type'], data?: any) => void;
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
  updateA2AProgress: (step: string, progress: number, agent?: 'teacher' | 'student') => void;
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
const pollA2AStatus = async (generationId: string, getState: any, setState: any) => {
  const poll = async () => {
    try {
      const response = await fetch(`/api/ai/session/generate?id=${generationId}`);
      if (!response.ok) return;

      const data = await response.json();
      const generation = data.generation;

      if (!generation) return;

      // 更新工作流进度
      const progress = (generation.current_iteration / generation.max_iterations) * 100;
      setState((state: any) => ({
        workflow: state.workflow ? {
          ...state.workflow,
          progress,
          data: {
            ...state.workflow.data,
            currentIteration: generation.current_iteration,
            builderFeedback: generation.builder_feedback,
            criticFeedback: generation.critic_feedback,
            status: generation.status,
          },
        } : null,
      }));

      // 如果完成，停止轮询
      if (generation.status === 'completed' || generation.status === 'failed') {
        // 添加完成消息
        const { addMessage } = getState();
        addMessage({
          role: 'system',
          content: generation.status === 'completed'
            ? `A2A会话生成完成！共进行了${generation.current_iteration}轮迭代。`
            : `A2A会话生成失败：${generation.error_message}`,
        });
        return;
      }

      // 继续轮询
      setTimeout(poll, 2000); // 每2秒轮询一次
    } catch (error) {
      console.error('A2A状态轮询失败:', error);
    }
  };

  poll();
};

// 默认AI工具配置
const DEFAULT_TOOLS: AITool[] = [
  // 课程管理工具
  { id: 'generate_course', name: '生成课程', description: '基于大纲自动生成完整课程内容', icon: null, category: 'course' },
  { id: 'edit_chapter', name: '编辑章节', description: '智能编辑和优化课程章节内容', icon: null, category: 'course' },
  { id: 'create_assessment', name: '创建评估', description: '自动生成课程评估和练习题', icon: null, category: 'assessment' },

  // 讨论管理工具
  { id: 'create_discussion', name: '创建讨论', description: '智能创建讨论话题和引导问题', icon: null, category: 'discussion' },
  { id: 'moderate_thread', name: '管理讨论', description: '智能管理讨论线程和回复', icon: null, category: 'communication' },
  { id: 'generate_insights', name: '生成洞察', description: '分析讨论内容并生成见解', icon: null, category: 'analysis' },

  // 学习分析工具
  { id: 'analyze_progress', name: '分析进度', description: '分析学习进度并提供建议', icon: null, category: 'progress' },
  { id: 'personalize_path', name: '个性化路径', description: '为学生定制学习路径', icon: null, category: 'progress' },
  { id: 'generate_report', name: '生成报告', description: '生成学习分析报告', icon: null, category: 'analysis' },

  // 沟通工具
  { id: 'send_notification', name: '发送通知', description: '智能通知学生和教师', icon: null, category: 'communication' },
  { id: 'schedule_meeting', name: '安排会议', description: '智能安排师生会议时间', icon: null, category: 'communication' },
  { id: 'send_message', name: '发送消息', description: '批量发送个性化消息', icon: null, category: 'communication' },

  // 评估工具
  { id: 'grade_assignment', name: '评分作业', description: '智能评分和反馈', icon: null, category: 'assessment' },
  { id: 'generate_feedback', name: '生成反馈', description: '为学习者生成个性化反馈', icon: null, category: 'assessment' },
  { id: 'optimize_content', name: '优化内容', description: '优化课程内容以提高效果', icon: null, category: 'analysis' },

  // 工作流工具
  { id: 'outline_generator', name: '大纲生成器', description: '生成课程大纲和学习计划', icon: null, category: 'workflow', requiresContext: true },
  { id: 'a2a_session', name: 'A2A会话生成', description: '启动Agent-to-Agent内容优化', icon: null, category: 'workflow', maxIterations: 5 },
  { id: 'workflow_manager', name: '工作流管理', description: '管理和监控工作流进度', icon: null, category: 'workflow' },
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

      // 消息操作
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
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

      // 发送消息
      sendMessage: async (content, metadata = {}) => {
        const { addMessage, setLoading, setError } = get();

        try {
          setLoading(true);
          setError(null);

          // 添加用户消息
          addMessage({
            role: 'user',
            content,
            metadata,
          });

          // 调用AI API
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [...get().messages, {
                role: 'user',
                content,
                metadata,
              }],
              sessionId: get().currentSessionId,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // 添加AI响应消息
          addMessage({
            role: 'assistant',
            content: data.content,
            metadata: {
              ...metadata,
              sessionId: data.sessionId,
            },
            toolCalls: data.toolCalls,
          });

          // 更新会话ID
          if (data.sessionId) {
            get().setSessionId(data.sessionId);
          }

        } catch (error) {
          console.error('发送消息失败:', error);
          setError(error instanceof Error ? error.message : '发送消息失败');

          // 添加错误消息
          addMessage({
            role: 'system',
            content: '抱歉，发送消息时出现错误。请稍后重试。',
          });
        } finally {
          setLoading(false);
        }
      },

      // 工作流操作
      startWorkflow: (type, data = {}) => {
        const workflow: WorkflowState = {
          id: `workflow_${Date.now()}`,
          type,
          status: 'running',
          progress: 0,
          currentStep: '初始化',
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
          workflow: state.workflow ? {
            ...state.workflow,
            status: 'completed',
            progress: 100,
            endTime: new Date(),
          } : null,
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
          const response = await fetch('/api/ai/tools/call', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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
            role: 'system',
            content: `工具 "${toolName}" 执行完成`,
            toolCalls: [{
              tool: toolName,
              args,
              result: data.result,
              status: 'completed',
            }],
          });

          return data.result;

        } catch (error) {
          console.error('工具调用失败:', error);
          setError(error instanceof Error ? error.message : '工具调用失败');

          // 添加错误消息
          addMessage({
            role: 'system',
            content: `工具 "${toolName}" 执行失败`,
            toolCalls: [{
              tool: toolName,
              args,
              status: 'error',
              error: error instanceof Error ? error.message : '未知错误',
            }],
          });
        }
      },

      updateToolCall: (toolCallId, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) => ({
            ...msg,
            toolCalls: msg.toolCalls?.map((call, index) =>
              index.toString() === toolCallId ? { ...call, ...updates } : call
            ),
          })),
        }));
      },

      getAvailableTools: (userRole = 'teacher') => {
        const { tools } = get();

        if (userRole === 'teacher') {
          return tools; // 教师可以使用所有工具
        } else if (userRole === 'student') {
          return tools.filter(tool =>
            ['analyze_progress', 'personalize_path', 'generate_report', 'generate_feedback'].includes(tool.id)
          );
        } else {
          return tools.filter(tool =>
            ['personalize_path', 'generate_report'].includes(tool.id)
          );
        }
      },

      // Outline generation specific implementations
      generateOutline: async (requirements, options = {}) => {
        const { addMessage, updateWorkflow, setError } = get();

        try {
          setError(null);

          // Start outline generation workflow
          get().startWorkflow('outline_generation', { requirements, ...options });

          // Update progress
          get().updateOutlineProgress('analyzing', 20);

          // Call outline generation tool
          const result = await get().callTool('generate_outline', {
            requirements,
            class_id: options.classId,
            save_to_class: options.saveToClass || false
          });

          // Update progress to completion
          get().updateOutlineProgress('finalizing', 100);
          get().completeWorkflow();

          // Add success message
          addMessage({
            role: 'system',
            content: '大纲生成完成！您可以查看和编辑生成的大纲。',
            toolCalls: [{
              tool: 'generate_outline',
              args: { requirements },
              result,
              status: 'completed',
            }],
          });

          return result;

        } catch (error) {
          console.error('Outline generation failed:', error);
          setError(error instanceof Error ? error.message : 'Outline generation failed');

          addMessage({
            role: 'system',
            content: '大纲生成失败，请重试。',
            toolCalls: [{
              tool: 'generate_outline',
              args: { requirements },
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }],
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
            role: 'system',
            content: `大纲已保存到${outlineData.class_id ? '班级' : '本地'}。`,
          });

          return outlineData;
        } catch (error) {
          console.error('Save outline failed:', error);
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
            throw new Error('Failed to load outline');
          }

          const outlineData = await response.json();

          addMessage({
            role: 'system',
            content: '已加载班级大纲。',
          });

          return outlineData;
        } catch (error) {
          console.error('Load outline failed:', error);
          setError(error instanceof Error ? error.message : 'Failed to load outline');

          addMessage({
            role: 'system',
            content: '加载大纲失败。',
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
          get().startWorkflow('a2a_session', config);

          // 调用A2A会话生成API
          const response = await fetch('/api/ai/session/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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
              role: 'system',
              content: `A2A会话生成已开始，共${config.iterations || 3}轮迭代。`,
              toolCalls: [{
                tool: 'a2a_session_generation',
                args: config,
                result: data.generation,
                status: 'completed',
              }],
            });

            // 开始轮询状态
            const unsubscribe = useChatbotStore.subscribe(
              (state) => state.workflow,
              (workflow) => {
                if (workflow?.status === 'completed' || workflow?.status === 'failed') {
                  unsubscribe();
                }
              }
            );

            // 启动轮询
            pollA2AStatus(data.generation.id, get, set);
          } else {
            throw new Error(data.error || 'A2A会话生成失败');
          }

        } catch (error) {
          console.error('A2A会话启动失败:', error);
          setError(error instanceof Error ? error.message : 'A2A会话启动失败');

          addMessage({
            role: 'system',
            content: 'A2A会话启动失败，请重试。',
            toolCalls: [{
              tool: 'a2a_session_generation',
              args: config,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }],
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
          const response = await fetch(`/api/ai/session/generate?session_id=${sessionId}`);

          if (!response.ok) {
            throw new Error(`获取A2A状态失败: ${response.status}`);
          }

          const data = await response.json();
          return data.generation;
        } catch (error) {
          console.error('获取A2A状态失败:', error);
          throw error;
        }
      },

      cancelA2ASession: () => {
        get().cancelWorkflow();
        get().addMessage({
          role: 'system',
          content: 'A2A会话已取消。',
        });
      },

      // 工具方法
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      setStreamingMessage: (message) => set({ streamingMessage: message }),

      // 重置状态
      reset: () => set({
        messages: [],
        workflow: null,
        isLoading: false,
        error: null,
        currentSessionId: null,
        streamingMessage: null,
      }),
    }),
    {
      name: 'chatbot-store',
      partialize: (state) => ({
        messages: state.messages.slice(-50), // 只保存最近50条消息
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);

export default useChatbotStore;