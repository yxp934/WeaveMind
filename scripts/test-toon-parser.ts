import { parseModelResponse } from "@/lib/ai/langgraph/utils/model-response";

const sample = `
---BEGIN_TOON---
message: 这是一个测试消息
action: ask_info
updatedCourseInfo:
  topic: LangGraph修复验证班
  duration: 8周
  sessionsPerWeek: 2
  targetAudience: AI开发者
  difficultyLevel: 中等
  courseType: 线上直播
workflowStep: info_collection
missingInfo: []
suggestions: 补充课程总时长,说明目标学员,确认难度等级,确认课程类型
metadata:
  toolsUsed: course_creation,intent_recognition
  progress: 20
---END_TOON---
`;

// eslint-disable-next-line no-console
console.log(
  "Parsed sample:",
  parseModelResponse<{
    message: string;
    action: string;
    updatedCourseInfo: Record<string, string>;
  }>(sample),
);
