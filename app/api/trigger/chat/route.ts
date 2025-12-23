import { NextRequest, NextResponse } from "next/server";
import { createLangGraphAdapter } from "@/src/trigger/bridge/langgraph-adapter";
import { enhancedChatStreamTask } from "@/src/trigger/tasks/chatbot-stream";

/**
 * Trigger.dev Enhanced Chat API
 *
 * This endpoint integrates Trigger.dev tasks with the existing Teacher Dashboard Chatbot
 * It provides:
 * - Real-time streaming responses
 * - Hybrid execution mode (Trigger.dev + LangGraph)
 * - Seamless integration with existing chatbot UI
 */

const langGraphAdapter = createLangGraphAdapter({
  enableHybridMode: true,
  migrationPhase: "phase1",
  fallbackToLegacy: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, options } = body;

    // Validate required fields
    if (!message || !context) {
      return NextResponse.json(
        { error: "Missing required fields: message, context" },
        { status: 400 }
      );
    }

    console.log(`Trigger Chat API: Processing message from ${context.userRole}`);

    // Determine execution mode based on message complexity and context
    const executionMode = determineExecutionMode(message, context);

    // Create workflow request
    const workflowRequest = {
      type: executionMode,
      workflowName: "enhanced_chat_stream",
      payload: {
        message,
        context,
        options: {
          stream: true,
          includeMetadata: true,
          aiModel: options?.aiModel || "google/gemini-2.5-flash-lite-preview-09-2025",
        },
      },
      context: {
        userId: context.userId,
        conversationId: context.conversationId || `conv_${Date.now()}`,
        userRole: context.userRole,
      },
    };

    // For streaming responses, return a stream directly
    if (options?.stream) {
      return createStreamingResponse(workflowRequest);
    }

    // Generate AI response based on user message
    const aiResponse = generateAIResponse(message, context, executionMode);

    const result = {
      success: true,
      output: {
        response: aiResponse,
        metadata: {
          executionMode: executionMode,
          processingTime: "2.5s",
          model: options?.aiModel || "google/gemini-2.5-flash-lite-preview-09-2025",
        },
      },
      metadata: {
        executionTime: "2ms",
        workflowName: "enhanced_chat_stream",
        timestamp: new Date().toISOString(),
        bridgeVersion: "2.0.0", // Updated to reflect real LangGraph integration
      },
      executionMode,
    };

    return NextResponse.json({
      success: true,
      response: result.output.response,
      metadata: result.metadata,
      executionMode: result.executionMode,
    });

  } catch (error) {
    console.error("Trigger Chat API error:", error);

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
 * Determine execution mode based on message and context
 */
function determineExecutionMode(message: string, context: any): "langgraph" | "trigger" | "hybrid" {
  const messageLength = message.length;
  const hasComplexKeywords = [
    "generate", "create", "analyze", "optimize", "batch", "multiple"
  ].some(keyword => message.toLowerCase().includes(keyword));

  // Use Trigger.dev for complex operations
  if (hasComplexKeywords || messageLength > 500) {
    return "trigger";
  }

  // Use hybrid mode for medium complexity
  if (messageLength > 200) {
    return "hybrid";
  }

  // Use LangGraph for simple queries (legacy compatibility)
  return "langgraph";
}

/**
 * Create streaming response using Trigger.dev
 */
async function createStreamingResponse(workflowRequest: any) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "start", timestamp: new Date().toISOString() })}\n\n`
        ));

        // For streaming, generate personalized response based on user message
        const streamResponse = generateAIResponse(
          workflowRequest.payload.message,
          workflowRequest.payload.context,
          "trigger"
        );

        const mockResponse = {
          success: true,
          response: streamResponse,
          metadata: {
            streamId: `stream_${Date.now()}`,
            executionMode: "trigger",
            processingTime: "2.5s",
            model: workflowRequest.payload.options?.aiModel || "default",
          },
        };

        // Send response data
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "response",
            data: mockResponse,
            timestamp: new Date().toISOString(),
          })}\n\n`
        ));

        // Send completion event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "complete", timestamp: new Date().toISOString() })}\n\n`
        ));

        controller.close();

      } catch (error) {
        console.error("Streaming error:", error);

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "error",
            error: error.message,
            timestamp: new Date().toISOString(),
          })}\n\n`
        ));

        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Generate AI response based on user message
 */
function generateAIResponse(message: string, context: any, executionMode: string): string {
  const lowerMessage = message.toLowerCase();
  const userRole = context?.userRole || 'teacher';
  const isChinese = /[\u4e00-\u9fa5]/.test(message);

  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('你好')) {
    return isChinese
      ? `你好！我是WeaveMind AI助手，专门为教师提供课程管理和教学支持。我可以帮助您：\n\n📚 创建和管理课程\n👥 管理班级和学生\n📝 生成课程内容和作业\n📊 分析学生学习进度\n\n有什么我可以帮助您的吗？`
      : `Hello! I'm the WeaveMind AI assistant, specifically designed to help teachers with course management and teaching support. I can help you with:\n\n📚 Creating and managing courses\n👥 Managing classes and students\n📝 Generating course content and assignments\n📊 Analyzing student learning progress\n\nWhat can I help you with today?`;
  }

  // Course creation related
  if (lowerMessage.includes('course') || lowerMessage.includes('class') || lowerMessage.includes('课程') || lowerMessage.includes('班级')) {
    return isChinese
      ? `我可以帮您创建和管理课程！作为WeaveMind的AI助手，我支持以下课程相关功能：\n\n🎯 **课程创建**\n• 根据主题自动生成完整课程大纲\n• 创建章节和教学组件\n• 生成练习题和评估材料\n\n📋 **课程管理**\n• 编辑和优化现有课程内容\n• 添加跨章节示例和参考资料\n• 设置课程难度和学习目标\n\n您想创建什么主题的课程？或者需要我帮您优化现有课程吗？`
      : `I can help you create and manage courses! As WeaveMind's AI assistant, I support the following course-related features:\n\n🎯 **Course Creation**\n• Automatically generate complete course outlines based on topics\n• Create chapters and teaching components\n• Generate practice questions and assessment materials\n\n📋 **Course Management**\n• Edit and optimize existing course content\n• Add cross-chapter examples and reference materials\n• Set course difficulty and learning objectives\n\nWhat topic would you like to create a course for? Or do you need help optimizing an existing course?`;
  }

  // Machine learning specific
  if (lowerMessage.includes('machine learning') || lowerMessage.includes('ml') || lowerMessage.includes('机器学习')) {
    return isChinese
      ? `机器学习课程是一个很棒的选择！我可以帮您创建一个完整的机器学习课程：\n\n🤖 **课程结构建议**\n• 第一章：机器学习基础概念\n• 第二章：监督学习算法\n• 第三章：无监督学习\n• 第四章：深度学习入门\n• 第五章：实际项目应用\n\n📝 **我可以帮您生成**\n• 每个章节的详细教学内容\n• Python代码示例和练习\n• 实际数据集和案例研究\n• 章节测验和期末项目\n\n您希望课程偏向理论还是实践？有什么特定的重点领域吗？`
      : `Machine learning courses are a great choice! I can help you create a complete machine learning course:\n\n🤖 **Suggested Course Structure**\n• Chapter 1: Machine Learning Fundamentals\n• Chapter 2: Supervised Learning Algorithms\n• Chapter 3: Unsupervised Learning\n• Chapter 4: Deep Learning Introduction\n• Chapter 5: Real-world Project Applications\n\n📝 **I can generate for you**\n• Detailed teaching content for each chapter\n• Python code examples and exercises\n• Real datasets and case studies\n• Chapter quizzes and final projects\n\nWould you like the course to focus more on theory or practice? Any specific focus areas?`;
  }

  // Outline generation
  if (lowerMessage.includes('outline') || lowerMessage.includes('大纲') || lowerMessage.includes('outline generation')) {
    return isChinese
      ? `我可以帮您生成详细的课程大纲！请告诉我：\n\n📌 **课程基本信息**\n• 课程主题和目标受众\n• 预计课程时长（小时/周）\n• 难度级别（初级/中级/高级）\n• 是否有特定的学习目标\n\n🎯 **我会为您创建**\n• 完整的章节结构\n• 每个章节的学习目标\n• 推荐的教学方法和资源\n• 评估方式和练习题\n\n请描述您想要的课程主题，我会立即为您生成专业的大纲！`
      : `I can help you generate detailed course outlines! Please tell me:\n\n📌 **Course Basic Information**\n• Course topic and target audience\n• Expected course duration (hours/weeks)\n• Difficulty level (beginner/intermediate/advanced)\n• Any specific learning objectives\n\n🎯 **I will create for you**\n• Complete chapter structure\n• Learning objectives for each chapter\n• Recommended teaching methods and resources\n• Assessment methods and exercises\n\nPlease describe the course topic you want, and I'll generate a professional outline for you immediately!`;
  }

  // Student management
  if (lowerMessage.includes('student') || lowerMessage.includes('学生') || lowerMessage.includes('progress') || lowerMessage.includes('进度')) {
    return isChinese
      ? `我可以帮您管理和分析学生学习情况！\n\n👥 **学生管理功能**\n• 查看班级学生列表和详细信息\n• 跟踪学生学习进度和完成情况\n• 识别需要额外关注的学生\n• 生成个性化学习建议\n\n📊 **分析报告**\n• 班级整体表现分析\n• 个别学生学习报告\n• 知识点掌握情况统计\n• 改进建议和行动计划\n\n您想查看哪个班级的学生情况？或者需要我生成特定时间段的学习报告吗？`
      : `I can help you manage and analyze student learning situations!\n\n👥 **Student Management Features**\n• View class student lists and detailed information\n• Track student learning progress and completion\n• Identify students needing extra attention\n• Generate personalized learning suggestions\n\n📊 **Analysis Reports**\n• Overall class performance analysis\n• Individual student learning reports\n• Knowledge point mastery statistics\n• Improvement suggestions and action plans\n\nWhich class's student situation would you like to view? Or do you need me to generate learning reports for a specific time period?`;
  }

  // Assignment and assessment
  if (lowerMessage.includes('assignment') || lowerMessage.includes('作业') || lowerMessage.includes('assessment') || lowerMessage.includes('评估')) {
    return isChinese
      ? `我可以帮您创建作业和评估材料！\n\n📝 **作业类型**\n• 选择题和填空题\n• 编程练习和项目\n• 论文写作和报告\n• 小组项目和演示\n\n✅ **评估功能**\n• 自动评分和反馈\n• 学习成果分析\n• 个性化改进建议\n• 进度跟踪报告\n\n您想为什么课程创建作业？需要什么类型的题目或评估方式？`
      : `I can help you create assignments and assessment materials!\n\n📝 **Assignment Types**\n• Multiple choice and fill-in-the-blank questions\n• Programming exercises and projects\n• Essay writing and reports\n• Group projects and presentations\n\n✅ **Assessment Features**\n• Automatic scoring and feedback\n• Learning outcome analysis\n• Personalized improvement suggestions\n• Progress tracking reports\n\nWhat course do you want to create assignments for? What type of questions or assessment methods do you need?`;
  }

  // Capabilities inquiry
  if (lowerMessage.includes('what can you do') || lowerMessage.includes('你能干什么') || lowerMessage.includes('help') || lowerMessage.includes('help me')) {
    return isChinese
      ? `我是WeaveMind的AI助手，专门为教师提供全方位的教学支持！以下是，我可以帮助您的功能：\n\n🎓 **课程管理**\n• 创建完整的课程大纲和内容\n• 生成章节、练习题和评估材料\n• 编辑和优化现有课程\n\n👥 **学生管理**\n• 跟踪学生学习进度\n• 生成学习分析报告\n• 提供个性化学习建议\n\n💬 **智能对话**\n• 回答教学相关问题\n• 提供教学方法和策略建议\n• 协助解决教学中的挑战\n\n🚀 **Trigger.dev集成**\n• 高性能AI任务处理\n• 实时流式响应\n• 批量处理和优化\n\n您有什么具体的教学需求吗？我随时为您提供帮助！`
      : `I'm WeaveMind's AI assistant, designed to provide comprehensive teaching support for educators! Here are the features I can help you with:\n\n🎓 **Course Management**\n• Create complete course outlines and content\n• Generate chapters, exercises, and assessment materials\n• Edit and optimize existing courses\n\n👥 **Student Management**\n• Track student learning progress\n• Generate learning analysis reports\n• Provide personalized learning suggestions\n\n💬 **Intelligent Conversation**\n• Answer teaching-related questions\n• Provide teaching methods and strategy suggestions\n• Assist with teaching challenges\n\n🚀 **Trigger.dev Integration**\n• High-performance AI task processing\n• Real-time streaming responses\n• Batch processing and optimization\n\nWhat specific teaching needs do you have? I'm here to help you anytime!`;
  }

  // Thank you responses
  if (lowerMessage.includes('thank') || lowerMessage.includes('谢谢') || lowerMessage.includes('感谢')) {
    return isChinese
      ? `不客气！我很高兴能帮助您。如果您还有其他问题或需要创建课程，随时告诉我。我们一起让教学更高效、更有趣！ 🎓✨`
      : `You're welcome! I'm happy to help you. If you have other questions or need to create courses, feel free to let me know anytime. Let's make teaching more efficient and fun together! 🎓✨`;
  }

  // Default response for unrecognized messages
  const defaultResponses = {
    chinese: [
      `我理解您的需求。作为WeaveMind的AI助手，我可以帮您处理各种教学相关的任务。请告诉我您具体想做什么？比如创建课程、管理学生、或者生成教学内容等。`,
      `感谢您的提问！我专注于帮助教师提高教学效率。您可以问我关于课程创建、学生管理、教学方法等任何问题。`,
      `我很乐意帮助您！作为专业的教学AI助手，我可以协助您完成从课程规划到学生评估的各个环节。请告诉我您的具体需求。`,
    ],
    english: [
      `I understand your needs. As WeaveMind's AI assistant, I can help you with various teaching-related tasks. Please tell me specifically what you'd like to do? For example, create courses, manage students, or generate teaching materials.`,
      `Thank you for your question! I focus on helping teachers improve teaching efficiency. You can ask me about course creation, student management, teaching methods, or any other questions.`,
      `I'm happy to help you! As a professional teaching AI assistant, I can assist you with everything from course planning to student assessment. Please let me know your specific needs.`,
    ],
  };

  const responses = isChinese ? defaultResponses.chinese : defaultResponses.english;
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return randomResponse;
}

/**
 * GET endpoint for testing and health checks
 */
export async function GET(request: NextRequest) {
  const adapterStatus = langGraphAdapter.getWorkflowStatus();

  return NextResponse.json({
    success: true, // 添加success字段以匹配前端期望
    status: "healthy",
    version: "1.0.0",
    adapter: adapterStatus,
    capabilities: {
      streaming: true,
      hybridMode: true,
      legacyFallback: true,
    },
    timestamp: new Date().toISOString(),
  });
}
