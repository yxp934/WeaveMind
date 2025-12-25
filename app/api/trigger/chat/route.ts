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

function inferEntityOverride(message: string) {
  if (!message) return null;
  if (/(课次|课节|第\s*\d+\s*(节|课)|session|sessions|lesson)/i.test(message)) {
    return "session";
  }
  if (/(作业|assignment|assignments|任务)/i.test(message)) {
    return "assignment";
  }
  return null;
}

function applyEntityOverride(actionData: any, message?: string) {
  const override = message ? inferEntityOverride(message) : null;
  if (!override) return actionData;
  const next =
    actionData && typeof actionData === "object" && !Array.isArray(actionData)
      ? { ...actionData }
      : {};
  if (!next.entity || next.entity === "class") {
    next.entity = override;
  }
  return next;
}

function findPendingToolCall(context: any, userText?: string) {
  const history = Array.isArray(context?.conversationHistory)
    ? context.conversationHistory
    : [];
  let lastUserText: string | undefined;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const msg = history[i];
    if (msg?.role === "user" && typeof msg?.content === "string") {
      lastUserText = msg.content;
      break;
    }
  }
  if (!lastUserText && userText) {
    lastUserText = userText;
  }
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const meta = history[i]?.metadata || {};
    const pending = meta.pendingToolCall;
    if (pending?.id && pending.toolName) {
      return {
        ...pending,
        input: applyEntityOverride(pending.input, lastUserText),
      };
    }
    const actionType = meta.actionType;
    if (meta.requiresDatabaseAction && actionType) {
      return {
        id: meta.pendingToolCallId || crypto.randomUUID(),
        toolName: actionType,
        input: applyEntityOverride(meta.actionData || {}, lastUserText),
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
  const actionType = base.actionType;
  const adjustedActionData = applyEntityOverride(base.actionData, userText);
  const requiresDatabaseAction = Boolean(
    base.requiresDatabaseAction && actionType
  );

  if (!requiresDatabaseAction) {
    return {
      ...base,
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
  const normalizedInput = applyEntityOverride(input, userText);
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
  const responseText =
    responseData.message ||
    output.response ||
    output.content ||
    output.message ||
    "";

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
            const responseContent =
              payloadChunk.response?.content ||
              payloadChunk.response ||
              payloadChunk.message ||
              "";
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
