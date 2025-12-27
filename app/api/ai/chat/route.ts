import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ChatRequest,
  StandardApiResponse,
  ChatResponseData,
} from "@/lib/types/api";
import { chatbot } from "@/lib/ai/langgraph/chatbot-graph";
import { z } from "zod";
import { encode as encodeToon } from "@toon-format/toon";
import { generateText } from "ai";
import {
  createGatewayOpenAI,
  DEFAULT_MODEL,
} from "@/lib/ai/langgraph/config/openai-gateway";
import {
  parseModelResponse,
  parseModelData,
} from "@/lib/ai/langgraph/utils/model-response";
import {
  buildTeacherAgentPrompt,
  buildStudentAgentPrompt,
  extractComponentsFromTeacherResponse,
  extractFeedbackFromStudentResponse,
  type A2AContext,
} from "@/lib/ai/prompts";

// Use Node.js runtime because this endpoint may perform Supabase admin operations.
export const runtime = "nodejs";

const openai = createGatewayOpenAI();

function extractJsonObject<T>(text: string): T | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch (error) {
    console.warn("Failed to parse JSON from model output:", error);
    return null;
  }
}

function normalizeDifficultyLevel(input?: string | null) {
  if (!input) return null;
  if (/beginner|入门|初级|基础/i.test(input)) return "beginner";
  if (/intermediate|中级|中等|进阶/i.test(input)) return "intermediate";
  if (/advanced|高级|高阶|专家/i.test(input)) return "advanced";
  return null;
}

function extractConceptsFromComponents(components: any[]): string[] {
  const concepts: string[] = [];
  components.forEach((component) => {
    if (component?.type === "text" && component?.content?.text) {
      const text = String(component.content.text);
      const words = text
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 4 &&
            !["the", "and", "for", "with", "this", "that", "from", "they", "have"].includes(
              word.toLowerCase(),
            ),
        );
      concepts.push(...words.slice(0, 5));
    }
  });
  return Array.from(new Set(concepts));
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
  delayMs = 5000,
): Promise<T> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const TOOL_EXECUTION_TIMEOUT_MS = 120_000;

function isApprovalMessage(message: string) {
  return /^(approve|approved|yes|ok|okay|confirm|confirmed|确认|同意|好的|可以)$/i.test(
    message.trim(),
  );
}

function inferEntityFromMessage(message: string) {
  if (!message) return null;
  if (/(课次|课节|第\s*\d+\s*(节|课)|session|sessions|lesson)/i.test(message)) {
    return "session";
  }
  if (/(作业|assignment|assignments|任务)/i.test(message)) {
    return "assignment";
  }
  if (/(班级|class|课程|course)/i.test(message)) {
    return "class";
  }
  return null;
}

function inferCrudAction(message: string) {
  if (!message) return null;
  if (/(删除|移除|delete|remove)/i.test(message)) {
    return "delete";
  }
  if (/(更新|修改|改回|改成|更名|rename|update|edit|change)/i.test(message)) {
    return "update";
  }
  if (/(创建|新建|新增|添加|create|add|生成)/i.test(message)) {
    return "create";
  }
  if (/(列出|列表|查看|查询|显示|有哪些|read|list|show|query)/i.test(message)) {
    return "list";
  }
  return null;
}

function extractUuid(message: string) {
  if (!message) return null;
  const match = message.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return match?.[0] || null;
}

function getLastNonApprovalUserText(context: any, fallback?: string) {
  const history = Array.isArray(context?.conversationHistory)
    ? context.conversationHistory
    : [];
  let lastUserText: string | undefined;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i];
    if (msg?.role === "user" && typeof msg?.content === "string") {
      if (!isApprovalMessage(msg.content)) {
        return msg.content;
      }
      if (!lastUserText) lastUserText = msg.content;
    }
  }
  return lastUserText || fallback;
}

function normalizeActionData(actionData: any, message?: string) {
  const next =
    actionData && typeof actionData === "object" && !Array.isArray(actionData)
      ? { ...actionData }
      : {};
  const entityFromMessage = message ? inferEntityFromMessage(message) : null;
  const actionFromMessage = message ? inferCrudAction(message) : null;
  const inferredId = message ? extractUuid(message) : null;
  const mentionsClass = message
    ? /(班级|class|课程|course)/i.test(message)
    : false;
  const entityFromIds = next.sessionId
    ? "session"
    : next.assignmentId
      ? "assignment"
      : next.classId
        ? "class"
        : null;

  if (!next.entity) {
    next.entity = entityFromMessage || entityFromIds || next.entity;
  } else if (entityFromMessage && next.entity === "class") {
    next.entity = entityFromMessage;
  }

  if (!next.action && actionFromMessage) {
    next.action = actionFromMessage;
  }

  if (next.entity === "session" && next.details?.name && !next.details?.title) {
    next.entity = "class";
  }

  if (inferredId) {
    if (
      next.entity === "assignment" &&
      !next.assignmentId &&
      ["update", "delete", "read"].includes(next.action)
    ) {
      next.assignmentId = inferredId;
    }
    if (
      next.entity === "session" &&
      !next.sessionId &&
      ["update", "delete", "read"].includes(next.action)
    ) {
      next.sessionId = inferredId;
    }
    if (
      next.entity === "class" &&
      !next.classId &&
      ["update", "delete", "read"].includes(next.action)
    ) {
      next.classId = inferredId;
    }
  }
  return next;
}

function findPendingToolCall(context: any, userText?: string) {
  const history = Array.isArray(context?.conversationHistory)
    ? context.conversationHistory
    : [];
  const lastUserText = getLastNonApprovalUserText(context, userText);
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const meta = history[i]?.metadata || {};
    if (meta.confirmationExecuted) continue;
    const pending = meta.pendingToolCall;
    if (pending?.id && pending.toolName) {
      return {
        ...pending,
        input: normalizeActionData(pending.input, lastUserText),
      };
    }
    const actionType = meta.actionType;
    if (meta.requiresDatabaseAction && actionType && meta.confirmationRequired !== false) {
      return {
        id: meta.pendingToolCallId || crypto.randomUUID(),
        toolName: actionType,
        input: normalizeActionData(meta.actionData || {}, lastUserText),
      };
    }
  }
  return null;
}

function normalizeResponseText(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item : JSON.stringify(item),
      )
      .join("\n");
  }
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }
  return String(value);
}

function normalizeChatData(data: any) {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    message: normalizeResponseText(data.message),
  };
}

function resolveClassIdFromContext(
  context: Record<string, any> | null | undefined,
  classIdOverride?: string | null,
) {
  if (classIdOverride) return classIdOverride;
  if (!context) return null;
  const selectedFromList = Array.isArray(context.selectedContexts)
    ? context.selectedContexts.find((item: any) => item?.type === "class")
    : null;
  return (
    context.selectedClassId ||
    context.classId ||
    selectedFromList?.id ||
    null
  );
}

async function buildRequestContext(
  context: Record<string, any> | null | undefined,
  classIdOverride?: string | null,
) {
  const base = context ? { ...context } : {};
  const admin = createAdminClient();
  let resolvedClassId = resolveClassIdFromContext(base, classIdOverride);

  if (!resolvedClassId && base.selectedSessionId) {
    const { data: sessionData } = await admin
      .from("course_sessions")
      .select("class_id")
      .eq("id", base.selectedSessionId)
      .maybeSingle();
    resolvedClassId = sessionData?.class_id || null;
  }

  let compressionContext = base.compressionContext || null;
  if (!compressionContext && resolvedClassId) {
    const { data } = await admin
      .from("course_compression_context")
      .select("*")
      .eq("class_id", resolvedClassId)
      .maybeSingle();
    compressionContext = data || null;
  }

  return {
    ...base,
    selectedClassId: resolvedClassId || base.selectedClassId,
    compressionContext,
  };
}

// AI聊天请求验证模式
const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z
    .object({
      courseId: z.string().uuid().optional(),
      classId: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      // 选中的上下文实体（来自Teacher Dashboard侧边栏）
      selectedClassId: z.string().uuid().optional(),
      selectedSessionId: z.string().uuid().optional(),
      selectedAssignmentId: z.string().uuid().optional(),
      confirmToolCall: z
        .object({
          id: z.string(),
          toolName: z.string(),
          // z.record() appears to trigger a Zod v4 compilation edge-case in production bundles
          // when this field is present. Use a catchall object instead.
          input: z.object({}).catchall(z.any()),
        })
        .optional(),
      selectedContexts: z
        .array(
          z.object({
            type: z.enum(["class", "session", "assignment"]),
            id: z.string(),
            title: z.string().optional(),
          }),
        )
        .optional(),
      userRole: z
        .union([
          z.enum(["teacher", "student", "self_learner"]),
          z.literal("self-learner"),
        ])
        .transform((role) => (role === "self-learner" ? "self_learner" : role)),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
            timestamp: z.string(),
            toolsUsed: z.array(z.string()).optional(),
            metadata: z.record(z.string(), z.any()).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  tools: z.array(z.string()).optional(),
  stream: z.boolean().optional(), // 新增：流式输出标志
});

