import { task, wait } from "@trigger.dev/sdk";
import { z } from "zod";

/**
 * Course Generation Task - Migrated from LangGraph workflow
 * Generates complete course content based on outline and requirements
 */
export const courseGenerationTask = task({
  id: "course-generation",
  schema: z.object({
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
      }).optional(),
    }),
  }),
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload) => {
    console.log(`Starting course generation for course ${payload.courseId}`);

    // Simulate course generation process
    await wait.for({ seconds: 2 });

    const { courseId, outline, metadata } = payload;
    const { generationOptions } = metadata;

    // TODO: Integrate with existing LangGraph workflow
    // This will be replaced with actual LangGraph integration

    const generatedCourse = {
      id: courseId,
      title: outline.title,
      chapters: outline.chapters.map((chapter, index) => ({
        ...chapter,
        id: `chapter_${index + 1}`,
        generatedContent: `Generated content for ${chapter.title}`,
        components: chapter.components.map((component, compIndex) => ({
          ...component,
          id: `component_${compIndex + 1}`,
          content: `Generated content for component ${compIndex + 1}`,
        })),
      })),
      metadata: {
        ...metadata,
        generatedAt: new Date().toISOString(),
        generationOptions,
      },
    };

    console.log(`Course generation completed for course ${courseId}`);

    return {
      success: true,
      course: generatedCourse,
      stats: {
        totalChapters: outline.chapters.length,
        totalComponents: outline.chapters.reduce((acc, ch) => acc + ch.components.length, 0),
        generationTime: "2s",
      },
    };
  },
});

/**
 * Batch Course Generation Task
 * Generates multiple courses in parallel for efficiency
 */
export const batchCourseGenerationTask = task({
  id: "batch-course-generation",
  schema: z.object({
    courses: z.array(z.object({
      courseId: z.string(),
      outline: z.any(),
      metadata: z.any(),
    })),
  }),
  retry: {
    maxAttempts: 3,
    factor: 1.5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload) => {
    console.log(`Starting batch generation for ${payload.courses.length} courses`);

    // Trigger individual course generation tasks
    const results = await Promise.allSettled(
      payload.courses.map((course) =>
        courseGenerationTask.triggerAndWait({
          courseId: course.courseId,
          outline: course.outline,
          metadata: course.metadata,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Batch generation completed: ${successful} successful, ${failed} failed`);

    return {
      total: payload.courses.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        courseId: payload.courses[index].courseId,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      })),
    };
  },
});
