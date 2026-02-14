// HealthGuide SyncQueueItem Model
// WatermelonDB model for tracking pending sync operations

import { Model } from '@nozbe/watermelondb';
import { field, writer } from '@nozbe/watermelondb/decorators';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export default class SyncQueueItem extends Model {
  static table = 'sync_queue';

  @field('table_name') tableName!: string;
  @field('operation') operation!: SyncOperation;
  @field('record_id') recordId!: string;
  @field('server_id') serverId?: string;
  @field('data') data!: string; // JSON stringified
  @field('status') status!: SyncStatus;
  @field('retry_count') retryCount!: number;
  @field('last_error') lastError?: string;
  @field('created_at') createdAt!: number;

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
