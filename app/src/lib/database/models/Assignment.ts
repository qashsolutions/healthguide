// HealthGuide Assignment Model
// WatermelonDB model for offline assignment storage

import { Model } from '@nozbe/watermelondb';
import { field, children, writer } from '@nozbe/watermelondb/decorators';

export default class Assignment extends Model {
  static table = 'assignments';

  static associations = {
    assignment_tasks: { type: 'has_many' as const, foreignKey: 'assignment_id' },
    observations: { type: 'has_many' as const, foreignKey: 'assignment_id' },
  };

  @field('server_id') serverId!: string;
  @field('elder_id') elderId!: string;
  @field('caregiver_id') caregiverId!: string;
  @field('scheduled_date') scheduledDate!: string;
  @field('start_time') startTime!: string;
  @field('end_time') endTime!: string;
  @field('status') status!: string;
  @field('actual_check_in') actualCheckIn?: string;
  @field('actual_check_out') actualCheckOut?: string;
  @field('check_in_latitude') checkInLatitude?: number;
  @field('check_in_longitude') checkInLongitude?: number;
  @field('check_out_latitude') checkOutLatitude?: number;
  @field('check_out_longitude') checkOutLongitude?: number;
  @field('notes') notes?: string;
  @field('synced') synced!: boolean;
  @field('local_updated_at') localUpdatedAt!: number;

  @children('assignment_tasks') tasks: any;
  @children('observations') observations: any;

  // Check in to visit - records time and location
  @writer async markCheckIn(latitude: number, longitude: number) {
    await this.update((record) => {
      record.actualCheckIn = new Date().toISOString();
      record.checkInLatitude = latitude;
      record.checkInLongitude = longitude;
      record.status = 'in_progress';
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Check out from visit - records time and location
  @writer async markCheckOut(latitude: number, longitude: number) {
    await this.update((record) => {
      record.actualCheckOut = new Date().toISOString();
      record.checkOutLatitude = latitude;
      record.checkOutLongitude = longitude;
      record.status = 'completed';
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Add notes to the assignment
  @writer async addNotes(notes: string) {
    await this.update((record) => {
      record.notes = notes;
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

  // Get display name for status
  get statusDisplay(): string {
    const statusMap: Record<string, string> = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      missed: 'Missed',
    };
    return statusMap[this.status] || this.status;
  }

  // Check if check-in is available
  get canCheckIn(): boolean {
    return this.status === 'scheduled' && !this.actualCheckIn;
  }

  // Check if check-out is available
  get canCheckOut(): boolean {
    return this.status === 'in_progress' && !!this.actualCheckIn && !this.actualCheckOut;
  }
}
