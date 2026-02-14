// HealthGuide Sync Queue Manager
// Manages the queue of offline changes to sync with the server
//
// NOTE: This requires WatermelonDB which only works in development builds, not Expo Go.
// In Expo Go, sync operations will be skipped gracefully.

import { supabase } from '../supabase';
import { getDatabase, getCollections, isOfflineDatabaseAvailable } from '../database';
import type SyncQueueItem from '../database/models/SyncQueueItem';
import type { SyncOperation, SyncStatus } from '../database/models/SyncQueueItem';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

export interface SyncStatusInfo {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
  isAvailable: boolean; // Whether offline sync is available
}

type SyncStatusListener = (status: SyncStatusInfo) => void;

class SyncQueueManager {
  private isSyncing = false;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private retryTimeoutId: NodeJS.Timeout | null = null;

  // Check if sync is available (WatermelonDB initialized)
  isAvailable(): boolean {
    return isOfflineDatabaseAvailable();
  }

  // Add an item to the sync queue
  async addToQueue(
    tableName: string,
    operation: SyncOperation,
    recordId: string,
    data: Record<string, any>,
    serverId?: string
  ) {
    const database = getDatabase();
    const collections = getCollections();

    if (!database || !collections) {
      console.warn('[SyncQueue] Database not available, skipping queue add');
      return;
    }

    await database.write(async () => {
      await collections.syncQueue.create((record: any) => {
        record.tableName = tableName;
        record.operation = operation;
        record.recordId = recordId;
        record.serverId = serverId;
        record.data = JSON.stringify(data);
        record.status = 'pending' as SyncStatus;
        record.retryCount = 0;
        record.createdAt = Date.now();
      });
    });

    await this.notifyListeners();
  }

