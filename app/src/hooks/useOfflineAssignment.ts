// HealthGuide useOfflineAssignment Hook
// Provides offline-first assignment operations with local state

import { useState, useEffect, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { getCollections } from '@/lib/database';
import {
  offlineCheckIn,
  offlineCheckOut,
  offlineCompleteTask,
  offlineSkipTask,
  offlineUndoTask,
  offlineCreateObservation,
} from '@/lib/sync';
import Assignment from '@/lib/database/models/Assignment';
import AssignmentTask from '@/lib/database/models/AssignmentTask';
import Observation from '@/lib/database/models/Observation';
import ElderCache from '@/lib/database/models/ElderCache';

interface UseOfflineAssignmentReturn {
  assignment: Assignment | null;
  tasks: AssignmentTask[];
  observations: Observation[];
  elder: ElderCache | null;
  loading: boolean;
  error: string | null;
  // Actions
  checkIn: (latitude: number, longitude: number) => Promise<void>;
  checkOut: (latitude: number, longitude: number) => Promise<void>;
  completeTask: (taskId: string, notes?: string) => Promise<void>;
  skipTask: (taskId: string, reason: string) => Promise<void>;
  undoTask: (taskId: string) => Promise<void>;
  addObservation: (data: {
    category: string;
    value?: string;
    note?: string;
    isFlagged?: boolean;
  }) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useOfflineAssignment(
  assignmentId: string,
  caregiverId: string
): UseOfflineAssignmentReturn {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [elder, setElder] = useState<ElderCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assignment data
  const loadData = useCallback(async () => {
    const cols = getCollections();
    if (!cols) {
      setLoading(false);
      setError('Offline database not available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get assignment
      const assignmentRecord = await cols.assignments.find(assignmentId);
      setAssignment(assignmentRecord);

      // Get tasks for this assignment
      const taskRecords = await cols.assignmentTasks
        .query(Q.where('assignment_id', assignmentId))
        .fetch();
      setTasks(taskRecords);

      // Get observations for this assignment
      const observationRecords = await cols.observations
        .query(Q.where('assignment_id', assignmentId))
        .fetch();
      setObservations(observationRecords);

      // Get cached elder
      if (assignmentRecord.elderId) {
        const elderRecords = await cols.eldersCache
          .query(Q.where('server_id', assignmentRecord.elderId))
          .fetch();
        setElder(elderRecords.length > 0 ? elderRecords[0] : null);
      }
    } catch (err: any) {
      console.error('[useOfflineAssignment] Load error:', err);
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to changes
  useEffect(() => {
    const cols = getCollections();
    if (!cols) return;

    const subscription = cols.assignments
      .query(Q.where('id', assignmentId))
      .observe()
      .subscribe((records: Assignment[]) => {
        if (records.length > 0) {
          setAssignment(records[0]);
        }
      });

    return () => subscription.unsubscribe();
  }, [assignmentId]);

  // Subscribe to task changes
  useEffect(() => {
    const cols = getCollections();
    if (!cols) return;

    const subscription = cols.assignmentTasks
      .query(Q.where('assignment_id', assignmentId))
      .observe()
      .subscribe((records: AssignmentTask[]) => {
        setTasks(records);
      });

    return () => subscription.unsubscribe();
  }, [assignmentId]);

  // Check in action
  const checkIn = useCallback(async (latitude: number, longitude: number) => {
    try {
      await offlineCheckIn(assignmentId, latitude, longitude);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Check-in error:', err);
      throw err;
    }
  }, [assignmentId]);

  // Check out action
  const checkOut = useCallback(async (latitude: number, longitude: number) => {
    try {
      await offlineCheckOut(assignmentId, latitude, longitude);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Check-out error:', err);
      throw err;
    }
  }, [assignmentId]);

  // Complete task action
  const completeTask = useCallback(async (taskId: string, notes?: string) => {
    try {
      await offlineCompleteTask(taskId, notes);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Complete task error:', err);
      throw err;
    }
  }, []);

  // Skip task action
  const skipTask = useCallback(async (taskId: string, reason: string) => {
    try {
      await offlineSkipTask(taskId, reason);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Skip task error:', err);
      throw err;
    }
  }, []);

  // Undo task action
  const undoTask = useCallback(async (taskId: string) => {
    try {
      await offlineUndoTask(taskId);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Undo task error:', err);
      throw err;
    }
  }, []);

  // Add observation action
  const addObservation = useCallback(async (data: {
    category: string;
    value?: string;
    note?: string;
    isFlagged?: boolean;
  }) => {
    if (!assignment) return;

    try {
      await offlineCreateObservation(
        assignmentId,
        assignment.elderId,
        caregiverId,
        data
      );
      // Refresh observations
      const cols = getCollections();
      if (!cols) return;
      const observationRecords = await cols.observations
        .query(Q.where('assignment_id', assignmentId))
        .fetch();
      setObservations(observationRecords);
    } catch (err: any) {
      console.error('[useOfflineAssignment] Add observation error:', err);
      throw err;
    }
  }, [assignmentId, assignment, caregiverId]);

  return {
    assignment,
    tasks,
    observations,
    elder,
    loading,
    error,
    checkIn,
    checkOut,
    completeTask,
    skipTask,
    undoTask,
    addObservation,
    refresh: loadData,
  };
}

// Hook for getting today's assignments (offline-first)
export function useOfflineTodayAssignments(caregiverId: string, dateStr: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const cols = getCollections();
    if (!cols) { setLoading(false); return; }

    try {
      setLoading(true);
      const records = await cols.assignments
        .query(
          Q.and(
            Q.where('caregiver_id', caregiverId),
            Q.where('scheduled_date', dateStr)
          )
        )
        .fetch();
      setAssignments(records);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caregiverId, dateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to changes
  useEffect(() => {
    const cols = getCollections();
    if (!cols) return;

    const subscription = cols.assignments
      .query(
        Q.and(
          Q.where('caregiver_id', caregiverId),
          Q.where('scheduled_date', dateStr)
        )
      )
      .observe()
      .subscribe((records: Assignment[]) => {
        setAssignments(records);
      });

    return () => subscription.unsubscribe();
  }, [caregiverId, dateStr]);

  return { assignments, loading, error, refresh: loadData };
}
