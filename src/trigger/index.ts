/**
 * Trigger.dev Tasks Index
 *
 * Central export point for all WeaveMind Trigger.dev tasks
 * This enables easy importing and task management
 */

// Example task
export { helloWorldTask } from "./example";

// Core AI tasks
export {
  courseGenerationTask,
  batchCourseGenerationTask,
} from "./tasks/course-generation";

export {
  a2aOrchestratorTask,
  batchA2aOptimizationTask,
} from "./tasks/a2a-orchestrator";

// Streaming tasks
export {
  enhancedChatStreamTask,
  intentRecognitionStreamTask,
  toolCallStreamTask,
} from "./tasks/chatbot-stream";

// Bridge layer
export {
  LangGraphAdapter,
  createLangGraphAdapter,
  type WorkflowRequest,
  type WorkflowResult,
} from "./bridge/langgraph-adapter";

/**
 * Task Registry
 *
 * Provides metadata about all available tasks
 */
export const TASK_REGISTRY = {
  "hello-world": {
    name: "Hello World Task",
    description: "Basic example task for testing Trigger.dev integration",
    category: "example",
    estimatedDuration: "5s",
  },

  // Course Generation Tasks
  "course-generation": {
    name: "Course Generation",
    description: "Generates complete course content based on outline and requirements",
    category: "course_management",
    estimatedDuration: "30-60s",
    supportsStreaming: false,
    supportsBatch: true,
  },

  "batch-course-generation": {
    name: "Batch Course Generation",
    description: "Generates multiple courses in parallel for efficiency",
    category: "course_management",
    estimatedDuration: "2-5 minutes",
    supportsStreaming: false,
    supportsBatch: true,
  },

  // A2A Optimization Tasks
  "a2a-orchestrator": {
    name: "A2A Orchestrator",
    description: "Manages Builder/Critic agent iteration loop for content optimization",
    category: "ai_optimization",
    estimatedDuration: "30-90s",
    supportsStreaming: false,
    supportsBatch: true,
  },

  "batch-a2a-optimization": {
    name: "Batch A2A Optimization",
    description: "Optimizes multiple content pieces in parallel",
    category: "ai_optimization",
    estimatedDuration: "2-5 minutes",
    supportsStreaming: false,
    supportsBatch: true,
  },

  // Chatbot Tasks
  "enhanced-chat-stream": {
    name: "Enhanced Chat Stream",
    description: "Provides real-time streaming responses for Teacher Dashboard Chatbot",
    category: "chatbot",
    estimatedDuration: "2-5s",
    supportsStreaming: true,
    supportsBatch: false,
  },

  "intent-recognition-stream": {
    name: "Intent Recognition Stream",
    description: "Analyzes user input and determines the appropriate action",
    category: "chatbot",
    estimatedDuration: "1-2s",
    supportsStreaming: false,
    supportsBatch: false,
  },

  "tool-call-stream": {
    name: "Tool Call Stream",
    description: "Executes AI tools with real-time progress updates",
    category: "chatbot",
    estimatedDuration: "2-10s",
    supportsStreaming: true,
    supportsBatch: false,
  },
} as const;

/**
 * Get task information
 */
export function getTaskInfo(taskId: keyof typeof TASK_REGISTRY) {
  return TASK_REGISTRY[taskId];
}

/**
 * List tasks by category
 */
export function getTasksByCategory(category: string) {
  return Object.entries(TASK_REGISTRY).filter(
    ([_, info]) => info.category === category
  );
}

/**
 * Check if task supports streaming
 */
export function supportsStreaming(taskId: keyof typeof TASK_REGISTRY): boolean {
  return TASK_REGISTRY[taskId]?.supportsStreaming ?? false;
}

/**
 * Check if task supports batch processing
 */
export function supportsBatch(taskId: keyof typeof TASK_REGISTRY): boolean {
  return TASK_REGISTRY[taskId]?.supportsBatch ?? false;
}