/**
 * 基于LangGraph的统一AI对话API端点
 * 支持真正的AI上下文记忆和动态对话
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<StandardApiResponse<ChatResponseData>>> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const debugMode = request.headers.get("x-weavemind-debug") === "1";

  try {
    // 1. 解析和验证请求数据
    const body = await request.json();
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求数据验证失败",
            details: validation.error.issues,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 400 },
      );
    }

    const {
      message: msg,
      context: ctx,
      stream: isStreamMode,
    } = validation.data;
    const message = msg;
    const context = ctx;
    const enableStream = isStreamMode || false;

    if (context && !context.confirmToolCall && isApprovalMessage(message)) {
      const pendingToolCall = findPendingToolCall(context, message);
      if (pendingToolCall) {
        context.confirmToolCall = pendingToolCall;
      }
    }

    // 2. 检查认证状态
    const supabase = await createClient();
    let authenticatedUser: any = null;
    try {
      const authResult = await runWithRetry(
        () =>
          withTimeout(
            supabase.auth.getUser(),
            8_000,
            "Supabase auth.getUser",
          ),
        2,
        1000,
      );
      authenticatedUser = authResult?.data?.user || null;
    } catch (err: any) {
      const isZh = /[\u4e00-\u9fff]/.test(message);
      const msg = isZh
        ? "登录状态校验超时/失败。请刷新页面后重试，或重新登录。"
        : "Auth check timed out/failed. Please refresh and try again, or sign in again.";
      const toonPayload = { intent: "error", status: "error", message: msg };
      const toonMessage = `---BEGIN_TOON---\n${encodeToon(toonPayload)}\n---END_TOON---`;
      return NextResponse.json({
        success: true,
        data: {
          message: toonMessage,
          toolsUsed: [],
          metadata: {
            intent: "error",
            timestamp: new Date().toISOString(),
            error: err?.message || "auth_timeout",
          },
        } as any,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: "production",
          processingTime: Date.now() - startTime,
        },
      });
    }
    let user = authenticatedUser;

    // ✅ Confirmed tool execution shortcut: do not run LangGraph, execute tool directly
    if (context?.confirmToolCall?.id && context.confirmToolCall.toolName) {
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "UNAUTHORIZED", message: "用户未认证" },
          },
          { status: 401 },
        );
      }

      const toolName = context.confirmToolCall.toolName;
      const sourceText = getLastNonApprovalUserText(context, message);
      let actionData = normalizeActionData(
        {
          ...(context.confirmToolCall.input || {}),
        },
        sourceText,
      );
      if (!actionData.classId && (context?.classId || context?.selectedClassId)) {
        actionData.classId = context.classId || context.selectedClassId;
      }
      if (!actionData.sessionId && context?.selectedSessionId) {
        actionData.sessionId = context.selectedSessionId;
      }
      if (!actionData.assignmentId && context?.selectedAssignmentId) {
        actionData.assignmentId = context.selectedAssignmentId;
      }
      actionData = normalizeActionData(actionData, sourceText);
      const meta = {
        requiresDatabaseAction: true,
        actionType: toolName,
        actionData,
        toolsUsed: [],
        classId: context?.classId,
        sessionId: context?.sessionId,
        assignmentId: context?.assignmentId,
        selectedClassId: context?.selectedClassId,
        selectedSessionId: context?.selectedSessionId,
        selectedAssignmentId: context?.selectedAssignmentId,
        requestContext: {
          classId: context?.classId,
          selectedClassId: context?.selectedClassId,
          selectedSessionId: context?.selectedSessionId,
          selectedAssignmentId: context?.selectedAssignmentId,
        },
      };

      const dbOperationResult = await runWithRetry(
        () =>
          withTimeout(
            handleDatabaseOperation(meta, supabase, user, false),
            TOOL_EXECUTION_TIMEOUT_MS,
            `Tool execution (${toolName})`,
          ),
        5,
        5000,
      );

      // 增强错误日志记录
      if (!dbOperationResult.success) {
        console.error("数据库操作失败详情:", {
          toolName,
          actionData,
          error: dbOperationResult.error,
          message: dbOperationResult.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log("数据库操作成功:", {
          toolName,
          message: dbOperationResult.message,
          toolsUsed: dbOperationResult.toolsUsed,
          timestamp: new Date().toISOString(),
        });
      }

      const toolExecutionMeta: Record<string, any> = {
        confirmationExecuted: true,
        confirmedToolCallId: context.confirmToolCall.id,
        toolExecutionSuccess: Boolean(dbOperationResult.success),
        lastExecutedTool: toolName,
        classId: (dbOperationResult as any).classId || null,
        joinCode: (dbOperationResult as any).joinCode || null,
        assignmentId: (dbOperationResult as any).assignmentId || null,
        toolResult: dbOperationResult,
        toolExecutionTimestamp: new Date().toISOString(),
      };
      const agentStateFromTool = (dbOperationResult as any).agentState;
      if (agentStateFromTool) toolExecutionMeta.agentState = agentStateFromTool;
      const outlineDraftFromTool = (dbOperationResult as any).outlineDraft;
      if (outlineDraftFromTool)
        toolExecutionMeta.outlineDraft = outlineDraftFromTool;

      if (toolName === "a2a_session_generate_and_save") {
        return NextResponse.json({
          success: true,
          data: {
            message: normalizeResponseText(dbOperationResult.message || ""),
            toolsUsed: dbOperationResult.toolsUsed || [],
            metadata: toolExecutionMeta,
          } as any,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            mode: "production",
            processingTime: Date.now() - startTime,
          },
        });
      }

      // Continue the LangGraph agent after the tool executes so multi-step goals
      // can propose the next tool (still requiring user confirmation).
      const priorHistory = context.conversationHistory || [];
      const historyWithToolResult = [
        ...priorHistory,
        {
          role: "assistant",
          content: normalizeResponseText(dbOperationResult.message || ""),
          timestamp: new Date().toISOString(),
          toolsUsed: dbOperationResult.toolsUsed || [],
          metadata: toolExecutionMeta,
        },
      ];

      // Pick a minimal continuation message in the user's language to avoid the
      // agent switching languages because the confirmation payload is silent.
      const lastUserMessage = [...historyWithToolResult]
        .reverse()
        .find((m: any) => m?.role === "user" && typeof m?.content === "string");
      const continueMessage = /[\u4e00-\u9fff]/.test(
        lastUserMessage?.content || "",
      )
        ? "继续"
        : "continue";

      try {
        const conversationId =
          user?.id || ctx?.organizationId || crypto.randomUUID();
        const userRole = context?.userRole || "student";
        const userId = user.id;

        const requestContext = await buildRequestContext(
          ctx,
          dbOperationResult?.classId || ctx?.selectedClassId || null,
        );
        const followup = await chatbot.processMessage(
          continueMessage,
          conversationId,
          userRole,
          userId,
          historyWithToolResult,
          requestContext,
        );

        // If the follow-up proposes another DB/tool action, mark it as pending.
        let finalFollowup = followup;
        const actionType = followup.data?.metadata?.actionType;
        const inferredActionType =
          actionType ||
          (followup.data?.metadata?.actionData?.action &&
          followup.data?.metadata?.actionData?.entity
            ? "entity_management"
            : undefined);
        const requiresDatabaseAction = Boolean(
          followup.success &&
            (followup.data?.metadata?.requiresDatabaseAction ||
              inferredActionType) &&
            inferredActionType,
        );
        if (requiresDatabaseAction && followup.data?.metadata) {
          const adjustedActionData = normalizeActionData(
            followup.data.metadata.actionData || {},
            lastUserMessage?.content || message,
          );
          const pendingToolCallId =
            followup.data.metadata.pendingToolCallId || crypto.randomUUID();
          finalFollowup = {
            ...followup,
            data: {
              ...followup.data,
              metadata: {
                ...followup.data.metadata,
                pendingToolCall: {
                  id: pendingToolCallId,
                  toolName: inferredActionType,
                  input: adjustedActionData,
                },
                actionType: inferredActionType,
                actionData: adjustedActionData,
                pendingToolCallId,
                requiresDatabaseAction: true,
                confirmationRequired: true,
              },
            },
          };
        }

        const normalizedFollowupData = normalizeChatData(finalFollowup.data);
        const followupMetadata = normalizedFollowupData?.metadata || {};
        const mergedMetadata = {
          ...toolExecutionMeta,
          ...followupMetadata,
          agentState: followupMetadata.agentState || toolExecutionMeta.agentState,
        };
        return NextResponse.json({
          success: true,
          data: {
            ...(normalizedFollowupData as any),
            toolsUsed: [
              ...new Set([
                ...(dbOperationResult.toolsUsed || []),
                ...(normalizedFollowupData?.toolsUsed || []),
              ]),
            ],
            metadata: mergedMetadata,
          } as any,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            mode: "production",
            processingTime: Date.now() - startTime,
          },
        });
      } catch (err: any) {
        const toonPayload = {
          intent: "tool_execution",
          status: dbOperationResult.success ? "ok" : "error",
          tool: toolName,
          message:
            dbOperationResult.message ||
            err?.message ||
            "Tool executed, but follow-up agent step failed.",
        };
        const toonMessage = `---BEGIN_TOON---\n${encodeToon(toonPayload)}\n---END_TOON---`;

        return NextResponse.json({
          success: true,
          data: {
            message: toonMessage,
            toolsUsed: dbOperationResult.toolsUsed || [],
            metadata: toolExecutionMeta,
          } as any,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            mode: "production",
            processingTime: Date.now() - startTime,
          },
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "用户未认证" },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 401 },
      );
    }

    // 3. 使用LangGraph聊天机器人处理消息
    // 🔧 关键修复：不要使用全局“default-conversation”，否则不同用户共享上下文导致串话/幻觉
    const conversationId =
      user?.id || ctx?.organizationId || crypto.randomUUID();
    const userRole = context?.userRole || "student";
    const userId = user.id;

    console.log("🤖 使用LangGraph处理聊天:", {
      requestId,
      conversationId,
      userRole,
      messageLength: message.length,
      historyLength: context?.conversationHistory?.length || 0,
      streamMode: enableStream,
    });

    // 4. 如果启用流式模式，使用流式响应
    if (enableStream) {
      return handleStreamResponse(
        requestId,
        message,
        conversationId,
        userRole,
        userId,
        context,
        startTime,
      );
    }

    // 5. 否则使用普通JSON响应
    let result: any;
    try {
      const requestContext = await buildRequestContext(ctx);
      result = await withTimeout(
        chatbot.processMessage(
          message,
          conversationId,
          userRole,
          userId,
          context?.conversationHistory || [],
          requestContext,
        ),
        30_000,
        "LangGraph processMessage",
      );
    } catch (err: any) {
      const isZh = /[\u4e00-\u9fff]/.test(message);
      const fallbackMsg = isZh
        ? "请求处理超时或暂时不可用。请稍等几秒后重试，或把任务拆成更小的步骤。"
        : "The request timed out or is temporarily unavailable. Please wait a few seconds and try again, or split the task into smaller steps.";
      const toonPayload = {
        intent: "error",
        status: "error",
        message: fallbackMsg,
      };
      const toonMessage = `---BEGIN_TOON---\n${encodeToon(toonPayload)}\n---END_TOON---`;

      return NextResponse.json({
        success: true,
        data: {
          message: toonMessage,
          toolsUsed: [],
          metadata: {
            intent: "error",
            timestamp: new Date().toISOString(),
            error: err?.message || "timeout",
          },
        } as any,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: "production",
          processingTime: Date.now() - startTime,
        },
      });
    }

    const processingTime = Date.now() - startTime;
    console.log("✅ LangGraph处理完成:", {
      requestId,
      processingTime,
      success: result.success,
      intent: result.data?.metadata?.intent,
    });

    // 6. 处理数据库操作请求
    let finalResult = result;
    console.log("🔍 检查数据库操作标志:", {
      hasResultData: !!result.data,
      hasMetadata: !!result.data?.metadata,
      requiresDatabaseAction: result.data?.metadata?.requiresDatabaseAction,
      actionType: result.data?.metadata?.actionType,
    });

    // 6.5 Any DB/tool action must be confirmed by the user (separate request).
    const actionType = result.data?.metadata?.actionType;
    const inferredActionType =
      actionType ||
      (result.data?.metadata?.actionData?.action &&
      result.data?.metadata?.actionData?.entity
        ? "entity_management"
        : undefined);
    const requiresDatabaseAction = Boolean(
      result.success &&
        (result.data?.metadata?.requiresDatabaseAction || inferredActionType) &&
        inferredActionType,
    );

    if (requiresDatabaseAction && result.data?.metadata) {
      const adjustedActionData = normalizeActionData(
        result.data.metadata.actionData || {},
        message,
      );
      const pendingToolCallId =
        result.data.metadata.pendingToolCallId || crypto.randomUUID();
      finalResult = {
        ...result,
        data: {
          ...result.data,
          message:
            normalizeResponseText(result.data.message) ||
            `Pending tool call ${inferredActionType}, awaiting confirmation.`,
          metadata: {
            ...result.data.metadata,
            pendingToolCall: {
              id: pendingToolCallId,
              toolName: inferredActionType,
              input: adjustedActionData,
            },
            actionType: inferredActionType,
            actionData: adjustedActionData,
            pendingToolCallId,
            requiresDatabaseAction: true,
            confirmationRequired: true,
          },
        },
      };
    }

    // 7. 返回JSON响应
    if (finalResult.success) {
      const normalizedData = normalizeChatData(finalResult.data);
      return NextResponse.json({
        success: true,
        data: normalizedData,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: "production",
          processingTime,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: finalResult.error?.code || "CHATBOT_ERROR",
            message: finalResult.error?.message || "聊天处理失败",
            details: finalResult.error,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime,
          },
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("🚨 Chat API Error:", {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "处理请求时发生错误",
          details: debugMode
            ? { message: error?.message, stack: error?.stack }
            : {},
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime,
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 获取对话状态
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<StandardApiResponse<any>>> {
  const requestId = crypto.randomUUID();

  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_PARAMETER",
            message: "缺少conversationId参数",
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 400 },
      );
    }

    const state = await chatbot.getConversationState(conversationId);

    return NextResponse.json({
      success: true,
      data: state,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error: any) {
    console.error("Get conversation state error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "获取对话状态失败",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 重置对话
 */
