// HealthGuide WatermelonDB Database Setup
// Initializes and exports the local database instance
//
// NOTE: WatermelonDB requires native code (JSI) which doesn't work in Expo Go.
// This module provides a lazy initialization that gracefully handles Expo Go.
// For full offline support, use a development build.

import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import Assignment from './models/Assignment';
import AssignmentTask from './models/AssignmentTask';
import Observation from './models/Observation';
import SyncQueueItem from './models/SyncQueueItem';
import ElderCache from './models/ElderCache';

// Track initialization state
let _database: Database | null = null;
let _initError: Error | null = null;
let _isExpoGo = false;

// Lazy database initialization
function initializeDatabase(): Database | null {
  if (_database) return _database;
  if (_initError) return null;

  // SQLiteAdapter requires native code — skip entirely on web
  if (Platform.OS === 'web') {
    _initError = new Error('WatermelonDB not available on web');
    _isExpoGo = true;
    return null;
  }

  try {
    // Dynamic import to prevent crash in Expo Go
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;

    const adapter = new SQLiteAdapter({
      schema,
      // Disable JSI in Expo Go (it will fail anyway)
      jsi: false,
      onSetUpError: (error: Error) => {
        console.error('Database setup error:', error);
        _initError = error;
      },
    });

    _database = new Database({
      adapter,
      modelClasses: [
        Assignment,
        AssignmentTask,
        Observation,
        SyncQueueItem,
        ElderCache,
      ],
    });

    return _database;
  } catch (error) {
    console.warn('WatermelonDB not available (likely running in Expo Go):', error);
    _initError = error as Error;
    _isExpoGo = true;
    return null;
  }
}

// Export getter for database (may be null in Expo Go)
export function getDatabase(): Database | null {
  return initializeDatabase();
}

// For backwards compatibility - will be null in Expo Go
export const database = null as Database | null;

// Check if offline database is available
export function isOfflineDatabaseAvailable(): boolean {
  return getDatabase() !== null;
}

// Check if running in Expo Go (limited functionality)
export function isRunningInExpoGo(): boolean {
  initializeDatabase(); // Trigger init to detect
  return _isExpoGo;
}

// Export model classes for convenience
export { Assignment, AssignmentTask, Observation, SyncQueueItem, ElderCache };
export { schema };

// Helper to get typed collections (returns null if DB unavailable)
export function getCollections() {
  const db = getDatabase();
  if (!db) return null;

  return {
    assignments: db.get<Assignment>('assignments'),
    assignmentTasks: db.get<AssignmentTask>('assignment_tasks'),
    observations: db.get<Observation>('observations'),
    syncQueue: db.get<SyncQueueItem>('sync_queue'),
    eldersCache: db.get<ElderCache>('elders_cache'),
  };
}

// Legacy export for backwards compatibility
export const collections = null as ReturnType<typeof getCollections>;

// Database reset function (for testing/debugging)
export async function resetDatabase() {
  const db = getDatabase();
  if (!db) {
    console.warn('Database not available, cannot reset');
    return;
  }
  await db.write(async () => {
    await db.unsafeResetDatabase();
  });
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const cols = getCollections();
  if (!cols) return 0;

  const { Q } = await import('@nozbe/watermelondb');
  const count = await cols.syncQueue
    .query(Q.where('status', Q.oneOf(['pending', 'syncing'])))
    .fetchCount();
  return count;
}

// Check if there are unsynced changes
export async function hasUnsyncedChanges(): Promise<boolean> {
  const count = await getPendingSyncCount();
  return count > 0;
}
