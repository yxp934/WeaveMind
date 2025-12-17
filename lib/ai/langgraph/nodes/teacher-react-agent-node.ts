import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { generateText } from "ai";
import { createGatewayOpenAI, DEFAULT_MODEL } from "../config/openai-gateway";
import { ChatbotState } from "../chatbot-state";
import { parseModelResponse } from "../utils/model-response";

const openai = createGatewayOpenAI();

type NextAction = "ask_user" | "propose_tool" | "done";

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

  return `You are WeaveMind's teacher-side assistant, running inside a LangGraph agent.

IMPORTANT DOMAIN RULES
- The product uses "class" as the top-level teaching unit. A class has many "sessions". There is NO separate "course" entity.
- Your job is to help the teacher manage classes, sessions, and assignments using tools.

OUTPUT FORMAT
- You MUST output TOON only (no Markdown fences, no JSON).
- Always reply in the user's language. If the user writes Chinese, reply in Chinese. Otherwise reply in English.

The response MUST be wrapped exactly like this (no extra text before/after):
---BEGIN_TOON---
message: ...
next_action: ask_user|propose_tool|done
proposed_tool:
  toolName: ...
  input: ...
agent_state: ...
reasoning: ...
---END_TOON---

TOOL CONFIRMATION + EXECUTION RULES
- You never execute tools directly. You only PROPOSE one tool call at a time.
- Every proposed tool call requires explicit user confirmation via a UI button.
- Max tool executions per user goal: 5 total. Already executed: ${toolCallsExecuted}. Remaining: ${toolCallsRemaining}.
- If remaining tool calls is 0, do not propose a tool; ask the user to simplify or start a new goal.
- Never invent IDs or pretend data exists. If you need data, propose a read tool first.

AVAILABLE TOOLS (you can propose exactly one per turn)
1) entity_management
   Purpose: CRUD for classes/sessions/assignments.
   Input:
     action: one of create|read|update|delete|list
     entity: one of class|session|assignment
     classId/sessionId/assignmentId: as needed
     details: object with fields for create/update (name/description for class; title/description/scheduledDate/startTime for session; title/description/dueDate for assignment)
   Notes:
     - For session/assignment operations, classId is usually required.
     - For list operations, if classId is missing and needed, ask the user to select a class or provide the classId.

2) create_sessions_batch
   Purpose: Create multiple sessions for a class in one database action.
   Input:
     classId: UUID
     sessions: array of { title, description?, scheduledDate?, startTime?, endTime?, durationMinutes? }
   Notes:
     - Do not assume dates/times. If scheduling matters, ask.

3) generate_class_outline_draft
   Purpose: Generate a draft outline for each session of a class (AI generation; no DB write).
   Input:
     classId: UUID
     language: "zh" | "en"
     teachingGoals?: string
   Notes:
     - After generation, you must guide the user to confirm EACH session outline (one by one).
     - You should not save outlines until the user confirms all.

4) save_class_outline
   Purpose: Save the confirmed outline into the database (class-based outline).
   Input:
     classId: UUID
     requirements: object
     chapters: array (one per session)
     language: "zh" | "en"

SPECIAL WORKFLOW: Creating a class (MUST follow this sequence)
If the user wants to create a class:
1) Propose the DB tool to create the class (entity_management: action=create, entity=class).
2) After it succeeds, create ALL sessions for that class (prefer create_sessions_batch).
3) After sessions exist, generate outlines for every session (generate_class_outline_draft).
4) Ask the user to confirm each session's outline (one session per turn). Apply user edits.
5) Only after all session outlines are confirmed, save to DB (save_class_outline).

CONTEXT YOU MAY USE
- selectedClassId: ${selectedClassId || "null"}
- selectedSessionId: ${selectedSessionId || "null"}
- selectedAssignmentId: ${selectedAssignmentId || "null"}
- lastCreatedClassId: ${lastCreatedClassId || "null"}

STATEFUL OUTLINE REVIEW (if present in conversation context)
- If you have an existing outline draft in context (from a prior tool result), continue confirming session outlines.
- Never lose track of which session is being confirmed.

WHAT TO DO EACH TURN
- Decide the user's goal.
- If you need missing parameters, ask the user (no tool proposal).
- Otherwise propose exactly one tool call needed next.
- For multi-tool tasks, after each tool executes, summarize what happened and ask for the next required info before proposing the next tool.

Return TOON with these keys:
message: string
next_action: ask_user|propose_tool|done
proposed_tool:
  toolName: string
  input: object
agent_state: object (store any needed state such as outlineDraft, outlineIndex, etc)
reasoning: string (brief)
`;
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

  try {
    parsed = parseModelResponse(text);
  } catch (err: any) {
    // 改进的错误处理：更智能的意图检测和响应
    parsed = handleParseError(userText, state, preferredLanguage, err);
  }

  /**
   * 处理解析错误，提供智能的fallback响应
   */
  function handleParseError(userText: string, state: any, preferredLanguage: string, err: any): any {
    const normalized = userText.toLowerCase();

    // 改进的意图检测模式
    const intentPatterns = {
      list: /(有哪些|列出|查看|show|list|what|which|获取|get)/i.test(userText),
      create: /(创建|create|新增|add|新建|new|开|开设)/i.test(userText),
      update: /(修改|update|编辑|edit|更改|change|更新)/i.test(userText),
      delete: /(删除|delete|移除|remove|取消|cancel)/i.test(userText),
      query: /(查询|search|查找|find|搜索)/i.test(userText),
    };

    // 实体类型检测
    const entityPatterns = {
      class: /(班级|class|classes|年级|grade|班级)/i.test(userText),
      session: /(课次|课|session|sessions|章节|chapter|课时)/i.test(userText),
      assignment: /(作业|assignment|assignments|任务|task|练习|exercise)/i.test(userText),
      course: /(课程|course|课程|subject)/i.test(userText),
    };

    // 确定主要意图
    const detectedIntent = Object.keys(intentPatterns).find(key => intentPatterns[key as keyof typeof intentPatterns]) || "ask";
    const detectedEntity = Object.keys(entityPatterns).find(key => entityPatterns[key as keyof typeof entityPatterns]);

    // 根据意图和实体提供智能响应
    if (detectedIntent === "list" && detectedEntity) {
      return {
        message:
          preferredLanguage === "zh"
            ? `我理解您想查看${getEntityNameCn(detectedEntity)}列表。我可以帮您从数据库中获取这些信息。请确认执行查询。`
            : `I understand you want to list ${detectedEntity}s. I can help retrieve this information from the database. Please confirm to run the query.`,
        next_action: "propose_tool",
        proposed_tool: {
          toolName: "entity_management",
          input: {
            action: "list",
            entity: detectedEntity,
            classId: state.metadata?.selectedClassId || state.metadata?.lastCreatedClassId || null,
          },
        },
        agent_state: state.metadata?.agentState || {},
        reasoning: `Fallback: Model output parsing failed (${err?.message || String(err)}). Intention: ${detectedIntent} ${detectedEntity}`,
      };
    }

    if (detectedIntent === "create" && detectedEntity) {
      return {
        message:
          preferredLanguage === "zh"
            ? `我理解您想创建新的${getEntityNameCn(detectedEntity)}。我将指导您完成创建过程。`
            : `I understand you want to create a new ${detectedEntity}. I'll guide you through the creation process.`,
        next_action: "ask_user",
        proposed_tool: {
          toolName: "entity_management",
          input: {
            action: "create",
            entity: detectedEntity,
            classId: state.metadata?.selectedClassId || state.metadata?.lastCreatedClassId || null,
          },
        },
        agent_state: state.metadata?.agentState || {},
        reasoning: `Fallback: Model output parsing failed (${err?.message || String(err)}). Intention: ${detectedIntent} ${detectedEntity}`,
      };
    }

    // 不使用预设fallback，让错误真正暴露
    throw new Error(`模型输出解析失败，无法处理用户意图。原始错误：${err?.message || String(err)}`);
  }

  /**
   * 获取实体中文名称
   */
  function getEntityNameCn(entity: string): string {
    const names: Record<string, string> = {
      class: "班级",
      session: "课次",
      assignment: "作业",
      course: "课程",
    };
    return names[entity] || entity;
  }

  /**
   * 根据上下文提供建议操作
   */
  function getContextualSuggestions(preferredLanguage: string, state: any): string {
    if (preferredLanguage === "zh") {
      const hasClass = state.metadata?.selectedClassId || state.metadata?.lastCreatedClassId;
      if (hasClass) {
        return "• 列出班级的课次\n• 创建新作业\n• 查看课程内容\n• 查看学生列表";
      }
      return "• 创建新班级\n• 查看已创建的班级\n• 管理课程内容";
    } else {
      const hasClass = state.metadata?.selectedClassId || state.metadata?.lastCreatedClassId;
      if (hasClass) {
        return "• List class sessions\n• Create new assignment\n• View course content\n• View student list";
      }
      return "• Create new class\n• View existing classes\n• Manage course content";
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
        requiresDatabaseAction: parsed.next_action === "propose_tool" && Boolean(parsed.proposed_tool?.toolName),
        actionType: parsed.proposed_tool?.toolName || null,
        actionData: parsed.proposed_tool?.input || null,
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
      Boolean(parsed.proposed_tool?.toolName),
    actionType: parsed.proposed_tool?.toolName || null,
    actionData: parsed.proposed_tool?.input || null,
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