export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<StandardApiResponse<any>>> {
  const requestId = crypto.randomUUID();

  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_PARAMETER",
            message: "缺少conversationId参数",
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 400 },
      );
    }

    await chatbot.resetConversation(conversationId);

    return NextResponse.json({
      success: true,
      data: { message: "对话已重置" },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  } catch (error: any) {
    console.error("Reset conversation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "重置对话失败",
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 处理流式响应 - 结合LangGraph + 字符级输出
 */
async function handleStreamResponse(
  requestId: string,
  message: string,
  conversationId: string,
  userRole: "teacher" | "student" | "self_learner",
  userId: string,
  context: any,
  startTime: number,
): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        console.log("🌊 开始流式LangGraph处理:", {
          requestId,
          conversationId,
          userRole,
          messageLength: message.length,
        });

        // 发送开始信号
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              requestId,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 发送进度更新 - 分析阶段
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              progress: 10,
              message: "🤖 正在分析您的需求...",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 发送进度更新 - 意图识别
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              progress: 30,
              message: "🧠 正在识别意图...",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 使用LangGraph处理消息
        console.log("🔄 开始LangGraph处理流程...");
        const requestContext = await buildRequestContext(context);
        const result = await chatbot.processMessage(
          message,
          conversationId,
          userRole,
          userId,
          context?.conversationHistory || [],
          requestContext,
        );

        if (!result.success) {
          throw new Error(result.error?.message || "LangGraph处理失败");
        }

        // 处理数据库/工具调用请求（流式模式下仅返回待确认信息，不自动执行）
        let finalResult = result;
        const actionType = result.data?.metadata?.actionType;
        const inferredActionType =
          actionType ||
          (result.data?.metadata?.actionData?.action &&
          result.data?.metadata?.actionData?.entity
            ? "entity_management"
            : undefined);
        const requiresDatabaseAction = Boolean(
          result.success &&
            (result.data?.metadata?.requiresDatabaseAction ||
              inferredActionType) &&
            inferredActionType,
        );

        if (requiresDatabaseAction) {
          const pendingToolCallId =
            result.data.metadata.pendingToolCallId || crypto.randomUUID();
          const adjustedActionData = normalizeActionData(
            result.data.metadata.actionData || {},
            message,
          );
          const pendingToolCall = {
            id: pendingToolCallId,
            toolName: inferredActionType,
            input: adjustedActionData,
          };

          finalResult = {
            ...result,
            data: {
              ...result.data,
              message:
                normalizeResponseText(result.data.message) ||
                `Pending tool call ${pendingToolCall.toolName}, awaiting confirmation.`,
              metadata: {
                ...result.data.metadata,
                pendingToolCall,
                actionType: inferredActionType,
                actionData: adjustedActionData,
                pendingToolCallId,
                requiresDatabaseAction: true,
                confirmationRequired: true,
              },
            },
          };
        }

        // 发送进度更新 - 生成响应
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              progress: 70,
              message: "✨ 正在生成智能回复...",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 等待一下让用户看到"生成回复"
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 发送进度更新 - 字符级输出
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              progress: 90,
              message: "📝 正在打字输出...",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 等待一下让用户看到"打字输出"
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 字符级流式输出AI响应
        const aiResponse = normalizeResponseText(
          finalResult.data?.message || "抱歉，我现在无法处理您的请求。",
        );
        const characters = aiResponse.split("");
        let currentText = "";

        for (let i = 0; i < characters.length; i++) {
          currentText += characters[i];

          // 每2个字符发送一次更新
          if (i % 2 === 0 || i === characters.length - 1) {
            // 发送流式内容更新
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "streaming",
                  content: currentText,
                  progress: 90 + Math.floor((i / characters.length) * 10), // 90%到100%的进度
                  timestamp: new Date().toISOString(),
                })}\n\n`,
              ),
            );

            // 添加小延迟以实现流畅效果
            if (i < characters.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 30)); // 30ms延迟
            }
          }
        }

        // 发送完整的AI响应和metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              data: normalizeChatData(finalResult.data),
              metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                mode: "production",
                processingTime: Date.now() - startTime,
              },
            })}\n\n`,
          ),
        );

        console.log("✅ 流式LangGraph处理完成:", {
          requestId,
          totalProcessingTime: Date.now() - startTime,
          intent: finalResult.data?.metadata?.intent,
        });
      } catch (error: any) {
        console.error("🚨 流式处理失败:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error.message || "LangGraph流式处理失败",
              details: error.stack,
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );
      } finally {
        // 发送结束信号
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "end",
              timestamp: new Date().toISOString(),
            })}\n\n`,
          ),
        );

        // 关闭流
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

/**
 * 处理数据库操作请求
 */
async function handleDatabaseOperation(
  metadata: any,
  supabase: any,
  user: any,
  isDemoMode: boolean = false,
) {
  const { actionType, actionData } = metadata;

  try {
    // 🔧 关键修复：使用Admin客户端执行DB写入，避免RLS导致“看似成功但实际未保存”
    // 仍然基于已认证用户做严格权限校验，避免滥用service role
    const dbClient = createAdminClient();

    switch (actionType) {
      case "create_course_with_sessions": {
        // 直接使用supabase客户端创建班级（绕过工具认证）
        const joinCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();

        console.log("🔍 检查用户认证状态:", {
          userId: user.id,
          isDemoMode,
          hasSupabaseAuth: !!supabase?.auth,
        });

        // 设置认证上下文（关键修复）
        let organizationId = null;

        // 使用统一的dbClient获取组织信息（允许任意组织成员创建班级；原先仅owner会导致创建失败）
        const { data: orgMember, error: orgError } = await dbClient
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (orgError || !orgMember) {
          console.error("获取组织成员信息失败:", orgError);
          throw new Error("您还没有加入任何组织，无法创建班级");
        }

        organizationId = orgMember.organization_id;
        console.log("✅ 用户是组织所有者:", organizationId);

        // 创建班级
        const { data: classData, error: classError } = await dbClient
          .from("classes")
          .insert({
            name: actionData.className,
            description: actionData.classDescription || "",
            organization_id: organizationId,
            join_code: joinCode,
            created_by: user.id,
          })
          .select()
          .single();

        if (classError) {
          console.error("创建班级失败:", classError);
          throw classError;
        }

        const classId = classData.id;
        console.log("✅ 班级创建成功:", classId);

        // 创建者自动成为班级管理员
        const { error: memberError } = await dbClient
          .from("class_members")
          .insert({
            class_id: classId,
            user_id: user.id,
            role: "teacher",
          });

        if (memberError) {
          console.error("添加班级成员失败:", memberError);
          // 不抛出错误，因为班级已创建成功
        }

        const sessionInputs = Array.isArray(actionData.sessions)
          ? actionData.sessions
          : [];
        if (sessionInputs.length === 0) {
          throw new Error("缺少课次信息，无法创建课程。请先提供每节课的标题/描述。");
        }

        const normalizeScheduledDate = (value: any): string | null => {
          if (!value) return null;
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return null;
          return d.toISOString();
        };
        const inferFrequencyDays = (value: any): number => {
          const text = String(value || "").toLowerCase();
          if (/(biweekly|fortnight|两周|隔周)/i.test(text)) return 14;
          if (/(daily|every day|每天)/i.test(text)) return 1;
          if (/(weekly|week|每周)/i.test(text)) return 7;
          return 7;
        };
        const baseDateSource =
          normalizeScheduledDate(
            actionData?.startDate ||
              actionData?.scheduleStart ||
              actionData?.firstSessionDate ||
              sessionInputs?.[0]?.scheduled_date ||
              sessionInputs?.[0]?.scheduledDate ||
              sessionInputs?.[0]?.date,
          ) || new Date().toISOString();
        const baseDate = new Date(baseDateSource);
        const stepDays = inferFrequencyDays(actionData?.frequency);

        const sessionRows = sessionInputs.map((session: any, index: number) => {
          const sessionNumber =
            typeof session.session_number === "number"
              ? session.session_number
              : index + 1;
          const scheduledDate =
            session.scheduled_date ||
            session.scheduledDate ||
            session.scheduledAt ||
            session.date ||
            null;
          const normalizedScheduledDate = normalizeScheduledDate(scheduledDate);
          const fallbackScheduledDate = new Date(
            baseDate.getTime() + index * stepDays * 24 * 60 * 60 * 1000,
          ).toISOString();
          return {
            class_id: classId,
            session_number: sessionNumber,
            title: session.title,
            description: session.description || null,
            scheduled_date: normalizedScheduledDate || fallbackScheduledDate,
            start_time: session.start_time || session.startTime || null,
            end_time: session.end_time || session.endTime || null,
            duration_minutes:
              session.duration_minutes || session.durationMinutes || null,
            created_by: user.id,
          };
        });

        for (const row of sessionRows) {
          if (!row.title) {
            throw new Error("课次标题不能为空，请补充课次标题后重试。");
          }
        }

        const { data: insertedSessions, error: sessionsError } = await dbClient
          .from("course_sessions")
          .insert(sessionRows)
          .select("id,title,session_number,scheduled_date");

        if (sessionsError) {
          console.error("创建课次失败:", sessionsError);
          throw sessionsError;
        }

        const totalSessions = insertedSessions?.length || sessionRows.length;

        // 初始化课程信息库（compression context）
        const sessionContexts = sessionRows.map((s) => ({
          session_number: s.session_number,
          session_title: s.title,
          title: s.title,
          description: s.description || "",
        }));

        const courseInfo = actionData.courseInfo || {};
        const difficultyLevel = normalizeDifficultyLevel(courseInfo.difficultyLevel);
        const summarySource = actionData.classDescription || actionData.className;
        const contextPayload = {
          class_id: classId,
          organization_id: organizationId,
          created_by: user.id,
          compressed_summary: summarySource || actionData.className,
          key_concepts: [],
          learning_objectives: courseInfo.learningObjectives
            ? [courseInfo.learningObjectives]
            : [],
          session_contexts: sessionContexts,
          teaching_method: courseInfo.teachingMethod || null,
          target_audience: courseInfo.targetAudience || null,
          prerequisites: [],
          difficulty_level: difficultyLevel,
          total_duration_minutes: sessionRows
            .map((s) => s.duration_minutes)
            .filter((v: any) => typeof v === "number")
            .reduce((acc: number, v: number) => acc + v, 0),
        };

        const { data: existingContext } = await dbClient
          .from("course_compression_context")
          .select("id,version")
          .eq("class_id", classId)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (existingContext?.id) {
          await dbClient
            .from("course_compression_context")
            .update({
              ...contextPayload,
              last_updated: new Date().toISOString(),
              version: existingContext.version ? existingContext.version + 1 : 1,
            })
            .eq("id", existingContext.id);
        } else {
          await dbClient.from("course_compression_context").insert(contextPayload);
        }

        return {
          success: true,
          message: `🎉 课程创建成功！我已经为您创建了"${actionData.className}"课程，包含以下内容：

