---
name: healthguide-core-offline-sync
description: Offline-first architecture for caregivers working in low-connectivity environments. Includes local data persistence, background sync, conflict resolution, and queue management. Use when building offline task completion, EVV fallback, or sync indicators.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [offline, sync, persistence, queue, connectivity]
---

# HealthGuide Offline Sync

## Overview
Caregivers often work in homes with poor connectivity. This skill enables task completion, observations, and EVV check-in/out to work offline, syncing automatically when connection is restored.

## Key Features

- Local SQLite storage with WatermelonDB
- Background sync queue with retry logic
- Conflict resolution (last-write-wins + merge)
- Connectivity monitoring
- Visual sync status indicators
- Automatic retry with exponential backoff

## Data Models

```typescript
interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data: Record<string, any>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

interface OfflineAssignment {
  id: string;
  elder_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  actual_check_in?: string;
  actual_check_out?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  _synced: boolean;
  _localUpdatedAt: number;
}

interface OfflineTask {
  id: string;
  assignment_id: string;
  task_id: string;
  status: 'pending' | 'completed' | 'skipped';
  completed_at?: string;
  skip_reason?: string;
  _synced: boolean;
  _localUpdatedAt: number;
}
```

## Instructions

### Step 1: WatermelonDB Setup

```bash
npx expo install @nozbe/watermelondb
npx expo install @nozbe/with-observables
```

```typescript
// lib/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'assignments',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'elder_id', type: 'string', isIndexed: true },
        { name: 'scheduled_date', type: 'string', isIndexed: true },
        { name: 'start_time', type: 'string' },
        { name: 'end_time', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'actual_check_in', type: 'string', isOptional: true },
        { name: 'actual_check_out', type: 'string', isOptional: true },
        { name: 'check_in_latitude', type: 'number', isOptional: true },
        { name: 'check_in_longitude', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'assignment_tasks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'assignment_id', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string' },
        { name: 'task_name', type: 'string' },
        { name: 'task_icon', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'completed_at', type: 'string', isOptional: true },
        { name: 'skip_reason', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'observations',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'assignment_id', type: 'string', isIndexed: true },
        { name: 'elder_id', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'mood_level', type: 'number', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'local_updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'table_name', type: 'string' },
        { name: 'operation', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'data', type: 'string' }, // JSON stringified
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'retry_count', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'elders_cache',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'photo_url', type: 'string', isOptional: true },
        { name: 'address', type: 'string' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'cached_at', type: 'number' },
      ],
    }),
  ],
});
```

### Step 2: Database Models

```typescript
// lib/database/models/Assignment.ts
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export default class Assignment extends Model {
  static table = 'assignments';

  static associations = {
    assignment_tasks: { type: 'has_many', foreignKey: 'assignment_id' },
    observations: { type: 'has_many', foreignKey: 'assignment_id' },
  };

  @field('server_id') serverId!: string;
  @field('elder_id') elderId!: string;
  @field('scheduled_date') scheduledDate!: string;
  @field('start_time') startTime!: string;
  @field('end_time') endTime!: string;
  @field('status') status!: string;
  @field('actual_check_in') actualCheckIn?: string;
  @field('actual_check_out') actualCheckOut?: string;
  @field('check_in_latitude') checkInLatitude?: number;
  @field('check_in_longitude') checkInLongitude?: number;
  @field('synced') synced!: boolean;
  @field('local_updated_at') localUpdatedAt!: number;

  @children('assignment_tasks') tasks: any;
  @children('observations') observations: any;

  async markCheckIn(latitude: number, longitude: number) {
    await this.update((record) => {
      record.actualCheckIn = new Date().toISOString();
      record.checkInLatitude = latitude;
      record.checkInLongitude = longitude;
      record.status = 'checked_in';
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  async markCheckOut(latitude: number, longitude: number) {
    await this.update((record) => {
      record.actualCheckOut = new Date().toISOString();
      record.status = 'completed';
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }
}

// lib/database/models/AssignmentTask.ts
export default class AssignmentTask extends Model {
  static table = 'assignment_tasks';

  @field('server_id') serverId!: string;
  @field('assignment_id') assignmentId!: string;
  @field('task_id') taskId!: string;
  @field('task_name') taskName!: string;
  @field('task_icon') taskIcon!: string;
  @field('status') status!: string;
  @field('completed_at') completedAt?: string;
  @field('skip_reason') skipReason?: string;
  @field('synced') synced!: boolean;
  @field('local_updated_at') localUpdatedAt!: number;

  async markCompleted() {
    await this.update((record) => {
      record.status = 'completed';
      record.completedAt = new Date().toISOString();
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }

  async markSkipped(reason: string) {
    await this.update((record) => {
      record.status = 'skipped';
      record.skipReason = reason;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  }
}
```

