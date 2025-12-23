import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";

/**
 * A2A (Agent-to-Agent) Double Intelligence System
 * Migrated from LangGraph Builder/Critic architecture
 *
 * This system implements:
 * - Builder Agent: Generates initial content
 * - Critic Agent: Reviews and provides feedback
 * - Iterative optimization loop
 */

const ContentSchema = z.object({
  title: z.string(),
  content: z.string(),
  quality: z.number().min(0).max(10),
  feedback: z.array(z.string()).optional(),
});

/**
 * Builder Agent Task - Generates initial content
 */
const builderAgentTask = task({
  id: "builder-agent",
  schema: z.object({
    request: z.object({
      type: z.enum(["course", "chapter", "component", "assessment"]),
      topic: z.string(),
      context: z.any(),
      requirements: z.array(z.string()),
    }),
    iteration: z.number().default(0),
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 10000,
  },
  run: async (payload) => {
    console.log(`Builder Agent: Generating content for iteration ${payload.iteration}`);

    // Simulate content generation
    await wait.for({ seconds: 1 });

    const { request, iteration } = payload;

    // TODO: Integrate with Vercel AI SDK for actual content generation
    // This will use the existing AI gateway configuration

    const generatedContent = {
      title: `${request.topic} - Iteration ${iteration + 1}`,
      content: `Generated content for ${request.type}: ${request.topic}\n\nThis is the ${iteration + 1} iteration of content generation.`,
      quality: Math.min(10, 6 + iteration), // Improving quality with iterations
      metadata: {
        iteration,
        requestType: request.type,
        generatedAt: new Date().toISOString(),
      },
    };

    console.log(`Builder Agent: Content generated with quality ${generatedContent.quality}`);

    return generatedContent;
  },
});

/**
 * Critic Agent Task - Reviews and provides feedback
 */
const criticAgentTask = task({
  id: "critic-agent",
  schema: z.object({
    content: ContentSchema,
    request: z.any(),
    iteration: z.number(),
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 10000,
  },
  run: async (payload) => {
    console.log(`Critic Agent: Reviewing content from iteration ${payload.iteration}`);

    // Simulate content review
    await wait.for({ seconds: 1 });

    const { content, request, iteration } = payload;

    // Generate feedback based on quality score
    const feedback = [];
    let shouldIterate = false;

    if (content.quality < 7) {
      feedback.push("Content quality needs improvement");
      shouldIterate = true;
    }

    if (iteration < 2) {
      feedback.push("Consider adding more examples");
      shouldIterate = true;
    }

    if (content.content.length < 500) {
      feedback.push("Content is too brief, expand with more details");
      shouldIterate = true;
    }

    // Simulate quality assessment
    const assessment = {
      score: Math.min(10, content.quality + 1), // Critic slightly improves quality
      feedback,
      suggestions: [
        "Add more practical examples",
        "Include visual elements if applicable",
        "Ensure content aligns with learning objectives",
      ],
      shouldIterate,
      iterationLimit: iteration >= 3, // Max 3 iterations
    };

    console.log(`Critic Agent: Review completed. Should iterate: ${shouldIterate}`);

    return {
      content: {
        ...content,
        quality: assessment.score,
        feedback: [...(content.feedback || []), ...feedback],
      },
      assessment,
    };
  },
});

/**
 * A2A Orchestrator Task - Manages the iteration loop between Builder and Critic
 */
export const a2aOrchestratorTask = task({
  id: "a2a-orchestrator",
  schema: z.object({
    request: z.object({
      type: z.enum(["course", "chapter", "component", "assessment"]),
      topic: z.string(),
      context: z.any(),
      requirements: z.array(z.string()),
    }),
    maxIterations: z.number().default(3),
  }),
  retry: {
    maxAttempts: 1, // Orchestrator handles retries internally
  },
  run: async (payload) => {
    console.log(`A2A Orchestrator: Starting for ${payload.request.type}: ${payload.request.topic}`);

    let currentContent = null;
    let iteration = 0;
    let shouldContinue = true;

    const iterationHistory = [];

    while (shouldContinue && iteration < payload.maxIterations) {
      console.log(`\n=== Iteration ${iteration + 1} ===`);

      // Step 1: Builder generates content
      const builderResult = await builderAgentTask.triggerAndWait({
        request: payload.request,
        iteration,
      });

      if (!builderResult.ok) {
        throw new Error(`Builder agent failed: ${builderResult.error}`);
      }

      currentContent = builderResult.output;

      // Step 2: Critic reviews content
      const criticResult = await criticAgentTask.triggerAndWait({
        content: currentContent,
        request: payload.request,
        iteration,
      });

      if (!criticResult.ok) {
        throw new Error(`Critic agent failed: ${criticResult.error}`);
      }

      const { content: reviewedContent, assessment } = criticResult.output;

      // Store iteration history
      iterationHistory.push({
        iteration,
        builderQuality: currentContent.quality,
        criticScore: assessment.score,
        feedback: assessment.feedback,
        shouldContinue: assessment.shouldIterate && !assessment.iterationLimit,
      });

      // Update current content
      currentContent = reviewedContent;

      // Check if we should continue
      shouldContinue = assessment.shouldIterate && !assessment.iterationLimit;

      if (shouldContinue) {
        console.log(`Critic requested iteration ${iteration + 2}`);
        iteration++;
        await wait.for({ seconds: 0.5 }); // Brief pause between iterations
      } else {
        console.log("A2A optimization completed");
      }
    }

    // Final result
    const finalResult = {
      content: currentContent,
      iterations: iteration + 1,
      history: iterationHistory,
      metadata: {
        request: payload.request,
        completedAt: new Date().toISOString(),
        finalQuality: currentContent.quality,
        improvement: iterationHistory.length > 0
          ? currentContent.quality - iterationHistory[0].builderQuality
          : 0,
      },
    };

    console.log(`\nA2A Orchestrator: Completed with quality ${finalResult.metadata.finalQuality}`);

    return finalResult;
  },
});

/**
 * Batch A2A Optimization Task
 * Optimizes multiple content pieces in parallel
 */
export const batchA2aOptimizationTask = task({
  id: "batch-a2a-optimization",
  schema: z.object({
    requests: z.array(z.object({
      type: z.enum(["course", "chapter", "component", "assessment"]),
      topic: z.string(),
      context: z.any(),
      requirements: z.array(z.string()),
    })),
    maxIterations: z.number().default(3),
  }),
  retry: {
    maxAttempts: 2,
    factor: 1.5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload) => {
    console.log(`Batch A2A: Starting optimization for ${payload.requests.length} items`);

    // Trigger A2A orchestrator for each request in parallel
    const results = await Promise.allSettled(
      payload.requests.map((request) =>
        a2aOrchestratorTask.triggerAndWait({
          request,
          maxIterations: payload.maxIterations,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Batch A2A completed: ${successful} successful, ${failed} failed`);

    return {
      total: payload.requests.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        request: payload.requests[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      })),
    };
  },
});