**班级信息：**
- 班级名称：${actionData.className}
- 加入代码：${joinCode}
- 课程节数：${totalSessions}节

**课程结构：**
- 目标学员：${actionData.courseInfo?.targetAudience || "未指定"}
- 难度级别：${actionData.courseInfo?.difficultyLevel || "未指定"}

课程已保存到数据库，您可以开始在WeaveMind平台上管理这个班级了！`,
          classId,
          joinCode,
          toolsUsed: ["createClass", "createSessionsBatch", "updateCompressionContext"],
        };
      }

      case "create_assignment": {
        // 创建作业
        let classId = metadata.classId;
        const useLatestClass = metadata.useLatestClass;

        // 如果用户选择使用最近的班级，查询最近创建的班级
        if (!classId && useLatestClass) {
          console.log("🔍 查询用户最近创建的班级...");
          const { data: latestClass, error: latestClassError } = await dbClient
            .from("classes")
            .select("id, name")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (latestClassError || !latestClass) {
            console.error("获取最近班级失败:", latestClassError);
            throw new Error(
              "找不到您创建的班级，请先创建一个班级或手动提供班级ID",
            );
          }

          classId = latestClass.id;
          console.log("✅ 找到最近的班级:", latestClass.name, classId);
        }

        if (!classId) {
          throw new Error('请提供班级ID以创建作业，或说"创建到最近的班级"');
        }

        // 验证班级是否存在
        const { data: classExists, error: classCheckError } = await dbClient
          .from("classes")
          .select("id, name")
          .eq("id", classId)
          .single();

        if (classCheckError || !classExists) {
          console.error("班级验证失败:", classCheckError);
          throw new Error(`班级ID ${classId} 不存在，请提供有效的班级ID`);
        }

        console.log("✅ 班级验证通过:", classExists.name);

        const { data: assignmentData, error: assignmentError } = await dbClient
          .from("assignments")
          .insert({
            class_id: classId,
            title: actionData.title,
            description: actionData.description || "",
            due_date: null,
            created_by: user.id,
          })
          .select()
          .single();

        if (assignmentError) {
          console.error("创建作业失败:", assignmentError);
          throw assignmentError;
        }

        console.log("✅ 作业创建成功:", assignmentData.id);

        return {
          success: true,
          message: `🎉 作业创建成功！我已经为您创建了作业：

**作业信息：**
- 作业标题：${actionData.title}
- 所属班级：${classExists.name}
- 班级ID：${classId}

**作业内容：**
${actionData.description}

**具体要求：**
${actionData.requirements?.join("\n") || "无特殊要求"}

