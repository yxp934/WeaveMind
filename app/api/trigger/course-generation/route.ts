import { NextRequest, NextResponse } from "next/server";
import { courseGenerationTask, batchCourseGenerationTask } from "@/src/trigger/tasks/course-generation";

/**
 * Trigger.dev Course Generation API
 *
 * This endpoint handles course generation using Trigger.dev tasks
 * It provides both single course and batch generation capabilities
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    // Validate request type
    if (!type || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: type, payload" },
        { status: 400 }
      );
    }

    console.log(`Trigger Course Generation API: Processing ${type} request`);

    let result;

    switch (type) {
      case "single":
        result = await handleSingleCourseGeneration(payload);
        break;

      case "batch":
        result = await handleBatchCourseGeneration(payload);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown generation type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Trigger Course Generation API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle single course generation
 */
async function handleSingleCourseGeneration(payload: any) {
  const { courseId, outline, metadata } = payload;

  // Validate required fields
  if (!courseId || !outline) {
    throw new Error("Missing required fields: courseId, outline");
  }

  console.log(`Generating single course: ${courseId}`);

  // Simulate course generation for now
  // In a real implementation, you would trigger the actual task
  console.log(`Generating course: ${courseId}`);

  const result = {
    success: true,
    course: {
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
        generationMode: "trigger",
      },
    },
    stats: {
      totalChapters: outline.chapters.length,
      totalComponents: outline.chapters.reduce((acc, ch) => acc + ch.components.length, 0),
      generationTime: "2s",
    },
  };

  return result;
}

/**
 * Handle batch course generation
 */
async function handleBatchCourseGeneration(payload: any) {
  const { courses } = payload;

  // Validate required fields
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    throw new Error("Missing or invalid courses array");
  }

  // Limit batch size to prevent overwhelming the system
  if (courses.length > 10) {
    throw new Error("Batch size too large. Maximum 10 courses per batch.");
  }

  console.log(`Generating batch of ${courses.length} courses`);

  // Simulate batch course generation for now
  // In a real implementation, you would trigger the actual task
  const results = courses.map((course, index) => ({
    courseId: course.courseId,
    success: true,
    data: {
      course: {
        id: course.courseId,
        title: course.outline?.title || `Course ${index + 1}`,
        status: "generated",
      },
    },
    error: null,
  }));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: courses.length,
    successful,
    failed,
    results,
  };
}

/**
 * GET endpoint for checking generation status and capabilities
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");

  // If courseId is provided, check status (would be implemented with actual status tracking)
  if (courseId) {
    return NextResponse.json({
      courseId,
      status: "completed", // Mock status
      message: "Course generation status would be tracked here",
    });
  }

  // Return general capabilities
  return NextResponse.json({
    status: "healthy",
    version: "1.0.0",
    capabilities: {
      singleGeneration: true,
      batchGeneration: true,
      maxBatchSize: 10,
      supportedFormats: ["outline", "topic", "requirements"],
    },
    templates: [
      {
        name: "Standard Course",
        description: "Complete course with chapters and components",
        estimatedDuration: "30-60s",
      },
      {
        name: "Quick Overview",
        description: "Brief course summary with key points",
        estimatedDuration: "15-30s",
      },
      {
        name: "Detailed Tutorial",
        description: "In-depth tutorial with examples and exercises",
        estimatedDuration: "60-120s",
      },
    ],
    timestamp: new Date().toISOString(),
  });
}
