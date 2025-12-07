// AI聊天实时功能

import { realtimeManager } from './index';

export interface AIChatEvent {
  sessionId: string;
  eventType: 'insert' | 'update';
  message: any;
}

export async function subscribeToAIResponse(
  sessionId: string,
  onResponse: (event: AIChatEvent) => void
): Promise<() => void> {
  return await realtimeManager.subscribe(
    'ai_chat_messages',
    (event) => {
      if (event.type === 'insert' || event.type === 'update') {
        onResponse({
          sessionId,
          eventType: event.type,
          message: event.record
        });
      }
    },
    `session_id=eq.${sessionId}`
  );
}

export async function subscribeToAISuggestions(
  sessionId: string,
  onSuggestion: (event: AIChatEvent) => void
): Promise<() => void> {
  return await realtimeManager.subscribe(
    'ai_suggestions',
    (event) => {
      if (event.type === 'insert') {
        onSuggestion({
          sessionId,
          eventType: event.type,
          message: event.record
        });
      }
    },
    `session_id=eq.${sessionId}`
  );
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  role: 'user' | 'assistant' = 'user'
): Promise<void> {
  console.log('Sending chat message:', { sessionId, message, role });
}

export async function sendAIResponse(
  sessionId: string,
  response: string,
  metadata?: any
): Promise<void> {
  console.log('Sending AI response:', { sessionId, response, metadata });
}

export async function executeToolCall(
  toolName: string,
  params: any
): Promise<any> {
  console.log('Executing AI tool call:', { toolName, params });
  return null;
}

export async function createChatSession(
  userId: string,
  context?: any
): Promise<string> {
  console.log('Creating chat session:', { userId, context });
  return `session_${Date.now()}`;
}

export async function endChatSession(sessionId: string): Promise<void> {
  console.log('Ending chat session:', { sessionId });
}

export async function getChatMessages(
  sessionId: string,
  limit: number = 50
): Promise<any[]> {
  return [];
}

export async function sendAISuggestion(
  sessionId: string,
  suggestion: any
): Promise<void> {
  console.log('Sending AI suggestion:', { sessionId, suggestion });
}

export async function getAIChatConnectionStatus(): Promise<{
  connected: boolean;
  subscriptions: number;
}> {
  return {
    connected: true,
    subscriptions: 0
  };
}

export async function cleanupAIChatRealtime(): Promise<void> {
  await realtimeManager.unsubscribeAll();
}
