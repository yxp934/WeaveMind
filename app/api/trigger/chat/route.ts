import { NextRequest, NextResponse } from "next/server";
import { runs, streams, tasks } from "@trigger.dev/sdk";
import { createClient } from "@/lib/supabase/server";
import type { enhancedChatStreamTask } from "@/src/trigger/tasks/chatbot-stream";

export const runtime = "nodejs";

/**
 * Trigger.dev Enhanced Chat API
 *
 * This endpoint triggers the real Trigger.dev task and proxies the stream/output
 * back to the Teacher Dashboard Chatbot.
 */

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";
const STREAM_TIMEOUT_SECONDS = 120;
const POLL_INTERVAL_MS = 1000;

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

function ensureConfirmationMetadata(
  metadata: Record<string, any> | undefined,
  userText?: string,
) {
  const base = metadata ? { ...metadata } : {};
  const actionType =
    base.actionType ||
    (base.actionData?.action && base.actionData?.entity
      ? "entity_management"
      : undefined);
  const adjustedActionData = normalizeActionData(base.actionData, userText);
  const requiresDatabaseAction = Boolean(
    (base.requiresDatabaseAction || actionType) && actionType
  );

  if (!requiresDatabaseAction) {
    return {
      ...base,
      actionType,
      actionData: adjustedActionData ?? base.actionData,
    };
  }

  const pendingToolCallId =
    base.pendingToolCallId || base.pendingToolCall?.id || crypto.randomUUID();
  const pendingToolCallBase = base.pendingToolCall || {
    id: pendingToolCallId,
    toolName: actionType,
    input: adjustedActionData || {},
  };
  const input =
    pendingToolCallBase?.input &&
    typeof pendingToolCallBase.input === "object" &&
    !Array.isArray(pendingToolCallBase.input)
      ? pendingToolCallBase.input
      : adjustedActionData || {};
  const normalizedInput = normalizeActionData(input, userText);
  const pendingToolCall = {
    ...pendingToolCallBase,
    id: pendingToolCallBase.id || pendingToolCallId,
    toolName: pendingToolCallBase.toolName || actionType,
    input: normalizedInput,
  };

  return {
    ...base,
    actionData: adjustedActionData ?? base.actionData,
    pendingToolCall,
    pendingToolCallId,
    requiresDatabaseAction: true,
    confirmationRequired: true,
  };
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

async function forwardConfirmToolCall(
  request: NextRequest,
  message: string,
  context: any
) {
  const forwardUrl = new URL("/api/ai/chat", request.url);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const cookie = request.headers.get("cookie");
  if (cookie) headers.cookie = cookie;
  const authorization = request.headers.get("authorization");
  if (authorization) headers.authorization = authorization;

  const res = await fetch(forwardUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, context, stream: false }),
  });

  const data = await res.json().catch(() => null);

  if (!data) {
    return NextResponse.json(
      { success: false, error: { message: "Invalid response from /api/ai/chat" } },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: res.status });
}

type ChatRequest = {
  message?: string;
  context?: any;
  options?: {
    stream?: boolean;
    includeMetadata?: boolean;
    aiModel?: string;
    workflowType?: string;
  };
  stream?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, context } = body;

    if (!message || !context) {
      return NextResponse.json(
        { error: "Missing required fields: message, context" },
        { status: 400 }
      );
    }

    if (!context?.confirmToolCall && isApprovalMessage(message)) {
      const pendingToolCall = findPendingToolCall(context, message);
      if (pendingToolCall) {
        context.confirmToolCall = pendingToolCall;
      }
    }

    if (context?.confirmToolCall?.id && context.confirmToolCall.toolName) {
      const lastUserText = getLastNonApprovalUserText(context, message);
      context.confirmToolCall = {
        ...context.confirmToolCall,
        input: normalizeActionData(context.confirmToolCall.input, lastUserText),
      };
      return await forwardConfirmToolCall(request, message, context);
    }

    if (!context.userId || !context.conversationId) {
      try {
        const supabase = await createClient();
        const authResult = await supabase.auth.getUser();
        const user = authResult?.data?.user || null;
        if (user) {
          context.userId = context.userId || user.id;
          context.conversationId = context.conversationId || user.id;
        }
      } catch (error) {
        console.warn("Trigger chat auth lookup failed:", error);
      }
    }

    const executionMode = determineExecutionMode(message, context);
    const normalizedOptions = {
      stream: Boolean(body.options?.stream ?? body.stream),
      includeMetadata: body.options?.includeMetadata ?? true,
      aiModel: body.options?.aiModel || DEFAULT_MODEL,
      workflowType: body.options?.workflowType,
    };

    const payload = {
      message,
      context,
      options: normalizedOptions,
    };

    if (normalizedOptions.stream) {
      return await createTriggerStreamingResponse(payload, executionMode, request.signal);
    }

    const result = await triggerAndWaitForResult(payload, executionMode);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Trigger Chat API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

