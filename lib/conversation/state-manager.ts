import { createClient } from '@/lib/supabase/server'
import { type SupabaseClient } from '@supabase/supabase-js'

export interface ConversationState {
  id: string
  userId: string
  sessionId: string
  workflowType: string
  currentStep: number
  collectedData: Record<string, any>
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    toolCalls?: ToolCall[]
  }>
  status: 'active' | 'completed' | 'paused' | 'error' | 'cancelled'
  errorMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ToolCall {
  id: string
  name: string
  parameters: any
  result?: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  timestamp?: string
}

export interface WorkflowStep {
  stepNumber: number
  type: 'question' | 'confirmation' | 'generation' | 'validation' | 'tool_execution'
  prompt: string
  validation?: any
  options?: string[]
  nextStep?: number | string
}

export interface StateManager {
  createState(userId: string, workflowType: string, sessionId?: string): Promise<ConversationState>
  getState(sessionId: string): Promise<ConversationState | null>
  updateState(sessionId: string, updates: Partial<ConversationState>): Promise<void>
  addMessage(sessionId: string, message: ConversationMessage): Promise<void>
  markComplete(sessionId: string): Promise<void>
  pause(sessionId: string): Promise<void>
  resume(sessionId: string): Promise<void>
  cleanup(sessionId: string): Promise<void>
  getWorkflowSteps(workflowType: string): Promise<WorkflowStep[]>
  getCurrentStep(sessionId: string): Promise<WorkflowStep | null>
  validateInput(sessionId: string, userInput: string): Promise<{ isValid: boolean; errors?: string[] }>
  moveToNextStep(sessionId: string, userInput: string): Promise<{ nextStep: number | null; isComplete: boolean }>
}

/**
 * 创建StateManager实例的工厂函数
 * 这个函数应该在API路由内部调用，而不是在模块级别
 */