### Step 3: Connectivity Monitor

```typescript
// lib/connectivity/NetInfoMonitor.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState, useCallback } from 'react';

interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string | null;
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? false,
        connectionType: netState.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}

// Higher-level hook for sync decisions
export function useCanSync() {
  const { isConnected, isInternetReachable } = useConnectivity();
  return isConnected && isInternetReachable;
}
```

### Step 4: Sync Queue Manager

```typescript
// lib/sync/SyncQueueManager.ts
import { database } from '../database';
import { supabase } from '../supabase';

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // Exponential backoff

export class SyncQueueManager {
  private isSyncing = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  async addToQueue(
    tableName: string,
    operation: 'create' | 'update' | 'delete',
    recordId: string,
    data: Record<string, any>
  ) {
    await database.write(async () => {
      const syncQueue = database.get('sync_queue');
      await syncQueue.create((record: any) => {
        record.tableName = tableName;
        record.operation = operation;
        record.recordId = recordId;
        record.data = JSON.stringify(data);
        record.status = 'pending';
        record.retryCount = 0;
        record.createdAt = Date.now();
      });
    });

    this.notifyListeners();
  }

  async processQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notifyListeners();

    try {
      const syncQueue = database.get('sync_queue');
      const pendingItems = await syncQueue
        .query(Q.where('status', 'pending'))
        .fetch();

      for (const item of pendingItems) {
        await this.processItem(item);
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processItem(item: any) {
    const { tableName, operation, recordId, data } = item;
    const parsedData = JSON.parse(data);

    try {
      await item.update((record: any) => {
        record.status = 'syncing';
      });

      // Map local table to Supabase table
      const supabaseTable = this.mapTableName(tableName);

      switch (operation) {
        case 'create':
          await supabase.from(supabaseTable).insert(parsedData);
          break;
        case 'update':
          await supabase
            .from(supabaseTable)
            .update(parsedData)
            .eq('id', recordId);
          break;
        case 'delete':
          await supabase.from(supabaseTable).delete().eq('id', recordId);
          break;
      }

      // Mark as completed
      await item.update((record: any) => {
        record.status = 'completed';
      });

      // Mark local record as synced
      await this.markRecordSynced(tableName, recordId);
    } catch (error: any) {
      const newRetryCount = item.retryCount + 1;

      await item.update((record: any) => {
        record.status = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';
        record.retryCount = newRetryCount;
        record.lastError = error.message;
      });

      // Schedule retry if not max retries
      if (newRetryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[newRetryCount - 1] || RETRY_DELAYS[4];
        setTimeout(() => this.processQueue(), delay);
      }
    }
  }

  private mapTableName(localTable: string): string {
    const mapping: Record<string, string> = {
      assignments: 'assignments',
      assignment_tasks: 'assignment_tasks',
      observations: 'observations',
    };
    return mapping[localTable] || localTable;
  }

  private async markRecordSynced(tableName: string, recordId: string) {
    const collection = database.get(tableName);
    const record = await collection.find(recordId);
    await record.update((r: any) => {
      r.synced = true;
    });
  }

  async getPendingCount(): Promise<number> {
    const syncQueue = database.get('sync_queue');
    const pending = await syncQueue
      .query(Q.where('status', Q.oneOf(['pending', 'syncing'])))
      .fetchCount();
    return pending;
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const pendingCount = await this.getPendingCount();
    const status: SyncStatus = {
      isOnline: true, // Should check actual connectivity
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncAt: Date.now(),
      lastError: null,
    };
    this.listeners.forEach((listener) => listener(status));
  }
}

export const syncQueueManager = new SyncQueueManager();
```

