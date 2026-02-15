// HealthGuide ElderCache Model
// WatermelonDB model for caching elder data for offline access

import { Model } from '@nozbe/watermelondb';
import { field, writer } from '@nozbe/watermelondb/decorators';

export default class ElderCache extends Model {
  static table = 'elders_cache';

  @field('server_id') declare serverId: string;
  @field('first_name') declare firstName: string;
  @field('last_name') declare lastName: string;
  @field('photo_url') declare photoUrl: string | undefined;
  @field('address') declare address: string;
  @field('apartment') declare apartment: string | undefined;
  @field('city') declare city: string;
  @field('state') declare state: string;
  @field('zip_code') declare zipCode: string;
  @field('latitude') declare latitude: number;
  @field('longitude') declare longitude: number;
  @field('phone') declare phone: string | undefined;
  @field('medical_notes') declare medicalNotes: string | undefined;
  @field('special_instructions') declare specialInstructions: string | undefined;
  @field('cached_at') declare cachedAt: number;

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
