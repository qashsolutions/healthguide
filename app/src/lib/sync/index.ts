// HealthGuide Sync Module - Barrel Export

export { syncQueueManager, type SyncStatusInfo } from './SyncQueueManager';

export {
  // Assignment operations
  offlineCheckIn,
  offlineCheckOut,
  offlineAddAssignmentNotes,
  // Task operations
  offlineCompleteTask,
  offlineSkipTask,
  offlineUndoTask,
  // Observation operations
  offlineCreateObservation,
  offlineUpdateObservation,
  offlineFlagObservation,
  // Query helpers
  getAssignmentWithTasks,
  getTodaysAssignments,
  getCachedElder,
  getUnsyncedCount,
} from './offlineOperations';

export {
  prefetchCaregiverData,
  clearOldCache,
  getCacheStats,
} from './prefetch';