### Step 5: Offline-First Data Operations

```typescript
// lib/sync/offlineOperations.ts
import { database } from '../database';
import { syncQueueManager } from './SyncQueueManager';

// Check-in with offline support
export async function offlineCheckIn(
  assignmentId: string,
  latitude: number,
  longitude: number
) {
  // Update local database immediately
  const assignment = await database.get('assignments').find(assignmentId);
  await assignment.markCheckIn(latitude, longitude);

  // Queue for sync
  await syncQueueManager.addToQueue('assignments', 'update', assignment.serverId, {
    id: assignment.serverId,
    actual_check_in: assignment.actualCheckIn,
    check_in_latitude: latitude,
    check_in_longitude: longitude,
    status: 'checked_in',
  });

  return assignment;
}

// Complete task with offline support
export async function offlineCompleteTask(taskId: string) {
  const task = await database.get('assignment_tasks').find(taskId);
  await task.markCompleted();

  await syncQueueManager.addToQueue('assignment_tasks', 'update', task.serverId, {
    id: task.serverId,
    status: 'completed',
    completed_at: task.completedAt,
  });

  return task;
}

// Skip task with offline support
export async function offlineSkipTask(taskId: string, reason: string) {
  const task = await database.get('assignment_tasks').find(taskId);
  await task.markSkipped(reason);

  await syncQueueManager.addToQueue('assignment_tasks', 'update', task.serverId, {
    id: task.serverId,
    status: 'skipped',
    skip_reason: reason,
  });

  return task;
}

// Create observation with offline support
export async function offlineCreateObservation(
  assignmentId: string,
  elderId: string,
  data: { category: string; moodLevel?: number; note?: string }
) {
  const localId = `local_${Date.now()}`;

  await database.write(async () => {
    const observations = database.get('observations');
    await observations.create((record: any) => {
      record._raw.id = localId;
      record.assignmentId = assignmentId;
      record.elderId = elderId;
      record.category = data.category;
      record.moodLevel = data.moodLevel;
      record.note = data.note;
      record.synced = false;
      record.localUpdatedAt = Date.now();
    });
  });

  await syncQueueManager.addToQueue('observations', 'create', localId, {
    assignment_id: assignmentId,
    elder_id: elderId,
    category: data.category,
    mood_level: data.moodLevel,
    note: data.note,
    created_at: new Date().toISOString(),
  });
}
```

### Step 6: Sync Status UI Component

```typescript
// components/sync/SyncStatusBar.tsx
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useConnectivity } from '@/lib/connectivity/NetInfoMonitor';
import { syncQueueManager } from '@/lib/sync/SyncQueueManager';
import { CloudIcon, CloudOffIcon, RefreshIcon } from '@/components/icons';

export function SyncStatusBar() {
  const { isConnected, isInternetReachable } = useConnectivity();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const isOnline = isConnected && isInternetReachable;

  useEffect(() => {
    const unsubscribe = syncQueueManager.subscribe((status) => {
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing]);

  // Trigger sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncQueueManager.processQueue();
    }
  }, [isOnline, pendingCount]);

  if (isOnline && pendingCount === 0) {
    return null; // Hide when everything is synced
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      {!isOnline ? (
        <>
          <CloudOffIcon size={16} color="#FFFFFF" />
          <Text style={styles.text}>
            Offline • {pendingCount} changes pending
          </Text>
        </>
      ) : isSyncing ? (
        <>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshIcon size={16} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.text}>Syncing {pendingCount} changes...</Text>
        </>
      ) : (
        <>
          <CloudIcon size={16} color="#FFFFFF" />
          <Text style={styles.text}>{pendingCount} changes pending</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F59E0B',
    gap: 8,
  },
  offline: {
    backgroundColor: '#EF4444',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
```

