// HealthGuide ElderCache Model
// WatermelonDB model for caching elder data for offline access

import { Model } from '@nozbe/watermelondb';
import { field, writer } from '@nozbe/watermelondb/decorators';

export default class ElderCache extends Model {
  static table = 'elders_cache';

  @field('server_id') serverId!: string;
  @field('first_name') firstName!: string;
  @field('last_name') lastName!: string;
  @field('photo_url') photoUrl?: string;
  @field('address') address!: string;
  @field('apartment') apartment?: string;
  @field('city') city!: string;
  @field('state') state!: string;
  @field('zip_code') zipCode!: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('phone') phone?: string;
  @field('medical_notes') medicalNotes?: string;
  @field('special_instructions') specialInstructions?: string;
  @field('cached_at') cachedAt!: number;

  // Get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Get full address
  get fullAddress(): string {
    const parts = [this.address];
    if (this.apartment) parts.push(`Apt ${this.apartment}`);
    parts.push(`${this.city}, ${this.state} ${this.zipCode}`);
    return parts.join(', ');
  }

  // Get initials for avatar fallback
  get initials(): string {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }

  // Update cache data
  @writer async updateCache(data: {
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    address?: string;
    apartment?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    medicalNotes?: string;
    specialInstructions?: string;
  }) {
    await this.update((record) => {
      Object.assign(record, data);
      record.cachedAt = Date.now();
    });
  }

  // Check if cache is stale (older than 24 hours)
  get isStale(): boolean {
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - this.cachedAt > staleThreshold;
  }
}