作业已保存到数据库，您可以开始在WeaveMind平台上管理这个作业了！`,
          assignmentId: assignmentData.id,
          classId: classId,
          className: classExists.name,
          toolsUsed: ["createAssignment"],
        };
      }

      case "create_sessions_batch": {
        const classId =
          actionData?.classId ||
          metadata.classId ||
          metadata.selectedClassId ||
          metadata?.requestContext?.selectedClassId;
        const sessions = actionData?.sessions;

        if (!classId) {
          throw new Error("Missing classId for create_sessions_batch");
        }
        if (!Array.isArray(sessions) || sessions.length === 0) {
          throw new Error("Missing sessions array for create_sessions_batch");
        }

        const normalizeScheduledDate = (value: any): string | null => {
          if (!value) return null;
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return null;
          return d.toISOString();
        };
        const inferFrequencyDays = (value: any): number => {
          const text = String(value || "").toLowerCase();
          if (/(biweekly|fortnight|两周|隔周)/i.test(text)) return 14;
          if (/(daily|every day|每天)/i.test(text)) return 1;
          if (/(weekly|week|每周)/i.test(text)) return 7;
          return 7;
        };

        const { data: cls } = await dbClient
          .from("classes")
          .select("id,name,created_by,description,organization_id")
          .eq("id", classId)
          .maybeSingle();

        if (!cls) {
          throw new Error("Class not found");
        }

        const { data: membership } = await dbClient
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          cls.created_by !== user.id &&
          !membership?.role?.match(/teacher|owner/)
        ) {
          throw new Error("Forbidden: not a teacher in this class");
        }

        const { data: lastSession } = await dbClient
          .from("course_sessions")
          .select("session_number")
          .eq("class_id", classId)
          .order("session_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const startNumber = (lastSession?.session_number || 0) + 1;
        const capped = sessions.slice(0, 32);
        const { data: scheduleContext } = await dbClient
          .from("schedule_generation_context")
          .select("session_details,frequency")
          .eq("class_id", classId)
          .maybeSingle();
        const sessionDetails = Array.isArray(scheduleContext?.session_details)
          ? scheduleContext?.session_details
          : [];
        const pickDetail = (idx: number, title?: string) => {
          const sessionNumber = startNumber + idx;
          return (
            sessionDetails.find(
              (detail: any, detailIdx: number) =>
                detail?.session_number === sessionNumber ||
                detail?.sessionNumber === sessionNumber ||
                detail?.title === title ||
                detail?.name === title ||
                detailIdx === idx,
            ) || null
          );
        };
        const explicitBase =
          normalizeScheduledDate(
            capped?.[0]?.scheduledDate ??
              capped?.[0]?.scheduled_date ??
              capped?.[0]?.scheduledAt ??
              capped?.[0]?.date,
          ) ||
          normalizeScheduledDate(
            pickDetail(0, capped?.[0]?.title)?.scheduled_date ||
              pickDetail(0, capped?.[0]?.title)?.scheduledDate ||
              pickDetail(0, capped?.[0]?.title)?.date,
          ) ||
          new Date().toISOString();
        const baseDate = new Date(explicitBase);
        const stepDays = inferFrequencyDays(scheduleContext?.frequency);
        const rows = capped.map((session: any, idx: number) => ({
          class_id: classId,
          session_number: startNumber + idx,
          title: session.title,
          description: session.description || "",
          scheduled_date: (() => {
            const normalized = normalizeScheduledDate(
              session.scheduledDate ??
                session.scheduled_date ??
                session.scheduledAt ??
                session.date,
            );
            if (normalized) return normalized;
            const detail = pickDetail(idx, session.title);
            const detailDate = normalizeScheduledDate(
              detail?.scheduled_date || detail?.scheduledDate || detail?.date,
            );
            if (detailDate) return detailDate;
            return new Date(
              baseDate.getTime() + idx * stepDays * 24 * 60 * 60 * 1000,
            ).toISOString();
          })(),
          start_time: session.startTime || null,
          end_time: session.endTime || null,
          duration_minutes: session.durationMinutes || null,
          created_by: user.id,
        }));

        const missingTitle = rows.find((row) => !row.title);
        if (missingTitle) {
          throw new Error("课次标题不能为空，请补充课次标题后再创建。");
        }

        const { data: inserted, error: insertError } = await dbClient
          .from("course_sessions")
          .insert(rows)
          .select("id,title,session_number,scheduled_date,start_time");

        if (insertError) {
          throw insertError;
        }

        const ordered = (inserted || []).sort(
          (a: any, b: any) => (a.session_number || 0) - (b.session_number || 0),
        );

        const lines = ordered.map(
          (s: any) =>
            `- #${s.session_number}: ${s.title} (ID: ${s.id})`,
        );

        const organizationId =
          cls.organization_id || metadata?.organizationId || null;
        const courseInfo = actionData?.courseInfo || {};
        const difficultyLevel = normalizeDifficultyLevel(
          courseInfo?.difficultyLevel,
        );
        const summarySource =
          actionData?.classDescription || cls.description || cls.name;
        const objectives = Array.isArray(courseInfo?.learningObjectives)
          ? courseInfo.learningObjectives
          : courseInfo?.learningObjectives
            ? [courseInfo.learningObjectives]
            : [];
        const sessionContexts = rows.map((row: any) => ({
          session_number: row.session_number,
          session_title: row.title,
          title: row.title,
          description: row.description || "",
        }));

        if (organizationId) {
          const { data: existingContext } = await dbClient
            .from("course_compression_context")
            .select(
              "id,compressed_summary,learning_objectives,teaching_method,target_audience,difficulty_level,session_contexts,version",
            )
            .eq("class_id", classId)
            .eq("organization_id", organizationId)
            .maybeSingle();

          const mergeValue = (prev: any, next: any) => {
            if (next === undefined || next === null) return prev;
            if (typeof next === "string" && !next.trim()) return prev;
            if (Array.isArray(next) && next.length === 0) return prev;
            return next;
          };

          if (existingContext?.id) {
            const existingSessions = Array.isArray(
              existingContext.session_contexts,
            )
              ? existingContext.session_contexts
              : [];
            const mergedSessionContexts = [
              ...existingSessions.filter(
                (c: any) =>
                  !sessionContexts.some(
                    (n: any) => n.session_number === c.session_number,
                  ),
              ),
              ...sessionContexts,
            ].sort(
              (a: any, b: any) =>
                (a.session_number || 0) - (b.session_number || 0),
            );

            await dbClient
              .from("course_compression_context")
              .update({
                compressed_summary: mergeValue(
                  existingContext.compressed_summary,
                  summarySource,
                ),
                learning_objectives: mergeValue(
                  existingContext.learning_objectives,
                  objectives,
                ),
                teaching_method: mergeValue(
                  existingContext.teaching_method,
                  courseInfo?.teachingMethod || null,
                ),
                target_audience: mergeValue(
                  existingContext.target_audience,
                  courseInfo?.targetAudience || null,
                ),
                difficulty_level: mergeValue(
                  existingContext.difficulty_level,
                  difficultyLevel,
                ),
                session_contexts: mergedSessionContexts,
                last_updated: new Date().toISOString(),
                version: existingContext.version
                  ? existingContext.version + 1
                  : 1,
              })
              .eq("id", existingContext.id);
          } else {
            await dbClient.from("course_compression_context").insert({
              class_id: classId,
              organization_id: organizationId,
              created_by: user.id,
              compressed_summary: summarySource,
              key_concepts: [],
              learning_objectives: objectives,
              teaching_method: courseInfo?.teachingMethod || null,
              target_audience: courseInfo?.targetAudience || null,
              prerequisites: [],
              difficulty_level: difficultyLevel,
              total_duration_minutes: rows
                .map((row: any) => row.duration_minutes)
                .filter((v: any) => typeof v === "number")
                .reduce((acc: number, v: number) => acc + v, 0),
              session_contexts: sessionContexts,
            });
          }
        }

        return {
          success: true,
          message:
            actionData?.language === "en"
              ? `Created ${ordered.length} sessions for class "${cls.name}":\n${lines.join("\n")}`
              : `✅ 已为班级「${cls.name}」创建 ${ordered.length} 节课次：\n${lines.join("\n")}`,
          classId,
          sessionIds: ordered.map((s: any) => s.id),
          toolsUsed: ["createSessionsBatch"],
          agentState: actionData?.agentState || null,
        };
      }

      case "generate_class_outline_draft": {
        const classId =
          actionData?.classId ||
          metadata.classId ||
          metadata.selectedClassId ||
          metadata?.requestContext?.selectedClassId;
        const language: "zh" | "en" =
          actionData?.language === "en" ? "en" : "zh";

        if (!classId) {
          throw new Error("Missing classId for generate_class_outline_draft");
        }

        const { data: cls } = await dbClient
          .from("classes")
          .select("id,name,description,created_by")
          .eq("id", classId)
          .maybeSingle();

        if (!cls) {
          throw new Error("Class not found");
        }

        const { data: membership } = await dbClient
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          cls.created_by !== user.id &&
          !membership?.role?.match(/teacher|owner/)
        ) {
          throw new Error("Forbidden: not a teacher in this class");
        }

        const { data: sessions } = await dbClient
          .from("course_sessions")
          .select("id,title,description,session_number")
          .eq("class_id", classId)
          .order("session_number", { ascending: true });

        if (!sessions || sessions.length === 0) {
          throw new Error("This class has no sessions yet. Create sessions first.");
        }

        const { data: compressionContext } = await dbClient
          .from("course_compression_context")
          .select(
            "compressed_summary,key_concepts,learning_objectives,teaching_method,target_audience,difficulty_level,session_contexts",
          )
          .eq("class_id", classId)
          .maybeSingle();

        const systemPrompt = `You are an expert teacher. Generate a draft outline for each session of a class.

Rules:
- Output JSON only (no Markdown fences, no extra prose).
- Write the outline content in ${
          language === "en" ? "English" : "Chinese"
        }.
- Do not assume hidden information. Use only the provided class and session titles/descriptions.

JSON keys:
requirements: object
chapters: array of objects, one per session, in session_number order:
  session_number: number
  title: string
  outline: array of bullet strings
  learning_objectives: array of strings
  components_plan: array of objects with:
    type: "text" | "question"
    description: string
`;

        const userPrompt = `Class:
- name: ${cls.name}
- description: ${cls.description || ""}

Sessions:
${sessions
  .map(
    (s: any) =>
      `- session_number: ${s.session_number}; title: ${s.title}; description: ${s.description || ""}`,
  )
  .join("\n")}

Teacher goals (optional):
${actionData?.teachingGoals || ""}

Course info library (if available):
- summary: ${compressionContext?.compressed_summary || ""}
- key concepts: ${(compressionContext?.key_concepts || []).join(", ")}
- learning objectives: ${(compressionContext?.learning_objectives || []).join(", ")}
- teaching method: ${compressionContext?.teaching_method || ""}
- target audience: ${compressionContext?.target_audience || ""}
- difficulty level: ${compressionContext?.difficulty_level || ""}
- session contexts: ${JSON.stringify(compressionContext?.session_contexts || [])}`;

        const { text } = await generateText({
          model: openai.chat(DEFAULT_MODEL),
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          maxTokens: 1800,
          temperature: 0.4,
          abortSignal: AbortSignal.timeout(30000),
        });

        const outlineDraft = parseModelData<{
          requirements: Record<string, any>;
          chapters: Array<{
            session_number: number;
            title: string;
            outline: string[];
            learning_objectives: string[];
            components_plan?: Array<{
              type: "text" | "question";
              description: string;
            }>;
          }>;
        }>(text);

        const orderedChapters = (outlineDraft.chapters || []).slice().sort(
          (a, b) => (a.session_number || 0) - (b.session_number || 0),
        );
        const first = orderedChapters[0];

        const nextAgentState = {
          ...(actionData?.agentState || {}),
          outlineDraft: {
            requirements: outlineDraft.requirements || {},
            chapters: orderedChapters,
          },
          outlineReviewIndex: 0,
          outlineClassId: classId,
          outlineLanguage: language,
          outlineStatus: "reviewing",
        };

        const firstBlock =
          language === "en"
            ? `Session ${first.session_number}: ${first.title}\n\nOutline:\n- ${(
                first.outline || []
              ).join("\n- ")}\n\nLearning objectives:\n- ${(
                first.learning_objectives || []
              ).join("\n- ")}\n\nComponents plan:\n- ${(
                (first.components_plan || []).map(
                  (item) => `${item.type}: ${item.description}`,
                )
              ).join("\n- ")}`
            : `第${first.session_number}节：${first.title}\n\n大纲：\n- ${(
                first.outline || []
              ).join("\n- ")}\n\n学习目标：\n- ${(
                first.learning_objectives || []
              ).join("\n- ")}\n\n组件规划：\n- ${(
                (first.components_plan || []).map(
                  (item) => `${item.type}: ${item.description}`,
                )
              ).join("\n- ")}`;

        const message =
          language === "en"
            ? `Generated a draft outline for all sessions in "${cls.name}".\n\nNow let's confirm them one by one.\n\n${firstBlock}\n\nReply with:\n- \"approve\" to accept this session\n- or paste edits to revise it`
            : `我已经为班级「${cls.name}」生成了所有课次的大纲草案。\n\n现在我们逐节确认。\n\n${firstBlock}\n\n请回复：\n- “确认” 表示接受本节\n- 或直接输入你想修改的内容`;

        return {
          success: true,
          message,
          classId,
          outlineDraft: nextAgentState.outlineDraft,
          agentState: nextAgentState,
          toolsUsed: ["generateClassOutlineDraft"],
        };
      }

      case "generate_session_outline_draft": {
        const classId =
          actionData?.classId ||
          metadata.classId ||
          metadata.selectedClassId ||
          metadata?.requestContext?.selectedClassId;
        const sessionId =
          actionData?.sessionId ||
          metadata.sessionId ||
          metadata.selectedSessionId;
        const language: "zh" | "en" =
          actionData?.language === "en" ? "en" : "zh";

        if (!classId || !sessionId) {
          throw new Error("Missing classId or sessionId for session outline draft");
        }

        const { data: cls } = await dbClient
          .from("classes")
          .select("id,name,description,created_by")
          .eq("id", classId)
          .maybeSingle();

        if (!cls) {
          throw new Error("Class not found");
        }

        const { data: membership } = await dbClient
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          cls.created_by !== user.id &&
          !membership?.role?.match(/teacher|owner/)
        ) {
          throw new Error("Forbidden: not a teacher in this class");
        }

        const { data: session } = await dbClient
          .from("course_sessions")
          .select("id,session_number,title,description,scheduled_date,duration_minutes")
          .eq("id", sessionId)
          .single();

        if (!session) {
          throw new Error("Session not found");
        }

        const { data: scheduleContext } = await dbClient
          .from("schedule_generation_context")
          .select("*")
          .eq("class_id", classId)
          .maybeSingle();
        const { data: compressionContext } = await dbClient
          .from("course_compression_context")
          .select(
            "id,compressed_summary,key_concepts,learning_objectives,teaching_method,target_audience,difficulty_level,session_contexts,version",
          )
          .eq("class_id", classId)
          .maybeSingle();

        const systemPrompt = `You are an expert teacher planning a single class session.

Rules:
- Output JSON only (no Markdown, no code fences).
- Write the outline in ${language === "en" ? "English" : "Chinese"}.
- Use ONLY the provided class/session context.

Output JSON schema:
{
  "session_number": number,
  "title": string,
  "learning_objectives": string[],
  "outline": string[],
  "components_plan": [
    { "type": "text", "description": string },
    { "type": "question", "description": string }
  ]
}

The components_plan must include BOTH types ("text" and "question").`;

        const userPrompt = `Class:
- name: ${cls.name}
- description: ${cls.description || ""}

Session:
- session_number: ${session.session_number}
- title: ${session.title}
- description: ${session.description || ""}
- scheduled_date: ${session.scheduled_date || ""}
- duration_minutes: ${session.duration_minutes || ""}

Schedule context:
${scheduleContext ? JSON.stringify(scheduleContext) : "N/A"}

Course info library:
- summary: ${compressionContext?.compressed_summary || ""}
- key concepts: ${(compressionContext?.key_concepts || []).join(", ")}
- learning objectives: ${(compressionContext?.learning_objectives || []).join(", ")}
- teaching method: ${compressionContext?.teaching_method || ""}
- target audience: ${compressionContext?.target_audience || ""}
- difficulty level: ${compressionContext?.difficulty_level || ""}
- session contexts: ${JSON.stringify(compressionContext?.session_contexts || [])}

Teacher notes:
${actionData?.teacherNotes || ""}`;

        const { text } = await generateText({
          model: openai.chat(DEFAULT_MODEL),
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          maxTokens: 1200,
          temperature: 0.4,
          abortSignal: AbortSignal.timeout(30000),
        });

        const parsed =
          extractJsonObject<{
            session_number: number;
            title: string;
            learning_objectives: string[];
            outline: string[];
            components_plan: Array<{
              type: "text" | "question";
              description: string;
            }>;
          }>(text) || parseModelResponse(text);

        if (!parsed || !parsed.outline) {
          throw new Error("Failed to parse session outline draft");
        }

        const outlineDraft = {
          session_number: parsed.session_number || session.session_number,
          title: parsed.title || session.title,
          learning_objectives: parsed.learning_objectives || [],
          outline: parsed.outline || [],
          components_plan: parsed.components_plan || [],
        };

        const componentsLines = (outlineDraft.components_plan || []).map(
          (item) => `${item.type}: ${item.description}`,
        );

        const message =
          language === "en"
            ? `Session ${outlineDraft.session_number}: ${outlineDraft.title}\n\nOutline:\n- ${outlineDraft.outline.join(
                "\n- ",
              )}\n\nLearning objectives:\n- ${outlineDraft.learning_objectives.join(
                "\n- ",
              )}\n\nComponents plan:\n- ${componentsLines.join(
                "\n- ",
              )}\n\nPlease review and reply \"approve\" to confirm, or paste edits as bullet points.`
            : `第${outlineDraft.session_number}节：${outlineDraft.title}\n\n大纲：\n- ${outlineDraft.outline.join(
                "\n- ",
              )}\n\n学习目标：\n- ${outlineDraft.learning_objectives.join(
                "\n- ",
              )}\n\n组件规划：\n- ${componentsLines.join(
                "\n- ",
              )}\n\n请确认大纲（回复“确认”），或用项目符号直接贴出修改。`;

        const nextAgentState = {
          ...(actionData?.agentState || {}),
          sessionOutlineStatus: "reviewing",
          sessionOutlineDraft: outlineDraft,
          sessionOutlineSessionId: sessionId,
          sessionOutlineClassId: classId,
          sessionOutlineLanguage: language,
        };

        return {
          success: true,
          message,
          classId,
          sessionId,
          outlineDraft,
          agentState: nextAgentState,
          toolsUsed: ["generateSessionOutlineDraft"],
        };
      }

      case "a2a_session_generate_and_save": {
        const classId =
          actionData?.classId ||
          metadata.classId ||
          metadata.selectedClassId ||
          metadata?.requestContext?.selectedClassId;
        const sessionId =
          actionData?.sessionId ||
          metadata.sessionId ||
          metadata.selectedSessionId;

        if (!classId || !sessionId) {
          throw new Error("Missing classId or sessionId for session generation");
        }

        const { data: cls } = await dbClient
          .from("classes")
          .select("id,name,description,created_by,organization_id")
          .eq("id", classId)
          .maybeSingle();

        if (!cls) {
          throw new Error("Class not found");
        }

        const { data: membership } = await dbClient
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          cls.created_by !== user.id &&
          !membership?.role?.match(/teacher|owner/)
        ) {
          throw new Error("Forbidden: not a teacher in this class");
        }

        const { data: session } = await dbClient
          .from("course_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();

        if (!session) {
          throw new Error("Session not found");
        }

        const { data: scheduleContext } = await dbClient
          .from("schedule_generation_context")
          .select("*")
          .eq("class_id", classId)
          .maybeSingle();
        const { data: compressionContext } = await dbClient
          .from("course_compression_context")
          .select(
            "id,compressed_summary,key_concepts,learning_objectives,teaching_method,target_audience,difficulty_level,session_contexts,version",
          )
          .eq("class_id", classId)
          .maybeSingle();

        const outlineDraft =
          actionData?.outlineDraft ||
          actionData?.sessionOutlineDraft ||
          actionData?.agentState?.sessionOutlineDraft ||
          null;

        const conversationContext = outlineDraft
          ? [
              `Outline: ${(outlineDraft.outline || []).join("; ")}`,
              `Objectives: ${(outlineDraft.learning_objectives || []).join("; ")}`,
              `Components plan: ${(outlineDraft.components_plan || [])
                .map((item: any) => `${item.type}: ${item.description}`)
                .join("; ")}`,
            ].join("\n")
          : "";

        const { data: previousSessions } = await dbClient
          .from("course_sessions")
          .select("session_number,title,description,chapter_id")
          .eq("class_id", classId)
          .lt("session_number", session.session_number)
          .order("session_number", { ascending: true });

        const previousSummary = (previousSessions || [])
          .map(
            (s: any) =>
              `Session ${s.session_number}: ${s.title}${s.description ? ` - ${s.description}` : ""}`,
          )
          .join("\n");

        const a2aContext: A2AContext = {
          className: cls.name,
          classDescription: cls.description || "",
          sessionNumber: session.session_number,
          sessionTitle: session.title,
          sessionDescription: session.description || "",
          scheduledDate: session.scheduled_date,
          previousSessionsSummary: previousSummary,
          conversationContext,
          scheduleContext: scheduleContext || null,
          courseInfo: compressionContext
            ? {
                summary: compressionContext.compressed_summary || "",
                keyConcepts: Array.isArray(compressionContext.key_concepts)
                  ? compressionContext.key_concepts
                  : [],
                learningObjectives: Array.isArray(
                  compressionContext.learning_objectives,
                )
                  ? compressionContext.learning_objectives
                  : [],
                teachingMethod: compressionContext.teaching_method || "",
                targetAudience: compressionContext.target_audience || "",
                difficultyLevel: compressionContext.difficulty_level || "",
                sessionContexts: Array.isArray(
                  compressionContext.session_contexts,
                )
                  ? compressionContext.session_contexts
                  : [],
              }
            : undefined,
        };

        const { data: generation, error: generationError } = await dbClient
          .from("a2a_session_generations")
          .insert({
            session_id: sessionId,
            created_by: user.id,
            status: "running",
            max_iterations: 3,
            current_iteration: 0,
          })
          .select()
          .single();

        if (generationError) {
          throw generationError;
        }

        const builderFeedback: any[] = [];
        const criticFeedback: any[] = [];
        let finalComponents: any[] = [];

        try {
          for (let iteration = 1; iteration <= 3; iteration += 1) {
            const lastStudentFeedback =
              iteration > 1
                ? criticFeedback[criticFeedback.length - 1]?.overall_feedback
                : undefined;
            const teacherPrompt = buildTeacherAgentPrompt(
              a2aContext,
              iteration,
              lastStudentFeedback,
            );

            const teacherResult = await generateText({
              model: openai.chat(DEFAULT_MODEL),
              prompt: teacherPrompt,
              temperature: 0.7,
            });

            const components = extractComponentsFromTeacherResponse(
              teacherResult.text,
            );
            if (!components || components.length === 0) {
              throw new Error("Teacher output did not include components");
            }

            builderFeedback.push({
              iteration,
              content: teacherResult.text,
              components,
              timestamp: new Date().toISOString(),
            });

            finalComponents = components;

            if (iteration < 3) {
              const studentPrompt = buildStudentAgentPrompt(
                a2aContext,
                iteration,
              );
              const studentResult = await generateText({
                model: openai.chat(DEFAULT_MODEL),
                prompt: `${studentPrompt}\n\n**CONTENT TO REVIEW:**\n${JSON.stringify(components, null, 2)}`,
                temperature: 0.5,
              });

              const feedback = extractFeedbackFromStudentResponse(
                studentResult.text,
              );
              criticFeedback.push({
                iteration,
                ...feedback,
                raw: studentResult.text,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (error: any) {
          await dbClient
            .from("a2a_session_generations")
            .update({
              status: "failed",
              current_iteration: builderFeedback.length,
              builder_feedback: builderFeedback,
              critic_feedback: criticFeedback,
              error_message: error?.message || "Session content generation failed",
            })
            .eq("id", generation.id);
          throw error;
        }

        const { data: chapter } = await dbClient
          .from("chapters")
          .insert({
            class_id: classId,
            course_id: session.course_id || null,
            title: session.title,
            description: session.description || "",
            order_index: session.session_number,
          })
          .select()
          .single();

        if (!chapter?.id) {
          throw new Error("Failed to create chapter for session content");
        }

        const componentsToInsert = finalComponents.map(
          (component: any, idx: number) => ({
            chapter_id: chapter.id,
            type: component.type || "text",
            content: component.content || {},
            order_index: idx,
          }),
        );

        const { error: componentsError } = await dbClient
          .from("components")
          .insert(componentsToInsert);

        if (componentsError) {
          throw componentsError;
        }

        await dbClient
          .from("course_sessions")
          .update({
            chapter_id: chapter.id,
            content_generated: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        const conceptList = extractConceptsFromComponents(finalComponents);
        if (compressionContext?.id) {
          const existingConcepts = Array.isArray(compressionContext.key_concepts)
            ? compressionContext.key_concepts
            : [];
          const mergedConcepts = Array.from(
            new Set([...existingConcepts, ...conceptList]),
          );

          const sessionContexts = Array.isArray(
            compressionContext.session_contexts,
          )
            ? compressionContext.session_contexts
            : [];
          const updatedSessionContexts = [
            ...sessionContexts.filter(
              (c: any) => c.session_number !== session.session_number,
            ),
            {
              session_number: session.session_number,
              session_title: session.title,
              components_count: finalComponents.length,
              key_concepts: conceptList,
              generated_at: new Date().toISOString(),
            },
          ];

          await dbClient
            .from("course_compression_context")
            .update({
              key_concepts: mergedConcepts,
              session_contexts: updatedSessionContexts,
              last_updated: new Date().toISOString(),
              version: compressionContext.version
                ? compressionContext.version + 1
                : 1,
            })
            .eq("id", compressionContext.id);
        }

        await dbClient
          .from("a2a_session_generations")
          .update({
            status: "completed",
            current_iteration: 3,
            builder_feedback: builderFeedback,
            critic_feedback: criticFeedback,
            final_content: { components: finalComponents },
          })
          .eq("id", generation.id);

        const nextAgentState = {
          ...(actionData?.agentState || {}),
          sessionOutlineStatus: "done",
          sessionOutlineSessionId: sessionId,
          sessionOutlineClassId: classId,
        };

        return {
          success: true,
          message:
            "✅ 课次内容已生成并写入数据库。现在可以在该课次中查看完整组件内容。",
          classId,
          sessionId,
          chapterId: chapter.id,
          toolsUsed: ["a2a_session_generation", "save_session_content"],
          agentState: nextAgentState,
        };
      }

      case "save_class_outline": {
        const classId =
          actionData?.classId ||
          metadata.classId ||
          metadata.selectedClassId ||
          metadata?.requestContext?.selectedClassId;
        const language: "zh" | "en" =
          actionData?.language === "en" ? "en" : "zh";
        const requirements =
          actionData?.requirements || actionData?.outlineDraft?.requirements;
        const chapters = actionData?.chapters || actionData?.outlineDraft?.chapters;

        if (!classId) {
          throw new Error("Missing classId for save_class_outline");
        }
        if (!requirements || !chapters) {
          throw new Error("Missing requirements/chapters for save_class_outline");
        }

        const { data: cls } = await dbClient
          .from("classes")
          .select("id,name,created_by")
          .eq("id", classId)
          .maybeSingle();

        if (!cls) {
          throw new Error("Class not found");
        }

        const { data: membership } = await dbClient
          .from("class_members")
          .select("role")
          .eq("class_id", classId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          cls.created_by !== user.id &&
          !membership?.role?.match(/teacher|owner/)
        ) {
          throw new Error("Forbidden: not a teacher in this class");
        }

        const { data: existing } = await dbClient
          .from("course_outlines")
          .select("id")
          .eq("class_id", classId)
          .eq("created_by", user.id)
          .maybeSingle();

        if (existing?.id) {
          const { error: updateError } = await dbClient
            .from("course_outlines")
            .update({ requirements, chapters })
            .eq("id", existing.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await dbClient
            .from("course_outlines")
            .insert({
              class_id: classId,
              requirements,
              chapters,
              created_by: user.id,
            });

          if (insertError) {
            throw insertError;
          }
        }

        const { data: classSessions } = await dbClient
          .from("course_sessions")
          .select("id,session_number,title,description")
          .eq("class_id", classId)
          .order("session_number", { ascending: true });

        const outlineLabel = language === "en" ? "Session Outline" : "课程大纲";
        const objectivesLabel =
          language === "en" ? "Learning objectives" : "学习目标";
        const componentsLabel =
          language === "en" ? "Components plan" : "组件规划";
        const formatBullets = (items: string[]) =>
          items
            .filter(Boolean)
            .map((item) => `- ${item}`)
            .join("\n");

        const chapterByNumber = new Map<number, any>();
        (chapters || []).forEach((chapter: any) => {
          const number = Number(chapter.session_number);
          if (!Number.isNaN(number)) chapterByNumber.set(number, chapter);
        });

        if (classSessions && classSessions.length > 0) {
          for (const session of classSessions) {
            const chapter = chapterByNumber.get(session.session_number);
            if (!chapter) continue;

            const objectives = formatBullets(
              Array.isArray(chapter.learning_objectives)
                ? chapter.learning_objectives
                : [],
            );
            const outlineLines = formatBullets(
              Array.isArray(chapter.outline) ? chapter.outline : [],
            );
            const componentsPlan = formatBullets(
              Array.isArray(chapter.components_plan)
                ? chapter.components_plan.map(
                    (item: any) => `${item.type}: ${item.description}`,
                  )
                : [],
            );

            const outlineBlock = [
              `${outlineLabel}:`,
              outlineLines,
              "",
              `${objectivesLabel}:`,
              objectives,
              "",
              `${componentsLabel}:`,
              componentsPlan,
            ]
              .filter((line) => line !== "")
              .join("\n");

            const baseDescription =
              typeof session.description === "string"
                ? session.description.trim()
                : "";
            const splitIndex = baseDescription.indexOf(outlineLabel);
            const prefix =
              splitIndex === -1
                ? baseDescription
                : baseDescription.slice(0, splitIndex).trim();
            const description = prefix
              ? `${prefix}\n\n${outlineBlock}`
              : outlineBlock;

            await dbClient
              .from("course_sessions")
              .update({ description, updated_at: new Date().toISOString() })
              .eq("id", session.id);
          }
        }

        const { data: existingContext } = await dbClient
          .from("course_compression_context")
          .select("id,session_contexts,version")
          .eq("class_id", classId)
          .maybeSingle();

        const outlineContexts = (chapters || []).map((chapter: any) => ({
          session_number: chapter.session_number,
          session_title: chapter.title,
          title: chapter.title,
          outline: chapter.outline || [],
          learning_objectives: chapter.learning_objectives || [],
          components_plan: chapter.components_plan || [],
          updated_at: new Date().toISOString(),
        }));

        if (existingContext?.id) {
          const existingSessionContexts = Array.isArray(
            existingContext.session_contexts,
          )
            ? existingContext.session_contexts
            : [];
          const outlineSessionNumbers = new Set(
            outlineContexts.map((context: any) => context.session_number),
          );
          const mergedSessionContexts = [
            ...existingSessionContexts.filter(
              (context: any) =>
                !outlineSessionNumbers.has(context.session_number),
            ),
            ...outlineContexts,
          ];
          await dbClient
            .from("course_compression_context")
            .update({
              session_contexts: mergedSessionContexts,
              last_updated: new Date().toISOString(),
              version: existingContext.version ? existingContext.version + 1 : 1,
            })
            .eq("id", existingContext.id);
        }

        return {
          success: true,
          message:
            language === "en"
              ? `Saved the outline for class "${cls.name}".`
              : `✅ 已保存班级「${cls.name}」的课程大纲。`,
          classId,
          toolsUsed: ["saveClassOutline", "updateSessionDescriptions"],
          agentState: actionData?.agentState || null,
        };
      }

      case "entity_management": {
        const dbClient = createAdminClient();
        const action = actionData?.action;
        const entity = actionData?.entity;

        if (!action || !entity) {
          throw new Error("缺少实体管理所需的 action 或 entity 参数");
        }

        // 统一解析上下文 ID
        const classId =
          actionData.classId || metadata.classId || metadata.selectedClassId;
        const sessionId =
          actionData.sessionId ||
          metadata.sessionId ||
          metadata.selectedSessionId;
        const assignmentId =
          actionData.assignmentId ||
          metadata.assignmentId ||
          metadata.selectedAssignmentId;

        // 班级相关 CRUD
        if (entity === "class") {
          switch (action) {
            case "list":
            case "read": {
              const { data: createdClasses } = await dbClient
                .from("classes")
                .select("id,name,description,join_code,created_at")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });

              const { data: memberClasses } = await dbClient
                .from("class_members")
                .select(
                  `
                  class_id,
                  role,
                  classes!inner (
                    id,
                    name,
                    description,
                    join_code,
                    created_at
                  )
                `,
                )
                .eq("user_id", user.id)
                .in("role", ["teacher", "owner"]);

              const merged = new Map<string, any>();
              (createdClasses || []).forEach((c: any) => merged.set(c.id, c));
              (memberClasses || []).forEach((mc: any) => {
                const cls = (mc as any).classes;
                merged.set(cls.id, cls);
              });

              const classes = Array.from(merged.values());

              const lines = classes.map(
                (c: any) =>
                  `- 班级：${c.name} | ID: ${c.id} | 加入码: ${c.join_code}`,
              );

              return {
                success: true,
                message:
                  lines.length > 0
                    ? `以下是您名下的班级列表：\n${lines.join("\n")}`
                    : "目前还没有找到您创建的班级，可以先让我帮您创建一个。",
                toolsUsed: ["listTeacherClasses"],
              };
            }
            case "create": {
              const name =
                actionData.details?.name || actionData.details?.title;
              const description = actionData.details?.description || "" || " ";

              if (!name) {
                throw new Error("创建班级时缺少名称，请在对话中明确班级名称");
              }

              const joinCode = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

              const db = createAdminClient();

              const { data: orgMember, error: orgError } = await db
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

              let organizationId = orgMember?.organization_id || null;

              if (orgError) {
                throw orgError;
              }

              if (!organizationId) {
                const rawName =
                  (user.user_metadata?.full_name as string) ||
                  (user.user_metadata?.name as string) ||
                  (user.email ? user.email.split("@")[0] : "") ||
                  "老师";
                const orgName = `${rawName} 的组织`;
                const slugBase = rawName
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "") || "teacher";

                let slug = slugBase;
                for (let attempt = 0; attempt < 3; attempt += 1) {
                  const { data: existing } = await db
                    .from("organizations")
                    .select("id")
                    .eq("slug", slug)
                    .maybeSingle();
                  if (!existing) break;
                  slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
                }

                const { data: org, error: createOrgError } = await db
                  .from("organizations")
                  .insert({ name: orgName, slug })
                  .select()
                  .single();

                if (createOrgError || !org?.id) {
                  throw createOrgError || new Error("无法创建默认组织");
                }

                const { error: memberError } = await db
                  .from("organization_members")
                  .insert({
                    organization_id: org.id,
                    user_id: user.id,
                    role: "owner",
                  });

                if (memberError) {
                  throw memberError;
                }

                organizationId = org.id;
              }

              const { data: classData, error: classError } = await db
                .from("classes")
                .insert({
                  name,
                  description,
                  organization_id: organizationId,
                  join_code: joinCode,
                  created_by: user.id,
                })
                .select()
                .single();

              if (classError) {
                throw classError;
              }

              await db.from("class_members").insert({
                class_id: classData.id,
                user_id: user.id,
                role: "teacher",
              });

              return {
                success: true,
                message: `✅ 班级「${name}」已创建完成，加入代码为：${joinCode}`,
                classId: classData.id,
                joinCode,
                toolsUsed: ["createClass"],
              };
            }
            case "update": {
              if (!classId) {
                throw new Error("更新班级前需要先指定班级ID");
              }
              const updates: Record<string, any> = {};
              if (actionData.details?.name) {
                updates.name = actionData.details.name;
              }
              if (actionData.details?.description) {
                updates.description = actionData.details.description;
              }
              if (Object.keys(updates).length === 0) {
                throw new Error("没有可更新的字段（name/description）");
              }

              const { data: cls, error: classError } = await dbClient
                .from("classes")
                .update(updates)
                .eq("id", classId)
                .select("id,name,description")
                .single();

              if (classError || !cls) {
                throw classError || new Error("班级更新失败");
              }

              return {
                success: true,
                message: `✅ 班级已更新：${cls.name}\n描述：${cls.description || "（无描述）"}`,
                classId,
                toolsUsed: ["updateClass"],
              };
            }
            case "delete": {
              if (!classId) {
                throw new Error("删除班级前需要先指定班级ID");
              }

              const { error: deleteError } = await dbClient
                .from("classes")
                .delete()
                .eq("id", classId);

              if (deleteError) {
                throw deleteError;
              }

              return {
                success: true,
                message: "✅ 班级已删除（相关课次和作业也会一并清理）。",
                classId,
                toolsUsed: ["deleteClass"],
              };
            }
          }
        }

        // 课次相关 CRUD
        if (entity === "session") {
          if (!classId && ["create", "list", "read"].includes(action)) {
            throw new Error("请先在界面中选择一个班级，或在对话中明确班级。");
          }

          switch (action) {
            case "list":
            case "read": {
              const { data: cls } = await dbClient
                .from("classes")
                .select("id,name,created_by")
                .eq("id", classId)
                .maybeSingle();

              if (!cls) {
                throw new Error("找不到该班级，无法列出课次。");
              }

              // 权限：必须是创建者或授课教师
              const { data: membership } = await dbClient
                .from("class_members")
                .select("role")
                .eq("class_id", classId)
                .eq("user_id", user.id)
                .maybeSingle();

              if (
                cls.created_by !== user.id &&
                !membership?.role?.match(/teacher|owner/)
              ) {
                throw new Error("无权查看该班级的课次。");
              }

              const { data: sessions } = await dbClient
                .from("course_sessions")
                .select(
                  "id,title,scheduled_date,start_time,session_number,class_id",
                )
                .eq("class_id", classId)
                .order("session_number", { ascending: true });

              const lines = (sessions || []).map(
                (s: any) =>
                  `- 第${s.session_number || "?"}节：${s.title} | 时间：${s.scheduled_date?.slice(0, 10) || "未设"} ${s.start_time || ""} | ID: ${s.id}`,
              );

              return {
                success: true,
                message:
                  lines.length > 0
                    ? `班级「${cls.name}」的课次如下：\n${lines.join("\n")}`
                    : "当前班级还没有任何课次，可以让我帮你创建第一节课。",
                classId,
                toolsUsed: ["listClassSessions"],
              };
            }
            case "create": {
              const title = actionData.details?.title;
              if (!title) {
                throw new Error("创建课次需要标题，请补充课次标题。");
              }
              const scheduledDate = actionData.details?.scheduledDate || null;
              const startTime = actionData.details?.startTime || null;

              const { data: lastSession } = await dbClient
                .from("course_sessions")
                .select("session_number")
                .eq("class_id", classId)
                .order("session_number", { ascending: false })
                .limit(1)
                .maybeSingle();

              const nextNumber = (lastSession?.session_number || 0) + 1;

              const { data: session, error: sessionError } = await dbClient
                .from("course_sessions")
                .insert({
                  class_id: classId,
                  session_number: nextNumber,
                  title,
                  description: actionData.details?.description || "",
                  scheduled_date: scheduledDate,
                  start_time: startTime,
                  duration_minutes: actionData.details?.durationMinutes || null,
                  created_by: user.id,
                })
                .select("id,title,scheduled_date,start_time,session_number")
                .single();

              if (sessionError || !session) {
                throw sessionError || new Error("课次创建失败");
              }

              return {
                success: true,
                message: `✅ 已为班级创建第${session.session_number}节课「${session.title}」。${
                  session.scheduled_date
                    ? `时间：${session.scheduled_date?.slice(0, 10)} ${session.start_time || ""}`
                    : "尚未设置具体时间"
                }`,
                classId,
                toolsUsed: ["createSession"],
              };
            }
            case "update": {
              if (!sessionId) {
                throw new Error("更新课次前需要先指定课次ID");
              }
              const updates: Record<string, any> = {};
              if (actionData.details?.title) {
                updates.title = actionData.details.title;
              }
              if (actionData.details?.scheduledDate) {
                updates.scheduled_date = actionData.details.scheduledDate;
              }
              if (actionData.details?.startTime) {
                updates.start_time = actionData.details.startTime;
              }
              if (Object.keys(updates).length === 0) {
                throw new Error(
                  "没有可更新的字段（title/scheduledDate/startTime）",
                );
              }

              const { data: session, error: sessionError } = await dbClient
                .from("course_sessions")
                .update(updates)
                .eq("id", sessionId)
                .select("id,title,scheduled_date,start_time,session_number")
                .single();

              if (sessionError || !session) {
                throw sessionError || new Error("课次更新失败");
              }

              return {
                success: true,
                message: `✅ 课次已更新：第${session.session_number}节「${session.title}」，时间：${session.scheduled_date?.slice(0, 10)} ${session.start_time || ""}`,
                classId: session.class_id,
                toolsUsed: ["updateSession"],
              };
            }
            case "delete": {
              if (!sessionId) {
                throw new Error("删除课次前需要先指定课次ID");
              }

              const { error: deleteError } = await dbClient
                .from("course_sessions")
                .delete()
                .eq("id", sessionId);

              if (deleteError) {
                throw deleteError;
              }

              return {
                success: true,
                message: "✅ 课次已删除。",
                classId,
                toolsUsed: ["deleteSession"],
              };
            }
          }
        }

        // 作业相关 CRUD
        if (entity === "assignment") {
          switch (action) {
            case "list":
            case "read": {
              if (!classId) {
                throw new Error("请先指定班级，再查看作业列表。");
              }

              const { data: cls } = await dbClient
                .from("classes")
                .select("id,name,created_by")
                .eq("id", classId)
                .maybeSingle();

              if (!cls) {
                throw new Error("找不到该班级，无法列出作业。");
              }

              const { data: membership } = await dbClient
                .from("class_members")
                .select("role")
                .eq("class_id", classId)
                .eq("user_id", user.id)
                .maybeSingle();

              if (
                cls.created_by !== user.id &&
                !membership?.role?.match(/teacher|owner/)
              ) {
                throw new Error("无权查看该班级的作业。");
              }

              const { data: assignments } = await dbClient
                .from("assignments")
                .select("id,title,description,created_at,due_date")
                .eq("class_id", classId)
                .order("created_at", { ascending: true });

              const lines = (assignments || []).map(
                (a: any) =>
                  `- 作业：${a.title} | 截止：${a.due_date ? a.due_date.slice(0, 16) : "未设置"} | ID: ${a.id}`,
              );

              return {
                success: true,
                message:
                  lines.length > 0
                    ? `班级「${cls.name}」的作业如下：\n${lines.join("\n")}`
                    : "当前班级还没有作业，可以让我帮你创建一个。",
                classId,
                toolsUsed: ["listClassAssignments"],
              };
            }
            case "create": {
              if (!classId) {
                throw new Error("创建作业前需要先指定班级");
              }

              const title = actionData.details?.title || "未命名作业";
              const description = actionData.details?.description || "";
              const dueDate = actionData.details?.dueDate || null;

              const { data: assignment, error: assignmentError } =
                await dbClient
                  .from("assignments")
                  .insert({
                    class_id: classId,
                    title,
                    description,
                    due_date: dueDate,
                    created_by: user.id,
                  })
                  .select("id,title,due_date")
                  .single();

              if (assignmentError || !assignment) {
                throw assignmentError || new Error("作业创建失败");
              }

              return {
                success: true,
                message: `✅ 已为班级创建作业「${assignment.title}」，截止时间：${assignment.due_date || "未设置"}`,
                assignmentId: assignment.id,
                classId,
                toolsUsed: ["createAssignment"],
              };
            }
            case "update": {
              if (!assignmentId) {
                throw new Error("更新作业前需要先指定作业ID");
              }
              const updates: Record<string, any> = {};
              if (actionData.details?.title) {
                updates.title = actionData.details.title;
              }
              if (actionData.details?.description) {
                updates.description = actionData.details.description;
              }
              if (actionData.details?.dueDate) {
                updates.due_date = actionData.details.dueDate;
              }
              if (Object.keys(updates).length === 0) {
                throw new Error(
                  "没有可更新的字段（title/description/dueDate）",
                );
              }

              const { data: assignment, error: assignmentError } =
                await dbClient
                  .from("assignments")
                  .update(updates)
                  .eq("id", assignmentId)
                  .select("id,title,due_date,class_id")
                  .single();

              if (assignmentError || !assignment) {
                throw assignmentError || new Error("作业更新失败");
              }

              return {
                success: true,
                message: `✅ 作业已更新：「${assignment.title}」，截止时间：${assignment.due_date || "未设置"}`,
                assignmentId,
                classId: assignment.class_id,
                toolsUsed: ["updateAssignment"],
              };
            }
            case "delete": {
              if (!assignmentId) {
                throw new Error("删除作业前需要先指定作业ID");
              }

              const { error: deleteError } = await dbClient
                .from("assignments")
                .delete()
                .eq("id", assignmentId);

              if (deleteError) {
                throw deleteError;
              }

              return {
                success: true,
                message: "✅ 作业已删除。",
                assignmentId,
                classId,
                toolsUsed: ["deleteAssignment"],
              };
            }
          }
        }

        throw new Error(
          `不支持的实体管理操作：entity=${entity}, action=${action}`,
        );
      }

      default:
        throw new Error(`不支持的操作类型: ${actionType}`);
    }
  } catch (error: any) {
    console.error("数据库操作失败:", {
      actionType,
      actionData,
      userId: user?.id,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // 提供更详细的错误信息
    const errorMessage = error.message || "未知数据库错误";
    const isPermissionError = errorMessage.includes("permission") || errorMessage.includes("forbidden") || errorMessage.includes("权限");
    const isConnectionError = errorMessage.includes("connection") || errorMessage.includes("network") || errorMessage.includes("连接");
    const isValidationError = errorMessage.includes("validation") || errorMessage.includes("validate") || errorMessage.includes("验证");

    let userFriendlyMessage = "❌ 数据库操作失败，请稍后重试";

    if (isPermissionError) {
      userFriendlyMessage = "❌ 权限不足，请检查您的账户权限或联系管理员";
    } else if (isConnectionError) {
      userFriendlyMessage = "❌ 数据库连接失败，请稍后重试或联系技术支持";
    } else if (isValidationError) {
      userFriendlyMessage = "❌ 数据验证失败，请检查输入的数据格式和内容";
    }

    return {
      success: false,
      message: userFriendlyMessage,
      error: errorMessage,
      errorType: isPermissionError ? "permission" : isConnectionError ? "connection" : isValidationError ? "validation" : "unknown",
      timestamp: new Date().toISOString(),
    };
  }
}
