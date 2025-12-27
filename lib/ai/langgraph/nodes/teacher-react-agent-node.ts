import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { generateText } from "ai";
import { createGatewayOpenAI, DEFAULT_MODEL } from "../config/openai-gateway";
import { ChatbotState } from "../chatbot-state";
import { parseModelResponse } from "../utils/model-response";

const openai = createGatewayOpenAI();

type NextAction = "ask_user" | "propose_tool" | "done";
type CrudAction = "create" | "read" | "update" | "delete" | "list";
type EntityType = "class" | "session" | "assignment";

function detectLanguage(text: string): "zh" | "en" {
  // Very lightweight heuristic: presence of CJK characters -> zh, else en.
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

function isApproval(text: string): boolean {
  return /^(approve|approved|yes|ok|okay|confirm|confirmed|确认|同意|好的|可以)[.!。！？\s]*$/i.test(
    text.trim(),
  );
}

function extractBullets(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];
  for (const line of lines) {
    const m = line.match(/^[-*•]\s+(.*)$/);
    if (m?.[1]) {
      bullets.push(m[1].trim());
      continue;
    }
    const n = line.match(/^\d+[.)]\s+(.*)$/);
    if (n?.[1]) {
      bullets.push(n[1].trim());
      continue;
    }
  }
  return bullets;
}

