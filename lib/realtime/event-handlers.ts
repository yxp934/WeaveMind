// 实时事件处理器

import { RealtimeEvent } from './index';

export async function handleDiscussionEvent(
  event: RealtimeEvent,
  callback?: (data: any) => void
): Promise<void> {
  console.log('Handling discussion event:', event);
  if (callback) {
    callback(event);
  }
}

export async function handleNotificationEvent(
  event: RealtimeEvent,
  callback?: (data: any) => void
): Promise<void> {
  console.log('Handling notification event:', event);
  if (callback) {
    callback(event);
  }
}

export async function handleProgressEvent(
  event: RealtimeEvent,
  callback?: (data: any) => void
): Promise<void> {
  console.log('Handling progress event:', event);
  if (callback) {
    callback(event);
  }
}

export async function handleAIChatEvent(
  event: RealtimeEvent,
  callback?: (data: any) => void
): Promise<void> {
  console.log('Handling AI chat event:', event);
  if (callback) {
    callback(event);
  }
}

export async function handleRealtimeEvent(
  event: RealtimeEvent,
  callbacks: {
    discussion?: (data: any) => void;
    notification?: (data: any) => void;
    progress?: (data: any) => void;
    aiChat?: (data: any) => void;
  }
): Promise<void> {
  console.log('Handling realtime event:', event);

  switch (event.table) {
    case 'discussion_posts':
      await handleDiscussionEvent(event, callbacks.discussion);
      break;
    case 'notifications':
      await handleNotificationEvent(event, callbacks.notification);
      break;
    case 'learning_progress':
      await handleProgressEvent(event, callbacks.progress);
      break;
    case 'ai_chat_messages':
      await handleAIChatEvent(event, callbacks.aiChat);
      break;
    default:
      console.warn('Unknown event table:', event.table);
  }
}

export function addEventRoute(
  table: string,
  handler: (event: RealtimeEvent) => void
): void {
  console.log('Adding event route:', { table, handler });
}

export function removeEventRoute(table: string): void {
  console.log('Removing event route:', { table });
}

export function getEventStats(): {
  totalEvents: number;
  eventsByTable: Record<string, number>;
} {
  return {
    totalEvents: 0,
    eventsByTable: {}
  };
}

export function getEventErrorLog(): any[] {
  return [];
}

export function resetEventStats(): void {
  console.log('Resetting event stats');
}
