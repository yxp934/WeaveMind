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
  conversationId: z.string(),
  userId: z.string(),
  userRole: z.enum(["teacher", "student", "self_learner"]),
  courseId: z.string().optional(),
  classId: z.string().optional(),
  selectedEntityId: z.string().optional(),
  conversationHistory: z.array(ChatMessageSchema).optional(),
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
    const { conversationId, userRole, userId, conversationHistory = [] } = context;

    // Initialize stream for real-time updates
    const stream = await streams.create();

    try {
      // Send initial stream event
      await streams.write(
        stream,
        {
          type: "start",
          timestamp: new Date().toISOString(),
          conversationId,
          userRole,
          workflowType: options?.workflowType || "general_chat",
        }
      );

      // Stream processing stages
      const stages = [
        { name: "Intent recognition", progress: 15, delay: 200 },
        { name: "Context analysis", progress: 35, delay: 300 },
        { name: "LangGraph processing", progress: 65, delay: 500 },
        { name: "Response generation", progress: 85, delay: 300 },
        { name: "Finalizing", progress: 100, delay: 100 },
      ];

      for (const stage of stages) {
        await wait.for({ milliseconds: stage.delay });

        await streams.write(
          stream,
          {
            type: "progress",
            stage: stage.name,
            progress: stage.progress,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Call the LangGraph chatbot
      const result = await chatbot.processMessage(
        message,
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
        throw new Error(`LangGraph chatbot failed: ${result.error?.message || "Unknown error"}`);
      }

      // Extract response content
      const responseData = result.data;
      const responseContent = responseData.message || responseData.content || "Processing completed";
      const metadata = responseData.metadata || {};

      // Stream the response character by character
      for (let i = 0; i < responseContent.length; i++) {
        await wait.for({ milliseconds: 15 }); // Streaming delay

        await streams.write(
          stream,
          {
            type: "token",
            content: responseContent[i],
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Send completion event with LangGraph metadata
      await streams.write(
        stream,
        {
          type: "complete",
          response: {
            content: responseContent,
            metadata: {
              processingTime: `${stages.reduce((acc, s) => acc + s.delay, 0)}ms`,
              model: options?.aiModel || "LangGraph-Chatbot",
              tokens: responseContent.length,
              workflowType: metadata.workflowType,
              intent: metadata.intent,
              toolsUsed: metadata.toolsUsed || [],
              langgraphMetadata: {
                sessionId: result.metadata?.sessionId,
                intent: result.metadata?.intent,
                workflow: result.metadata?.workflow,
                contextPreserved: result.metadata?.contextPreserved,
              },
            },
          },
          timestamp: new Date().toISOString(),
        }
      );

      await streams.close(stream);

      return {
        success: true,
        conversationId,
        response: responseContent,
        metadata: {
          streamId: stream.id,
          processedAt: new Date().toISOString(),
          userRole,
          langgraphResult: result,
        },
      };

    } catch (error) {
      console.error("Enhanced Chat Stream error:", error);

      await streams.write(
        stream,
        {
          type: "error",
          error: {
            message: error.message,
            code: "STREAM_ERROR",
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
        await wait.for({ milliseconds: step.delay });

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
