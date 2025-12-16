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
    const systemPrompt = `You are the intent router for WeaveMind (teacher-first LMS). Use full dialog history to infer intent and required parameters. Classes have many sessions; there is no separate "course" entity.

Key workflows / tools (mention them so the model knows what exists):
- course_creation_tool: create a class, then create all sessions, then generate outlines for each session. If fields are missing, return missing_fields. If user asks to create a class, you must plan: create class -> create sessions -> create outlines; confirm outlines with user.
- outline_generation_tool: generate/update outlines for sessions.
- assignment_creation_tool: create assignments for classes.
- a2a_optimization_tool / content_generation_tool: content tasks.
- entity_crud_tool: CRUD for classes/sessions/assignments with action=create/read/update/delete/list; requires classId/sessionId/assignmentId as appropriate.
- listTeacherClasses, listClassSessions, listClassAssignments: read-only data fetch.

Intents you can return:
1) course_creation
2) outline_generation
3) assignment_creation
4) a2a_optimization
5) content_generation
6) continue_workflow
7) entity_management (CRUD/list for class/session/assignment; also teacher_data_lookup maps here)
8) general_chat

Rules:
- If user asks “what classes/sessions/assignments do I have”, “list/show classes/sessions/assignments”, force entity_management with action=list and entity inferred; include classId if present in context.
- Prefer action=list when intent is data lookup. Do not fall back to course creation for these queries.
- Always plan to ask for missing fields instead of guessing.

Output format MUST be TOON (no markdown fences):
---BEGIN_TOON---
intent: ...
confidence: 0.0-1.0
parameters:
  courseTopic: ...
  courseDuration: ...
  sessionsPerWeek: ...
  targetAudience: ...
  difficultyLevel: ...
  courseType: ...
  action: create|read|update|delete|list
  entity: class|session|assignment
  entityId: ...
  classId: ...
  sessionId: ...
  details: ...
reasoning: ...
suggestedResponse: ...
shouldContinueWorkflow: true/false
workflowType: ...
---END_TOON---
Reply in the user's language; keep the system text in English. Do not wrap in code fences.`;

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

    // 🔧 规则修正：显式的“我有哪些班级/课次/作业”必须走实体管理列表
    const normalizedUserText = lastMessage.content
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "");
    const hasListVerb = /(有哪些|有什么|哪几个|列出|查看|show|list|lookat|what|which)/i.test(
      lastMessage.content.toString(),
    );
    const mentionsClass = /(班级|class|classes)/i.test(normalizedUserText);
    const mentionsSession = /(课次|课程节|session|sessions|lesson)/i.test(
      normalizedUserText,
    );
    const mentionsAssignment = /(作业|作业列表|assignment|assignments)/i.test(
      normalizedUserText,
    );

    const resolvedClassId =
      intentResult.parameters?.classId ||
      state.metadata?.selectedClassId ||
      state.metadata?.classId ||
      state.metadata?.requestContext?.classId ||
      null;

    if (hasListVerb && (mentionsClass || mentionsSession || mentionsAssignment)) {
      finalIntent = "entity_management";
      finalWorkflow = undefined; // override any prior workflow to avoid continue_workflow routing
      intentResult.parameters = {
        ...intentResult.parameters,
        action: "list",
        entity: mentionsClass
          ? "class"
          : mentionsSession
            ? "session"
            : "assignment",
        classId: resolvedClassId,
      };
      intentResult.reasoning = `${
        intentResult.reasoning || ""
      } 识别到用户在查询已有的 ${
        mentionsClass
          ? "班级"
          : mentionsSession
            ? "课次"
            : "作业"
      }，强制使用 entity_management + list，并清除旧的工作流上下文以避免误路由。`;
    }

    // 如果AI判定为实体管理但缺少动作，默认使用list，避免落入课程创建流
    if (
      finalIntent === "entity_management" &&
      !intentResult.parameters?.action
    ) {
      intentResult.parameters = {
        ...intentResult.parameters,
        action: "list",
      };
    }

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
      teacher_data_lookup: "entity_management",
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

    // 兜底规则：在解析失败时，仍然用关键词强制路由班级/课次/作业列表
    const fallbackText = lastMessage.content.toString();
    const hasListVerb = /(有哪些|有什么|哪几个|列出|查看|show|list|look at|what|which)/i.test(
      fallbackText,
    );
    const mentionsClass = /(班级|class|classes)/i.test(fallbackText);
    const mentionsSession = /(课次|课程节|session|sessions|lesson)/i.test(
      fallbackText,
    );
    const mentionsAssignment = /(作业|作业列表|assignment|assignments)/i.test(
      fallbackText,
    );
    if (hasListVerb && (mentionsClass || mentionsSession || mentionsAssignment)) {
      return {
        ...state,
        intent: {
          type: "entity_management",
          confidence: 0.3,
          parameters: {
            action: "list",
            entity: mentionsClass
              ? "class"
              : mentionsSession
                ? "session"
                : "assignment",
          },
        },
        currentWorkflow: undefined,
        metadata: {
          ...state.metadata,
          timestamp: new Date().toISOString(),
          reasoning: `Fallback keyword routing to list ${
            mentionsClass ? "classes" : mentionsSession ? "sessions" : "assignments"
          }`,
          suggestedResponse: "I will list your items now.",
        },
      };
    }

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
  // 优先处理实体管理/查询，避免被历史工作流劫持
  const intent = state.intent?.type || "general_chat";
  if (intent === "entity_management") {
    return "entity_management";
  }

  // 如果有活跃的工作流，继续该工作流
  if (state.currentWorkflow && state.currentWorkflow.status === "active") {
    return "continue_workflow";
  }

  // 根据意图类型路由到不同的处理节点
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
    case "general_chat":
    case "通用对话":
    default:
      return "general_chat";
  }
}
