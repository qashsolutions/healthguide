// HealthGuide Custom Hooks
// Export all hooks for easy importing

export {
  useAuth,
  useHasRole,
  useAgencyId,
} from './useAuth';

export {
  useVisit,
  useTodayVisits,
  checkIn,
  checkOut,
  updateTaskStatus,
  saveObservations,
  reportTaskDecline,
} from './useVisits';

export type {
  CheckInData,
  CheckOutData,
  UpdateTaskStatusData,
  SaveObservationsData,
  TaskDeclineData,
} from './useVisits';

// Offline-first hooks
export {
  useOfflineAssignment,
  useOfflineTodayAssignments,
} from './useOfflineAssignment';
