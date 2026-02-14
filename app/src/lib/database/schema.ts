// HealthGuide WatermelonDB Schema
// Defines local database structure for offline-first data persistence

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Assignments table - stores scheduled visits
    tableSchema({
      name: 'assignments',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'elder_id', type: 'string', isIndexed: true },
        { name: 'caregiver_id', type: 'string', isIndexed: true },
        { name: 'scheduled_date', type: 'string', isIndexed: true },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'actual_check_in', type: 'string', isOptional: true },
        { name: 'actual_check_out', type: 'string', isOptional: true },
        { name: 'check_in_latitude', type: 'number', isOptional: true },
        { name: 'check_in_longitude', type: 'number', isOptional: true },
        { name: 'check_out_latitude', type: 'number', isOptional: true },
        { name: 'check_out_longitude', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),

    // Assignment tasks table - individual tasks within an assignment
    tableSchema({
      name: 'assignment_tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'assignment_id', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string' },
        { name: 'task_name', type: 'string' },
        { name: 'task_icon', type: 'string' },
        { name: 'task_category', type: 'string' },
        { name: 'is_required', type: 'boolean' },
        { name: 'status', type: 'string' },
        { name: 'completed_at', type: 'string', isOptional: true },
        { name: 'skip_reason', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),

    // Observations table - caregiver observations during visits
    tableSchema({
      name: 'observations',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'assignment_id', type: 'string', isIndexed: true },
        { name: 'elder_id', type: 'string', isIndexed: true },
        { name: 'caregiver_id', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'value', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'is_flagged', type: 'boolean' },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),

    // Sync queue - tracks pending changes to sync
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'data', type: 'string' }, // JSON stringified
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // Elders cache - cached elder data for offline access
    tableSchema({
      name: 'elders_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'address', type: 'string' },
        { name: 'apartment', type: 'string', isOptional: true },
        { name: 'city', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'zip_code', type: 'string' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'phone', type: 'string', isOptional: true },
        { name: 'medical_notes', type: 'string', isOptional: true },
        { name: 'special_instructions', type: 'string', isOptional: true },
        { name: 'cached_at', type: 'number' },
      ],
    }),

    // Task library cache - cached task definitions
    tableSchema({
      name: 'tasks_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'cached_at', type: 'number' },
      ],
    }),

    // Emergency contacts cache - for urgent situations offline
    tableSchema({
      name: 'emergency_contacts_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'elder_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'relationship', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'is_primary', type: 'boolean' },
        { name: 'cached_at', type: 'number' },
      ],
    }),
  ],
});
