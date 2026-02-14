// HealthGuide Visit Types
// Per healthguide-caregiver/evv and task-completion skills

export type VisitStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'checked_out'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type CheckInMethod = 'gps' | 'qr_code';

export interface Visit {
  id: string;
  agency_id: string;
  caregiver_id: string;
  careseeker_id: string;

  // Scheduling
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;

  // Status
  status: VisitStatus;

  // EVV Data
  check_in_method?: CheckInMethod;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;

  // Relations (populated)
  careseeker?: Careseeker;
  caregiver?: Caregiver;
  tasks?: VisitTask[];
  observations?: Observation[];

  created_at: string;
  updated_at: string;
}

export interface Careseeker {
  id: string;
  full_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  notes?: string;
  family_contacts?: FamilyContact[];
}

export interface Caregiver {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
}

export interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  receives_notifications: boolean;
}

export type TaskStatus = 'pending' | 'completed' | 'skipped';

export interface VisitTask {
  id: string;
  visit_id: string;
  task_id: string;
  status: TaskStatus;
  completed_at?: string;
  skipped_reason?: string;
  notes?: string;

  // From task library
  task?: Task;
}

export interface Task {
  id: string;
  agency_id: string;
  name: string;
  category: TaskCategory;
  icon: string;
  description?: string;
  estimated_minutes?: number;
}

export type TaskCategory =
  | 'companionship'
  | 'meal_prep'
  | 'medication'
  | 'personal_care'
  | 'housekeeping'
  | 'transportation'
  | 'errands'
  | 'mobility'
  | 'vitals'
  | 'laundry'
  | 'exercise'
  | 'other';

export interface Observation {
  id: string;
  visit_id: string;
  type: ObservationType;
  content: string;
  mood_rating?: number; // 1-5
  audio_url?: string;
  created_at: string;
}

export type ObservationType =
  | 'general'
  | 'mood'
  | 'health_concern'
  | 'medication'
  | 'behavior'
  | 'family_communication';

// Task category to icon mapping
export const TASK_ICONS: Record<TaskCategory, string> = {
  companionship: 'companionship',
  meal_prep: 'meal',
  medication: 'medication',
  personal_care: 'personalCare',
  housekeeping: 'cleaning',
  transportation: 'transport',
  errands: 'errands',
  mobility: 'mobility',
  vitals: 'vitals',
  laundry: 'laundry',
  exercise: 'exercise',
  other: 'check',
};
