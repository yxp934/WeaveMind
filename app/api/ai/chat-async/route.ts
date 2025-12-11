import { NextRequest, NextResponse } from 'next/server'
import { enqueueChatJob } from '@/lib/queue/chat-queue'
import { chatJobStore } from '@/lib/store/chat-job-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, context, stream } = body

    // 验证必需字段
    if (!message || !context?.userRole) {
      return NextResponse.json(
        { error: 'Missing required fields: message, context.userRole' },
        { status: 400 }
      )
    }

    // 生成任务ID
    const jobId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 创建任务状态
    chatJobStore.create(jobId)

    // 提交到队列
    await enqueueChatJob({
      jobId,
      message,
      context,
    })

    // 更新状态为处理中
    chatJobStore.update(jobId, { status: 'processing' })

    console.log(`[Chat Async] 任务已提交: ${jobId}`)

    // 返回任务ID和状态端点
    return NextResponse.json({
      success: true,
      data: {
        jobId,
        statusUrl: `/api/ai/chat-status/${jobId}`,
        status: 'processing',
      }
    })

  } catch (error) {
    console.error('[Chat Async] API错误:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
