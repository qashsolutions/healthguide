// HealthGuide Offline-First Data Operations
// Functions for performing data operations that work offline

import { Q } from '@nozbe/watermelondb';
import { database, collections } from '../database';
import { syncQueueManager } from './SyncQueueManager';
import Assignment from '../database/models/Assignment';
import AssignmentTask from '../database/models/AssignmentTask';
import Observation from '../database/models/Observation';

// ============================================
// ASSIGNMENT OPERATIONS
// ============================================

// Check in to an assignment with location
export async function offlineCheckIn(
  assignmentId: string,
  latitude: number,
  longitude: number
): Promise<Assignment> {
  const assignment = await collections.assignments.find(assignmentId);
  await assignment.markCheckIn(latitude, longitude);

  // Queue for sync
  await syncQueueManager.addToQueue(
    'assignments',
    'update',
    assignmentId,
    {
      id: assignment.serverId,
      actual_check_in: assignment.actualCheckIn,
      check_in_latitude: latitude,
      check_in_longitude: longitude,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    },
    assignment.serverId
  );

  return assignment;
}

// Check out from an assignment with location
export async function offlineCheckOut(
  assignmentId: string,
  latitude: number,
  longitude: number
): Promise<Assignment> {
  const assignment = await collections.assignments.find(assignmentId);
  await assignment.markCheckOut(latitude, longitude);

  // Queue for sync
  await syncQueueManager.addToQueue(
    'assignments',
    'update',
    assignmentId,
    {
      id: assignment.serverId,
      actual_check_out: assignment.actualCheckOut,
      check_out_latitude: latitude,
      check_out_longitude: longitude,
      status: 'completed',
      updated_at: new Date().toISOString(),
    },
    assignment.serverId
  );

  return assignment;
}

// Add notes to an assignment
export async function offlineAddAssignmentNotes(
  assignmentId: string,
  notes: string
): Promise<Assignment> {
  const assignment = await collections.assignments.find(assignmentId);
  await assignment.addNotes(notes);

  await syncQueueManager.addToQueue(
    'assignments',
    'update',
    assignmentId,
    {
      id: assignment.serverId,
      notes,
      updated_at: new Date().toISOString(),
    },
    assignment.serverId
  );

  return assignment;
}

// ============================================
// TASK OPERATIONS
// ============================================

// Complete a task
export async function offlineCompleteTask(
  taskId: string,
  notes?: string
): Promise<AssignmentTask> {
  const task = await collections.assignmentTasks.find(taskId);
  await task.markCompleted(notes);

  await syncQueueManager.addToQueue(
    'assignment_tasks',
    'update',
    taskId,
    {
      id: task.serverId,
      status: 'completed',
      completed_at: task.completedAt,
      notes: task.notes,
      updated_at: new Date().toISOString(),
    },
    task.serverId
  );

  return task;
}

// Skip a task with reason
export async function offlineSkipTask(
  taskId: string,
  reason: string
): Promise<AssignmentTask> {
  const task = await collections.assignmentTasks.find(taskId);
  await task.markSkipped(reason);

  await syncQueueManager.addToQueue(
    'assignment_tasks',
    'update',
    taskId,
    {
      id: task.serverId,
      status: 'skipped',
      skip_reason: reason,
      updated_at: new Date().toISOString(),
    },
    task.serverId
  );

  return task;
}

// Undo task completion
export async function offlineUndoTask(taskId: string): Promise<AssignmentTask> {
  const task = await collections.assignmentTasks.find(taskId);
  await task.undoCompletion();

  await syncQueueManager.addToQueue(
    'assignment_tasks',
    'update',
    taskId,
    {
      id: task.serverId,
      status: 'pending',
      completed_at: null,
      skip_reason: null,
      updated_at: new Date().toISOString(),
    },
    task.serverId
  );

  return task;
}

// ============================================
// OBSERVATION OPERATIONS
// ============================================

interface CreateObservationData {
  category: string;
  value?: string;
  note?: string;
  isFlagged?: boolean;
  photoUrl?: string;
}

// Create a new observation
export async function offlineCreateObservation(
  assignmentId: string,
  elderId: string,
  caregiverId: string,
  data: CreateObservationData
): Promise<Observation> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let observation: Observation;

  await database.write(async () => {
    observation = await collections.observations.create((record: any) => {
      record._raw.id = localId;
      record.assignmentId = assignmentId;
      record.elderId = elderId;
      record.caregiverId = caregiverId;
      record.category = data.category;
      record.value = data.value;
      record.note = data.note;
      record.isFlagged = data.isFlagged ?? false;
      record.photoUrl = data.photoUrl;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  });

  await syncQueueManager.addToQueue(
    'observations',
    'create',
    localId,
    {
      assignment_id: assignmentId,
      elder_id: elderId,
      caregiver_id: caregiverId,
      category: data.category,
      value: data.value,
      note: data.note,
      is_flagged: data.isFlagged ?? false,
      photo_url: data.photoUrl,
      created_at: new Date().toISOString(),
    }
  );

  return observation!;
}

// Update an existing observation
export async function offlineUpdateObservation(
  observationId: string,
  data: Partial<CreateObservationData>
): Promise<Observation> {
  const observation = await collections.observations.find(observationId);
  await observation.updateDetails({
    value: data.value,
    note: data.note,
    isFlagged: data.isFlagged,
    photoUrl: data.photoUrl,
  });

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.value !== undefined) updateData.value = data.value;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.isFlagged !== undefined) updateData.is_flagged = data.isFlagged;
  if (data.photoUrl !== undefined) updateData.photo_url = data.photoUrl;

  if (observation.serverId) {
    updateData.id = observation.serverId;
    await syncQueueManager.addToQueue(
      'observations',
      'update',
      observationId,
      updateData,
      observation.serverId
    );
  }

  return observation;
}

// Flag an observation
export async function offlineFlagObservation(
  observationId: string
): Promise<Observation> {
  const observation = await collections.observations.find(observationId);
  await observation.flag();

  if (observation.serverId) {
    await syncQueueManager.addToQueue(
      'observations',
      'update',
      observationId,
      {
        id: observation.serverId,
        is_flagged: true,
        updated_at: new Date().toISOString(),
      },
      observation.serverId
    );
  }

  return observation;
}

// ============================================
// QUERY HELPERS
// ============================================

// Get assignment by ID with tasks
export async function getAssignmentWithTasks(assignmentId: string) {
  const assignment = await collections.assignments.find(assignmentId);
  const tasks = await collections.assignmentTasks
    .query(Q.where('assignment_id', assignmentId))
    .fetch();

  return { assignment, tasks };
}

// Get today's assignments for a caregiver
export async function getTodaysAssignments(caregiverId: string, dateStr: string) {
  return await collections.assignments
    .query(
      Q.and(
        Q.where('caregiver_id', caregiverId),
        Q.where('scheduled_date', dateStr)
      )
    )
    .fetch();
}

// Get elder from cache
export async function getCachedElder(elderId: string) {
  const results = await collections.eldersCache
    .query(Q.where('server_id', elderId))
    .fetch();

  return results.length > 0 ? results[0] : null;
}

// Get unsynced items count by table
export async function getUnsyncedCount(tableName: string): Promise<number> {
  const collection = database.get(tableName);
  return await collection
    .query(Q.where('synced', false))
    .fetchCount();
}
