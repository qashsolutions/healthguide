// HealthGuide SyncQueueItem Model
// WatermelonDB model for tracking pending sync operations

import { Model } from '@nozbe/watermelondb';
import { field, writer } from '@nozbe/watermelondb/decorators';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export default class SyncQueueItem extends Model {
  static table = 'sync_queue';

  @field('table_name') declare tableName: string;
  @field('operation') declare operation: SyncOperation;
  @field('record_id') declare recordId: string;
  @field('server_id') declare serverId: string | undefined;
  @field('data') declare data: string; // JSON stringified
  @field('status') declare status: SyncStatus;
  @field('retry_count') declare retryCount: number;
  @field('last_error') declare lastError: string | undefined;
  @field('created_at') declare createdAt: number;

  // Get parsed data
  get parsedData(): Record<string, any> {
    try {
      return JSON.parse(this.data);
    } catch {
      return {};
    }
  }

  // Mark as syncing
  @writer async markSyncing() {
    await this.update((record) => {
      record.status = 'syncing';
    });
  }

  // Mark as completed
  @writer async markCompleted() {
    await this.update((record) => {
      record.status = 'completed';
    });
  }

  // Mark as failed with error
  @writer async markFailed(error: string) {
    await this.update((record) => {
      record.status = 'failed';
      record.lastError = error;
      record.retryCount = record.retryCount + 1;
    });
  }

  // Reset to pending for retry
  @writer async resetToPending() {
    await this.update((record) => {
      record.status = 'pending';
    });
  }

  // Check if max retries reached
  get isMaxRetriesReached(): boolean {
    return this.retryCount >= 5;
  }

  // Get human-readable description
  get description(): string {
    const operationText: Record<SyncOperation, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
    };
    return `${operationText[this.operation]} ${this.tableName}`;
  }
}
