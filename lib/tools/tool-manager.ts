import { type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1'
const MODEL_NAME = 'meituan/longcat-flash-chat'

export interface ToolDefinition {
  id: string
  toolName: string
  toolDescription: string
  toolCategory: string
  toolSchema: any
  enabled: boolean
  usageCount: number
}

export interface ToolExecutionContext {
  userId: string
  conversationStateId?: string
  sessionId?: string
}

export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: string
  executionTimeMs: number
}

export interface ToolExecutor {
  execute(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult>
}

/**
 * 工具管理器类
 * 负责工具的注册、验证和执行
 */
export class ToolManager {
  private supabase: SupabaseClient
  private tools: Map<string, ToolExecutor> = new Map()

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient()
    this.initializeDefaultTools()
  }

  /**
   * 初始化默认工具
   */
  private initializeDefaultTools(): void {
    this.registerTool('generate_outline', {
      execute: async (params, context, supabase) => {
        return await this.executeGenerateOutline(params, context, supabase)
      }
    })

    this.registerTool('create_session', {
      execute: async (params, context, supabase) => {
        return await this.executeCreateSession(params, context, supabase)
      }
    })

    this.registerTool('a2a_session_generation', {
      execute: async (params, context, supabase) => {
        return await this.executeA2ASessionGeneration(params, context, supabase)
      }
    })

    this.registerTool('generate_quiz', {
      execute: async (params, context, supabase) => {
        return await this.executeGenerateQuiz(params, context, supabase)
      }
    })

    this.registerTool('generate_writing_assignment', {
      execute: async (params, context, supabase) => {
        return await this.executeGenerateWritingAssignment(params, context, supabase)
      }
    })

    this.registerTool('generate_research_assignment', {
      execute: async (params, context, supabase) => {
        return await this.executeGenerateResearchAssignment(params, context, supabase)
      }
    })
  }

  /**
   * 注册工具
   */
  registerTool(name: string, executor: ToolExecutor): void {
    this.tools.set(name, executor)
  }

