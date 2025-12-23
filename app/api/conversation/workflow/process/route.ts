import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStateManager, type StateManager, type ConversationMessage } from '@/lib/conversation/state-manager'
import { generateText } from 'ai'
import { createGatewayOpenAI, DEFAULT_MODEL } from '@/lib/ai/langgraph/config/openai-gateway'

// 使用统一的 Gateway 配置
const openai = createGatewayOpenAI()

/**
 * 构建工作流对话系统提示词
 */
function buildWorkflowSystemPrompt(workflowType: string, currentStep: number, prompt: string): string {
  return `你是一个专业的AI教育助手，正在帮助用户完成${workflowType}工作流。

当前工作流: ${workflowType}
当前步骤: ${currentStep}

系统提示词：
${prompt}

CRITICAL GUIDELINES:
- 始终使用多项选择题格式（A, B, C, D）
- 每次只问一个问题
- 为每个问题提供3-4个清晰选项
- 在适当时包含"其他（请具体说明）"选项
- 保持鼓励性和简洁性
- 定期总结你所学到的信息

IMPORTANT:
- 如果用户输入不符合当前步骤的要求，请友好地提示并重新询问
- 不要跳过任何步骤
- 确保收集到所有必需的信息再继续下一步`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, userInput, workflowType } = body

    if (!sessionId || !userInput) {
      return NextResponse.json(
        { error: 'Session ID and user input are required' },
        { status: 400 }
      )
    }

    // 获取或创建对话状态
    let state = await stateManager.getState(sessionId)

    if (!state) {
      if (!workflowType) {
        return NextResponse.json(
          { error: 'Workflow type is required for new conversation' },
          { status: 400 }
        )
      }
      // 创建新的对话状态
      state = await stateManager.createState(user.id, workflowType, sessionId)
    }

    // 确保用户只能访问自己的对话状态
    if (state.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 验证用户输入
    const validation = await stateManager.validateInput(sessionId, userInput)
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        validationErrors: validation.errors
      }, { status: 400 })
    }

    // 添加用户消息到历史
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    }
    await stateManager.addMessage(sessionId, userMessage)

    // 获取当前步骤信息
    const currentStep = await stateManager.getCurrentStep(sessionId)

    if (!currentStep) {
      return NextResponse.json(
        { error: 'Current step not found' },
        { status: 400 }
      )
    }

    // 构建AI提示词
    const systemPrompt = buildWorkflowSystemPrompt(
      state.workflowType,
      state.currentStep,
      currentStep.prompt
    )

    // 添加对话历史上下文
    let contextPrompt = systemPrompt + '\n\n'

    // 添加已收集的数据作为上下文
    if (Object.keys(state.collectedData).length > 0) {
      contextPrompt += '已收集的信息:\n'
      Object.entries(state.collectedData).forEach(([key, value]) => {
        contextPrompt += `- ${key}: ${value}\n`
      })
      contextPrompt += '\n'
    }

    // 添加对话历史
    if (state.conversationHistory.length > 0) {
      contextPrompt += '对话历史:\n'
      state.conversationHistory.slice(-6).forEach(msg => { // 只取最近6条消息
        contextPrompt += `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}\n`
      })
      contextPrompt += '\n'
    }

    contextPrompt += `当前用户输入: ${userInput}\n\n请根据当前步骤的要求，生成合适的AI回复。`

    // 调用AI生成回复
    try {
      const openai = ensureGatewayClient()
      const { text } = await generateText({
        model: openai.chat(DEFAULT_MODEL),
        prompt: contextPrompt,
        temperature: 0.7,
      })

      // 添加AI回复到历史
      const aiMessage: ConversationMessage = {
        role: 'assistant',
        content: text.trim(),
        timestamp: new Date().toISOString()
      }
      await stateManager.addMessage(sessionId, aiMessage)

      // 移动到下一步
      const { nextStep, isComplete } = await stateManager.moveToNextStep(sessionId, userInput)

      // 如果完成，标记为完成状态
      if (isComplete) {
        await stateManager.markComplete(sessionId)
      }

      // 获取更新后的状态
      const updatedState = await stateManager.getState(sessionId)

      return NextResponse.json({
        success: true,
        response: text.trim(),
        state: updatedState,
        nextStep,
        isComplete
      })

    } catch (aiError: any) {
      console.error('AI generation error:', aiError)

      // 标记对话状态为错误
      await stateManager.updateState(sessionId, {
        status: 'error',
        errorMessage: `AI generation failed: ${aiError.message}`
      })

      return NextResponse.json(
        { error: 'AI generation failed', details: aiError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Workflow processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 获取当前工作流状态和步骤
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const stateManager = createStateManager(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const state = await stateManager.getState(sessionId)
    if (!state) {
      return NextResponse.json(
        { error: 'Conversation state not found' },
        { status: 404 }
      )
    }

    // 确保用户只能访问自己的对话状态
    if (state.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentStep = await stateManager.getCurrentStep(sessionId)
    const workflowSteps = await stateManager.getWorkflowSteps(state.workflowType)

    return NextResponse.json({
      state,
      currentStep,
      totalSteps: workflowSteps.length,
      progress: Math.round((state.currentStep / workflowSteps.length) * 100)
    })

  } catch (error: any) {
    console.error('Get workflow status error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}