function extractClassName(text: string): string | null {
  const patterns: RegExp[] = [
    /《([^》]+)》/i,
    /班级[:：]\s*([^\n，。,。;；]+)\s*/i,
    /(班级名|班级名称|班级名字|班名)[:：]\s*([^\n，。,。;；]+)\s*/i,
    /(名称是|名字是|名称为|名字为|名为)\s*([^\n，。,。;；]+)\s*/i,
    /(?:创建|新建|建立|开设|开班)\s*(?:一个|一门|一堂|一节)?\s*([^\n，。,。;；]+?(?:班级|班|课程|class))/i,
    /班级[“"《]([^”"》\n，。,。;；]+)[”"》]/i,
    /叫(?:做)?\s*([^\n，。,。;；]+)\s*/i,
    /名为[“"]([^”"]+)[”"]/i,
    /名为《([^》]+)》/i,
    /named\s+[“"]([^”"]+)[”"]/i,
    /(class\s*name)[:：]\s*([^\n,.;]+)\s*/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const raw = m?.[2] || m?.[1];
    if (raw) {
      const name = raw.trim();
      const cleaned = sanitizeClassName(name);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

function sanitizeClassName(value: string | null | undefined): string | null {
  if (!value) return null;
  const name = String(value).trim();
  if (!name) return null;
  if (/^(班级|班|课程|课|class|classes)$/i.test(name)) return null;
  if (/^(一个|一门|一堂|一节)\s*(班级|班|课程|课|class|classes)$/i.test(name)) {
    return null;
  }
  const cut = name.match(
    /^(.*?)(?:(?:\s+一共|\s+共有|\s+共|\s+第\s*\d+\s*节|\s+session\s*\d+|\s+\d+\s*sessions?|\s+-\s+第\s*\d+\s*节|\s+-\s+session\s*\d+).*?)?$/i,
  );
  const cleaned = (cut?.[1] || name).replace(/[-–—:：]+$/g, "").trim();
  return cleaned || null;
}

function trimTrailingSessionInfo(value: string): string {
  const cut = value.match(
    /^(.*?)(?:(?:[。.;；、]?\s*(?:一共|共有|共)\s*\d+\s*(节|课|sessions?))|(?:[。.;；、]?\s*第\s*\d+\s*(节|课))|(?:\s*session\s*\d+)|(?:\s*\d+\s*sessions?)).*$/i,
  );
  const cleaned = (cut?.[1] || value).replace(/[-–—:：]+$/g, "").trim();
  return cleaned || value.trim();
}

function extractSessionCount(text: string): number | null {
  const m = text.match(/(\d+)\s*(节|课|sessions?)/i);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(32, Math.max(1, Math.floor(n)));
}

function inferCrudAction(text: string): CrudAction | null {
  if (/(删除|移除|清除|delete|remove)/i.test(text)) return "delete";
  if (/(更新|修改|更改|编辑|update|edit)/i.test(text)) return "update";
  if (/(创建|新建|新增|添加|建立|create|add)/i.test(text)) return "create";
  if (/(列出|查看|显示|list|show|有哪些|what|which)/i.test(text)) {
    return "list";
  }
  if (/(查询|读取|read)/i.test(text)) return "read";
  return null;
}

function inferEntityType(text: string): EntityType | null {
  const hasSession = /(课次|课节|第\s*\d+\s*(节|课)|session|sessions|lesson)/i.test(
    text,
  );
  const hasAssignment = /(作业|assignment|assignments|任务)/i.test(text);
  const hasClass = /(班级|课程|班|class|classes)/i.test(text);

  if (hasSession) return "session";
  if (hasAssignment) return "assignment";
  if (hasClass) return "class";
  return null;
}

function describeEntity(entity: EntityType, lang: "zh" | "en"): string {
  if (lang === "en") {
    if (entity === "class") return "class";
    if (entity === "session") return "session";
    return "assignment";
  }
  if (entity === "class") return "班级";
  if (entity === "session") return "课次";
  return "作业";
}

function describeCrudAction(action: CrudAction, lang: "zh" | "en"): string {
  if (lang === "en") {
    switch (action) {
      case "create":
        return "create";
      case "update":
        return "update";
      case "delete":
        return "delete";
      case "list":
        return "list";
      case "read":
        return "view";
    }
  }
  switch (action) {
    case "create":
      return "创建";
    case "update":
      return "更新";
    case "delete":
      return "删除";
    case "list":
      return "列出";
    case "read":
      return "查看";
  }
}

function extractUuid(text: string): string | null {
  const match = text.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
  return match?.[0] || null;
}

function extractTitle(text: string): string | null {
  const patterns: RegExp[] = [
    /标题(?:为|是)?[:：]?\s*[“"]?([^”"\n，,。;；]+)[”"]?/i,
    /(名称|名为|name|title)[:：]?\s*[“"]?([^”"\n，,。;；]+)[”"]?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const raw = m?.[2] || m?.[1];
    if (raw) {
      const value = raw.trim();
      if (value) return value;
    }
  }
  return null;
}

function extractDescription(text: string): string | null {
  const patterns: RegExp[] = [
    /描述[:：]?\s*[“"]?([^”"\n]+)[”"]?/i,
    /说明[:：]?\s*[“"]?([^”"\n]+)[”"]?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const value = m[1].trim();
      if (value) return value;
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  const match = text.match(/\d{4}-\d{1,2}-\d{1,2}/);
  return match?.[0] || null;
}

function extractTime(text: string): string | null {
  const match = text.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
  return match?.[0] || null;
}

function extractLabeledValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${escapeRegExp(label)}\\s*[:：]\\s*([^\\n]+)`, "i");
    const match = text.match(re);
    if (match?.[1]) {
      const value = match[1].trim().replace(/[;；。,.]+$/g, "").trim();
      if (value) return value;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCourseInfoInput(text: string, labels: string[]): string {
  if (!text || !labels.length) return text;
  const pattern = labels.map(escapeRegExp).join("|");
  if (!pattern) return text;
  const re = new RegExp(`(${pattern})\\s*[:：]`, "gi");
  return text.replace(re, "\n$1:");
}

function extractCourseInfoFields(text: string): {
  classDescription?: string;
  courseInfo?: {
    targetAudience?: string;
    learningObjectives?: string;
    teachingMethod?: string;
    difficultyLevel?: string;
  };
} {
  if (!text) return {};
  const allLabels = [
    "课程简介",
    "课程描述",
    "课程说明",
    "课程概述",
    "班级描述",
    "description",
    "summary",
    "overview",
    "目标学员",
    "目标受众",
    "受众",
    "面向人群",
    "面向对象",
    "target audience",
    "audience",
    "学习目标",
    "课程目标",
    "教学目标",
    "目标",
    "learning objectives",
    "learning goals",
    "goals",
    "教学方法",
    "教学方式",
    "授课方式",
    "教学形式",
    "教学模式",
    "teaching method",
    "teaching approach",
    "delivery method",
    "难度级别",
    "难度",
    "水平",
    "difficulty",
    "level",
  ];
  const normalizedText = normalizeCourseInfoInput(text, allLabels);

  const classDescription =
    extractLabeledValue(normalizedText, [
      "课程简介",
      "课程描述",
      "课程说明",
      "课程概述",
      "班级描述",
      "description",
      "summary",
      "overview",
    ]) || undefined;

  let targetAudience =
    extractLabeledValue(normalizedText, [
      "目标学员",
      "目标受众",
      "受众",
      "面向人群",
      "面向对象",
      "target audience",
      "audience",
    ]) || undefined;
  if (!targetAudience) {
    const match = normalizedText.match(/(?:面向|适合|针对)\s*([^\n，。,。;；]+)/);
    if (match?.[1]) targetAudience = match[1].trim();
  }

  let learningObjectives =
    extractLabeledValue(normalizedText, [
      "学习目标",
      "课程目标",
      "教学目标",
      "目标",
      "learning objectives",
      "learning goals",
      "goals",
    ]) || undefined;

  let teachingMethod =
    extractLabeledValue(normalizedText, [
      "教学方法",
      "教学方式",
      "授课方式",
      "教学形式",
      "教学模式",
      "teaching method",
      "teaching approach",
      "delivery method",
    ]) || undefined;
  if (!teachingMethod) {
    const match = normalizedText.match(
      /(?:采用|以|使用)\s*([^\n，。,。;；]+)(?:教学|授课|方式)/,
    );
    if (match?.[1]) teachingMethod = match[1].trim();
  }

  let difficultyLevel =
    extractLabeledValue(normalizedText, [
      "难度级别",
      "难度",
      "水平",
      "difficulty",
      "level",
    ]) || undefined;
  if (!difficultyLevel) {
    if (/(入门|初级|beginner)/i.test(normalizedText)) {
      difficultyLevel = "beginner";
    }
    if (/(中级|进阶|intermediate)/i.test(normalizedText)) {
      difficultyLevel = "intermediate";
    }
    if (/(高级|高阶|advanced|expert)/i.test(normalizedText)) {
      difficultyLevel = "advanced";
    }
  }
  if (difficultyLevel) {
    difficultyLevel = trimTrailingSessionInfo(difficultyLevel);
  }

  if (
    !classDescription &&
    !targetAudience &&
    !learningObjectives &&
    !teachingMethod &&
    !difficultyLevel
  ) {
    const cleaned = normalizedText.trim();
    const looksLikeSessions =
      /第\s*\d+\s*节|session\s*\d+/i.test(cleaned) ||
      /(^|\n)\s*[-*•]\s+/.test(cleaned) ||
      /(^|\n)\s*\d+[.)]\s+/.test(cleaned);
    if (!looksLikeSessions && cleaned.length > 20 && !isApproval(cleaned)) {
      return { classDescription: cleaned };
    }
  }

  const courseInfo: Record<string, string> = {};
  if (targetAudience) courseInfo.targetAudience = targetAudience;
  if (learningObjectives) courseInfo.learningObjectives = learningObjectives;
  if (teachingMethod) courseInfo.teachingMethod = teachingMethod;
  if (difficultyLevel) courseInfo.difficultyLevel = difficultyLevel;

  return {
    classDescription,
    courseInfo: Object.keys(courseInfo).length > 0 ? (courseInfo as any) : undefined,
  };
}

function mergeCourseInfo(
  existing: Record<string, any> | null | undefined,
  incoming: Record<string, any> | null | undefined,
) {
  const next = { ...(existing || {}) };
  const entries = incoming && typeof incoming === "object" ? Object.entries(incoming) : [];
  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    next[key] = value;
  }
  return next;
}

function hasCourseInfo(creation: {
  classDescription?: string | null;
  courseInfo?: Record<string, any> | null;
}) {
  if (creation.classDescription) return true;
  const info = creation.courseInfo || {};
  return Boolean(
    info.targetAudience ||
      info.learningObjectives ||
      info.teachingMethod,
  );
}

function buildCourseInfoSummary(
  creation: {
    classDescription?: string | null;
    courseInfo?: Record<string, any> | null;
  },
  preferredLanguage: "zh" | "en",
) {
  const courseInfo = creation.courseInfo || {};
  const summaryLines: string[] = [];
  if (creation.classDescription) {
    summaryLines.push(
      preferredLanguage === "zh"
        ? `课程简介：${creation.classDescription}`
        : `Summary: ${creation.classDescription}`,
    );
  }
  if (courseInfo.targetAudience) {
    summaryLines.push(
      preferredLanguage === "zh"
        ? `目标学员：${courseInfo.targetAudience}`
        : `Target audience: ${courseInfo.targetAudience}`,
    );
  }
  if (courseInfo.learningObjectives) {
    summaryLines.push(
      preferredLanguage === "zh"
        ? `学习目标：${courseInfo.learningObjectives}`
        : `Learning objectives: ${courseInfo.learningObjectives}`,
    );
  }
  if (courseInfo.teachingMethod) {
    summaryLines.push(
      preferredLanguage === "zh"
        ? `教学方法：${courseInfo.teachingMethod}`
        : `Teaching method: ${courseInfo.teachingMethod}`,
    );
  }
  if (courseInfo.difficultyLevel) {
    summaryLines.push(
      preferredLanguage === "zh"
        ? `难度：${courseInfo.difficultyLevel}`
        : `Difficulty: ${courseInfo.difficultyLevel}`,
    );
  }
  if (summaryLines.length === 0) return "";
  const heading =
    preferredLanguage === "zh" ? "课程信息库：" : "Course info library:";
  return `\n\n${heading}\n- ${summaryLines.join("\n- ")}`;
}

function normalizeEntityManagementInput(
  userText: string,
  input: Record<string, any> | null | undefined,
  contextIds: {
    classId?: string | null;
    selectedClassId?: string | null;
    selectedSessionId?: string | null;
    selectedAssignmentId?: string | null;
  },
): Record<string, any> {
  const normalized =
    input && typeof input === "object" ? { ...input } : ({} as any);
  const inferredAction = normalized.action || inferCrudAction(userText);
  const inferredEntity = inferEntityType(userText);
  const proposedEntity = normalized.entity;

  if (inferredAction) normalized.action = inferredAction;
  if (inferredEntity) {
    if (!proposedEntity || (proposedEntity === "class" && inferredEntity !== "class")) {
      normalized.entity = inferredEntity;
    }
  } else if (proposedEntity) {
    normalized.entity = proposedEntity;
  }

  const action = normalized.action;
  const inferredId = extractUuid(userText);
  const fallbackClassId = contextIds.selectedClassId || contextIds.classId;

  if (!normalized.classId && fallbackClassId) {
    normalized.classId = fallbackClassId;
  }

  if (normalized.entity === "session") {
    if (!normalized.sessionId) {
      if (action === "update" || action === "delete") {
        normalized.sessionId =
          contextIds.selectedSessionId || inferredId || null;
      } else {
        normalized.sessionId = contextIds.selectedSessionId || null;
      }
    }
    if (
      !normalized.classId &&
      inferredId &&
      (action === "list" || action === "read" || action === "create")
    ) {
      normalized.classId = inferredId;
    }
  }

  if (normalized.entity === "assignment") {
    if (!normalized.assignmentId) {
      if (action === "update" || action === "delete") {
        normalized.assignmentId =
          contextIds.selectedAssignmentId || inferredId || null;
      } else {
        normalized.assignmentId = contextIds.selectedAssignmentId || null;
      }
    }
    if (
      !normalized.classId &&
      inferredId &&
      (action === "list" || action === "read" || action === "create")
    ) {
      normalized.classId = inferredId;
    }
  }

  if (normalized.entity === "class" && !normalized.classId && inferredId) {
    normalized.classId = inferredId;
  }

  if (action === "create" || action === "update") {
    const details =
      normalized.details && typeof normalized.details === "object"
        ? { ...normalized.details }
        : ({} as any);
    const title = extractTitle(userText);
    if (title) {
      if (normalized.entity === "class") {
        details.name = details.name || title;
      } else {
        details.title = details.title || title;
      }
    }
    const description = extractDescription(userText);
    if (description && !details.description) {
      details.description = description;
    }

    if (normalized.entity === "session") {
      const date = extractDate(userText);
      if (date && !details.scheduledDate) {
        details.scheduledDate = date;
      }
      const time = extractTime(userText);
      if (time && !details.startTime) {
        details.startTime = time;
      }
    }

    if (normalized.entity === "assignment") {
      const dueDate = extractDate(userText);
      if (dueDate && !details.dueDate) {
        details.dueDate = dueDate;
      }
    }

    if (Object.keys(details).length > 0) {
      normalized.details = details;
    }
  }

  return normalized;
}

function parseSessionDrafts(
  text: string,
): Array<{
  idx?: number;
  title: string;
  description?: string;
  scheduledDate?: string;
  startTime?: string;
}> {
  // Some UIs collapse newlines; normalize common "- Session" separators into newlines.
  const normalizedText = text.replace(
    /\s+-\s+(?=(第\s*\d+\s*节|session\s*\d+))/gi,
    "\n- ",
  );
  const drafts: Array<{
    idx?: number;
    title: string;
    description?: string;
    scheduledDate?: string;
    startTime?: string;
  }> = [];

  const buildDraft = (raw: string, idx?: number) => {
    const scheduledDate = extractDate(raw) || undefined;
    const startTime = extractTime(raw) || undefined;
    let cleaned = raw;
    if (scheduledDate) {
      cleaned = cleaned.replace(scheduledDate, " ");
    }
    if (startTime) {
      cleaned = cleaned.replace(startTime, " ");
    }
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    if (typeof idx === "number") {
      const idxRe = new RegExp(`^(第\\s*${idx}\\s*节|session\\s*${idx})\\s*[:：-]?\\s*`, "i");
      cleaned = cleaned.replace(idxRe, "").trim();
    }
    if (!cleaned && typeof idx === "number") {
      cleaned = /session/i.test(raw) ? `Session ${idx}` : `第${idx}节`;
    }
    if (!cleaned) return null;
    const [titlePart, descPart] = cleaned.split(/\s*[-—–]\s*/, 2);
    const title = titlePart.trim();
    if (!title) return null;
    const description = descPart?.trim();
    return {
      idx,
      title,
      description: description || undefined,
      scheduledDate,
      startTime,
    };
  };

  const cnRe =
    /第\s*(\d+)\s*节\s*[:：-]?\s*([^\n；;。]+)(?:[；;\n。]|$)/g;
  for (const match of normalizedText.matchAll(cnRe)) {
    const idx = Number(match[1]);
    const raw = (match[2] || "").trim();
    if (!raw) continue;
    const draft = buildDraft(raw, idx);
    if (draft) drafts.push(draft);
  }

  const enRe =
    /session\s*(\d+)\s*[:：-]?\s*([^\n；;。]+)(?:[；;\n。]|$)/gi;
  for (const match of normalizedText.matchAll(enRe)) {
    const idx = Number(match[1]);
    const raw = (match[2] || "").trim();
    if (!raw) continue;
    const draft = buildDraft(raw, idx);
    if (draft) drafts.push(draft);
  }

  const bullets = extractBullets(normalizedText);
  for (const b of bullets) {
    const idxMatch = b.match(/第\s*(\d+)\s*节/i);
    const enMatch = b.match(/session\s*(\d+)/i);
    const idx = idxMatch ? Number(idxMatch[1]) : enMatch ? Number(enMatch[1]) : undefined;
    const draft = buildDraft(b, idx);
    if (draft) drafts.push(draft);
  }

  if (drafts.length === 0) {
    const parts = normalizedText
      .split(/[；;\n。]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts) {
      const idxMatch = p.match(/第\s*(\d+)\s*节/i);
      const enMatch = p.match(/session\s*(\d+)/i);
      const idx = idxMatch ? Number(idxMatch[1]) : enMatch ? Number(enMatch[1]) : undefined;
      const draft = buildDraft(p, idx);
      if (draft) drafts.push(draft);
    }
  }

  const seen = new Set<string>();
  return drafts
    .filter((d) => {
      const key =
        typeof d.idx === "number" ? `idx:${d.idx}` : `title:${d.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (typeof a.idx === "number" && typeof b.idx === "number") {
        return a.idx - b.idx;
      }
      if (typeof a.idx === "number") return -1;
      if (typeof b.idx === "number") return 1;
      return 0;
    })
    .slice(0, 32);
}

function mergeSessionDrafts(
  existing: Array<Record<string, any>>,
  incoming: Array<Record<string, any>>,
  sessionCount?: number | null,
) {
  const cappedCount =
    typeof sessionCount === "number" && sessionCount > 0 ? sessionCount : null;
  const next = (Array.isArray(existing) ? existing : []).map((d, i) => ({
    ...d,
    idx: typeof d.idx === "number" ? d.idx : i + 1,
  }));
  const mergeValue = (prev: any, nextValue: any) => {
    if (nextValue === undefined || nextValue === null) return prev;
    if (typeof nextValue === "string" && !nextValue.trim()) return prev;
    return nextValue;
  };

  for (const item of incoming || []) {
    if (!item) continue;
    const incomingIdx =
      typeof item.idx === "number" && item.idx > 0 ? item.idx : null;
    let targetIndex = -1;
    if (
      incomingIdx &&
      (!cappedCount || incomingIdx <= cappedCount)
    ) {
      targetIndex = incomingIdx - 1;
    } else if (item.title) {
      const lower = String(item.title).toLowerCase();
      targetIndex = next.findIndex(
        (d) => d?.title && String(d.title).toLowerCase() === lower,
      );
    }

    if (targetIndex >= 0) {
      const base = next[targetIndex] || {};
      next[targetIndex] = {
        ...base,
        ...item,
        idx: base.idx || incomingIdx || targetIndex + 1,
        title: mergeValue(base.title, item.title),
        description: mergeValue(base.description, item.description),
        scheduledDate: mergeValue(base.scheduledDate, item.scheduledDate),
        startTime: mergeValue(base.startTime, item.startTime),
      };
      continue;
    }

    if (!cappedCount || next.length < cappedCount) {
      next.push({
        ...item,
        idx: incomingIdx || next.length + 1,
      });
    }
  }

  return cappedCount ? next.slice(0, cappedCount) : next;
}

async function generateSessionTitleDrafts(params: {
  className: string;
  classDescription?: string | null;
  courseInfo?: Record<string, any> | null;
  sessionCount: number;
  preferredLanguage: "zh" | "en";
}): Promise<Array<{ idx?: number; title: string; description?: string }>> {
  const {
    className,
    classDescription,
    courseInfo,
    sessionCount,
    preferredLanguage,
  } = params;

  const systemPrompt =
    preferredLanguage === "zh"
      ? `你是经验丰富的课程设计师。请为一个班级生成 ${sessionCount} 节课的标题草案。\n\n规则：\n- 只输出要点列表（不要额外解释）。\n- 每行格式：- 第X节：标题 - 可选描述\n- 确保编号从1到${sessionCount}，标题清晰具体。`
      : `You are an expert curriculum designer. Generate ${sessionCount} session title drafts.\n\nRules:\n- Output only bullet lines (no extra prose).\n- Format each line as: - Session X: Title - optional description\n- Ensure numbering from 1 to ${sessionCount}.`;

  const userPrompt = `Class name: ${className}\nClass description: ${classDescription || ""}\nCourse info: ${JSON.stringify(courseInfo || {})}`;

  const { text } = await generateText({
    model: openai.chat(DEFAULT_MODEL),
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 600,
    temperature: 0.4,
    abortSignal: AbortSignal.timeout(15000),
  });

  return parseSessionDrafts(text);
}

function buildFallbackSessionDrafts(params: {
  className: string;
  sessionCount: number;
  preferredLanguage: "zh" | "en";
  startIndex?: number;
}): Array<{ idx?: number; title: string; description?: string }> {
  const { className, sessionCount, preferredLanguage, startIndex = 1 } = params;
  const drafts: Array<{ idx?: number; title: string; description?: string }> = [];
  for (let idx = startIndex; idx <= sessionCount; idx += 1) {
    const title =
      preferredLanguage === "zh"
        ? `${className} 第${idx}讲`
        : `${className} - Session ${idx}`;
    drafts.push({ idx, title });
  }
  return drafts;
}

function getLastToolExecution(messages: any[]): {
  toolName: string | null;
  success: boolean | null;
  toolResult: any | null;
  confirmedToolCallId: string | null;
} {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg: any = messages[i];
    const meta =
      msg?.additional_kwargs?.metadata || msg?.additional_kwargs || null;
    if (meta?.confirmationExecuted) {
      return {
        toolName: meta?.lastExecutedTool || meta?.actionType || null,
        success:
          typeof meta?.toolExecutionSuccess === "boolean"
            ? meta.toolExecutionSuccess
            : null,
        toolResult: meta?.toolResult || null,
        confirmedToolCallId: meta?.confirmedToolCallId || null,
      };
    }
  }
  return {
    toolName: null,
    success: null,
    toolResult: null,
    confirmedToolCallId: null,
  };
}

function isContinuationMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "continue" || t === "继续";
}

