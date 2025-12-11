import { NextRequest, NextResponse } from 'next/server'
import { chatJobStore } from '@/lib/store/chat-job-store'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

    // 获取任务状态
    const job = chatJobStore.get(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job
    })

  } catch (error) {
    console.error('[Chat Status] API错误:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