  /**
   * 执行工具
   */
  async executeTool(
    toolName: string,
    parameters: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
      // 获取工具定义
      const { data: toolDef, error: fetchError } = await this.supabase
        .from('ai_tools_registry')
        .select('*')
        .eq('tool_name', toolName)
        .eq('enabled', true)
        .single()

      if (fetchError || !toolDef) {
        return {
          success: false,
          error: `Tool '${toolName}' not found or disabled`,
          executionTimeMs: Date.now() - startTime
        }
      }

      // 验证参数
      const validationResult = this.validateParameters(parameters, toolDef.tool_schema)
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Parameter validation failed: ${validationResult.errors?.join(', ')}`,
          executionTimeMs: Date.now() - startTime
        }
      }

      // 获取执行器
      const executor = this.tools.get(toolName)
      if (!executor) {
        return {
          success: false,
          error: `No executor found for tool '${toolName}'`,
          executionTimeMs: Date.now() - startTime
        }
      }

      // 记录工具调用
      await this.logToolCall(toolName, parameters, context)

      // 执行工具
      const result = await executor.execute(parameters, context, this.supabase)

      // 更新使用计数
      await this.updateUsageCount(toolName)

      return result

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * 验证参数
   */
  private validateParameters(parameters: any, schema: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = []

    // 基本类型检查
    if (typeof parameters !== 'object' || parameters === null) {
      return { isValid: false, errors: ['Parameters must be an object'] }
    }

    // 检查必需参数
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredField of schema.required) {
        if (!(requiredField in parameters)) {
          errors.push(`Missing required field: ${requiredField}`)
        }
      }
    }

    // 类型检查
    if (schema.properties) {
      for (const [field, definition] of Object.entries(schema.properties)) {
        if (field in parameters) {
          const paramValue = parameters[field]
          const def = definition as any

          if (def.type === 'string' && typeof paramValue !== 'string') {
            errors.push(`${field} must be a string`)
          } else if (def.type === 'number' && typeof paramValue !== 'number') {
            errors.push(`${field} must be a number`)
          } else if (def.type === 'array' && !Array.isArray(paramValue)) {
            errors.push(`${field} must be an array`)
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * 记录工具调用
   */
  private async logToolCall(
    toolName: string,
    parameters: any,
    context: ToolExecutionContext
  ): Promise<void> {
    try {
      // 这里可以扩展为更详细的日志记录
      console.log(`Tool call: ${toolName}`, { parameters, context })
    } catch (error) {
      console.error('Failed to log tool call:', error)
    }
  }

  /**
   * 更新使用计数
   */
  private async updateUsageCount(toolName: string): Promise<void> {
    try {
      await this.supabase
        .from('ai_tools_registry')
        .update({ usage_count: 'usage_count + 1' })
        .eq('tool_name', toolName)
    } catch (error) {
      console.error('Failed to update usage count:', error)
    }
  }

  /**
   * 生成课程大纲
   */
  private async executeGenerateOutline(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { courseTitle, courseDescription, sessionCount, sessionTopics } = parameters

      // 调用AI生成大纲
      const openai = createOpenAI({
        apiKey: process.env.VERCEL_GATEWAY_KEY!,
        baseURL: GATEWAY_BASE_URL
      })

      const prompt = `
        为课程"${courseTitle}"生成详细的大纲。

        课程描述: ${courseDescription}
        课程节数: ${sessionCount}
        节次主题: ${sessionTopics.join(', ')}

        请生成一个详细的课程大纲，包含每个节次的标题、学习目标、主要内容点和作业建议。
        以JSON格式返回结果。
      `

      const { text } = await generateText({
        model: openai.chat(MODEL_NAME),
        prompt,
        temperature: 0.7
      })

      // 解析AI返回的JSON
      let outline
      try {
        outline = JSON.parse(text)
      } catch {
        outline = { outline: text, raw: true }
      }

      return {
        success: true,
        data: {
          courseTitle,
          sessionCount,
          outline,
          generatedAt: new Date().toISOString()
        },
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }

  /**
   * 创建课程节次
   */
  private async executeCreateSession(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { classId, sessionTitle, sessionDate, sessionTime, duration } = parameters

      // 创建课程节次记录
      const { data, error } = await supabase
        .from('chapters')
        .insert({
          class_id: classId,
          title: sessionTitle,
          scheduled_date: sessionDate,
          scheduled_time: sessionTime,
          duration_minutes: duration,
          status: 'scheduled'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`)
      }

      return {
        success: true,
        data,
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }

  /**
   * A2A课程内容生成
   */
  private async executeA2ASessionGeneration(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { sessionId, outline, iteration } = parameters

      // 这里实现A2A生成逻辑
      // 暂时返回模拟结果
      const result = {
        sessionId,
        outline,
        iteration,
        content: `Generated content for iteration ${iteration}`,
        generatedAt: new Date().toISOString()
      }

      // 记录到数据库
      await supabase
        .from('a2a_session_generations')
        .insert({
          session_id: sessionId,
          outline,
          iteration_number: iteration,
          generated_content: result.content,
          status: 'completed'
        })

      return {
        success: true,
        data: result,
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }

  /**
   * 生成测验
   */
  private async executeGenerateQuiz(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { assignmentId, questionCount, difficulty } = parameters

      // 模拟生成测验
      const questions = []
      for (let i = 0; i < questionCount; i++) {
        questions.push({
          id: `${assignmentId}_q${i + 1}`,
          question: `Sample question ${i + 1}`,
          type: 'multiple_choice',
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          difficulty
        })
      }

      const quiz = {
        assignmentId,
        questions,
        difficulty,
        generatedAt: new Date().toISOString()
      }

      return {
        success: true,
        data: quiz,
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }

  /**
   * 生成写作作业
   */
  private async executeGenerateWritingAssignment(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { assignmentId, topic, wordCount } = parameters

      const assignment = {
        assignmentId,
        topic,
        wordCount,
        type: 'writing',
        instructions: `请就"${topic}"写一篇文章，字数不少于${wordCount}字。`,
        generatedAt: new Date().toISOString()
      }

      return {
        success: true,
        data: assignment,
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }

  /**
   * 生成研究作业
   */
  private async executeGenerateResearchAssignment(
    parameters: any,
    context: ToolExecutionContext,
    supabase: SupabaseClient
  ): Promise<ToolExecutionResult> {
    try {
      const { assignmentId, researchTopic, resources } = parameters

      const assignment = {
        assignmentId,
        researchTopic,
        resources,
        type: 'research',
        instructions: `请就"${researchTopic}"进行深入研究，并提供相关资料和参考资料。`,
        generatedAt: new Date().toISOString()
      }

      return {
        success: true,
        data: assignment,
        executionTimeMs: 0
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: 0
      }
    }
  }
}

/**
 * 创建工具管理器实例的工厂函数
 */
export function createToolManager(supabase?: SupabaseClient): ToolManager {
  return new ToolManager(supabase)
}