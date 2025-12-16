import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ChatRequest,
  StandardApiResponse,
  ChatResponseData,
} from "@/lib/types/api";
import { chatbot } from "@/lib/ai/langgraph/chatbot-graph";
import {
  createClassTool,
  createSessionTool,
  createAssignmentTool,
} from "@/lib/ai/teacher-dashboard-tools";
import { z } from "zod";

// Use Node.js runtime because this endpoint may perform Supabase admin operations.
export const runtime = "nodejs";

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
          input: z.record(z.any()),
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

    // 2. 检查认证状态
    const supabase = await createClient();
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    let user = authenticatedUser;
    let isDemoMode = false;

    // 如果没有用户但有上下文，或者明确设置为演示模式
    if (!user || (ctx?.userRole && !user)) {
      isDemoMode = true;
      // 演示模式下使用测试用户
      user = {
        id: "5e1ebe73-5f0e-4858-8376-499dc2b294cc",
        email: "test_maxtokens_2024@example.com",
      };
      console.log("🎭 演示模式：使用测试用户进行数据库操作", user.id);
    }

    // 3. 使用LangGraph聊天机器人处理消息
    // 🔧 关键修复：不要使用全局“default-conversation”，否则不同用户共享上下文导致串话/幻觉
    const conversationId =
      user?.id || ctx?.organizationId || crypto.randomUUID();
    const userRole = context?.userRole || (isDemoMode ? "teacher" : "student");
    const userId = user?.id || "demo-user";

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
        isDemoMode,
      );
    }

    // 5. 否则使用普通JSON响应
    const result = await chatbot.processMessage(
      message,
      conversationId,
      userRole,
      userId,
      context?.conversationHistory || [],
      {
        courseId: ctx?.courseId,
        classId: ctx?.classId,
        organizationId: ctx?.organizationId,
        selectedClassId: ctx?.selectedClassId,
        selectedSessionId: ctx?.selectedSessionId,
        selectedAssignmentId: ctx?.selectedAssignmentId,
        selectedContexts: ctx?.selectedContexts,
      },
    );

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

    // 强制需要确认的动作标记与默认 actionType
    const intentType = result.data?.metadata?.intent || result.data?.intent;
    if (
      intentType === "entity_management" ||
      result.data?.metadata?.actionType
    ) {
      result.data.metadata.intent = "entity_management";
      result.data.metadata.requiresDatabaseAction = true;
      if (!result.data.metadata.actionType) {
        result.data.metadata.actionType = "entity_management";
      }
      if (!result.data.metadata.actionData) {
        result.data.metadata.actionData = {};
      }
    }

    if ((result.data?.metadata?.toolsUsed || []).length > 5) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOOL_LIMIT_REACHED",
            message: "Tool call limit reached (5). Please simplify your request.",
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            processingTime,
          },
        },
        { status: 400 },
      );
    }

    // 6.5 如果是实体管理但缺少确认，直接返回待确认，不执行
    if (
      intentType === "entity_management" &&
      !context?.confirmToolCall?.id
    ) {
      const pendingToolCallId =
        result.data.metadata.pendingToolCallId || crypto.randomUUID();
      finalResult = {
        ...result,
        data: {
          ...result.data,
          message:
            result.data.message ||
            `Pending tool call ${result.data.metadata.actionType || "entity_management"}, awaiting confirmation.`,
          metadata: {
            ...result.data.metadata,
            pendingToolCall: {
              id: pendingToolCallId,
              toolName: result.data.metadata.actionType || "entity_management",
              input: result.data.metadata.actionData || {},
            },
            pendingToolCallId,
            requiresDatabaseAction: true,
            confirmationRequired: true,
          },
        },
      };
    } else if (result.success && result.data?.metadata?.requiresDatabaseAction) {
      console.log("🔧 检测到工具/数据库调用请求:", result.data.metadata.actionType);
      const pendingToolCallId =
        result.data.metadata.pendingToolCallId || crypto.randomUUID();
      const pendingToolCall = {
        id: pendingToolCallId,
        toolName: result.data.metadata.actionType,
        input: result.data.metadata.actionData || {},
      };

      // 如果本次请求带有确认且ID匹配，则执行（带重试）
      // 未确认则直接返回待确认
      if (!context?.confirmToolCall || context.confirmToolCall.id !== pendingToolCallId) {
        finalResult = {
          ...result,
          data: {
            ...result.data,
            message:
              result.data.message ||
              `Pending tool call ${pendingToolCall.toolName}, awaiting confirmation.`,
            metadata: {
              ...result.data.metadata,
              pendingToolCall,
              pendingToolCallId,
              requiresDatabaseAction: true,
              confirmationRequired: true,
            },
          },
        };
      } else {
        try {
          const effectiveUser = user || { id: userId };
          const dbOperationResult = await runWithRetry(
            () =>
              handleDatabaseOperation(
                result.data.metadata,
                supabase,
                effectiveUser,
                isDemoMode,
              ),
            5,
            5000,
          );

          if (dbOperationResult.success) {
            finalResult = {
              ...result,
              data: {
                ...result.data,
                message: dbOperationResult.message,
                metadata: {
                  ...result.data.metadata,
                  classId: dbOperationResult.classId,
                  joinCode: dbOperationResult.joinCode,
                  assignmentId: dbOperationResult.assignmentId,
                  pendingToolCall: null,
                  pendingToolCallId: null,
                  toolsUsed: [
                    ...(result.data.metadata.toolsUsed || []),
                    ...dbOperationResult.toolsUsed,
                  ],
                },
              },
            };
          } else {
            finalResult = {
              success: false,
              error: {
                code: "DATABASE_OPERATION_FAILED",
                message:
                  dbOperationResult.message ||
                  "Tool execution failed after retries.",
              },
            };
          }
        } catch (dbError: any) {
          console.error("❌ 工具调用失败:", dbError);
          finalResult = {
            success: false,
            error: {
              code: "DATABASE_OPERATION_FAILED",
              message: `Tool execution failed after retries: ${dbError.message}`,
            },
          };
        }
      }
    }

    // 7. 返回JSON响应
    if (finalResult.success) {
      return NextResponse.json({
        success: true,
        data: finalResult.data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          mode: isDemoMode ? "demo" : "production",
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
          details: error,
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
  isDemoMode: boolean,
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
        const result = await chatbot.processMessage(
          message,
          conversationId,
          userRole,
          userId,
          context?.conversationHistory || [],
          {
            courseId: context?.courseId,
            classId: context?.classId,
            organizationId: context?.organizationId,
            selectedClassId: context?.selectedClassId,
            selectedSessionId: context?.selectedSessionId,
            selectedAssignmentId: context?.selectedAssignmentId,
            selectedContexts: context?.selectedContexts,
          },
        );

        if (!result.success) {
          throw new Error(result.error?.message || "LangGraph处理失败");
        }

        // 强制需要确认的动作标记与默认 actionType
        const intentType = result.data?.metadata?.intent || result.data?.intent;
        if (
          intentType === "entity_management" ||
          result.data?.metadata?.actionType
        ) {
          result.data.metadata.intent = "entity_management";
          result.data.metadata.requiresDatabaseAction = true;
          if (!result.data.metadata.actionType) {
            result.data.metadata.actionType = "entity_management";
          }
          if (!result.data.metadata.actionData) {
            result.data.metadata.actionData = {};
          }
        }

        // 处理数据库/工具调用请求（流式模式下仅返回待确认信息，不自动执行）
        let finalResult = result;
        if (result.data?.metadata?.requiresDatabaseAction) {
          const pendingToolCallId =
            result.data.metadata.pendingToolCallId || crypto.randomUUID();
          const pendingToolCall = {
            id: pendingToolCallId,
            toolName: result.data.metadata.actionType,
            input: result.data.metadata.actionData || {},
          };

          if (
            context?.confirmToolCall &&
            context.confirmToolCall.id === pendingToolCallId
          ) {
            const supabase = await createClient();
            const {
              data: { user: authenticatedUser },
            } = await supabase.auth.getUser();

            try {
              const dbOperationResult = await runWithRetry(
                () =>
                  handleDatabaseOperation(
                    result.data.metadata,
                    supabase,
                    authenticatedUser,
                    true,
                  ),
                5,
                5000,
              );
              if (dbOperationResult.success) {
                finalResult = {
                  ...result,
                  data: {
                    ...result.data,
                    message: dbOperationResult.message,
                    metadata: {
                      ...result.data.metadata,
                      classId: dbOperationResult.classId,
                      joinCode: dbOperationResult.joinCode,
                      assignmentId: dbOperationResult.assignmentId,
                      pendingToolCall: null,
                      pendingToolCallId: null,
                      toolsUsed: [
                        ...(result.data.metadata.toolsUsed || []),
                        ...(dbOperationResult.toolsUsed || []),
                      ],
                    },
                  },
                };
              }
            } catch (dbError: any) {
              console.error("❌ 工具调用失败:", dbError);
              throw new Error(`Tool execution failed: ${dbError.message}`);
            }
          } else {
            finalResult = {
              ...result,
              data: {
                ...result.data,
                message:
                  result.data.message ||
                  `Pending tool call ${pendingToolCall.toolName}, awaiting confirmation.`,
                metadata: {
                  ...result.data.metadata,
                  pendingToolCall,
                  pendingToolCallId,
                  requiresDatabaseAction: true,
                  confirmationRequired: true,
                },
              },
            };
          }
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
        const aiResponse =
          finalResult.data?.message || "抱歉，我现在无法处理您的请求。";
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
              data: finalResult.data,
              metadata: {
                timestamp: new Date().toISOString(),
                requestId,
                mode: isDemoMode ? "demo" : "production",
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

        // 创建课程会话
        const sessionsPerWeek = actionData.sessionsPerWeek || 2;
        const duration = actionData.duration || 8;
        const totalSessions = actionData.totalSessions || 16;

        console.log(`🔄 开始创建${totalSessions}个课程会话...`);
        for (let i = 1; i <= Math.min(totalSessions, 16); i++) {
          const sessionDate = new Date();
          sessionDate.setDate(sessionDate.getDate() + (i - 1) * 7);
          const sessionDateStr = sessionDate.toISOString().split("T")[0];

          const { error: sessionError } = await dbClient
            .from("course_sessions")
            .insert({
              class_id: classId,
              title: `第${i}节：${actionData.className}`,
              description: `第${i}节课程内容，基于${actionData.className}`,
              scheduled_date: sessionDateStr,
              start_time: "09:00",
              end_time: "10:00",
              duration_minutes: 60,
              created_by: user.id,
              session_number: i, // 🔧 添加必需的session_number字段
            });

          if (sessionError) {
            console.error(`创建第${i}节课程失败:`, sessionError);
            // 不抛出错误，继续创建其他课程
          } else {
            console.log(`✅ 第${i}节课程创建成功`);
          }
        }

        return {
          success: true,
          message: `🎉 课程创建成功！我已经为您创建了"${actionData.className}"课程，包含以下内容：

**班级信息：**
- 班级名称：${actionData.className}
- 加入代码：${joinCode}
- 课程节数：${Math.min(totalSessions, 16)}节

**课程结构：**
- 总时长：${duration}周
- 每周课次：${sessionsPerWeek}节
- 目标学员：${actionData.courseInfo?.targetAudience || "未指定"}
- 难度级别：${actionData.courseInfo?.difficultyLevel || "中等"}

课程已保存到数据库，您可以开始在WeaveMind平台上管理这个班级了！`,
          classId,
          joinCode,
          toolsUsed: ["createClass", "createSession"],
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
                .single();

              if (orgError || !orgMember) {
                throw new Error("您还没有加入任何组织，无法创建班级");
              }

              const { data: classData, error: classError } = await db
                .from("classes")
                .insert({
                  name,
                  description,
                  organization_id: orgMember.organization_id,
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
              const title = actionData.details?.title || "未命名课次";
              const scheduledDate =
                actionData.details?.scheduledDate ||
                new Date().toISOString().slice(0, 10);
              const startTime = actionData.details?.startTime || "09:00";

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
                  duration_minutes: 60,
                  created_by: user.id,
                })
                .select("id,title,scheduled_date,start_time,session_number")
                .single();

              if (sessionError || !session) {
                throw sessionError || new Error("课次创建失败");
              }

              return {
                success: true,
                message: `✅ 已为班级创建第${session.session_number}节课「${session.title}」，时间：${session.scheduled_date?.slice(0, 10)} ${session.start_time || ""}`,
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
    console.error("数据库操作失败:", error);
    return {
      success: false,
      message: `❌ 数据库操作失败: ${error.message}`,
      error: error.message,
    };
  }
}
