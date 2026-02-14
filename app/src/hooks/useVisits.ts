// HealthGuide Visit Hooks
// Per healthguide-caregiver skills - API hooks for visit data

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Visit, VisitTask, TaskStatus, CheckInMethod } from '@/types/visit';

// ============================================
// Types
// ============================================

interface UseVisitsOptions {
  caregiverId?: string;
  elderId?: string;
  date?: string; // YYYY-MM-DD
  status?: string;
}

interface UseVisitResult {
  visit: Visit | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseVisitsResult {
  visits: Visit[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================
// Hook: Fetch single visit with tasks
// ============================================

export function useVisit(visitId: string | undefined): UseVisitResult {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVisit = useCallback(async () => {
    if (!visitId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('visits')
        .select(`
          *,
          careseeker:elders(
            id,
            first_name,
            last_name,
            address,
            apartment,
            city,
            state,
            zip_code,
            latitude,
            longitude,
            phone,
            special_instructions
          ),
          caregiver:user_profiles(
            id,
            first_name,
            last_name,
            phone
          ),
          tasks:visit_tasks(
            id,
            task_id,
            status,
            completed_at,
            skipped_reason,
            notes,
            sort_order,
            task:task_library(
              id,
              name,
              description,
              category,
              icon,
              estimated_duration_minutes
            )
          )
        `)
        .eq('id', visitId)
        .single();

      if (queryError) throw queryError;

      // Transform the data to match our Visit type
      const transformedVisit: Visit = {
        ...data,
        careseeker: data.careseeker ? {
          id: data.careseeker.id,
          full_name: `${data.careseeker.first_name} ${data.careseeker.last_name}`,
          address: [
            data.careseeker.address,
            data.careseeker.apartment,
            `${data.careseeker.city}, ${data.careseeker.state} ${data.careseeker.zip_code}`,
          ].filter(Boolean).join(', '),
          latitude: data.careseeker.latitude,
          longitude: data.careseeker.longitude,
          phone: data.careseeker.phone,
          notes: data.careseeker.special_instructions,
        } : undefined,
        caregiver: data.caregiver ? {
          id: data.caregiver.id,
          full_name: `${data.caregiver.first_name} ${data.caregiver.last_name}`,
          phone: data.caregiver.phone,
        } : undefined,
        tasks: data.tasks?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
      };

      setVisit(transformedVisit);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch visit'));
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    fetchVisit();
  }, [fetchVisit]);

  return { visit, loading, error, refetch: fetchVisit };
}

// ============================================
// Hook: Fetch today's visits for caregiver
// ============================================

export function useTodayVisits(caregiverId?: string): UseVisitsResult {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('visits')
        .select(`
          *,
          careseeker:elders(
            id,
            first_name,
            last_name,
            address,
            city,
            state
          ),
          tasks:visit_tasks(id, status)
        `)
        .eq('scheduled_date', today)
        .order('scheduled_start', { ascending: true });

      if (caregiverId) {
        query = query.eq('caregiver_id', caregiverId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const transformedVisits: Visit[] = (data || []).map((visit: any) => ({
        ...visit,
        careseeker: visit.careseeker ? {
          id: visit.careseeker.id,
          full_name: `${visit.careseeker.first_name} ${visit.careseeker.last_name}`,
          address: `${visit.careseeker.address}, ${visit.careseeker.city}, ${visit.careseeker.state}`,
          latitude: 0,
          longitude: 0,
        } : undefined,
        tasks: visit.tasks || [],
      }));

      setVisits(transformedVisits);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch visits'));
    } finally {
      setLoading(false);
    }
  }, [caregiverId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return { visits, loading, error, refetch: fetchVisits };
}

// ============================================
// Mutations: Check-in
// ============================================

export interface CheckInData {
  visitId: string;
  latitude?: number;
  longitude?: number;
  method: CheckInMethod;
}

export async function checkIn(data: CheckInData): Promise<Visit | null> {
  const { data: visit, error } = await supabase
    .from('visits')
    .update({
      status: 'checked_in',
      actual_start: new Date().toISOString(),
      check_in_latitude: data.latitude,
      check_in_longitude: data.longitude,
      check_in_method: data.method,
    })
    .eq('id', data.visitId)
    .select()
    .single();

  if (error) throw error;

  // Trigger notification via Edge Function
  try {
    await supabase.functions.invoke('notify-check-in', {
      body: { visit_id: data.visitId, method: data.method },
    });
  } catch (notifyError) {
    console.warn('Failed to send check-in notification:', notifyError);
  }

  return visit;
}

// ============================================
// Mutations: Check-out
// ============================================

export interface CheckOutData {
  visitId: string;
  latitude?: number;
  longitude?: number;
  observations?: any[];
  voiceNotes?: string[];
}

export async function checkOut(data: CheckOutData): Promise<Visit | null> {
  const { data: visit, error } = await supabase
    .from('visits')
    .update({
      status: 'checked_out',
      actual_end: new Date().toISOString(),
      check_out_latitude: data.latitude,
      check_out_longitude: data.longitude,
      observations: data.observations || [],
      voice_notes: data.voiceNotes || [],
    })
    .eq('id', data.visitId)
    .select()
    .single();

  if (error) throw error;

  // Trigger notification via Edge Function
  try {
    await supabase.functions.invoke('notify-check-out', {
      body: { visit_id: data.visitId },
    });
  } catch (notifyError) {
    console.warn('Failed to send check-out notification:', notifyError);
  }

  return visit;
}

// ============================================
// Mutations: Update task status
// ============================================

export interface UpdateTaskStatusData {
  taskId: string;
  status: TaskStatus;
  skippedReason?: string;
  notes?: string;
}

export async function updateTaskStatus(data: UpdateTaskStatusData): Promise<VisitTask | null> {
  const updates: Record<string, any> = {
    status: data.status,
  };

  if (data.status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  if (data.status === 'skipped' && data.skippedReason) {
    updates.skipped_reason = data.skippedReason;
  }

  if (data.notes) {
    updates.notes = data.notes;
  }

  const { data: task, error } = await supabase
    .from('visit_tasks')
    .update(updates)
    .eq('id', data.taskId)
    .select()
    .single();

  if (error) throw error;

  return task;
}

// ============================================
// Mutations: Save observations
// ============================================

export interface SaveObservationsData {
  visitId: string;
  observations: Array<{
    category: string;
    value: string;
    icon: string;
  }>;
  voiceNotes?: string[];
}

export async function saveObservations(data: SaveObservationsData): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .update({
      observations: data.observations,
      voice_notes: data.voiceNotes || [],
    })
    .eq('id', data.visitId);

  if (error) throw error;
}

// ============================================
// Mutations: Report task decline
// ============================================

export interface TaskDeclineData {
  visitId: string;
  taskDescription: string;
}

export async function reportTaskDecline(data: TaskDeclineData): Promise<void> {
  const { error } = await supabase
    .from('task_declines')
    .insert({
      visit_id: data.visitId,
      task_description: data.taskDescription,
      declined_at: new Date().toISOString(),
    });

  if (error) throw error;

  // Notify agency via Edge Function
  try {
    await supabase.functions.invoke('notify-task-declined', {
      body: { visit_id: data.visitId, task_description: data.taskDescription },
    });
  } catch (notifyError) {
    console.warn('Failed to send task decline notification:', notifyError);
  }
}
