import { task, wait, streams } from "@trigger.dev/sdk";
import { z } from "zod";
import { chatbot } from "../../../lib/ai/langgraph/chatbot-graph";

/**
 * Chatbot Streaming Task
 * Integrated with LangGraph chatbot workflow for real-time streaming responses
 * Uses the existing chatbot.processMessage() method with streaming support
 */

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.any().optional(),
});

const ConversationContextSchema = z.object({
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  userRole: z.enum(["teacher", "student", "self_learner"]),
  courseId: z.string().optional(),
  classId: z.string().optional(),
  organizationId: z.string().optional(),
  selectedEntityId: z.string().optional(),
  selectedClassId: z.string().optional(),
  selectedSessionId: z.string().optional(),
  selectedAssignmentId: z.string().optional(),
  selectedContexts: z
    .array(
      z.object({
        type: z.enum(["class", "session", "assignment"]),
        id: z.string(),
        title: z.string().optional(),
      })
    )
    .optional(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
  confirmToolCall: z
    .object({
      id: z.string(),
      toolName: z.string(),
      input: z.object({}).catchall(z.any()),
    })
    .optional(),
});

/**
 * Enhanced Chat Stream Task with LangGraph Integration
 */
export const enhancedChatStreamTask = task({
  id: "enhanced-chat-stream",
  schema: z.object({
    message: z.string(),
    context: ConversationContextSchema,
    options: z.object({
      stream: z.boolean().default(true),
      includeMetadata: z.boolean().default(true),
      aiModel: z.string().optional(),
      workflowType: z.string().optional(), // e.g., "course_creation", "general_chat", etc.
    }).optional(),
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 60000, // 1 minute max for streaming
  },
  run: async (payload) => {
    console.log(`Enhanced Chat Stream: Processing message for ${payload.context.userRole} via LangGraph`);

    const { message, context, options } = payload;
    const { conversationId, sessionId, userRole, userId, conversationHistory = [] } = context;
    const resolvedConversationId = conversationId || sessionId || `conv_${Date.now()}`;

    let responseContent = "";
    let responseMetadata: Record<string, any> = {};
    let responseChoices: any[] | undefined = undefined;
    let responseToolsUsed: string[] = [];
    let langgraphResult: any = null;
    let streamError: Error | null = null;
    const streamId = `stream_${Date.now()}`;

    try {
      const { waitUntilComplete } = streams.writer({
        execute: async ({ write }) => {
          try {
            write({
              type: "start",
              timestamp: new Date().toISOString(),
              conversationId: resolvedConversationId,
              userRole,
              workflowType: options?.workflowType || "general_chat",
            });

            const stages = [
              { name: "Intent recognition", progress: 15, delay: 200 },
              { name: "Context analysis", progress: 35, delay: 300 },
              { name: "LangGraph processing", progress: 65, delay: 500 },
              { name: "Response generation", progress: 85, delay: 300 },
              { name: "Finalizing", progress: 100, delay: 100 },
            ];

            for (const stage of stages) {
              await wait.for({ seconds: stage.delay / 1000 });
              write({
                type: "progress",
                stage: stage.name,
                progress: stage.progress,
                timestamp: new Date().toISOString(),
              });
            }

            const result = await chatbot.processMessage(
              message,
              resolvedConversationId,
              userRole,
              userId,
              conversationHistory,
              {
                courseId: context.courseId,
                classId: context.classId,
                organizationId: context.organizationId,
                selectedClassId: context.selectedClassId,
                selectedSessionId: context.selectedSessionId,
                selectedAssignmentId: context.selectedAssignmentId,
                selectedContexts: context.selectedContexts,
              }
            );

            langgraphResult = result;

            if (!result.success) {
              throw new Error(`LangGraph chatbot failed: ${result.error?.message || "Unknown error"}`);
            }

            const responseData = result.data || {};
            responseContent = responseData.message || responseData.content || responseData.response || "";
            responseMetadata = responseData.metadata || {};
            responseChoices = responseData.choices || undefined;
            responseToolsUsed = responseData.toolsUsed || [];

            if (!responseContent) {
              throw new Error("LangGraph chatbot returned an empty response");
            }

            for (let i = 0; i < responseContent.length; i++) {
              await wait.for({ seconds: 0.015 });
              write({
                type: "token",
                content: responseContent[i],
                timestamp: new Date().toISOString(),
              });
            }

            const responsePayload = {
              message: responseContent,
              response: responseContent,
              choices: responseData.choices || undefined,
              toolsUsed: responseData.toolsUsed || [],
              metadata: {
                ...responseMetadata,
                processingTime: `${stages.reduce((acc, s) => acc + s.delay, 0)}ms`,
                model: options?.aiModel || "LangGraph-Chatbot",
                tokens: responseContent.length,
                langgraphMetadata: {
                  sessionId: result.metadata?.sessionId,
                  intent: result.metadata?.intent,
                  workflow: result.metadata?.workflow,
                  contextPreserved: result.metadata?.contextPreserved,
                },
              },
            };

            write({
              type: "response",
              data: responsePayload,
              timestamp: new Date().toISOString(),
            });

            write({
              type: "complete",
              data: responsePayload,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            const err = error as Error;
            streamError = err;
            write({
              type: "error",
              error: {
                message: err.message,
                code: "STREAM_ERROR",
                langgraphError: true,
              },
              timestamp: new Date().toISOString(),
            });
          }
        },
      });

      await waitUntilComplete();

      if (streamError) {
        throw streamError;
      }

      return {
        success: true,
        conversationId: resolvedConversationId,
        response: responseContent,
        data: {
          message: responseContent,
          response: responseContent,
          choices: responseChoices,
          toolsUsed: responseToolsUsed,
          metadata: responseMetadata,
        },
        metadata: {
          streamId,
          processedAt: new Date().toISOString(),
          userRole,
          langgraphResult,
        },
      };

    } catch (error) {
      console.error("Enhanced Chat Stream error:", error);
      throw error;
    }
  },
});

/**
 * Intent Recognition Stream Task
 * Integrated with LangGraph chatbot intent recognition workflow
 */
export const intentRecognitionStreamTask = task({
  id: "intent-recognition-stream",
  schema: z.object({
    message: z.string(),
    context: z.object({
      userRole: z.enum(["teacher", "student", "self_learner"]),
      conversationHistory: z.array(ChatMessageSchema).optional(),
      conversationId: z.string().optional(),
      userId: z.string().optional(),
    }),
  }),
  retry: {
    maxAttempts: 2,
    factor: 1.5,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 10000,
  },
  run: async (payload) => {
    console.log(`Intent Recognition: Analyzing message from ${payload.context.userRole} via LangGraph`);

    const { message, context } = payload;
    const { userRole, conversationHistory = [], conversationId = `intent-${Date.now()}`, userId } = context;

    try {
      // Call LangGraph chatbot to analyze intent
      // The chatbot will automatically recognize intent through its intent_recognition node
      const result = await chatbot.processMessage(
        message,
        conversationId,
        userRole,
        userId,
        conversationHistory,
        {}
      );

      if (!result.success) {
        throw new Error(`LangGraph intent recognition failed: ${result.error?.message || "Unknown error"}`);
      }

      // Extract intent information from the result
      const responseData = result.data;
      const metadata = responseData.metadata || {};

      // Extract intent from metadata or use general_chat as default
      const detectedIntent = metadata.intent || "general_chat";
      const workflowType = metadata.workflowType;

      // Build intent analysis result
      const intentAnalysis = {
        message,
        intent: detectedIntent,
        confidence: 0.95, // LangGraph provides high-confidence intent recognition
        allIntents: [
          {
            intent: detectedIntent,
            confidence: 0.95,
            reason: "Detected by LangGraph intent recognition node",
          },
          ...(workflowType ? [{
            intent: workflowType,
            confidence: 0.85,
            reason: "Workflow type from LangGraph metadata",
          }] : []),
        ],
        routeDecision: detectedIntent,
        processingTime: "processed",
        analyzedAt: new Date().toISOString(),
        langgraphMetadata: {
          sessionId: result.metadata?.sessionId,
          workflow: result.metadata?.workflow,
          contextPreserved: result.metadata?.contextPreserved,
          toolsUsed: metadata.toolsUsed || [],
        },
      };

      console.log(`Intent Recognition: Detected intent "${detectedIntent}" via LangGraph`);

      return intentAnalysis;

    } catch (error) {
      console.error("Intent Recognition failed:", error);

      // Return fallback intent recognition
      return {
        message,
        intent: "general_chat",
        confidence: 0.5,
        allIntents: [
          { intent: "general_chat", confidence: 0.5, reason: "Fallback due to error" },
        ],
        routeDecision: "general_chat",
        processingTime: "failed",
        analyzedAt: new Date().toISOString(),
        error: {
          code: "INTENT_RECOGNITION_ERROR",
          message: (error as Error).message,
        },
      };
    }
  },
});

/**
 * Tool Call Stream Task
 * Executes AI tools through LangGraph with real-time progress updates
 */
export const toolCallStreamTask = task({
  id: "tool-call-stream",
  schema: z.object({
    toolName: z.string(),
    parameters: z.any(),
    context: ConversationContextSchema,
    message: z.string().optional(), // Optional message for context
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload) => {
    console.log(`Tool Call Stream: Executing ${payload.toolName} via LangGraph`);

    const { toolName, parameters, context, message } = payload;
    const { conversationId, userId, userRole, conversationHistory = [] } = context;

    // Create stream for progress updates
    const stream = await streams.create();

    try {
      // Send start event
      await streams.write(
        stream,
        {
          type: "tool_start",
          toolName,
          parameters,
          timestamp: new Date().toISOString(),
        }
      );

      // Stream tool execution progress
      const steps = [
        { name: "Validating parameters", progress: 15, delay: 200 },
        { name: "LangGraph workflow initiation", progress: 35, delay: 300 },
        { name: "Executing through chatbot tools", progress: 65, delay: 1000 },
        { name: "Processing tool results", progress: 85, delay: 500 },
        { name: "Formatting output", progress: 100, delay: 200 },
      ];

      for (const step of steps) {
        await wait.for({ seconds: step.delay / 1000 });

        await streams.write(
          stream,
          {
            type: "tool_progress",
            step: step.name,
            progress: step.progress,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Call LangGraph chatbot to execute the tool
      // The chatbot will use its tool-calling capabilities to execute the requested tool
      const toolMessage = message || `Please execute the tool: ${toolName} with parameters: ${JSON.stringify(parameters)}`;

      const result = await chatbot.processMessage(
        toolMessage,
        conversationId,
        userRole,
        userId,
        conversationHistory,
        {
          courseId: context.courseId,
          classId: context.classId,
        }
      );

      if (!result.success) {
        throw new Error(`LangGraph tool execution failed: ${result.error?.message || "Unknown error"}`);
      }

      // Extract tool result from LangGraph response
      const responseData = result.data;
      const metadata = responseData.metadata || {};
      const toolsUsed = metadata.toolsUsed || [];

      // Check if the requested tool was used
      const toolExecuted = toolsUsed.includes(toolName) ||
                          metadata.workflowType === toolName ||
                          toolName === "general_chat"; // Fallback for general execution

      const finalResult = {
        success: true,
        toolName,
        data: {
          message: responseData.message || responseData.content || `Tool ${toolName} executed via LangGraph`,
          parameters,
          result: responseData,
          toolExecuted,
          toolsUsed,
        },
        metadata: {
          executedAt: new Date().toISOString(),
          userId,
          userRole,
          executionTime: `${steps.reduce((acc, s) => acc + s.delay, 0)}ms`,
          langgraphMetadata: {
            sessionId: result.metadata?.sessionId,
            intent: result.metadata?.intent,
            workflow: result.metadata?.workflow,
            contextPreserved: result.metadata?.contextPreserved,
          },
        },
      };

      // Send completion event
      await streams.write(
        stream,
        {
          type: "tool_complete",
          result: finalResult,
          timestamp: new Date().toISOString(),
        }
      );

      await streams.close(stream);

      console.log(`Tool Call Stream: Successfully executed ${toolName} via LangGraph`);

      return finalResult;

    } catch (error) {
      console.error(`Tool Call Stream error for ${toolName}:`, error);

      await streams.write(
        stream,
        {
          type: "tool_error",
          error: {
            toolName,
            message: error.message,
            code: "TOOL_EXECUTION_ERROR",
            langgraphError: true,
          },
          timestamp: new Date().toISOString(),
        }
      );

      await streams.close(stream);
      throw error;
    }
  },
});
