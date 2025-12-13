import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { ChatbotState } from '../chatbot-state'

type EntityType = 'class' | 'session' | 'assignment'
type CrudAction = 'create' | 'read' | 'update' | 'delete' | 'list'

function buildSummary(action: CrudAction, entity: EntityType): string {
  const entityLabel =
    entity === 'class' ? '班级' : entity === 'session' ? '课次/会话' : '作业'

  switch (action) {
    case 'create':
      return `好的，我会为您创建新的${entityLabel}，并直接调用数据库完成操作。`
    case 'read':
    case 'list':
      return `好的，我会从数据库中查询${entityLabel}信息，并返回真实的数据列表。`
    case 'update':
      return `好的，我会根据您的说明更新对应的${entityLabel}记录，确保写入数据库。`
    case 'delete':
      return `好的，我会在数据库中删除指定的${entityLabel}记录（如有权限）。`
    default:
      return `好的，我会根据您的需求对${entityLabel}执行数据库操作。`
  }
}

export async function entityManagementNode(
  state: ChatbotState,
): Promise<Partial<ChatbotState>> {
  const lastMessage = state.messages[state.messages.length - 1]

  if (!(lastMessage instanceof HumanMessage)) {
    return { ...state }
  }

  const params = state.intent?.parameters || {}
  const action: CrudAction = params.action || 'read'
  const entity: EntityType = params.entity || 'class'

  const summary = buildSummary(action, entity)

  const metadata = {
    ...(state.metadata || {}),
    toolsUsed: [...(state.metadata?.toolsUsed || []), 'entity_management'],
    // 关键：所有实体相关操作统一走数据库工具，不再走fallback分支
    requiresDatabaseAction: true,
    actionType: 'entity_management',
    actionData: {
      action,
      entity,
      entityId: params.entityId || null,
      details: params.details || null,
      // LangGraph 侧保存下游可能需要的上下文 ID
      classId:
        params.classId ||
        state.metadata?.selectedClassId ||
        state.metadata?.classId ||
        state.metadata?.requestContext?.classId ||
        null,
      sessionId:
        params.sessionId ||
        state.metadata?.selectedSessionId ||
        state.metadata?.sessionId ||
        null,
      assignmentId:
        params.assignmentId ||
        state.metadata?.selectedAssignmentId ||
        state.metadata?.assignmentId ||
        null,
    },
  }

  const aiMessage = new AIMessage({
    content: summary,
    additional_kwargs: {
      metadata,
    },
  })

  return {
    ...state,
    messages: [...state.messages, aiMessage],
    metadata,
    currentWorkflow: {
      type: 'entity_management',
      status: 'active',
      step: 'pending_db_action',
      data: metadata.actionData,
    },
  }
}
