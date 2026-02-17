// HealthGuide Observation Model
// WatermelonDB model for offline observation storage

import { Model } from '@nozbe/watermelondb';
import { field, relation, writer } from '@nozbe/watermelondb/decorators';

export default class Observation extends Model {
  static table = 'observations';

  static associations = {
    assignments: { type: 'belongs_to' as const, key: 'assignment_id' },
  };

  @field('server_id') declare serverId: string | undefined;
  @field('assignment_id') declare assignmentId: string;
  @field('elder_id') declare elderId: string;
  @field('caregiver_id') declare caregiverId: string;
  @field('category') declare category: string;
  @field('value') declare value: string | undefined;
  @field('note') declare note: string | undefined;
  @field('is_flagged') declare isFlagged: boolean;
  @field('photo_url') declare photoUrl: string | undefined;
  @field('synced') declare synced: boolean;
  @field('local_updated_at') declare localUpdatedAt: number;

  @relation('assignments', 'assignment_id') assignment: any;

  // Update observation details
  @writer async updateDetails(data: {
    value?: string;
    note?: string;
    isFlagged?: boolean;
    photoUrl?: string;
  }) {
    await this.update((record) => {
      if (data.value !== undefined) record.value = data.value;
      if (data.note !== undefined) record.note = data.note;
      if (data.isFlagged !== undefined) record.isFlagged = data.isFlagged;
      if (data.photoUrl !== undefined) record.photoUrl = data.photoUrl;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Flag observation as important
  @writer async flag() {
    await this.update((record) => {
      record.isFlagged = true;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Remove flag from observation
  @writer async unflag() {
    await this.update((record) => {
      record.isFlagged = false;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  // Mark as synced after successful server sync
  @writer async markSynced(serverId: string) {
    await this.update((record) => {
      record.serverId = serverId;
      record.synced = true;
    });
  }

  // Get category display name
  get categoryDisplay(): string {
    const categoryMap: Record<string, string> = {
      mood: 'Mood',
      mobility: 'Mobility',
      appetite: 'Appetite',
      medication: 'Medication',
      skin: 'Skin Condition',
      sleep: 'Sleep',
      pain: 'Pain Level',
      cognitive: 'Cognitive',
      social: 'Social Engagement',
      other: 'Other',
    };
    return categoryMap[this.category] || this.category;
  }

  // Get category icon
  get categoryIcon(): string {
    const iconMap: Record<string, string> = {
      mood: 'smile',
      mobility: 'walking',
      appetite: 'utensils',
      medication: 'pill',
      skin: 'bandage',
      sleep: 'moon',
      pain: 'stethoscope',
      cognitive: 'brain',
      social: 'users',
      other: 'note',
    };
    return iconMap[this.category] || 'note';
  }
}
