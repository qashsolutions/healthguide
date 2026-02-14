// HealthGuide Data Prefetching
// Pre-downloads data for offline use before going to areas with poor connectivity

import { Q } from '@nozbe/watermelondb';
import { format, addDays } from 'date-fns';
import { getDatabase, getCollections } from '../database';
import { supabase } from '../supabase';

interface PrefetchOptions {
  daysAhead?: number;
  includeElderDetails?: boolean;
  includeEmergencyContacts?: boolean;
}

// Prefetch all data a caregiver needs for upcoming visits
export async function prefetchCaregiverData(
  caregiverId: string,
  options: PrefetchOptions = {}
) {
  const {
    daysAhead = 7,
    includeElderDetails = true,
    includeEmergencyContacts = true,
  } = options;

  const today = format(new Date(), 'yyyy-MM-dd');
  const futureDate = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

  console.log(`[Prefetch] Starting prefetch for caregiver ${caregiverId}`);
  console.log(`[Prefetch] Date range: ${today} to ${futureDate}`);

  // Fetch upcoming assignments with related data
  const { data: assignments, error } = await supabase
    .from('visits')
    .select(`
      *,
      elder:elders (
        id,
        first_name,
        last_name,
        photo_url,
        address,
        apartment,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        phone,
        medical_notes,
        special_instructions
      ),
      visit_tasks (
        *,
        task:task_library (id, name, icon, category)
      )
    `)
    .eq('caregiver_id', caregiverId)
    .gte('scheduled_date', today)
    .lte('scheduled_date', futureDate)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('[Prefetch] Error fetching assignments:', error);
    throw error;
  }

  if (!assignments || assignments.length === 0) {
    console.log('[Prefetch] No assignments to prefetch');
    return { assignmentCount: 0, elderCount: 0 };
  }

  console.log(`[Prefetch] Found ${assignments.length} assignments`);

  const elderIds = new Set<string>();
  const database = getDatabase();
  const collections = getCollections();
  if (!database || !collections) {
    console.warn('[Prefetch] Database not available, skipping prefetch');
    return { assignmentCount: 0, elderCount: 0 };
  }

  await database.write(async () => {
    for (const assignment of assignments) {
      // Cache elder data
      if (includeElderDetails && assignment.elder) {
        elderIds.add(assignment.elder.id);
        await cacheElder(assignment.elder);
      }

      // Cache assignment
      const localAssignmentId = await cacheAssignment(assignment, caregiverId);

      // Cache tasks
      if (assignment.visit_tasks) {
        for (const task of assignment.visit_tasks) {
          await cacheAssignmentTask(task, localAssignmentId);
        }
      }
    }
  });

  // Fetch and cache emergency contacts if requested
  if (includeEmergencyContacts && elderIds.size > 0) {
    await prefetchEmergencyContacts(Array.from(elderIds));
  }

  console.log(`[Prefetch] Completed: ${assignments.length} assignments, ${elderIds.size} elders`);

  return {
    assignmentCount: assignments.length,
    elderCount: elderIds.size,
  };
}

// Cache a single elder's data
async function cacheElder(elder: any) {
  const collections = getCollections();
  if (!collections) return;
  const existingElder = await collections.eldersCache
    .query(Q.where('server_id', elder.id))
    .fetch();

  if (existingElder.length === 0) {
    await collections.eldersCache.create((record: any) => {
      record.serverId = elder.id;
      record.firstName = elder.first_name;
      record.lastName = elder.last_name;
      record.photoUrl = elder.photo_url;
      record.address = elder.address;
      record.apartment = elder.apartment;
      record.city = elder.city;
      record.state = elder.state;
      record.zipCode = elder.zip_code;
      record.latitude = elder.latitude;
      record.longitude = elder.longitude;
      record.phone = elder.phone;
      record.medicalNotes = elder.medical_notes;
      record.specialInstructions = elder.special_instructions;
      record.cachedAt = Date.now();
    });
  } else {
    // Update existing cache
    await existingElder[0].update((record: any) => {
      record.firstName = elder.first_name;
      record.lastName = elder.last_name;
      record.photoUrl = elder.photo_url;
      record.address = elder.address;
      record.apartment = elder.apartment;
      record.city = elder.city;
      record.state = elder.state;
      record.zipCode = elder.zip_code;
      record.latitude = elder.latitude;
      record.longitude = elder.longitude;
      record.phone = elder.phone;
      record.medicalNotes = elder.medical_notes;
      record.specialInstructions = elder.special_instructions;
      record.cachedAt = Date.now();
    });
  }
}

