import { ChatJobData } from "@/lib/queue/chat-queue";
import { generateText } from "ai";
import {
  createGatewayOpenAI,
  DEFAULT_MODEL,
} from "@/lib/ai/langgraph/config/openai-gateway";
import { chatJobStore } from "@/lib/store/chat-job-store";

export interface ChatJobResult {
  success: boolean;
  message: string;
  metadata?: {
    sessionId?: string;
    toolsUsed?: string[];
  };
  error?: string;
}

const CHAT_MEMORY_LIMIT = 10; // 只保留最近10轮对话历史

export async function processChatJob(
  data: ChatJobData,
): Promise<ChatJobResult> {
  const { jobId, message, context } = data;

  try {
    // 标记任务为处理中
    chatJobStore.update(jobId, {
      status: "processing",
    });

    // 构建对话历史文本（限制长度）
    const recentHistory = context.conversationHistory
      .slice(-CHAT_MEMORY_LIMIT)
      .map(
        (msg) => `${msg.role === "user" ? "用户" : "AI助手"}: ${msg.content}`,
      )
      .join("\n");

    // 构建AI提示
    const prompt = `
你是一个专业的AI学习助手，名为WeaveMind。你需要与用户进行自然、友好的对话。

用户角色：${context.userRole}
当前时间：${new Date().toLocaleString("zh-CN")}

对话历史：
${recentHistory}

用户最新消息：${message}

请根据用户角色和对话历史，提供一个恰当的回复。你的回复应该：

1. **友好亲切**：使用温暖、友好的语调
2. **专业准确**：提供准确、实用的信息
3. **主动引导**：根据用户角色提供相关的建议和帮助
4. **简洁明了**：保持回复简洁但信息丰富

请直接回复用户，不需要包含"用户角色"或其他格式化的标签。
`;

    console.log(`[Chat Job ${jobId}] 开始处理AI调用...`);

    // 调用AI模型 - 使用更快的模型减少延迟
    const { text: aiResponse } = await generateText({
      model: createGatewayOpenAI().chat(DEFAULT_MODEL),
      prompt,
      maxTokens: 2000,
      temperature: 0.8,
    });

    console.log(
      `[Chat Job ${jobId}] AI响应完成，响应长度: ${aiResponse.length}`,
    );

    const result = {
      success: true,
      message: aiResponse,
      metadata: {
        sessionId: jobId,
      },
    };

    // 保存结果到store
    chatJobStore.update(jobId, {
      status: "completed",
      result: {
        message: aiResponse,
        metadata: {
          sessionId: jobId,
        },
      },
    });

    // 返回结果
    return result;
  } catch (error) {
    console.error(`[Chat Job ${jobId}] 处理失败:`, error);

    const errorResult = {
      success: false,
      message: "抱歉，我现在无法处理您的请求。请稍后重试。",
      error: error instanceof Error ? error.message : "未知错误",
    };

    // 保存错误到store
    chatJobStore.update(jobId, {
      status: "failed",
      error: errorResult.error,
    });

    return errorResult;
  }
}
