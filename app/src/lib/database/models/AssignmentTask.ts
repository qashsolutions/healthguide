// HealthGuide AssignmentTask Model
// WatermelonDB model for offline task completion tracking

import { Model } from '@nozbe/watermelondb';
import { field, relation, writer } from '@nozbe/watermelondb/decorators';

export default class AssignmentTask extends Model {
  static table = 'assignment_tasks';

  static associations = {
    assignments: { type: 'belongs_to' as const, key: 'assignment_id' },
  };

  @field('server_id') declare serverId: string;
  @field('assignment_id') declare assignmentId: string;
  @field('task_id') declare taskId: string;
  @field('task_name') declare taskName: string;
  @field('task_icon') declare taskIcon: string;
  @field('task_category') declare taskCategory: string;
  @field('is_required') declare isRequired: boolean;
  @field('status') declare status: string;
  @field('completed_at') declare completedAt: string | undefined;
  @field('skip_reason') declare skipReason: string | undefined;
  @field('notes') declare notes: string | undefined;
  @field('synced') declare synced: boolean;
  @field('local_updated_at') declare localUpdatedAt: number;

  @relation('assignments', 'assignment_id') assignment: any;

  // Mark task as completed
  @writer async markCompleted(notes?: string) {
    await this.update((record) => {
      record.status = 'completed';
      record.completedAt = new Date().toISOString();
      if (notes) {
        record.notes = notes;
      }
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Mark task as skipped with reason
  @writer async markSkipped(reason: string) {
    await this.update((record) => {
      record.status = 'skipped';
      record.skipReason = reason;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Undo task completion (set back to pending)
  @writer async undoCompletion() {
    await this.update((record) => {
      record.status = 'pending';
      record.completedAt = undefined;
      record.skipReason = undefined;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Mark as synced after successful server sync
  @writer async markSynced() {
    await this.update((record) => {
      record.synced = true;
    });
  }

  // Get status display color
  get statusColor(): string {
    const colorMap: Record<string, string> = {
      pending: '#6B7280',
      completed: '#10B981',
      skipped: '#F59E0B',
    };
    return colorMap[this.status] || '#6B7280';
  }

  // Check if task can be completed
  get canComplete(): boolean {
    return this.status === 'pending';
  }

  // Check if task can be undone
  get canUndo(): boolean {
    return this.status === 'completed' || this.status === 'skipped';
  }
}