function buildSystemPrompt(params: {
  toolCallsExecuted: number;
  preferredLanguage: "zh" | "en";
  selectedClassId?: string | null;
  selectedSessionId?: string | null;
  selectedAssignmentId?: string | null;
  lastCreatedClassId?: string | null;
  agentState?: Record<string, any> | null;
  compressionContext?: Record<string, any> | null;
}): string {
  const {
    toolCallsExecuted,
    preferredLanguage,
    selectedClassId,
    selectedSessionId,
    selectedAssignmentId,
    lastCreatedClassId,
    compressionContext,
  } = params;

  const compressionBlock = compressionContext
    ? `COURSE INFO LIBRARY:
- summary: ${compressionContext.compressed_summary || ""}
- key concepts: ${(compressionContext.key_concepts || []).join(", ")}
- learning objectives: ${(compressionContext.learning_objectives || []).join(", ")}
- teaching method: ${compressionContext.teaching_method || ""}
- target audience: ${compressionContext.target_audience || ""}
- difficulty level: ${compressionContext.difficulty_level || ""}
- session contexts: ${JSON.stringify(compressionContext.session_contexts || [])}
`
    : "";

  return `You are WeaveMind's teacher assistant. You help teachers manage classes, sessions, and assignments.

IMPORTANT: Always respond in ${preferredLanguage === "zh" ? "Chinese" : "English"}.

OUTPUT FORMAT:
You must output in TOON format using exactly this structure:
---BEGIN_TOON---
message: [your helpful response here]
next_action: ask_user
---END_TOON---

Or when proposing a tool:
---BEGIN_TOON---
message: [explanation of what you will do]
next_action: propose_tool
proposed_tool:
  toolName: [tool name]
  input: [tool parameters]
---END_TOON---

AVAILABLE TOOLS:
1. entity_management - Create, read, update, delete classes/sessions/assignments
2. create_sessions_batch - Create multiple sessions for a class
3. generate_class_outline_draft - Generate AI outlines for sessions
4. save_class_outline - Save confirmed outlines to database
5. generate_session_outline_draft - Generate outline for one session
6. a2a_session_generate_and_save - Run collaborative generation and save session content

RULES:
- You can only propose ONE tool per turn
- All tools need user confirmation before execution
- If no tool needed, use next_action: ask_user
- Be helpful and explain what you're doing

CONTEXT:
- Selected Class: ${selectedClassId || "none"}
- Selected Session: ${selectedSessionId || "none"}
- Last Created Class: ${lastCreatedClassId || "none"}
${compressionBlock}

Always be helpful and guide the user step by step.`;
}

function countExecutedToolCallsFromHistory(
  messages: any[],
): number {
  // The client sends assistant message metadata back; we look for confirmationExecuted.
  // We cannot rely on tool call content alone.
  let count = 0;
  for (const msg of messages) {
    const meta = (msg as any)?.additional_kwargs?.metadata || (msg as any)?.additional_kwargs || null;
    if (meta?.confirmationExecuted) count += 1;
  }
  return count;
}