### Step 7: Data Pre-fetching for Offline

```typescript
// lib/sync/prefetch.ts
import { database } from '../database';
import { supabase } from '../supabase';
import { format, addDays } from 'date-fns';

export async function prefetchCaregiverData(caregiverId: string) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  // Fetch upcoming assignments
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      elder:elders (
        id,
        first_name,
        last_name,
        photo_url,
        address,
        latitude,
        longitude
      ),
      assignment_tasks (
        *,
        task:task_library (name, icon)
      )
    `)
    .eq('caregiver_id', caregiverId)
    .gte('scheduled_date', today)
    .lte('scheduled_date', nextWeek);

  if (!assignments) return;

  await database.write(async () => {
    const assignmentsCollection = database.get('assignments');
    const tasksCollection = database.get('assignment_tasks');
    const eldersCollection = database.get('elders_cache');

    for (const assignment of assignments) {
      // Cache elder
      const existingElder = await eldersCollection
        .query(Q.where('server_id', assignment.elder.id))
        .fetch();

      if (existingElder.length === 0) {
        await eldersCollection.create((record: any) => {
          record.serverId = assignment.elder.id;
          record.firstName = assignment.elder.first_name;
          record.lastName = assignment.elder.last_name;
          record.photoUrl = assignment.elder.photo_url;
          record.address = assignment.elder.address;
          record.latitude = assignment.elder.latitude;
          record.longitude = assignment.elder.longitude;
          record.cachedAt = Date.now();
        });
      }

      // Cache assignment
      const existingAssignment = await assignmentsCollection
        .query(Q.where('server_id', assignment.id))
        .fetch();

      let localAssignmentId: string;

      if (existingAssignment.length === 0) {
        const newAssignment = await assignmentsCollection.create((record: any) => {
          record.serverId = assignment.id;
          record.elderId = assignment.elder_id;
          record.scheduledDate = assignment.scheduled_date;
          record.startTime = assignment.start_time;
          record.endTime = assignment.end_time;
          record.status = assignment.status;
          record.actualCheckIn = assignment.actual_check_in;
          record.actualCheckOut = assignment.actual_check_out;
          record.synced = true;
          record.localUpdatedAt = Date.now();
        });
        localAssignmentId = newAssignment.id;
      } else {
        localAssignmentId = existingAssignment[0].id;
      }

      // Cache tasks
      for (const task of assignment.assignment_tasks) {
        const existingTask = await tasksCollection
          .query(Q.where('server_id', task.id))
          .fetch();

        if (existingTask.length === 0) {
          await tasksCollection.create((record: any) => {
            record.serverId = task.id;
            record.assignmentId = localAssignmentId;
            record.taskId = task.task_id;
            record.taskName = task.task.name;
            record.taskIcon = task.task.icon;
            record.status = task.status;
            record.completedAt = task.completed_at;
            record.skipReason = task.skip_reason;
            record.synced = true;
            record.localUpdatedAt = Date.now();
          });
        }
      }
    }
  });

  console.log(`Prefetched ${assignments.length} assignments for offline use`);
}
```

## Troubleshooting

### Data not syncing
**Cause:** Queue stuck or network issues
**Solution:** Check sync queue status, verify internet connectivity, check for failed items

### Duplicate records after sync
**Cause:** Server ID not properly matched
**Solution:** Always use `server_id` for matching, implement proper upsert logic

### Performance issues with large queues
**Cause:** Too many pending items
**Solution:** Process in batches, implement queue cleanup for old completed items
