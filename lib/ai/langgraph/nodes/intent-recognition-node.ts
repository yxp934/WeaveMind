import { StateGraph, END } from "@langchain/langgraph";
import { ChatbotState } from "../chatbot-state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { generateText } from "ai";
import { createGatewayOpenAI, DEFAULT_MODEL } from "../config/openai-gateway";
import { decode as decodeToon } from "@toon-format/toon";

// 初始化AI模型 - 使用Vercel AI Gateway
const openai = createGatewayOpenAI();

/**
 * 意图识别节点 - 纯AI模型驱动版本
 * 核心原则：完全基于AI模型能力进行意图识别，不使用任何硬编码关键词检测
 * 关键修复：使用messages格式传递完整对话历史，让模型理解上下文
 */
export async function intentRecognitionNode(
  state: ChatbotState,
): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state };
  }

  try {
    // 构建完整的对话历史作为messages格式（这是关键修复）
    const conversationMessages = state.messages.map((msg) => {
      if (msg instanceof HumanMessage) {
        return { role: "user" as const, content: msg.content.toString() };
      } else {
        return { role: "assistant" as const, content: msg.content.toString() };
      }
    });

    // 构建系统提示，让AI理解如何进行意图识别
    const systemPrompt = `你是WeaveMind的智能意图识别系统。你需要基于完整的对话历史理解用户的真实意图。

## 当前会话状态：
- 会话ID：${state.sessionId}
- 用户角色：${state.userRole}
- 当前工作流：${state.currentWorkflow ? `${state.currentWorkflow.type} (状态: ${state.currentWorkflow.status}, 步骤: ${state.currentWorkflow.step})` : "无"}
- 已收集的课程信息：${state.courseInfo ? JSON.stringify(state.courseInfo, null, 2) : "无"}
- 对话消息总数：${state.messages.length}

## 你的任务
基于完整的对话历史，判断用户当前的意图。这是一个教育AI平台，支持以下核心功能：

1. **course_creation** - 创建课程（用户想要创建新的教学课程）
2. **outline_generation** - 生成大纲（用户想要生成课程大纲）
3. **assignment_creation** - 创建作业（用户想要创建作业或测验）
4. **a2a_optimization** - A2A优化（用户想要使用AI优化内容）
5. **content_generation** - 内容生成（用户想要生成教学材料）
6. **continue_workflow** - 继续工作流（用户正在进行中的工作流，提供了更多信息或确认继续）
7. **entity_management** - 班级/课次/作业的 CRUD 操作，请直接生成结构化指令（创建/读取/更新/删除）
8. **general_chat** - 通用对话（闲聊或不明确的请求）

## 关键判断原则
1. **理解对话上下文**：如果之前的对话显示用户正在创建课程、收集信息等，那么用户的后续回复很可能是在继续这个流程
2. **理解用户意图**：用户说"继续"、"好的"、"下一步"等词时，结合上下文判断是在继续什么
3. **提取参数**：从用户消息中提取所有相关参数（课程主题、时长、目标受众等）
4. **不要机械匹配**：不要简单匹配关键词，而是理解用户的真实需求

## 输出格式（严格TOON，对应一个JSON对象）
# 所有字段都必须给出，即使为空也要写 null 或空字符串
intent: 意图类型
confidence: 0.0-1.0
parameters:
  courseTopic: 课程主题
  courseDuration: 课程时长
  sessionsPerWeek: 每周课次
  targetAudience: 目标学员
  difficultyLevel: 难度级别
  courseType: 课程类型
  action: create|read|update|delete|list
  entity: class|session|assignment
  entityId: 目标实体ID（如有）
  details: 其他字段/说明，比如课次日期、作业标题、班级描述
reasoning: 详细的推理过程，解释为什么你认为是这个意图
suggestedResponse: 建议的AI回复
shouldContinueWorkflow: true/false
workflowType: 如果是继续工作流，具体是哪个工作流

输出时必须严格满足：
1. 第一行输出: ---BEGIN_TOON---
2. 中间是符合上述字段定义的TOON内容
3. 最后一行输出: ---END_TOON---
不要输出任何其他解释、自然语言前缀/后缀或代码块标记，也不要输出JSON或markdown代码块。`;

    // 使用messages格式调用AI，让模型能够理解完整对话上下文
    const { text } = await generateText({
      model: openai.chat(DEFAULT_MODEL),
      system: systemPrompt,
      messages: conversationMessages,
      maxTokens: 2000,
      temperature: 0.1,
      abortSignal: AbortSignal.timeout(25000), // 25秒超时，接近Vercel限制但保留缓冲
    });

    // 解析AI响应（使用TOON，避免多重```json代码块导致的JSON解析错误）
    let intentResult: any;
    try {
      let cleanText = text.trim();

      // 如果模型仍然包了一层```或```toon，先粗暴去掉首尾代码块
      if (cleanText.startsWith("```")) {
        const firstFenceEnd = cleanText.indexOf("\n");
        if (firstFenceEnd !== -1) {
          cleanText = cleanText.slice(firstFenceEnd + 1);
        }
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.slice(0, cleanText.lastIndexOf("```"));
      }

      // 如果模型意外重复输出多段TOON，只保留第一段（以空行分隔）
      const firstBlock = cleanText.split("\n```")[0].trim();

      intentResult = decodeToon(firstBlock);
    } catch (e: any) {
      console.error("解析意图识别结果失败:", e, "Raw text:", text);
      throw new Error(`意图识别TOON解析失败: ${e.message || String(e)}`);
    }

    // 处理AI判断的意图
    let finalIntent = intentResult.intent;
    let finalWorkflow = state.currentWorkflow;

    // 如果AI判断用户是在继续工作流，设置正确的工作流状态
    if (intentResult.shouldContinueWorkflow && intentResult.workflowType) {
      finalIntent = "continue_workflow";
      finalWorkflow = {
        type: intentResult.workflowType,
        status: "active",
        step: state.currentWorkflow?.step || "continuing",
        data: state.currentWorkflow?.data || {},
      };
    }

    // 映射中文意图到英文
    const intentMapping: Record<string, string> = {
      课程创建: "course_creation",
      大纲生成: "outline_generation",
      作业创建: "assignment_creation",
      A2A优化: "a2a_optimization",
      内容生成: "content_generation",
      继续工作流: "continue_workflow",
      通用对话: "general_chat",
    };

    const mappedIntent = intentMapping[finalIntent] || finalIntent;

    console.log("🤖 AI意图识别结果:", {
      intent: mappedIntent,
      confidence: intentResult.confidence,
      reasoning: intentResult.reasoning,
      shouldContinueWorkflow: intentResult.shouldContinueWorkflow,
      workflowType: intentResult.workflowType,
    });

    return {
      ...state,
      intent: {
        type: mappedIntent,
        confidence: intentResult.confidence || 0.5,
        parameters: intentResult.parameters || {},
      },
      currentWorkflow: finalWorkflow,
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        reasoning: intentResult.reasoning,
        suggestedResponse: intentResult.suggestedResponse,
        mode: "pure_ai_recognition",
      },
    };
  } catch (error) {
    console.error("意图识别失败:", error);

    return {
      ...state,
      intent: {
        type: "general_chat",
        confidence: 0.3,
        parameters: {},
      },
      metadata: {
        ...state.metadata,
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        reasoning: `意图识别失败: ${(error as Error).message}`,
        suggestedResponse: "我很乐意帮助您！请告诉我您想做什么？",
        suggestions: [
          "创建课程",
          "生成大纲",
          "创建作业",
          "优化内容",
          "生成材料",
        ],
      },
    };
  }
}

/**
 * 路由决策节点 - 根据意图决定下一步操作
 */
export function routeDecisionNode(state: ChatbotState): string {
  // 如果有活跃的工作流，继续该工作流
  if (state.currentWorkflow && state.currentWorkflow.status === "active") {
    return "continue_workflow";
  }

  // 根据意图类型路由到不同的处理节点
  const intent = state.intent?.type || "general_chat";

  switch (intent) {
    case "course_creation":
    case "课程创建":
      return "course_creation";
    case "outline_generation":
    case "大纲生成":
      return "outline_generation";
    case "assignment_creation":
    case "作业创建":
      return "assignment_creation";
    case "a2a_optimization":
    case "A2A优化":
      return "a2a_optimization";
    case "content_generation":
    case "内容生成":
      return "content_generation";
    case "continue_workflow":
    case "继续工作流":
      return "continue_workflow";
    case "entity_management":
    case "实体管理":
      return "entity_management";
    case "general_chat":
    case "通用对话":
    default:
      return "general_chat";
  }
}