export async function teacherReactAgentNode(
  state: ChatbotState,
): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state };
  }

  const userText = lastMessage.content.toString();
  const lastToolExecution = getLastToolExecution(state.messages);
  const toolCallsExecuted = countExecutedToolCallsFromHistory(state.messages);
  const toolAgentState =
    lastToolExecution.toolResult &&
    typeof lastToolExecution.toolResult === "object"
      ? (lastToolExecution.toolResult as any).agentState
      : null;
  let existingAgentState: any = state.metadata?.agentState || {};
  if (toolAgentState && typeof toolAgentState === "object") {
    existingAgentState = {
      ...existingAgentState,
      ...toolAgentState,
      sessionOutlineStatus:
        toolAgentState.sessionOutlineStatus ||
        existingAgentState.sessionOutlineStatus,
      sessionOutlineDraft:
        toolAgentState.sessionOutlineDraft ||
        existingAgentState.sessionOutlineDraft,
      sessionOutlineSessionId:
        toolAgentState.sessionOutlineSessionId ||
        existingAgentState.sessionOutlineSessionId,
      sessionOutlineClassId:
        toolAgentState.sessionOutlineClassId ||
        existingAgentState.sessionOutlineClassId,
    };
  }
  const preferredLanguage =
    existingAgentState?.preferredLanguage ||
    (state.metadata as any)?.preferredLanguage ||
    detectLanguage(userText);
  existingAgentState = {
    ...existingAgentState,
    preferredLanguage,
  };

  // After a confirmed tool execution, the server sends a synthetic "continue/继续" message.
  // Show the tool's human-readable result and ask what to do next, unless we're in a
  // stateful workflow (class creation / outline review) that should immediately propose
  // the next tool.
  const hasActiveCreation =
    existingAgentState?.classCreation?.status &&
    existingAgentState.classCreation.status !== "done";
  const isOutlineReviewing = existingAgentState?.outlineStatus === "reviewing";
  const isSessionOutlineReviewing =
    existingAgentState?.sessionOutlineStatus === "reviewing";
  const hasActiveSessionOutline =
    existingAgentState?.sessionOutlineStatus &&
    existingAgentState.sessionOutlineStatus !== "done";
  const alreadyRenderedToolId =
    typeof existingAgentState?.lastRenderedToolCallId === "string"
      ? existingAgentState.lastRenderedToolCallId
      : null;

  if (
    isContinuationMessage(userText) &&
    !hasActiveCreation &&
    !isOutlineReviewing &&
    !isSessionOutlineReviewing &&
    !hasActiveSessionOutline &&
    lastToolExecution.toolName &&
    typeof lastToolExecution.success === "boolean" &&
    lastToolExecution.confirmedToolCallId &&
    lastToolExecution.confirmedToolCallId !== alreadyRenderedToolId
  ) {
    const toolMessage =
      (lastToolExecution.toolResult &&
        typeof lastToolExecution.toolResult.message === "string" &&
        lastToolExecution.toolResult.message.trim()) ||
      (preferredLanguage === "zh"
        ? "工具已执行，但没有返回可展示的信息。"
        : "The tool executed, but returned no displayable message.");

    const nextPrompt =
      preferredLanguage === "zh"
        ? "\n\n如果需要继续，请告诉我下一步。"
        : "\n\nIf you'd like to continue, tell me the next step.";

    const nextAgentState = {
      ...existingAgentState,
      lastRenderedToolCallId: lastToolExecution.confirmedToolCallId,
    };

    const aiMessage = new AIMessage({
      content: `${toolMessage}${nextPrompt}`,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: nextAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
        },
      },
    });

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        agentState: nextAgentState,
        requiresDatabaseAction: false,
        actionType: null,
        actionData: null,
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: "ask_user",
        data: { phase: "post_tool_observation" },
      },
    };
  }

  const selectedClassId =
    state.metadata?.selectedClassId ||
    state.metadata?.lastCreatedClassId ||
    null;
  const selectedSessionId = state.metadata?.selectedSessionId || null;
  const sessionOutlineStatus = existingAgentState?.sessionOutlineStatus || null;
  const wantsSessionContent =
    (/(生成|制作|完善|补充|创建|编写|撰写)/i.test(userText) &&
      /(课次|课节|session|lesson|这节|本节|这个)/i.test(userText) &&
      /(内容|讲义|组件|content|教学)/i.test(userText)) ||
    (/生成.*内容/i.test(userText) && !!selectedSessionId);
  const wantsSessionOutline =
    !!selectedSessionId && /(大纲|outline)/i.test(userText);

  if ((wantsSessionContent || wantsSessionOutline) && !hasActiveSessionOutline) {
    if (!selectedSessionId || !selectedClassId) {
      const ask =
        preferredLanguage === "zh"
          ? "请先选择要生成内容的课次（在右侧聊天上下文中选中课次），或直接告诉我课次ID。"
          : "Please select the session you want to generate content for (pick it in the context menu) or provide the session ID.";
      const aiMessage = new AIMessage({
        content: ask,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "missing_session_context" },
        },
      };
    }

    const msg =
      preferredLanguage === "zh"
        ? "我将先为这节课生成详细大纲（含教学目标和组件规划），生成后请你确认。请确认执行。"
        : "I will generate a detailed outline for this session (objectives + component plan) and ask you to confirm. Please confirm to proceed.";
    const nextAgentState = {
      ...existingAgentState,
      sessionOutlineStatus: "drafting",
      sessionOutlineSessionId: selectedSessionId,
      sessionOutlineClassId: selectedClassId,
    };
    const aiMessage = new AIMessage({
      content: msg,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: nextAgentState,
          requiresDatabaseAction: true,
          actionType: "generate_session_outline_draft",
          actionData: {
            classId: selectedClassId,
            sessionId: selectedSessionId,
            language: preferredLanguage,
            agentState: nextAgentState,
          },
        },
      },
    });
    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        agentState: nextAgentState,
        requiresDatabaseAction: true,
        actionType: "generate_session_outline_draft",
        actionData: {
          classId: selectedClassId,
          sessionId: selectedSessionId,
          language: preferredLanguage,
          agentState: nextAgentState,
        },
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: "propose_tool",
        data: { phase: "generate_session_outline" },
      },
    };
  }

  // Deterministic fast-path: list queries should reliably propose a read tool.
  const normalized = userText.toLowerCase();
  const wantsList = /(有哪些|列出|查看|show|list|what|which)/i.test(userText);
  const mentionsClass = /(班级|班|课程|class|classes)/i.test(userText);
  const mentionsSession = /(课次|课|session|sessions)/i.test(userText);
  const mentionsAssignment = /(作业|assignment|assignments)/i.test(userText);
  const listEntity = mentionsClass
    ? "class"
    : mentionsSession
      ? "session"
      : mentionsAssignment
        ? "assignment"
        : null;

  // Deterministic class creation workflow (class -> sessions -> outline -> save).
  if (existingAgentState?.outlineStatus !== "reviewing") {
    const wantsCreateClass =
      /(创建|新建|建立|开设|开班|开办|开|办).*(班级|班|课程|课)/.test(userText) ||
      /(create|start).*(class|course)/i.test(userText);
    const activeCreation = existingAgentState?.classCreation;
    const isActive =
      activeCreation?.status && activeCreation.status !== "done";

    if (wantsCreateClass || isActive) {
      const creation = {
        status: isActive ? activeCreation.status : "collecting",
        className: activeCreation?.className || null,
        classDescription: activeCreation?.classDescription || null,
        courseInfo: activeCreation?.courseInfo || {},
        courseInfoConfirmed: activeCreation?.courseInfoConfirmed || false,
        sessionCount: activeCreation?.sessionCount || null,
        sessionsDraft: Array.isArray(activeCreation?.sessionsDraft)
          ? activeCreation.sessionsDraft
          : [],
        sessionTitlesGenerated: activeCreation?.sessionTitlesGenerated || false,
        classId: activeCreation?.classId || null,
        outlineLanguage: activeCreation?.outlineLanguage || null,
      };

      // Mark completion once the outline has been saved.
      if (
        lastToolExecution.toolName === "save_class_outline" &&
        lastToolExecution.success === true
      ) {
        const doneMsg =
          preferredLanguage === "zh"
            ? "✅ 班级创建与大纲保存已完成。如果你还想创建作业或调整课次，我也可以继续帮你。"
            : "✅ Class creation + outline save completed. If you want to create assignments or edit sessions, tell me.";
        const nextAgentState = {
          ...existingAgentState,
          classCreation: { ...creation, status: "done" },
        };
        const aiMessage = new AIMessage({
          content: doneMsg,
          additional_kwargs: {
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
            },
          },
        });
        return {
          ...state,
          messages: [...state.messages, aiMessage],
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: nextAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
            timestamp: new Date().toISOString(),
          },
          currentWorkflow: {
            type: "react_agent",
            status: "active",
            step: "done",
            data: { phase: "class_creation_done" },
          },
        };
      }

      // Update collected fields from the current user turn (if any).
      const updated = { ...creation };
      const trimmed = userText.trim();
      const extractedInfo = extractCourseInfoFields(userText);
      if (extractedInfo.classDescription && !updated.classDescription) {
        updated.classDescription = extractedInfo.classDescription;
      }
      if (extractedInfo.courseInfo) {
        updated.courseInfo = mergeCourseInfo(
          updated.courseInfo,
          extractedInfo.courseInfo,
        );
      }
      if (!updated.className) {
        updated.className = extractClassName(userText) || null;
        // If we're actively collecting and the user replies with a bare name
        // (common after we ask "what is the class name?"), accept it directly.
        if (
          !updated.className &&
          !isApproval(userText) &&
          /^[^\s\n]{1,40}$/.test(trimmed) &&
          !/^\d+$/.test(trimmed) &&
          !/[，。,。;；:：]/.test(trimmed) &&
          !/(创建|新建|建立|一共|需要)/.test(trimmed)
        ) {
          updated.className = trimmed;
        }
      }
      if (!updated.sessionCount) {
        updated.sessionCount = extractSessionCount(userText) || null;
        // If we asked for a number, the user may reply with just "2".
        if (!updated.sessionCount && /^\d{1,2}$/.test(trimmed)) {
          const n = Number(trimmed);
          if (Number.isFinite(n) && n > 0) {
            updated.sessionCount = Math.min(32, Math.max(1, Math.floor(n)));
          }
        }
      }
      const normalizedClassName = sanitizeClassName(updated.className);
      if (normalizedClassName) {
        updated.className = normalizedClassName;
      }
      const looksLikeSessionDraft =
        Boolean(updated.sessionCount) &&
        (/第\s*\d+\s*节/i.test(userText) ||
          /session\s*\d+/i.test(userText) ||
          /(^|\n)\s*[-*•]\s+/m.test(userText) ||
          /(^|\n)\s*\d+[.)]\s+/m.test(userText));
      if (updated.sessionCount && !isApproval(userText)) {
        if (looksLikeSessionDraft) {
          const parsed = parseSessionDrafts(userText);
          if (parsed.length > 0) {
            updated.sessionsDraft = mergeSessionDrafts(
              updated.sessionsDraft,
              parsed,
              updated.sessionCount,
            );
          }
        }
      }

      const nextAgentState = {
        ...existingAgentState,
        classCreation: updated,
      };

      if (updated.status === "ask_course_info") {
        const skipCourseInfo = /(跳过|暂时不|以后再说|不需要|不知道|skip)/i.test(
          userText,
        );
        if (isApproval(userText) || skipCourseInfo) {
          updated.courseInfoConfirmed = true;
          updated.status = "collecting";
        } else {
          const courseInfoBlock = buildCourseInfoSummary(
            updated,
            preferredLanguage,
          );
          const msg = hasCourseInfo(updated)
            ? preferredLanguage === "zh"
              ? `我已经记录课程信息。${courseInfoBlock}\n\n如需补充请继续输入；确认继续请回复“确认”。`
              : `I've captured the course info.${courseInfoBlock}\n\nAdd more details, or reply "approve" to continue.`
            : preferredLanguage === "zh"
              ? "在创建前，请补充课程信息库（课程简介/目标学员/学习目标/教学方法/难度，可一次性给出）。如果暂时不需要，请回复“确认”跳过。"
              : "Before creating the class, please provide the course info library (summary, target audience, learning objectives, teaching method, difficulty). Reply \"approve\" to skip for now.";
          const withStatus = {
            ...nextAgentState,
            classCreation: { ...updated, status: "ask_course_info" },
          };
          const aiMessage = new AIMessage({
            content: msg,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_course_info" },
            },
          };
        }
      }

      if (updated.status === "collecting") {
        if (!updated.className) {
          const ask =
            preferredLanguage === "zh"
              ? "好的。请告诉我你要创建的班级名称是什么？"
              : "Sure. What is the class name you want to create?";
          const aiMessage = new AIMessage({
            content: ask,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_class_name" },
            },
          };
        }

        if (!updated.sessionCount) {
          const ask =
            preferredLanguage === "zh"
              ? "这个班级需要几节课（sessions）？请给我一个数字，例如：8。"
              : "How many sessions should this class have? Please reply with a number, e.g. 8.";
          const aiMessage = new AIMessage({
            content: ask,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_session_count" },
            },
          };
        }

        const missing = Math.max(
          0,
          updated.sessionCount - updated.sessionsDraft.length,
        );
        if (missing > 0) {
          if (updated.className) {
            let generated: Array<{ idx?: number; title: string; description?: string }> = [];
            if (!updated.sessionTitlesGenerated && !looksLikeSessionDraft) {
              try {
                generated = await generateSessionTitleDrafts({
                  className: updated.className,
                  classDescription: updated.classDescription,
                  courseInfo: updated.courseInfo,
                  sessionCount: updated.sessionCount,
                  preferredLanguage,
                });
              } catch (error) {
                generated = [];
              }
            }

            if (generated.length === 0) {
              generated = buildFallbackSessionDrafts({
                className: updated.className,
                sessionCount: updated.sessionCount,
                preferredLanguage,
                startIndex: updated.sessionsDraft.length + 1,
              });
            }

            updated.sessionsDraft = mergeSessionDrafts(
              updated.sessionsDraft,
              generated,
              updated.sessionCount,
            );
            updated.sessionTitlesGenerated = true;
            const lines = updated.sessionsDraft
              .map((draft: any, index: number) => {
                const idx = draft.idx || index + 1;
                const label =
                  preferredLanguage === "zh"
                    ? `第${idx}节`
                    : `Session ${idx}`;
                const desc = draft.description ? ` - ${draft.description}` : "";
                return `- ${label}：${draft.title}${desc}`;
              })
              .join("\n");
            const msg =
              preferredLanguage === "zh"
                ? `我先整理了课次标题草案，请确认或修改：\n${lines}\n\n回复“确认”继续，或直接贴出修改。`
                : `I drafted session titles. Please confirm or edit:\n${lines}\n\nReply "approve" to continue, or paste edits.`;
            const withStatus = {
              ...nextAgentState,
              classCreation: updated,
            };
            const aiMessage = new AIMessage({
              content: msg,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: withStatus,
                  requiresDatabaseAction: false,
                  actionType: null,
                  actionData: null,
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "ask_user",
                data: { phase: "review_session_titles" },
              },
            };
          }
          const ask =
            preferredLanguage === "zh"
              ? "我还需要班级名称才能生成课次安排。请先告诉我班级名称。"
              : "I need a class name before drafting session titles. Please share the class name.";
          const aiMessage = new AIMessage({
            content: ask,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_session_titles" },
            },
          };
        }

        if (!updated.courseInfoConfirmed) {
          const skipCourseInfo = /(跳过|暂时不|以后再说|不需要|不知道|skip)/i.test(
            userText,
          );
          if (isApproval(userText) || skipCourseInfo) {
            updated.courseInfoConfirmed = true;
          } else {
            const courseInfoBlock = buildCourseInfoSummary(
              updated,
              preferredLanguage,
            );
            const ask = hasCourseInfo(updated)
              ? preferredLanguage === "zh"
                ? `我已经记录课程信息。${courseInfoBlock}\n\n如需补充请继续输入；确认继续请回复“确认”。`
                : `I've captured the course info.${courseInfoBlock}\n\nAdd more details, or reply "approve" to continue.`
              : preferredLanguage === "zh"
                ? "在创建前，请补充课程信息库（课程简介/目标学员/学习目标/教学方法/难度，可一次性给出）。如果暂时不需要，请回复“确认”跳过。"
                : "Before creating the class, please provide the course info library (summary, target audience, learning objectives, teaching method, difficulty). Reply \"approve\" to skip for now.";
            const withStatus = {
              ...nextAgentState,
              classCreation: { ...updated, status: "ask_course_info" },
            };
            const aiMessage = new AIMessage({
              content: ask,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: withStatus,
                  requiresDatabaseAction: false,
                  actionType: null,
                  actionData: null,
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "ask_user",
                data: { phase: "ask_course_info" },
              },
            };
          }
        }

        const courseInfoBlock = buildCourseInfoSummary(
          updated,
          preferredLanguage,
        );

        const msg =
          preferredLanguage === "zh"
            ? `我可以现在创建班级「${updated.className}」。${courseInfoBlock}\n\n请确认执行创建。`
            : `I can now create the class "${updated.className}".${courseInfoBlock}\n\nPlease confirm to run the creation.`;

        const withStatus = {
          ...nextAgentState,
          classCreation: { ...updated, status: "await_class_created" },
        };
        const aiMessage = new AIMessage({
          content: msg,
          additional_kwargs: {
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: true,
              actionType: "entity_management",
              actionData: {
                action: "create",
                entity: "class",
                details: {
                  name: updated.className,
                  description: updated.classDescription || "",
                },
              },
            },
          },
        });
        return {
          ...state,
          messages: [...state.messages, aiMessage],
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: withStatus,
            requiresDatabaseAction: true,
            actionType: "entity_management",
            actionData: {
              action: "create",
              entity: "class",
              details: {
                name: updated.className,
                description: updated.classDescription || "",
              },
            },
            timestamp: new Date().toISOString(),
          },
          currentWorkflow: {
            type: "react_agent",
            status: "active",
            step: "propose_tool",
            data: { phase: "create_class" },
          },
        };
      }

      if (updated.status === "await_class_created") {
        const classId =
          state.metadata?.lastCreatedClassId ||
          state.metadata?.selectedClassId ||
          lastToolExecution.toolResult?.classId ||
          null;
        const classCreateAttempted =
          lastToolExecution.toolName === "entity_management" &&
          typeof lastToolExecution.success === "boolean";
        const classCreateSucceeded = classCreateAttempted && lastToolExecution.success;
        const classCreateFailed = classCreateAttempted && !lastToolExecution.success;

        if (classCreateFailed) {
          const toolMessage =
            (lastToolExecution.toolResult &&
              typeof lastToolExecution.toolResult.message === "string" &&
              lastToolExecution.toolResult.message.trim()) ||
            (preferredLanguage === "zh"
              ? "❌ 创建班级失败。"
              : "❌ Failed to create class.");
          const msg =
            preferredLanguage === "zh"
              ? `${toolMessage}\n\n请修改班级名称/描述后重试，或回复“确认”让我重新尝试创建。`
              : `${toolMessage}\n\nPlease revise the class name/description and try again, or reply "approve" to retry.`;
          const withStatus = {
            ...nextAgentState,
            classCreation: { ...updated, status: "collecting" },
          };
          const aiMessage = new AIMessage({
            content: msg,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "class_creation_failed" },
            },
          };
        }

        if (classCreateSucceeded || classId) {
          if (!classId) {
            const ask =
              preferredLanguage === "zh"
                ? "班级创建已完成，但我没有拿到班级ID。请在右侧上下文中选择该班级，或告诉我班级ID。"
                : "The class is created, but I can't find its ID. Please select the class in the context panel or share the class ID.";
            const aiMessage = new AIMessage({
              content: ask,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: nextAgentState,
                  requiresDatabaseAction: false,
                  actionType: null,
                  actionData: null,
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "ask_user",
                data: { phase: "missing_class_after_create" },
              },
            };
          }
          const sessions = (updated.sessionsDraft || [])
            .slice(0, updated.sessionCount || 0)
            .map((s: any) => ({
              title: s.title,
              description: s.description || "",
              scheduledDate: s.scheduledDate,
              startTime: s.startTime,
            }));

          const msg =
            preferredLanguage === "zh"
              ? `✅ 班级已创建（ID: ${classId}）。下一步我将为该班级创建 ${sessions.length} 节课次。请确认执行。`
              : `✅ Class created (ID: ${classId}). Next I will create ${sessions.length} sessions for this class. Please confirm to run it.`;

          const withStatus = {
            ...nextAgentState,
            classCreation: {
              ...updated,
              status: "await_sessions_created",
              classId,
            },
          };

          const aiMessage = new AIMessage({
            content: msg,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: true,
                actionType: "create_sessions_batch",
                actionData: {
                  classId,
                  sessions,
                  language: preferredLanguage,
                  classDescription: updated.classDescription,
                  courseInfo: updated.courseInfo,
                  agentState: withStatus,
                },
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: true,
              actionType: "create_sessions_batch",
              actionData: {
                classId,
                sessions,
                language: preferredLanguage,
                classDescription: updated.classDescription,
                courseInfo: updated.courseInfo,
                agentState: withStatus,
              },
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "propose_tool",
              data: { phase: "create_sessions_batch" },
            },
          };
        }

        const remind =
          preferredLanguage === "zh"
            ? "请先点击上方的“Confirm and run”来执行创建班级。"
            : "Please click “Confirm and run” above to execute class creation.";
        const aiMessage = new AIMessage({
          content: remind,
          additional_kwargs: {
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
            },
          },
        });
        return {
          ...state,
          messages: [...state.messages, aiMessage],
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: nextAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
            timestamp: new Date().toISOString(),
          },
          currentWorkflow: {
            type: "react_agent",
            status: "active",
            step: "ask_user",
            data: { phase: "waiting_confirmation" },
          },
        };
      }

      if (updated.status === "await_sessions_created") {
        const classId =
          updated.classId ||
          state.metadata?.lastCreatedClassId ||
          state.metadata?.selectedClassId ||
          lastToolExecution.toolResult?.classId ||
          null;
        const sessionsAttempted =
          lastToolExecution.toolName === "create_sessions_batch" &&
          typeof lastToolExecution.success === "boolean";
        const sessionsSucceeded = sessionsAttempted && lastToolExecution.success;
        const sessionsFailed = sessionsAttempted && !lastToolExecution.success;
        const hasSessionIds = Array.isArray(
          (lastToolExecution.toolResult as any)?.sessionIds,
        );

        if (sessionsFailed) {
          if (!classId) {
            const ask =
              preferredLanguage === "zh"
                ? "课次创建失败且未找到班级ID。请在右侧上下文中选择班级，或告诉我班级ID后重试。"
                : "Session creation failed and I can't find the class ID. Please select the class in the context panel or share the class ID to retry.";
            const aiMessage = new AIMessage({
              content: ask,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: nextAgentState,
                  requiresDatabaseAction: false,
                  actionType: null,
                  actionData: null,
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "ask_user",
                data: { phase: "missing_class_for_retry" },
              },
            };
          }
          const toolMessage =
            (lastToolExecution.toolResult &&
              typeof lastToolExecution.toolResult.message === "string" &&
              lastToolExecution.toolResult.message.trim()) ||
            (preferredLanguage === "zh"
              ? "❌ 创建课次失败。"
              : "❌ Failed to create sessions.");

          const sessions = (updated.sessionsDraft || [])
            .slice(0, updated.sessionCount || 0)
            .map((s: any) => ({
              title: s.title,
              description: s.description || "",
              scheduledDate: s.scheduledDate,
              startTime: s.startTime,
            }));

          const msg =
            preferredLanguage === "zh"
              ? `${toolMessage}\n\n我可以重试创建 ${sessions.length} 节课次。若需要指定时间，请在确认前补充每节课日期/时间。请确认执行重试。`
              : `${toolMessage}\n\nI can retry creating ${sessions.length} sessions. If you need specific dates/times, please add them before confirming. Please confirm to run the retry.`;

          const withStatus = {
            ...nextAgentState,
            classCreation: { ...updated, status: "await_sessions_created", classId },
          };

          const aiMessage = new AIMessage({
            content: msg,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: true,
                actionType: "create_sessions_batch",
                actionData: {
                  classId,
                  sessions,
                  language: preferredLanguage,
                  classDescription: updated.classDescription,
                  courseInfo: updated.courseInfo,
                  agentState: withStatus,
                },
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: true,
              actionType: "create_sessions_batch",
              actionData: {
                classId,
                sessions,
                language: preferredLanguage,
                classDescription: updated.classDescription,
                courseInfo: updated.courseInfo,
                agentState: withStatus,
              },
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "propose_tool",
              data: { phase: "retry_create_sessions_batch" },
            },
          };
        }

        if (sessionsSucceeded || hasSessionIds) {
          if (!classId) {
            const ask =
              preferredLanguage === "zh"
                ? "课次已创建，但我没有找到班级ID。请在右侧上下文中选择班级，或告诉我班级ID。"
                : "Sessions were created, but I can't find the class ID. Please select the class in the context panel or share the class ID.";
            const aiMessage = new AIMessage({
              content: ask,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: nextAgentState,
                  requiresDatabaseAction: false,
                  actionType: null,
                  actionData: null,
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: nextAgentState,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "ask_user",
                data: { phase: "missing_class_after_sessions" },
              },
            };
          }
          let chosen: "zh" | "en" | null = null;
          if (!isApproval(userText)) {
            if (/(英文|english)/i.test(userText)) chosen = "en";
            if (/(中文|chinese)/i.test(userText)) chosen = "zh";
          }

          if (chosen) {
            const msg =
              preferredLanguage === "zh"
                ? `好的。我将使用${chosen === "en" ? "英文" : "中文"}为每节课生成大纲草稿。请确认执行生成。`
                : `Great. I will generate an outline draft in ${chosen === "en" ? "English" : "Chinese"} for each session. Please confirm to run it.`;
            const withStatus = {
              ...nextAgentState,
              classCreation: {
                ...updated,
                outlineLanguage: chosen,
                status: "await_outline_draft",
                classId,
              },
            };
            const aiMessage = new AIMessage({
              content: msg,
              additional_kwargs: {
                metadata: {
                  ...(state.metadata || {}),
                  intent: "react_agent",
                  agentState: withStatus,
                  requiresDatabaseAction: true,
                  actionType: "generate_class_outline_draft",
                  actionData: {
                    classId,
                    language: chosen,
                    agentState: withStatus,
                  },
                },
              },
            });
            return {
              ...state,
              messages: [...state.messages, aiMessage],
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: true,
                actionType: "generate_class_outline_draft",
                actionData: {
                  classId,
                  language: chosen,
                  agentState: withStatus,
                },
                timestamp: new Date().toISOString(),
              },
              currentWorkflow: {
                type: "react_agent",
                status: "active",
                step: "propose_tool",
                data: { phase: "generate_class_outline_draft" },
              },
            };
          }
          const msg =
            preferredLanguage === "zh"
              ? "✅ 课次已创建。接下来我将为每节课生成大纲草稿。你希望大纲用中文还是英文？"
              : "✅ Sessions created. Next I will generate an outline draft for each session. Do you want the outlines in English or Chinese?";

          const withStatus = {
            ...nextAgentState,
            classCreation: {
              ...updated,
              status: "ask_outline_language",
              classId,
            },
          };
          const aiMessage = new AIMessage({
            content: msg,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_outline_language" },
            },
          };
        }

        const remind =
          preferredLanguage === "zh"
            ? "请先点击上方的“Confirm and run”来执行创建课次。"
            : "Please click “Confirm and run” above to execute session creation.";
        const aiMessage = new AIMessage({
          content: remind,
          additional_kwargs: {
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: nextAgentState,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
            },
          },
        });
        return {
          ...state,
          messages: [...state.messages, aiMessage],
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: nextAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
            timestamp: new Date().toISOString(),
          },
          currentWorkflow: {
            type: "react_agent",
            status: "active",
            step: "ask_user",
            data: { phase: "waiting_confirmation" },
          },
        };
      }

      if (updated.status === "ask_outline_language") {
        const classId =
          updated.classId || state.metadata?.lastCreatedClassId || null;
        let chosen: "zh" | "en" | null = updated.outlineLanguage;
        if (!chosen && !isApproval(userText)) {
          if (/(英文|english)/i.test(userText)) chosen = "en";
          if (/(中文|chinese)/i.test(userText)) chosen = "zh";
        }

        if (!chosen) {
          const ask =
            preferredLanguage === "zh"
              ? "你希望大纲用中文还是英文？（回复“中文”或“英文”）"
              : "Do you want the outlines in Chinese or English? (Reply \"Chinese\" or \"English\")";
          const withStatus = {
            ...nextAgentState,
            classCreation: { ...updated, outlineLanguage: null, classId },
          };
          const aiMessage = new AIMessage({
            content: ask,
            additional_kwargs: {
              metadata: {
                ...(state.metadata || {}),
                intent: "react_agent",
                agentState: withStatus,
                requiresDatabaseAction: false,
                actionType: null,
                actionData: null,
              },
            },
          });
          return {
            ...state,
            messages: [...state.messages, aiMessage],
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: false,
              actionType: null,
              actionData: null,
              timestamp: new Date().toISOString(),
            },
            currentWorkflow: {
              type: "react_agent",
              status: "active",
              step: "ask_user",
              data: { phase: "ask_outline_language" },
            },
          };
        }

        const msg =
          preferredLanguage === "zh"
            ? `好的。我将使用${chosen === "en" ? "英文" : "中文"}为每节课生成大纲草稿。请确认执行生成。`
            : `Great. I will generate an outline draft in ${chosen === "en" ? "English" : "Chinese"} for each session. Please confirm to run it.`;

        const withStatus = {
          ...nextAgentState,
          classCreation: {
            ...updated,
            outlineLanguage: chosen,
            status: "await_outline_draft",
            classId,
          },
        };

        const aiMessage = new AIMessage({
          content: msg,
          additional_kwargs: {
            metadata: {
              ...(state.metadata || {}),
              intent: "react_agent",
              agentState: withStatus,
              requiresDatabaseAction: true,
              actionType: "generate_class_outline_draft",
              actionData: {
                classId,
                language: chosen,
                agentState: withStatus,
              },
            },
          },
        });

        return {
          ...state,
          messages: [...state.messages, aiMessage],
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: withStatus,
            requiresDatabaseAction: true,
            actionType: "generate_class_outline_draft",
            actionData: {
              classId,
              language: chosen,
              agentState: withStatus,
            },
            timestamp: new Date().toISOString(),
          },
          currentWorkflow: {
            type: "react_agent",
            status: "active",
            step: "propose_tool",
            data: { phase: "generate_outline" },
          },
        };
      }
    }
  }

  if (
    wantsList &&
    listEntity &&
    existingAgentState?.outlineStatus !== "reviewing" &&
    existingAgentState?.sessionOutlineStatus !== "reviewing"
  ) {
    // For sessions/assignments listing, we need a class context.
    const classId =
      state.metadata?.selectedClassId ||
      state.metadata?.lastCreatedClassId ||
      null;
    if ((listEntity === "session" || listEntity === "assignment") && !classId) {
      const ask =
        preferredLanguage === "zh"
          ? "你想查看哪个班级的内容？请先在界面中选择一个班级，或直接告诉我班级ID。"
          : "Which class do you want to query? Please select a class in the UI or provide the classId.";
      const aiMessage = new AIMessage({
        content: ask,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "missing_class_context" },
        },
      };
    }

    const msg =
      preferredLanguage === "zh"
        ? "我可以从数据库中查询并列出你的数据。请确认执行查询。"
        : "I can query the database and list your data. Please confirm to run the query.";
    const aiMessage = new AIMessage({
      content: msg,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          requiresDatabaseAction: true,
          actionType: "entity_management",
          actionData: {
            action: "list",
            entity: listEntity,
            classId,
          },
        },
      },
    });
    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        requiresDatabaseAction: true,
        actionType: "entity_management",
        actionData: {
          action: "list",
          entity: listEntity,
          classId,
        },
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: "propose_tool",
        data: { phase: "list_entity" },
      },
    };
  }

  if (existingAgentState?.sessionOutlineStatus === "reviewing") {
    const language: "zh" | "en" =
      existingAgentState.sessionOutlineLanguage === "en"
        ? "en"
        : preferredLanguage;
    const draft =
      (existingAgentState.sessionOutlineDraft as any) ||
      (lastToolExecution.toolResult as any)?.outlineDraft ||
      (lastToolExecution.toolResult as any)?.agentState?.sessionOutlineDraft ||
      null;
    const classId = existingAgentState.sessionOutlineClassId;
    const sessionId = existingAgentState.sessionOutlineSessionId;
    const nextAgentState = {
      ...existingAgentState,
      sessionOutlineDraft: draft ? { ...draft } : undefined,
    };

    if (!draft) {
      const missingDraftMsg =
        language === "en"
          ? "I can't find the outline draft in context. Please ask me to generate the session outline again."
          : "我没有找到本节课的大纲草案，请重新让我生成该课次的大纲。";
      const aiMessage = new AIMessage({
        content: missingDraftMsg,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: nextAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: nextAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "missing_outline_draft" },
        },
      };
    }

    if (isApproval(userText)) {
      const prompt =
        language === "en"
          ? "Outline confirmed. I can now run collaborative generation and save the session content. Please confirm to proceed."
          : "大纲已确认。我现在可以开始协作生成并保存课次内容。请确认执行。";
      const awaitingState = {
        ...nextAgentState,
        sessionOutlineStatus: "awaiting_a2a",
      };
      const aiMessage = new AIMessage({
        content: prompt,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: awaitingState,
            requiresDatabaseAction: true,
            actionType: "a2a_session_generate_and_save",
            actionData: {
              classId,
              sessionId,
              outlineDraft: draft,
              agentState: awaitingState,
            },
          },
        },
      });

      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: awaitingState,
          requiresDatabaseAction: true,
          actionType: "a2a_session_generate_and_save",
          actionData: {
            classId,
            sessionId,
            outlineDraft: draft,
            agentState: awaitingState,
          },
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "propose_tool",
          data: { phase: "a2a_session_generation" },
        },
      };
    }

    const userProvidedBullets = extractBullets(userText);
    if (userProvidedBullets.length > 0) {
      nextAgentState.sessionOutlineDraft = {
        ...draft,
        outline: userProvidedBullets,
      };
    }

    const componentsPlan = (nextAgentState.sessionOutlineDraft.components_plan || [])
      .map((item: any) => `${item.type}: ${item.description}`)
      .join("\n- ");
    const outlineText = (nextAgentState.sessionOutlineDraft.outline || []).join(
      "\n- ",
    );
    const objectivesText = (
      nextAgentState.sessionOutlineDraft.learning_objectives || []
    ).join("\n- ");

    const message =
      language === "en"
        ? `Session ${draft.session_number}: ${draft.title}\n\nOutline:\n- ${outlineText}\n\nLearning objectives:\n- ${objectivesText}\n\nComponents plan:\n- ${componentsPlan}\n\nReply \"approve\" to confirm, or paste edits as bullet points.`
        : `第${draft.session_number}节：${draft.title}\n\n大纲：\n- ${outlineText}\n\n学习目标：\n- ${objectivesText}\n\n组件规划：\n- ${componentsPlan}\n\n请回复“确认”通过，或用项目符号直接贴出修改。`;

    const aiMessage = new AIMessage({
      content: message,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: nextAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
        },
      },
    });

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        agentState: nextAgentState,
        requiresDatabaseAction: false,
        actionType: null,
        actionData: null,
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: "ask_user",
        data: { phase: "session_outline_review" },
      },
    };
  }

  if (existingAgentState?.sessionOutlineStatus === "awaiting_a2a") {
    const language: "zh" | "en" =
      existingAgentState.sessionOutlineLanguage === "en"
        ? "en"
        : preferredLanguage;
    const draft =
      (existingAgentState.sessionOutlineDraft as any) ||
      (lastToolExecution.toolResult as any)?.outlineDraft ||
      (lastToolExecution.toolResult as any)?.agentState?.sessionOutlineDraft ||
      null;
    const classId = existingAgentState.sessionOutlineClassId;
    const sessionId = existingAgentState.sessionOutlineSessionId;
    const wantsGeneration =
      isApproval(userText) ||
      /(开始|运行|生成|继续|执行).*(内容|课次)?/i.test(userText);

    if (!draft || !classId || !sessionId) {
      const fallbackMsg =
        language === "en"
          ? "I can't locate the outline draft for content generation. Please ask me to generate the session outline again."
          : "我无法找到用于内容生成的大纲草案，请重新让我生成该课次的大纲。";
      const aiMessage = new AIMessage({
        content: fallbackMsg,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: existingAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: existingAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "missing_outline_for_a2a" },
        },
      };
    }

    if (!wantsGeneration) {
      const remind =
        language === "en"
          ? "I can start collaborative generation and save the session content. Please reply \"confirm\" to proceed."
          : "我可以开始协作生成并保存课次内容。请回复“确认”以继续。";
      const aiMessage = new AIMessage({
        content: remind,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: existingAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });
      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: existingAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "awaiting_a2a_confirmation" },
        },
      };
    }

    const prompt =
      language === "en"
        ? "Outline confirmed. I can now run collaborative generation and save the session content. Please confirm to proceed."
        : "大纲已确认。我现在可以开始协作生成并保存课次内容。请确认执行。";
    const aiMessage = new AIMessage({
      content: prompt,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: existingAgentState,
          requiresDatabaseAction: true,
          actionType: "a2a_session_generate_and_save",
          actionData: {
            classId,
            sessionId,
            outlineDraft: draft,
            agentState: existingAgentState,
          },
        },
      },
    });
    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        agentState: existingAgentState,
        requiresDatabaseAction: true,
        actionType: "a2a_session_generate_and_save",
        actionData: {
          classId,
          sessionId,
          outlineDraft: draft,
          agentState: existingAgentState,
        },
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: "propose_tool",
        data: { phase: "a2a_session_generation" },
      },
    };
  }

  // Deterministic outline confirmation flow (reduces reliance on the model for state tracking).
  if (
    existingAgentState?.outlineStatus === "reviewing" &&
    existingAgentState?.outlineDraft?.chapters &&
    Array.isArray(existingAgentState.outlineDraft.chapters)
  ) {
    const language: "zh" | "en" =
      existingAgentState.outlineLanguage === "en" ? "en" : preferredLanguage;
    const chapters = existingAgentState.outlineDraft.chapters as any[];
    const requirements =
      existingAgentState.outlineDraft.requirements || {};
    const lastAssistant = [...state.messages]
      .reverse()
      .find(
        (msg) =>
          msg instanceof AIMessage &&
          msg.content &&
          msg.content.toString().trim().length > 0,
      ) as AIMessage | undefined;
    const inferIndexFromContent = (content: string) => {
      if (!content) return null;
      const zhMatch = content.match(/第(\d+)节/);
      if (zhMatch?.[1]) {
        const num = Number(zhMatch[1]);
        const found = chapters.findIndex(
          (chapter) => Number(chapter.session_number) === num,
        );
        if (found >= 0) return found;
      }
      const enMatch = content.match(/Session\s+(\d+)/i);
      if (enMatch?.[1]) {
        const num = Number(enMatch[1]);
        const found = chapters.findIndex(
          (chapter) => Number(chapter.session_number) === num,
        );
        if (found >= 0) return found;
      }
      return null;
    };
    const inferredIndex = inferIndexFromContent(
      lastAssistant?.content?.toString() || "",
    );
    const idx =
      typeof inferredIndex === "number"
        ? inferredIndex
        : Math.max(0, Number(existingAgentState.outlineReviewIndex || 0));
    const current = chapters[idx];
    const formatChapter = (chapter: any) =>
      language === "en"
        ? `Session ${chapter.session_number}: ${chapter.title}\n\nOutline:\n- ${(chapter.outline || []).join(
            "\n- ",
          )}\n\nLearning objectives:\n- ${(chapter.learning_objectives || []).join(
            "\n- ",
          )}\n\nComponents plan:\n- ${(chapter.components_plan || [])
            .map((item: any) => `${item.type}: ${item.description}`)
            .join("\n- ")}`
        : `第${chapter.session_number}节：${chapter.title}\n\n大纲：\n- ${(chapter.outline || []).join(
            "\n- ",
          )}\n\n学习目标：\n- ${(chapter.learning_objectives || []).join(
            "\n- ",
          )}\n\n组件规划：\n- ${(chapter.components_plan || [])
            .map((item: any) => `${item.type}: ${item.description}`)
            .join("\n- ")}`;

    if (isContinuationMessage(userText) && current) {
      const show = formatChapter(current);
      const reply =
        language === "en"
          ? `Please review this session:\n\n${show}\n\nReply "approve" to accept, or paste edits as bullets.`
          : `请确认本节内容：\n\n${show}\n\n回复“确认”通过，或用项目符号直接贴出修改。`;
      const aiMessage = new AIMessage({
        content: reply,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: existingAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });

      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: existingAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "outline_review" },
        },
      };
    }

    if (!current) {
      // Already finished; propose saving.
      const msg =
        language === "en"
          ? "All session outlines are confirmed. I can now save the outline to the database. Please confirm to run `save_class_outline`."
          : "所有课次的大纲都已确认。我现在可以把大纲保存到数据库。请确认执行 `save_class_outline`。";

      const updatedAgentState = {
        ...existingAgentState,
        outlineStatus: "ready_to_save",
      };

      const aiMessage = new AIMessage({
        content: msg,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: updatedAgentState,
            requiresDatabaseAction: true,
            actionType: "save_class_outline",
            actionData: {
              classId: existingAgentState.outlineClassId,
              requirements,
              chapters,
              language,
              agentState: updatedAgentState,
            },
          },
        },
      });

      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: updatedAgentState,
          requiresDatabaseAction: true,
          actionType: "save_class_outline",
          actionData: {
            classId: existingAgentState.outlineClassId,
            requirements,
            chapters,
            language,
            agentState: updatedAgentState,
          },
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "propose_tool",
          data: { phase: "save_outline" },
        },
      };
    }

    const userProvidedBullets = extractBullets(userText);
    const updatedChapters = chapters.slice();
    let nextIndex = idx;

    if (isApproval(userText)) {
      nextIndex = idx + 1;
    } else if (userProvidedBullets.length > 0) {
      updatedChapters[idx] = {
        ...current,
        outline: userProvidedBullets,
      };
      // After applying edits, ask user to approve the updated version.
    } else {
      const ask =
        language === "en"
          ? `Tell me what to change for this session. You can reply with a bullet list (lines starting with '-' or '1.') to replace the outline, or reply "approve" to accept it as-is.`
          : `请告诉我这节课要怎么改。你可以用项目符号（以“-”或“1.”开头的多行）来替换大纲，或者回复“确认”表示不改直接通过。`;

      const aiMessage = new AIMessage({
        content: ask,
        additional_kwargs: {
          metadata: {
            ...(state.metadata || {}),
            intent: "react_agent",
            agentState: existingAgentState,
            requiresDatabaseAction: false,
            actionType: null,
            actionData: null,
          },
        },
      });

      return {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: existingAgentState,
          requiresDatabaseAction: false,
          actionType: null,
          actionData: null,
          timestamp: new Date().toISOString(),
        },
        currentWorkflow: {
          type: "react_agent",
          status: "active",
          step: "ask_user",
          data: { phase: "outline_review" },
        },
      };
    }

    const nextAgentState = {
      ...existingAgentState,
      outlineDraft: {
        requirements,
        chapters: updatedChapters,
      },
      outlineReviewIndex: nextIndex,
    };

    const nextChapter = updatedChapters[nextIndex];
    const show = nextChapter ? formatChapter(nextChapter) : "";
    const movedToNext = nextIndex !== idx;
    const isReadyToSave = !nextChapter;

    const reply = isReadyToSave
      ? language === "en"
        ? "All session outlines are confirmed. I can now save the outline to the database. Please confirm to run `save_class_outline`."
        : "所有课次的大纲都已确认。我现在可以把大纲保存到数据库。请确认执行 `save_class_outline`。"
      : movedToNext
        ? language === "en"
          ? `Please review the next session:\n\n${show}\n\nReply "approve" to accept, or paste edits as bullets.`
          : `请继续确认下一节：\n\n${show}\n\n回复“确认”通过，或用项目符号直接贴出修改。`
        : language === "en"
          ? `Updated this session. Please approve it or edit again:\n\n${show}\n\nReply "approve" to accept, or paste edits as bullets.`
          : `已更新本节内容。请确认是否通过，或继续修改：\n\n${show}\n\n回复“确认”通过，或用项目符号直接贴出修改。`;

    const updatedAgentState = isReadyToSave
      ? { ...nextAgentState, outlineStatus: "ready_to_save" }
      : nextAgentState;
    const actionData = isReadyToSave
      ? {
          classId: existingAgentState.outlineClassId,
          requirements,
          chapters: updatedChapters,
          language,
          agentState: updatedAgentState,
        }
      : null;

    const aiMessage = new AIMessage({
      content: reply,
      additional_kwargs: {
        metadata: {
          ...(state.metadata || {}),
          intent: "react_agent",
          agentState: updatedAgentState,
          requiresDatabaseAction: isReadyToSave,
          actionType: isReadyToSave ? "save_class_outline" : null,
          actionData,
        },
      },
    });

    return {
      ...state,
      messages: [...state.messages, aiMessage],
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        agentState: updatedAgentState,
        requiresDatabaseAction: isReadyToSave,
        actionType: isReadyToSave ? "save_class_outline" : null,
        actionData,
        timestamp: new Date().toISOString(),
      },
      currentWorkflow: {
        type: "react_agent",
        status: "active",
        step: isReadyToSave ? "propose_tool" : "ask_user",
        data: { phase: isReadyToSave ? "save_outline" : "outline_review" },
      },
    };
  }

  const systemPrompt = buildSystemPrompt({
    toolCallsExecuted,
    preferredLanguage,
    selectedClassId: state.metadata?.selectedClassId || null,
    selectedSessionId: state.metadata?.selectedSessionId || null,
    selectedAssignmentId: state.metadata?.selectedAssignmentId || null,
    lastCreatedClassId: state.metadata?.lastCreatedClassId || null,
    agentState: state.metadata?.agentState || null,
    compressionContext: state.metadata?.compressionContext || null,
  });

  const conversationMessages = state.messages.map((msg) => {
    if (msg instanceof HumanMessage) {
      return { role: "user" as const, content: msg.content.toString() };
    }
    return { role: "assistant" as const, content: msg.content.toString() };
  });

  const { text } = await generateText({
    model: openai.chat(DEFAULT_MODEL),
    system: systemPrompt,
    messages: conversationMessages,
    maxTokens: 1400,
    temperature: 0.2,
    abortSignal: AbortSignal.timeout(25000),
  });

  let parsed: {
    message: string;
    next_action: NextAction;
    proposed_tool?: { toolName: string; input: Record<string, any> } | null;
    agent_state?: Record<string, any>;
    reasoning?: string;
  };

  // 改进的解析逻辑 - 专门处理简化后的TOON格式
  try {
    parsed = parseModelResponse(text);
  } catch (err: any) {
    console.warn("模型输出解析失败:", err?.message);

    const fallbackAction = inferCrudAction(userText);
    const fallbackEntity = inferEntityType(userText);
    if (fallbackAction && fallbackEntity) {
      const normalizedInput = normalizeEntityManagementInput(
        userText,
        { action: fallbackAction, entity: fallbackEntity },
        {
          classId: state.metadata?.classId || null,
          selectedClassId: state.metadata?.selectedClassId || null,
          selectedSessionId: state.metadata?.selectedSessionId || null,
          selectedAssignmentId: state.metadata?.selectedAssignmentId || null,
        },
      );
      parsed = {
        message:
          preferredLanguage === "zh"
            ? `我可以帮你${describeCrudAction(fallbackAction, "zh")}${describeEntity(fallbackEntity, "zh")}，需要确认后执行。`
            : `I can ${describeCrudAction(fallbackAction, "en")} the ${describeEntity(fallbackEntity, "en")} after your confirmation.`,
        next_action: "propose_tool",
        proposed_tool: {
          toolName: "entity_management",
          input: normalizedInput,
        },
        agent_state: existingAgentState,
        reasoning: "fallback_parse",
      };
    } else {
      const cleaned = text.trim();
      parsed = {
        message:
          cleaned ||
          (preferredLanguage === "zh"
            ? "我需要更多信息才能继续，请再描述一下。"
            : "I need a bit more detail to continue. Please clarify."),
        next_action: "ask_user",
        agent_state: existingAgentState,
        reasoning: "fallback_parse",
      };
    }
  }

  let nextAction = parsed.next_action;
  let proposedTool = parsed.proposed_tool || null;
  if (
    nextAction === "propose_tool" &&
    proposedTool?.toolName === "entity_management"
  ) {
    proposedTool = {
      ...proposedTool,
      input: normalizeEntityManagementInput(userText, proposedTool.input, {
        classId: state.metadata?.classId || null,
        selectedClassId: state.metadata?.selectedClassId || null,
        selectedSessionId: state.metadata?.selectedSessionId || null,
        selectedAssignmentId: state.metadata?.selectedAssignmentId || null,
      }),
    };
    if (!proposedTool.input?.action || !proposedTool.input?.entity) {
      proposedTool = null;
      nextAction = "ask_user";
    }
  }

  const assistantMessage = new AIMessage({
    content: parsed.message,
    additional_kwargs: {
      metadata: {
        ...(state.metadata || {}),
        intent: "react_agent",
        reasoning: parsed.reasoning,
        agentState: parsed.agent_state || state.metadata?.agentState || {},
        // Tool proposal payload for API confirmation gate
        requiresDatabaseAction:
          nextAction === "propose_tool" && Boolean(proposedTool?.toolName),
        actionType: proposedTool?.toolName || null,
        actionData: proposedTool?.input || null,
      },
    },
  });

  const nextMetadata = {
    ...(state.metadata || {}),
    intent: "react_agent",
    reasoning: parsed.reasoning,
    agentState: parsed.agent_state || state.metadata?.agentState || {},
    requiresDatabaseAction:
      nextAction === "propose_tool" && Boolean(proposedTool?.toolName),
    actionType: proposedTool?.toolName || null,
    actionData: proposedTool?.input || null,
    toolsUsed: state.metadata?.toolsUsed || [],
    timestamp: new Date().toISOString(),
  };

  return {
    ...state,
    messages: [...state.messages, assistantMessage],
    metadata: nextMetadata,
    currentWorkflow: {
      type: "react_agent",
      status: "active",
      step: nextAction,
      data: {
        toolCallsExecuted,
      },
    },
  };
}
