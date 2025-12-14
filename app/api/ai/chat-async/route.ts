import { NextRequest, NextResponse } from "next/server";
import { enqueueChatJob } from "@/lib/queue/chat-queue";
import { chatJobStore } from "@/lib/store/chat-job-store";

// 使用 Node.js runtime，便于访问 Redis/BullMQ 队列
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    // 验证必需字段（仅支持异步模式，不再直接流式）
    if (!message || !context?.userRole) {
      return NextResponse.json(
        { error: "Missing required fields: message, context.userRole" },
        { status: 400 },
      );
    }

    // 生成任务ID
    const jobId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建任务状态
    chatJobStore.create(jobId);

    console.log(`[Chat Async] 入队异步聊天任务: ${jobId}`);

    // 将任务推入 Redis/BullMQ 队列；如果未配置 Redis，则在当前进程中同步执行
    await enqueueChatJob({
      jobId,
      message,
      context: {
        courseId: context.courseId,
        classId: context.classId,
        organizationId: context.organizationId,
        userRole: context.userRole,
        conversationHistory: context.conversationHistory || [],
      },
    });

    // 返回任务已入队，让前端通过 /api/ai/chat-status/[jobId] 轮询结果
    return NextResponse.json(
      {
        success: true,
        data: {
          jobId,
          status: "queued",
        },
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[Chat Async] API错误:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