export function createStateManager(supabaseClient?: SupabaseClient): StateManager {
  const supabase = supabaseClient || createClient()

  return {
    /**
     * 创建新的对话状态
     */
    async createState(userId: string, workflowType: string, sessionId?: string): Promise<ConversationState> {
      const actualSessionId = sessionId || generateSessionId()

      const { data, error } = await supabase
        .from('conversation_states')
        .insert({
          user_id: userId,
          session_id: actualSessionId,
          workflow_type: workflowType,
          current_step: 0,
          collected_data: {},
          conversation_history: [],
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create conversation state: ${error.message}`)
      }

      return mapDbToState(data)
    },

    /**
     * 获取对话状态
     */
    async getState(sessionId: string): Promise<ConversationState | null> {
      const { data, error } = await supabase
        .from('conversation_states')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No rows found
        }
        throw new Error(`Failed to get conversation state: ${error.message}`)
      }

      return mapDbToState(data)
    },

    /**
     * 更新对话状态
     */
    async updateState(sessionId: string, updates: Partial<ConversationState>): Promise<void> {
      const updateData: any = {}

      if (updates.currentStep !== undefined) {
        updateData.current_step = updates.currentStep
      }
      if (updates.collectedData !== undefined) {
        updateData.collected_data = updates.collectedData
      }
      if (updates.conversationHistory !== undefined) {
        updateData.conversation_history = updates.conversationHistory
      }
      if (updates.status !== undefined) {
        updateData.status = updates.status
        if (updates.status === 'completed') {
          updateData.completed_at = new Date().toISOString()
        }
      }
      if (updates.errorMessage !== undefined) {
        updateData.error_message = updates.errorMessage
      }

      const { error } = await supabase
        .from('conversation_states')
        .update(updateData)
        .eq('session_id', sessionId)

      if (error) {
        throw new Error(`Failed to update conversation state: ${error.message}`)
      }
    },

    /**
     * 添加消息到对话历史
     */
    async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
      const state = await this.getState(sessionId)
      if (!state) {
        throw new Error(`Conversation state not found for session: ${sessionId}`)
      }

      const timestamp = message.timestamp || new Date().toISOString()
      const newMessage = {
        role: message.role,
        content: message.content,
        timestamp,
        toolCalls: message.toolCalls
      }

      const updatedHistory = [...state.conversationHistory, newMessage]

      await this.updateState(sessionId, {
        conversationHistory: updatedHistory
      })
    },

    /**
     * 标记对话完成
     */
    async markComplete(sessionId: string): Promise<void> {
      await this.updateState(sessionId, {
        status: 'completed'
      })
    },

    /**
     * 暂停对话
     */
    async pause(sessionId: string): Promise<void> {
      await this.updateState(sessionId, {
        status: 'paused'
      })
    },

    /**
     * 恢复对话
     */
    async resume(sessionId: string): Promise<void> {
      await this.updateState(sessionId, {
        status: 'active'
      })
    },

    /**
     * 清理对话状态
     */
    async cleanup(sessionId: string): Promise<void> {
      const { error } = await supabase
        .from('conversation_states')
        .delete()
        .eq('session_id', sessionId)

      if (error) {
        throw new Error(`Failed to cleanup conversation state: ${error.message}`)
      }
    },

    /**
     * 获取工作流步骤
     */
    async getWorkflowSteps(workflowType: string): Promise<WorkflowStep[]> {
      const { data, error } = await supabase
        .from('conversation_steps')
        .select('*')
        .eq('workflow_type', workflowType)
        .order('step_number')

      if (error) {
        throw new Error(`Failed to get workflow steps: ${error.message}`)
      }

      return data.map(step => ({
        stepNumber: step.step_number,
        type: step.step_type,
        prompt: step.prompt_template,
        validation: step.validation_rules,
        options: step.prompt_variables?.options,
        nextStep: step.next_step_conditions?.success
      }))
    },

    /**
     * 获取当前步骤信息
     */
    async getCurrentStep(sessionId: string): Promise<WorkflowStep | null> {
      const state = await this.getState(sessionId)
      if (!state) {
        return null
      }

      const steps = await this.getWorkflowSteps(state.workflowType)
      return steps.find(step => step.stepNumber === state.currentStep) || null
    },

    /**
     * 验证用户输入
     */
    async validateInput(sessionId: string, userInput: string): Promise<{ isValid: boolean; errors?: string[] }> {
      const currentStep = await this.getCurrentStep(sessionId)
      if (!currentStep) {
        return { isValid: false, errors: ['No current step found'] }
      }

      const validationRules = currentStep.validation || {}
      const errors: string[] = []

      // 检查最小长度
      if (validationRules.minLength && userInput.length < validationRules.minLength) {
        errors.push(`输入内容至少需要 ${validationRules.minLength} 个字符`)
      }

      // 检查选项验证
      if (validationRules.options && validationRules.options.length > 0) {
        const trimmedInput = userInput.trim().toUpperCase()
        if (!validationRules.options.includes(trimmedInput)) {
          errors.push(`请选择以下选项之一: ${validationRules.options.join(', ')}`)
        }
      }

      // 检查必填
      if (validationRules.required && (!userInput || userInput.trim().length === 0)) {
        errors.push('此字段为必填项')
      }

      // 检查日期格式
      if (validationRules.dateFormat === 'YYYY-MM-DD') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(userInput.trim())) {
          errors.push('请使用 YYYY-MM-DD 格式输入日期')
        } else {
          const date = new Date(userInput.trim())
          if (isNaN(date.getTime())) {
            errors.push('请输入有效的日期')
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      }
    },

    /**
     * 移动到下一步
     */
    async moveToNextStep(sessionId: string, userInput: string): Promise<{ nextStep: number | null; isComplete: boolean }> {
      const state = await this.getState(sessionId)
      if (!state) {
        throw new Error(`Conversation state not found for session: ${sessionId}`)
      }

      const currentStep = await this.getCurrentStep(sessionId)
      if (!currentStep) {
        throw new Error('No current step found')
      }

      // 更新收集的数据
      const updatedData = {
        ...state.collectedData,
        [`step_${state.currentStep}`]: userInput
      }

      // 确定下一步
      let nextStep: number | null = null
      let isComplete = false

      if (typeof currentStep.nextStep === 'string' && currentStep.nextStep === 'complete') {
        isComplete = true
        nextStep = null
      } else if (typeof currentStep.nextStep === 'number') {
        nextStep = currentStep.nextStep
      } else {
        // 默认下一步是当前步骤+1
        nextStep = state.currentStep + 1
      }

      // 更新状态
      await this.updateState(sessionId, {
        currentStep: nextStep || state.currentStep,
        collectedData: updatedData,
        status: isComplete ? 'completed' : 'active'
      })

      return { nextStep, isComplete }
    }
  }
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 映射数据库记录到状态对象
 */
function mapDbToState(dbRecord: any): ConversationState {
  return {
    id: dbRecord.id,
    userId: dbRecord.user_id,
    sessionId: dbRecord.session_id,
    workflowType: dbRecord.workflow_type,
    currentStep: dbRecord.current_step,
    collectedData: dbRecord.collected_data || {},
    conversationHistory: dbRecord.conversation_history || [],
    status: dbRecord.status,
    errorMessage: dbRecord.error_message,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    completedAt: dbRecord.completed_at
  }
}