  // Process the entire queue
  async processQueue() {
    const database = getDatabase();
    const collections = getCollections();

    if (!database || !collections) {
      console.warn('[SyncQueue] Database not available, skipping queue processing');
      return;
    }

    if (this.isSyncing) {
      console.log('[SyncQueue] Already syncing, skipping...');
      return;
    }

    this.isSyncing = true;
    await this.notifyListeners();

    try {
      const { Q } = await import('@nozbe/watermelondb');
      const pendingItems = await collections.syncQueue
        .query(Q.where('status', 'pending'))
        .fetch();

      console.log(`[SyncQueue] Processing ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        await this.processItem(item);
      }

      this.lastSyncAt = Date.now();
      this.lastError = null;
    } catch (error: any) {
      console.error('[SyncQueue] Error processing queue:', error);
      this.lastError = error.message;
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }
  }

  // Process a single queue item
  private async processItem(item: SyncQueueItem) {
    const database = getDatabase();
    if (!database) return;

    const { tableName, operation, recordId, serverId, data } = item;
    const parsedData = JSON.parse(data);

    try {
      // Mark as syncing
      await database.write(async () => {
        await item.update((record) => {
          record.status = 'syncing';
        });
      });

      // Map local table to Supabase table
      const supabaseTable = this.mapTableName(tableName);

      // Execute the operation
      switch (operation) {
        case 'create': {
          const { data: created, error } = await supabase
            .from(supabaseTable)
            .insert(parsedData)
            .select()
            .single();

          if (error) throw error;

          // Update local record with server ID if needed
          if (created?.id) {
            await this.updateLocalRecordServerId(tableName, recordId, created.id);
          }
          break;
        }

        case 'update': {
          const idToUse = serverId || parsedData.id;
          if (!idToUse) throw new Error('No server ID for update operation');

          const { error } = await supabase
            .from(supabaseTable)
            .update(parsedData)
            .eq('id', idToUse);

          if (error) throw error;
          break;
        }

        case 'delete': {
          const idToDelete = serverId || parsedData.id;
          if (!idToDelete) throw new Error('No server ID for delete operation');

          const { error } = await supabase
            .from(supabaseTable)
            .delete()
            .eq('id', idToDelete);

          if (error) throw error;
          break;
        }
      }

      // Mark as completed
      await database.write(async () => {
        await item.update((record) => {
          record.status = 'completed';
        });
      });

      // Mark local record as synced
      await this.markRecordSynced(tableName, recordId);

      console.log(`[SyncQueue] Successfully synced ${operation} on ${tableName}`);
    } catch (error: any) {
      console.error(`[SyncQueue] Failed to sync item:`, error);

      const newRetryCount = item.retryCount + 1;
      const shouldRetry = newRetryCount < MAX_RETRIES;

      await database.write(async () => {
        await item.update((record) => {
          record.status = shouldRetry ? 'pending' : 'failed';
          record.retryCount = newRetryCount;
          record.lastError = error.message;
        });
      });

      // Schedule retry with exponential backoff
      if (shouldRetry) {
        const delay = RETRY_DELAYS[newRetryCount - 1] || RETRY_DELAYS[4];
        console.log(`[SyncQueue] Scheduling retry in ${delay}ms`);

        if (this.retryTimeoutId) {
          clearTimeout(this.retryTimeoutId);
        }
        this.retryTimeoutId = setTimeout(() => this.processQueue(), delay);
      }
    }
  }

  // Map local table name to Supabase table name
  private mapTableName(localTable: string): string {
    const mapping: Record<string, string> = {
      assignments: 'visits',
      assignment_tasks: 'visit_tasks',
      observations: 'observations',
    };
    return mapping[localTable] || localTable;
  }

  // Update local record with server ID after create
  private async updateLocalRecordServerId(
    tableName: string,
    localId: string,
    serverId: string
  ) {
    const database = getDatabase();
    if (!database) return;

    try {
      const collection = database.get(tableName);
      const record = await collection.find(localId);

      await database.write(async () => {
        await record.update((r: any) => {
          r.serverId = serverId;
        });
      });
    } catch (error) {
      console.error(`[SyncQueue] Failed to update server ID:`, error);
    }
  }

  // Mark a local record as synced
  private async markRecordSynced(tableName: string, recordId: string) {
    const database = getDatabase();
    if (!database) return;

    try {
      const collection = database.get(tableName);
      const record = await collection.find(recordId);

      await database.write(async () => {
        await record.update((r: any) => {
          r.synced = true;
        });
      });
    } catch (error) {
      console.error(`[SyncQueue] Failed to mark record as synced:`, error);
    }
  }

  // Get count of pending items
  async getPendingCount(): Promise<number> {
    const collections = getCollections();
    if (!collections) return 0;

    const { Q } = await import('@nozbe/watermelondb');
    return await collections.syncQueue
      .query(Q.where('status', Q.oneOf(['pending', 'syncing'])))
      .fetchCount();
  }

  // Get count of failed items
  async getFailedCount(): Promise<number> {
    const collections = getCollections();
    if (!collections) return 0;

    const { Q } = await import('@nozbe/watermelondb');
    return await collections.syncQueue
      .query(Q.where('status', 'failed'))
      .fetchCount();
  }

  // Get all failed items
  async getFailedItems(): Promise<SyncQueueItem[]> {
    const collections = getCollections();
    if (!collections) return [];

    const { Q } = await import('@nozbe/watermelondb');
    return await collections.syncQueue
      .query(Q.where('status', 'failed'))
      .fetch();
  }

  // Retry all failed items
  async retryFailed() {
    const database = getDatabase();
    if (!database) return;

    const failedItems = await this.getFailedItems();

    await database.write(async () => {
      for (const item of failedItems) {
        await item.update((record) => {
          record.status = 'pending';
          record.retryCount = 0;
          record.lastError = undefined;
        });
      }
    });

    await this.notifyListeners();
    await this.processQueue();
  }

  // Clear completed items from the queue
  async clearCompleted() {
    const database = getDatabase();
    const collections = getCollections();
    if (!database || !collections) return;

    const { Q } = await import('@nozbe/watermelondb');
    const completedItems = await collections.syncQueue
      .query(Q.where('status', 'completed'))
      .fetch();

    await database.write(async () => {
      for (const item of completedItems) {
        await item.destroyPermanently();
      }
    });

    console.log(`[SyncQueue] Cleared ${completedItems.length} completed items`);
  }

  // Subscribe to sync status changes
  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of status change
  private async notifyListeners() {
    const pendingCount = await this.getPendingCount();
    const failedCount = await this.getFailedCount();

    const status: SyncStatusInfo = {
      isOnline: true, // Will be updated by connectivity hook
      isSyncing: this.isSyncing,
      pendingCount,
      failedCount,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      isAvailable: this.isAvailable(),
    };

    this.listeners.forEach((listener) => listener(status));
  }

  // Get current sync status
  async getStatus(): Promise<SyncStatusInfo> {
    const pendingCount = await this.getPendingCount();
    const failedCount = await this.getFailedCount();

    return {
      isOnline: true,
      isSyncing: this.isSyncing,
      pendingCount,
      failedCount,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      isAvailable: this.isAvailable(),
    };
  }
}

// Export singleton instance
export const syncQueueManager = new SyncQueueManager();
