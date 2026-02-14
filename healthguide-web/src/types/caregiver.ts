/**
 * Public caregiver result — returned by public-caregiver-search edge function.
 * Contains ONLY safe, non-PII columns.
 */
export interface PublicCaregiverResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  zip_prefix: string;       // 3-digit zip prefix (e.g., "782")
  capabilities: string[];
  npi_verified: boolean;
  bio: string | null;
  rating_count: number;
  positive_count: number;
  created_at: string;
}

export interface SearchResponse {
  success: boolean;
  caregivers: PublicCaregiverResult[];
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
  error?: string;
}

/** Capability labels for display */
export const CAPABILITY_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  meal_preparation: 'Meal Prep',
  light_housekeeping: 'Light Housekeeping',
  errands: 'Errands & Shopping',
  mobility_assistance: 'Mobility Assist',
  personal_care: 'Personal Care',
  medication_reminders: 'Med Reminders',
  medication_administration: 'Med Admin',
};

/** All available capabilities */
export const ALL_CAPABILITIES = [
  'companionship',
  'meal_preparation',
  'light_housekeeping',
  'errands',
  'mobility_assistance',
  'personal_care',
  'medication_reminders',
  'medication_administration',
] as const;