async function triggerAndWaitForResult(payload: any, executionMode: string) {
  const runHandle = await tasks.trigger<typeof enhancedChatStreamTask>(
    "enhanced-chat-stream",
    payload,
    {
      metadata: {
        executionMode,
        conversationId: payload.context?.conversationId,
        userRole: payload.context?.userRole,
      },
      tags: [
        `role:${payload.context?.userRole || "teacher"}`,
        `mode:${executionMode}`,
      ],
    }
  );

  const run = await runs.poll(runHandle.id, { pollIntervalMs: POLL_INTERVAL_MS });

  if (!run.isSuccess || !run.output) {
    throw new Error(run.error?.message || "Trigger run failed");
  }

  const output: any = run.output;
  const responseData =
    output.data ||
    output.langgraphResult?.data ||
    output.metadata?.langgraphResult?.data ||
    {};
  const responseMetadata = ensureConfirmationMetadata(
    responseData.metadata,
    payload.message,
  );
  const responseText = normalizeResponseText(
    responseData.message ||
      output.response ||
      output.content ||
      output.message ||
      "",
  );

  return {
    success: true,
    response: responseText,
    data: {
      message: responseText,
      choices: responseData.choices || undefined,
      toolsUsed: responseData.toolsUsed || responseMetadata.toolsUsed || [],
      metadata: responseMetadata,
      runId: run.id,
      executionMode,
    },
    metadata: {
      executionMode,
      task: "enhanced-chat-stream",
      runId: run.id,
      timestamp: new Date().toISOString(),
    },
    executionMode,
  };
}

async function createTriggerStreamingResponse(
  payload: any,
  executionMode: string,
  signal?: AbortSignal
) {
  const runHandle = await tasks.trigger<typeof enhancedChatStreamTask>(
    "enhanced-chat-stream",
    payload,
    {
      metadata: {
        executionMode,
        conversationId: payload.context?.conversationId,
        userRole: payload.context?.userRole,
      },
      tags: [
        `role:${payload.context?.userRole || "teacher"}`,
        `mode:${executionMode}`,
      ],
    }
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const realtimeStream = await streams.read<any>(runHandle.id, {
          timeoutInSeconds: STREAM_TIMEOUT_SECONDS,
          signal,
        });

        let accumulatedContent = "";

        for await (const chunk of realtimeStream) {
          const payloadChunk = normalizeStreamChunk(chunk);
          if (
            payloadChunk?.type === "token" &&
            typeof payloadChunk.content === "string"
          ) {
            accumulatedContent += payloadChunk.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payloadChunk)}\n\n`)
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "streaming",
                  content: accumulatedContent,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              )
            );
            continue;
          }

          if (
            (payloadChunk?.type === "response" ||
              payloadChunk?.type === "complete") &&
            !payloadChunk.data
          ) {
            const responseContent = normalizeResponseText(
              payloadChunk.response?.content ||
                payloadChunk.response ||
                payloadChunk.message ||
                "",
            );
            payloadChunk.data = {
              message: responseContent,
              response: responseContent,
              metadata: payloadChunk.response?.metadata || payloadChunk.metadata || {},
            };
          }

          if (payloadChunk?.data?.metadata) {
            payloadChunk.data.metadata = ensureConfirmationMetadata(
              payloadChunk.data.metadata,
              payload.message,
            );
          }

          if (payloadChunk?.data) {
            if ("message" in payloadChunk.data) {
              payloadChunk.data.message = normalizeResponseText(
                payloadChunk.data.message,
              );
            }
            if ("response" in payloadChunk.data) {
              payloadChunk.data.response = normalizeResponseText(
                payloadChunk.data.response,
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payloadChunk)}\n\n`)
          );
        }

        controller.close();
      } catch (error) {
        const err = error as Error;
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: {
                message: err.message,
                code: "STREAM_PROXY_ERROR",
              },
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function normalizeStreamChunk(chunk: any) {
  if (typeof chunk === "string") {
    const trimmed = chunk.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        return { type: "token", content: chunk };
      }
    }
    return { type: "token", content: chunk };
  }

  if (chunk && typeof chunk === "object") {
    return chunk;
  }

  return { type: "token", content: String(chunk) };
}

/**
 * Determine execution mode based on message and context
 */
function determineExecutionMode(
  message: string,
  context: any
): "langgraph" | "trigger" | "hybrid" {
  const messageLength = message.length;
  const hasComplexKeywords = [
    "generate",
    "create",
    "analyze",
    "optimize",
    "batch",
    "multiple",
  ].some((keyword) => message.toLowerCase().includes(keyword));

  if (hasComplexKeywords || messageLength > 500) {
    return "trigger";
  }

  if (messageLength > 200) {
    return "hybrid";
  }

  return "langgraph";
}

/**
 * GET endpoint for testing and health checks
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    status: "healthy",
    version: "1.0.0",
    task: "enhanced-chat-stream",
    capabilities: {
      streaming: true,
      triggerTasks: true,
    },
    timestamp: new Date().toISOString(),
  });
}
