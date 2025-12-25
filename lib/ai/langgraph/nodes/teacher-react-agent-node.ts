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
  return /^(approve|approved|yes|ok|okay|confirm|confirmed|确认|同意|好的|可以)$/.test(
    text.trim().toLowerCase(),
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
    /班级[:：]\s*([^\n，。,。;；]+)\s*/i,
    /(班级名|班级名称|班级名字|班名)[:：]\s*([^\n，。,。;；]+)\s*/i,
    /叫(?:做)?\s*([^\n，。,。;；]+)\s*/i,
    /名为[“"]([^”"]+)[”"]/i,
    /named\s+[“"]([^”"]+)[”"]/i,
    /(class\s*name)[:：]\s*([^\n,.;]+)\s*/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    const raw = m?.[2] || m?.[1];
    if (raw) {
      const name = raw.trim();
      if (name) return name;
    }
  }
  return null;
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
  if (/(班级|class|classes)/i.test(text)) return "class";
  if (/(课次|课|session|sessions)/i.test(text)) return "session";
  if (/(作业|assignment|assignments|任务)/i.test(text)) return "assignment";
  return null;
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
  const inferredEntity = normalized.entity || inferEntityType(userText);

  if (inferredAction) normalized.action = inferredAction;
  if (inferredEntity) normalized.entity = inferredEntity;

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
): Array<{ title: string; description?: string }> {
  // Some UIs collapse newlines; normalize common "- Session" separators into newlines.
  const normalizedText = text.replace(
    /\s+-\s+(?=(第\s*\d+\s*节|session\s*\d+))/gi,
    "\n- ",
  );
  const drafts: Array<{ idx?: number; title: string; description?: string }> =
    [];

  const cnRe = /第\s*(\d+)\s*节\s*[:：]\s*([^\n；;]+)(?:[；;\n]|$)/g;
  for (const match of normalizedText.matchAll(cnRe)) {
    const idx = Number(match[1]);
    const title = (match[2] || "").trim();
    if (title) drafts.push({ idx, title });
  }

  const enRe = /session\s*(\d+)\s*[:：-]\s*([^\n；;]+)(?:[；;\n]|$)/gi;
  for (const match of normalizedText.matchAll(enRe)) {
    const idx = Number(match[1]);
    const title = (match[2] || "").trim();
    if (title) drafts.push({ idx, title });
  }

  const bullets = extractBullets(normalizedText);
  for (const b of bullets) {
    const cleaned = b.replace(/^第\s*\d+\s*节\s*[:：]\s*/i, "").trim();
    if (cleaned) drafts.push({ title: cleaned });
  }

  if (drafts.length === 0) {
    const parts = normalizedText
      .split(/[；;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts) {
      const cleaned = p
        .replace(/^第\s*\d+\s*节\s*[:：]\s*/i, "")
        .replace(/^session\s*\d+\s*[:：-]\s*/i, "")
        .trim();
      if (cleaned) drafts.push({ title: cleaned });
    }
  }

  const seen = new Set<string>();
  return drafts
    .filter((d) => {
      const key = d.title.toLowerCase();
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
    .map(({ title, description }) => ({ title, description }))
    .slice(0, 32);
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
  toolCallsRemaining: number;
  preferredLanguage: "zh" | "en";
  selectedClassId?: string | null;
  selectedSessionId?: string | null;
  selectedAssignmentId?: string | null;
  lastCreatedClassId?: string | null;
  agentState?: Record<string, any> | null;
}): string {
  const {
    toolCallsExecuted,
    toolCallsRemaining,
    preferredLanguage,
    selectedClassId,
    selectedSessionId,
    selectedAssignmentId,
    lastCreatedClassId,
  } = params;

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

RULES:
- You can only propose ONE tool per turn
- All tools need user confirmation before execution
- Maximum 5 tool calls per goal (${toolCallsRemaining} remaining)
- If no tool needed, use next_action: ask_user
- Be helpful and explain what you're doing

CONTEXT:
- Selected Class: ${selectedClassId || "none"}
- Selected Session: ${selectedSessionId || "none"}
- Last Created Class: ${lastCreatedClassId || "none"}

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
  const preferredLanguage = detectLanguage(userText);
  const existingAgentState: any = state.metadata?.agentState || {};
  const toolCallsExecuted = countExecutedToolCallsFromHistory(state.messages);
  const toolCallsRemaining = Math.max(0, 5 - toolCallsExecuted);
  const lastToolExecution = getLastToolExecution(state.messages);

  // After a confirmed tool execution, the server sends a synthetic "continue/继续" message.
  // Show the tool's human-readable result and ask what to do next, unless we're in a
  // stateful workflow (class creation / outline review) that should immediately propose
  // the next tool.
  const hasActiveCreation =
    existingAgentState?.classCreation?.status &&
    existingAgentState.classCreation.status !== "done";
  const isOutlineReviewing = existingAgentState?.outlineStatus === "reviewing";
  const alreadyRenderedToolId =
    typeof existingAgentState?.lastRenderedToolCallId === "string"
      ? existingAgentState.lastRenderedToolCallId
      : null;

  if (
    isContinuationMessage(userText) &&
    !hasActiveCreation &&
    !isOutlineReviewing &&
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
        ? "\n\n接下来你想做什么？你可以让我：列出班级/课次/作业，创建/更新/删除它们，或创建一个新班级。"
        : "\n\nWhat would you like to do next? I can list/create/update/delete classes, sessions, or assignments, or create a new class.";

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

  // Deterministic fast-path: list queries should reliably propose a read tool.
  const normalized = userText.toLowerCase();
  const wantsList = /(有哪些|列出|查看|show|list|what|which)/i.test(userText);
  const mentionsClass = /(班级|class|classes)/i.test(userText);
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
      /(创建|新建|建立).*(班级)/.test(userText) ||
      /(create).*(class)/i.test(userText);
    const activeCreation = existingAgentState?.classCreation;
    const isActive =
      activeCreation?.status && activeCreation.status !== "done";

    if (wantsCreateClass || isActive) {
      const creation = {
        status: isActive ? activeCreation.status : "collecting",
        className: activeCreation?.className || null,
        classDescription: activeCreation?.classDescription || null,
        sessionCount: activeCreation?.sessionCount || null,
        sessionsDraft: Array.isArray(activeCreation?.sessionsDraft)
          ? activeCreation.sessionsDraft
          : [],
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
      if (
        updated.sessionCount &&
        updated.sessionsDraft.length < updated.sessionCount &&
        !isApproval(userText)
      ) {
        const looksLikeSessionDraft =
          /第\s*\d+\s*节/i.test(userText) ||
          /session\s*\d+/i.test(userText) ||
          /(^|\n)\s*[-*•]\s+/m.test(userText) ||
          /(^|\n)\s*\d+[.)]\s+/m.test(userText);
        if (looksLikeSessionDraft) {
          const parsed = parseSessionDrafts(userText);
          for (const s of parsed) {
            if (updated.sessionsDraft.length >= updated.sessionCount) break;
            updated.sessionsDraft.push(s);
          }
        }
      }

      const nextAgentState = {
        ...existingAgentState,
        classCreation: updated,
      };

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
          const ask =
            preferredLanguage === "zh"
              ? `请再提供 ${missing} 节课的标题（可选描述）。建议每行一个，例如：\n- 第1节：...\n- 第2节：...`
              : `Please provide ${missing} more session title(s) (optional description). One per line, for example:\n- Session 1: ...\n- Session 2: ...`;
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

        if (toolCallsRemaining <= 0) {
          const limitMsg =
            preferredLanguage === "zh"
              ? "工具调用次数已达到上限（5）。请简化请求或开启新的目标。"
              : "Tool call limit reached (5). Please simplify your request or start a new goal.";
          const aiMessage = new AIMessage({
            content: limitMsg,
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
              data: { phase: "tool_limit" },
            },
          };
        }

        const msg =
          preferredLanguage === "zh"
            ? `我可以现在创建班级「${updated.className}」。请确认执行创建。`
            : `I can now create the class "${updated.className}". Please confirm to run the creation.`;

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
          lastToolExecution.toolResult?.classId ||
          null;
        if (
          lastToolExecution.toolName === "entity_management" &&
          lastToolExecution.success === true &&
          classId
        ) {
          const sessions = (updated.sessionsDraft || [])
            .slice(0, updated.sessionCount || 0)
            .map((s: any) => ({
              title: s.title,
              description: s.description || "",
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
          updated.classId || state.metadata?.lastCreatedClassId || null;
        if (
          lastToolExecution.toolName === "create_sessions_batch" &&
          lastToolExecution.success === false &&
          classId
        ) {
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
            }));

          const msg =
            preferredLanguage === "zh"
              ? `${toolMessage}\n\n我可以重试创建 ${sessions.length} 节课次（如果你没提供日期，我会为每节课自动填入一个默认日期：从今天开始按顺序往后排）。请确认执行重试。`
              : `${toolMessage}\n\nI can retry creating ${sessions.length} sessions (if you didn't provide dates, I'll auto-fill a default scheduled date for each session, starting from today). Please confirm to run the retry.`;

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

        if (
          lastToolExecution.toolName === "create_sessions_batch" &&
          lastToolExecution.success === true &&
          classId
        ) {
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

        if (toolCallsRemaining <= 0) {
          const limitMsg =
            preferredLanguage === "zh"
              ? "工具调用次数已达到上限（5）。请简化请求或开启新的目标。"
              : "Tool call limit reached (5). Please simplify your request or start a new goal.";
          const aiMessage = new AIMessage({
            content: limitMsg,
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
              data: { phase: "tool_limit" },
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

  if (wantsList && listEntity && existingAgentState?.outlineStatus !== "reviewing") {
    if (toolCallsExecuted >= 5) {
      const limitMsg =
        preferredLanguage === "zh"
          ? "工具调用次数已达到上限（5）。请简化请求或开启新的目标。"
          : "Tool call limit reached (5). Please simplify your request or start a new goal.";
      const aiMessage = new AIMessage({
        content: limitMsg,
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
          data: { phase: "tool_limit" },
        },
      };
    }

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
    const idx = Math.max(0, Number(existingAgentState.outlineReviewIndex || 0));
    const current = chapters[idx];

    if (!current) {
      // Already finished; propose saving.
      const alreadyExecuted = countExecutedToolCallsFromHistory(state.messages);
      if (alreadyExecuted >= 5) {
        const limitMsg =
          language === "en"
            ? "Tool call limit reached (5). Please start a new goal to save the outline."
            : "工具调用次数已达到上限（5）。请开启一个新的目标后再保存大纲。";
        const aiMessage = new AIMessage({
          content: limitMsg,
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
            data: { phase: "tool_limit" },
          },
        };
      }

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
    const show =
      nextChapter &&
      (language === "en"
        ? `Session ${nextChapter.session_number}: ${nextChapter.title}\n\nOutline:\n- ${(nextChapter.outline || []).join(
            "\n- ",
          )}\n\nLearning objectives:\n- ${(nextChapter.learning_objectives || []).join(
            "\n- ",
          )}`
        : `第${nextChapter.session_number}节：${nextChapter.title}\n\n大纲：\n- ${(nextChapter.outline || []).join(
            "\n- ",
          )}\n\n学习目标：\n- ${(nextChapter.learning_objectives || []).join(
            "\n- ",
          )}`);

    const movedToNext = nextIndex !== idx;
    const reply =
      !nextChapter
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

    const aiMessage = new AIMessage({
      content: reply,
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
        data: { phase: "outline_review" },
      },
    };
  }

  const systemPrompt = buildSystemPrompt({
    toolCallsExecuted,
    toolCallsRemaining,
    preferredLanguage,
    selectedClassId: state.metadata?.selectedClassId || null,
    selectedSessionId: state.metadata?.selectedSessionId || null,
    selectedAssignmentId: state.metadata?.selectedAssignmentId || null,
    lastCreatedClassId: state.metadata?.lastCreatedClassId || null,
    agentState: state.metadata?.agentState || null,
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

    // 简化fallback逻辑 - 不使用预设回复，直接抛出错误暴露问题
    throw new Error(`模型输出解析失败: ${err?.message || String(err)}。请检查提示词和模型设置。`);
  }

  let proposedTool = parsed.proposed_tool || null;
  if (
    parsed.next_action === "propose_tool" &&
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
          parsed.next_action === "propose_tool" && Boolean(proposedTool?.toolName),
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
      parsed.next_action === "propose_tool" &&
      Boolean(proposedTool?.toolName),
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
      step: parsed.next_action,
      data: {
        toolCallsExecuted,
        toolCallsRemaining,
      },
    },
  };
}