// Cache a single assignment
async function cacheAssignment(assignment: any, caregiverId: string): Promise<string> {
  const collections = getCollections();
  if (!collections) return '';
  const existingAssignment = await collections.assignments
    .query(Q.where('server_id', assignment.id))
    .fetch();

  let localId: string;

  if (existingAssignment.length === 0) {
    const newAssignment = await collections.assignments.create((record: any) => {
      record.serverId = assignment.id;
      record.elderId = assignment.elder_id;
      record.caregiverId = caregiverId;
      record.scheduledDate = assignment.scheduled_date;
      record.startTime = assignment.start_time;
      record.endTime = assignment.end_time;
      record.status = assignment.status;
      record.actualCheckIn = assignment.actual_check_in;
      record.actualCheckOut = assignment.actual_check_out;
      record.checkInLatitude = assignment.check_in_latitude;
      record.checkInLongitude = assignment.check_in_longitude;
      record.checkOutLatitude = assignment.check_out_latitude;
      record.checkOutLongitude = assignment.check_out_longitude;
      record.notes = assignment.notes;
      record.synced = true;
      record.localUpdatedAt = Date.now();
    });
    localId = newAssignment.id;
  } else {
    // Update existing if server version is newer
    const existing = existingAssignment[0];
    if (existing.synced) {
      await existing.update((record: any) => {
        record.status = assignment.status;
        record.actualCheckIn = assignment.actual_check_in;
        record.actualCheckOut = assignment.actual_check_out;
        record.checkInLatitude = assignment.check_in_latitude;
        record.checkInLongitude = assignment.check_in_longitude;
        record.checkOutLatitude = assignment.check_out_latitude;
        record.checkOutLongitude = assignment.check_out_longitude;
        record.notes = assignment.notes;
        record.localUpdatedAt = Date.now();
      });
    }
    localId = existing.id;
  }

  return localId;
}

// Cache a single assignment task
async function cacheAssignmentTask(task: any, localAssignmentId: string) {
  const collections = getCollections();
  if (!collections) return;
  const existingTask = await collections.assignmentTasks
    .query(Q.where('server_id', task.id))
    .fetch();

  if (existingTask.length === 0) {
    await collections.assignmentTasks.create((record: any) => {
      record.serverId = task.id;
      record.assignmentId = localAssignmentId;
      record.taskId = task.task_id;
      record.taskName = task.task?.name || 'Unknown Task';
      record.taskIcon = task.task?.icon || '📋';
      record.taskCategory = task.task?.category || 'other';
      record.isRequired = task.is_required ?? false;
      record.status = task.status;
      record.completedAt = task.completed_at;
      record.skipReason = task.skip_reason;
      record.notes = task.notes;
      record.synced = true;
      record.localUpdatedAt = Date.now();
    });
  } else if (existingTask[0].synced) {
    // Update existing if synced
    await existingTask[0].update((record: any) => {
      record.status = task.status;
      record.completedAt = task.completed_at;
      record.skipReason = task.skip_reason;
      record.notes = task.notes;
      record.localUpdatedAt = Date.now();
    });
  }
}

// Prefetch emergency contacts for a list of elders
async function prefetchEmergencyContacts(elderIds: string[]) {
  const { data: contacts, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .in('elder_id', elderIds);

  if (error) {
    console.error('[Prefetch] Error fetching emergency contacts:', error);
    return;
  }

  if (!contacts) return;

  const database = getDatabase();
  if (!database) return;

  const emergencyContactsCache = database.get('emergency_contacts_cache');

  await database.write(async () => {
    for (const contact of contacts) {
      const existing = await emergencyContactsCache
        .query(Q.where('server_id', contact.id))
        .fetch();

      if (existing.length === 0) {
        await emergencyContactsCache.create((record: any) => {
          record.serverId = contact.id;
          record.elderId = contact.elder_id;
          record.name = contact.name;
          record.relationship = contact.relationship;
          record.phone = contact.phone;
          record.isPrimary = contact.is_primary;
          record.cachedAt = Date.now();
        });
      }
    }
  });

  console.log(`[Prefetch] Cached ${contacts.length} emergency contacts`);
}

// Clear old cached data (older than 30 days)
export async function clearOldCache(daysOld: number = 30) {
  const database = getDatabase();
  const collections = getCollections();
  if (!database || !collections) return;

  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

  await database.write(async () => {
    // Clear old elder cache
    const oldElders = await collections.eldersCache
      .query(Q.where('cached_at', Q.lt(cutoffTime)))
      .fetch();

    for (const elder of oldElders) {
      await elder.destroyPermanently();
    }

    // Clear completed sync queue items
    const completedItems = await collections.syncQueue
      .query(Q.where('status', 'completed'))
      .fetch();

    for (const item of completedItems) {
      await item.destroyPermanently();
    }

    console.log(`[Cache] Cleared ${oldElders.length} old elders, ${completedItems.length} sync items`);
  });
}

// Get cache statistics
export async function getCacheStats() {
  const collections = getCollections();
  if (!collections) return { elders: 0, assignments: 0, tasks: 0, observations: 0, pendingSync: 0 };

  const elderCount = await collections.eldersCache.query().fetchCount();
  const assignmentCount = await collections.assignments.query().fetchCount();
  const taskCount = await collections.assignmentTasks.query().fetchCount();
  const observationCount = await collections.observations.query().fetchCount();
  const pendingSyncCount = await collections.syncQueue
    .query(Q.where('status', Q.oneOf(['pending', 'syncing'])))
    .fetchCount();

  return {
    elders: elderCount,
    assignments: assignmentCount,
    tasks: taskCount,
    observations: observationCount,
    pendingSync: pendingSyncCount,
  };
}
