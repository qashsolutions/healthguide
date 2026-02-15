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

  @field('server_id') declare serverId: string;
  @field('elder_id') declare elderId: string;
  @field('caregiver_id') declare caregiverId: string;
  @field('scheduled_date') declare scheduledDate: string;
  @field('start_time') declare startTime: string;
  @field('end_time') declare endTime: string;
  @field('status') declare status: string;
  @field('actual_check_in') declare actualCheckIn: string | undefined;
  @field('actual_check_out') declare actualCheckOut: string | undefined;
  @field('check_in_latitude') declare checkInLatitude: number | undefined;
  @field('check_in_longitude') declare checkInLongitude: number | undefined;
  @field('check_out_latitude') declare checkOutLatitude: number | undefined;
  @field('check_out_longitude') declare checkOutLongitude: number | undefined;
  @field('notes') declare notes: string | undefined;
  @field('synced') declare synced: boolean;
  @field('local_updated_at') declare localUpdatedAt: number;

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
