// HealthGuide Observation Model
// WatermelonDB model for offline observation storage

import { Model } from '@nozbe/watermelondb';
import { field, relation, writer } from '@nozbe/watermelondb/decorators';

export default class Observation extends Model {
  static table = 'observations';

  static associations = {
    assignments: { type: 'belongs_to' as const, key: 'assignment_id' },
  };

  @field('server_id') serverId?: string;
  @field('assignment_id') assignmentId!: string;
  @field('elder_id') elderId!: string;
  @field('caregiver_id') caregiverId!: string;
  @field('category') category!: string;
  @field('value') value?: string;
  @field('note') note?: string;
  @field('is_flagged') isFlagged!: boolean;
  @field('photo_url') photoUrl?: string;
  @field('synced') synced!: boolean;
  @field('local_updated_at') localUpdatedAt!: number;

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
      mood: '😊',
      mobility: '🚶',
      appetite: '🍽️',
      medication: '💊',
      skin: '🩹',
      sleep: '😴',
      pain: '🩺',
      cognitive: '🧠',
      social: '👥',
      other: '📝',
    };
    return iconMap[this.category] || '📝';
  }
}
