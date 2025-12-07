// 实时功能主入口文件

import { createClient } from '@/lib/supabase/client';

export interface RealtimeEvent {
  type: 'insert' | 'update' | 'delete';
  table: string;
  record: any;
  old_record?: any;
}

export class RealtimeManager {
  private supabase = createClient();
  private subscriptions = new Map<string, any>();

  async subscribe(
    table: string,
    callback: (event: RealtimeEvent) => void,
    filter?: string
  ): Promise<() => void> {
    try {
      const channel = this.supabase
        .channel(`realtime:${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            callback({
              type: payload.eventType as 'insert' | 'update' | 'delete',
              table,
              record: payload.new,
              old_record: payload.old
            });
          }
        )
        .subscribe();

      const subscriptionId = `sub_${Date.now()}_${table}`;
      this.subscriptions.set(subscriptionId, channel);

      return () => {
        channel.unsubscribe();
        this.subscriptions.delete(subscriptionId);
      };
    } catch (error) {
      console.error('Failed to subscribe to realtime changes:', error);
      throw error;
    }
  }

  async unsubscribeAll(): Promise<void> {
    for (const [id, subscription] of this.subscriptions) {
      try {
        await subscription.unsubscribe();
      } catch (error) {
        console.error(`Failed to unsubscribe ${id}:`, error);
      }
    }
    this.subscriptions.clear();
  }
}

// 导出单例实例
export const realtimeManager = new RealtimeManager();

// 便利函数
export const subscribeToTable = (
  table: string,
  callback: (event: RealtimeEvent) => void,
  filter?: string
) => {
  return realtimeManager.subscribe(table, callback, filter);
};

export const unsubscribeAll = () => {
  return realtimeManager.unsubscribeAll();
};
