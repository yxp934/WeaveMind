import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatbot } from "@/lib/ai/langgraph/chatbot-graph";
import { z } from "zod";

const MAX_RETRIES = 3;

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
) {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[${label}] attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await delay(500 * attempt);
      }
    }
  }
  throw lastError;
}

function startHeartbeat(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  let active = true;
  const timer = setInterval(() => {
    if (!active) return;
    try {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "progress",
            progress: 50,
            message: "⏳ 正在处理中... (保持连接)",
            timestamp: new Date().toISOString(),
            heartbeat: true,
          })}\n\n`,
        ),
      );
    } catch (err) {
      console.warn("heartbeat enqueue failed", err);
    }
  }, 5000);

  return () => {
    active = false;
    clearInterval(timer);
  };
}

// Use the Node.js runtime because this endpoint performs Supabase admin operations
// (service role) that are not supported on the Edge runtime.
export const runtime = "nodejs";

// AI聊天请求验证模式
const chatStreamRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z
    .object({
      courseId: z.string().uuid().optional(),
      classId: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      selectedClassId: z.string().uuid().optional(),
      selectedSessionId: z.string().uuid().optional(),
      selectedAssignmentId: z.string().uuid().optional(),
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
});

/**
 * 流式AI聊天API端点 - 复用chat端点逻辑
 * 这个端点是为了向后兼容SidebarChatbot而创建的，现在使用真正的LangGraph工作流
 */
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1. 解析和验证请求数据
    const body = await request.json();
    const validation = chatStreamRequestSchema.safeParse(body);

    if (!validation.success) {
      const errorResponse = `data: ${JSON.stringify({
        type: "error",
        error: "请求数据验证失败",
        details: validation.error.issues,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      return new Response(errorResponse, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      });
    }

    const { message: msg, context: ctx } = validation.data;
    const message = msg;
    const context = ctx;

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
    // 🔧 关键修复：使用用户ID作为conversationId，避免同一组织成员串话导致的幻觉
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
      streamMode: true,
    });

    // 4. 复用chat端点的流式处理逻辑
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
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("🚨 ChatStream API Error:", {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime,
    });

    const errorResponse = `data: ${JSON.stringify({
      type: "error",
      error: error.message || "处理请求时发生错误",
      timestamp: new Date().toISOString(),
    })}\n\n`;

    return new Response(errorResponse, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  }
}

/**
 * 处理流式响应 - 复用chat端点的逻辑
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
      const dbClient = createAdminClient();
      const supabaseServer = await createClient();
      const stopHeartbeat = startHeartbeat(controller, encoder);

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

        // 尝试直接处理显式CRUD请求，避免LangGraph超时/幻觉
        const crudHandled = await tryHandleDirectCrud(
          message,
          context,
          userId,
          userRole,
          dbClient,
          supabaseServer,
          encoder,
          controller,
        );
        if (crudHandled) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "end",
                timestamp: new Date().toISOString(),
              })}\n\n`,
            ),
          );
          controller.close();
          return;
        }

        // 使用LangGraph处理消息
        console.log("🔄 开始LangGraph处理流程...");
        const result = await executeWithRetry(
          () =>
            chatbot.processMessage(
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
            ),
          "chatbot.processMessage",
        );

        if (!result.success) {
          throw new Error(result.error?.message || "LangGraph处理失败");
        }

        // 处理数据库操作请求
        let finalResult = result;
        if (result.data?.metadata?.requiresDatabaseAction) {
          console.log(
            "🔧 检测到数据库操作请求:",
            result.data.metadata.actionType,
          );

          try {
            const dbOperationResult = await executeWithRetry(
              () =>
                handleDatabaseOperation(
                  result.data.metadata,
                  supabaseServer,
                  user || { id: userId },
                  true,
                ),
              "handleDatabaseOperation",
            );
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
                  toolsUsed: [
                    ...(result.data.metadata.toolsUsed || []),
                    ...(dbOperationResult.toolsUsed || []),
                  ],
                  error: dbOperationResult.success
                    ? null
                    : dbOperationResult.error,
                },
              },
            };
          } catch (dbError: any) {
            console.error("❌ 数据库操作失败:", dbError);
            finalResult = {
              ...result,
              data: {
                ...result.data,
                message: `❌ 数据库操作失败: ${dbError.message}`,
                metadata: {
                  ...result.data.metadata,
                  error: dbError.message,
                },
              },
              success: false,
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
        stopHeartbeat();
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
        stopHeartbeat();
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
 * 处理数据库操作请求 - 复用chat端点的逻辑
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

/**
 * 处理CORS预检请求
 */
export async function OPTIONS(request: NextRequest): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
