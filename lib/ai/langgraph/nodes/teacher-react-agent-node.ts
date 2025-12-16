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

  // Deterministic outline confirmation flow (reduces reliance on the model for state tracking).
  const existingAgentState: any = state.metadata?.agentState || {};
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

  const toolCallsExecuted = countExecutedToolCallsFromHistory(state.messages);
  const toolCallsRemaining = Math.max(0, 5 - toolCallsExecuted);

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

  const parsed = parseModelResponse<{
    message: string;
    next_action: NextAction;
    proposed_tool?: { toolName: string; input: Record<string, any> } | null;
    agent_state?: Record<string, any>;
    reasoning?: string;
  }>(text);

  const assistantMessage = new AIMessage({
    content: parsed.message || (preferredLanguage === "zh" ? "我可以帮您。" : "I can help."),
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
