import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import { runCourseGeneration } from "../../../lib/ai/course-generation-orchestrator";

/**
 * Course Generation Task - Integrated with LangGraph workflow
 * Generates complete course content based on outline and requirements
 * Uses the existing runCourseGeneration function from course-generation-orchestrator
 */
export const courseGenerationTask = task({
  id: "course-generation",
  schema: z.object({
    runId: z.string(),
    courseId: z.string(),
    outline: z.object({
      title: z.string(),
      chapters: z.array(z.object({
        title: z.string(),
        description: z.string(),
        components: z.array(z.any()),
      })),
    }),
    metadata: z.object({
      classId: z.string().optional(),
      teacherId: z.string(),
      organizationId: z.string(),
      generationOptions: z.object({
        includeExamples: z.boolean().default(true),
        includeAssessments: z.boolean().default(true),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
        maxIterationsPerChapter: z.number().default(3),
      }).optional(),
    }),
  }),
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 300000, // 5 minutes max
  },
  run: async (payload) => {
    console.log(`Starting LangGraph course generation for run ${payload.runId}`);

    const { runId, courseId, outline, metadata } = payload;
    const { generationOptions } = metadata;
    const maxIterations = generationOptions?.maxIterationsPerChapter || 3;

    try {
      // Call the existing LangGraph course generation orchestrator
      await runCourseGeneration(runId);

      // Get the updated run status
      console.log(`Course generation completed for run ${runId}`);

      // Return success with run information
      return {
        success: true,
        runId,
        courseId,
        stats: {
          totalChapters: outline.chapters.length,
          totalComponents: outline.chapters.reduce((acc, ch) => acc + ch.components.length, 0),
          maxIterationsPerChapter: maxIterations,
          completedAt: new Date().toISOString(),
        },
        message: "Course generation completed using LangGraph workflow",
      };

    } catch (error) {
      console.error(`Course generation failed for run ${runId}:`, error);

      // Return error information
      return {
        success: false,
        runId,
        courseId,
        error: {
          code: "COURSE_GENERATION_ERROR",
          message: (error as Error).message,
          details: `Failed to generate course content for run ${runId}`,
        },
        stats: {
          totalChapters: outline.chapters.length,
          failedAt: new Date().toISOString(),
        },
      };
    }
  },
});

/**
 * Batch Course Generation Task
 * Generates multiple courses in parallel using LangGraph workflow for efficiency
 */
export const batchCourseGenerationTask = task({
  id: "batch-course-generation",
  schema: z.object({
    courses: z.array(z.object({
      runId: z.string(),
      courseId: z.string(),
      outline: z.object({
        title: z.string(),
        chapters: z.array(z.object({
          title: z.string(),
          description: z.string(),
          components: z.array(z.any()),
        })),
      }),
      metadata: z.object({
        classId: z.string().optional(),
        teacherId: z.string(),
        organizationId: z.string(),
        generationOptions: z.object({
          includeExamples: z.boolean().default(true),
          includeAssessments: z.boolean().default(true),
          difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
          maxIterationsPerChapter: z.number().default(3),
        }).optional(),
      }),
    })),
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 300000, // 5 minutes max for batch
  },
  run: async (payload) => {
    console.log(`Starting LangGraph batch generation for ${payload.courses.length} courses`);

    const { courses } = payload;

    try {
      // Trigger individual course generation tasks in parallel
      const results = await Promise.allSettled(
        courses.map((course) =>
          courseGenerationTask.triggerAndWait({
            runId: course.runId,
            courseId: course.courseId,
            outline: course.outline,
            metadata: course.metadata,
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Batch generation completed: ${successful} successful, ${failed} failed using LangGraph`);

      // Process results and extract metadata
      const processedResults = results.map((result, index) => {
        const course = courses[index];

        if (result.status === 'fulfilled') {
          const data = result.value;
          return {
            courseId: course.courseId,
            runId: course.runId,
            success: true,
            data: {
              ...data,
              langgraphProcessed: true,
            },
            error: null,
          };
        } else {
          return {
            courseId: course.courseId,
            runId: course.runId,
            success: false,
            data: null,
            error: {
              code: "BATCH_COURSE_ITEM_ERROR",
              message: (result.reason as Error).message,
              langgraphError: true,
            },
          };
        }
      });

      // Calculate batch statistics
      const stats = {
        totalCourses: courses.length,
        successful,
        failed,
        totalChapters: processedResults
          .filter(r => r.success)
          .reduce((acc, r) => acc + (r.data.stats?.totalChapters || 0), 0),
        totalComponents: processedResults
          .filter(r => r.success)
          .reduce((acc, r) => acc + (r.data.stats?.totalComponents || 0), 0),
        processedAt: new Date().toISOString(),
      };

      return {
        total: courses.length,
        successful,
        failed,
        stats,
        results: processedResults,
        message: "Batch course generation completed using LangGraph workflow",
      };

    } catch (error) {
      console.error(`Batch course generation failed:`, error);

      return {
        total: courses.length,
        successful: 0,
        failed: courses.length,
        stats: {
          totalCourses: courses.length,
          successful: 0,
          failed: courses.length,
          processedAt: new Date().toISOString(),
        },
        results: courses.map(course => ({
          courseId: course.courseId,
          runId: course.runId,
          success: false,
          data: null,
          error: {
            code: "BATCH_COURSE_GENERATION_ERROR",
            message: (error as Error).message,
            langgraphError: true,
          },
        })),
        error: {
          code: "BATCH_COURSE_ORCHESTRATOR_ERROR",
          message: (error as Error).message,
        },
      };
    }
  },
});
