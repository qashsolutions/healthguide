// HealthGuide Default Tasks
// Per healthguide-agency/task-library skill

export type TaskCategory =
  | 'companionship'
  | 'household'
  | 'nutrition'
  | 'mobility'
  | 'personal_care'
  | 'health'
  | 'errands'
  | 'other';

export interface TaskDefinitionTemplate {
  name: string;
  description: string;
  category: TaskCategory;
  icon_name: string;
  requires_license: boolean;
  estimated_duration_minutes?: number;
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_TASKS: TaskDefinitionTemplate[] = [
  // Companionship
  {
    name: 'Companionship',
    description: 'Provide friendly conversation and emotional support',
    category: 'companionship',
    icon_name: 'companionship',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 1,
  },
  {
    name: 'Accompany to Appointments',
    description: 'Escort to medical appointments or social activities',
    category: 'companionship',
    icon_name: 'car',
    requires_license: false,
    estimated_duration_minutes: 120,
    is_active: true,
    sort_order: 2,
  },

  // Household
  {
    name: 'Light Housekeeping',
    description: 'Dusting, vacuuming, tidying up living spaces',
    category: 'household',
    icon_name: 'cleaning',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 10,
  },
  {
    name: 'Laundry',
    description: 'Washing, drying, folding clothes',
    category: 'household',
    icon_name: 'laundry',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 11,
  },
  {
    name: 'Organize Living Space',
    description: 'Help organize closets, drawers, or rooms',
    category: 'household',
    icon_name: 'organize',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 12,
  },

  // Nutrition
  {
    name: 'Meal Preparation',
    description: 'Prepare nutritious meals according to dietary needs',
    category: 'nutrition',
    icon_name: 'meal',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 20,
  },
  {
    name: 'Feeding Assistance',
    description: 'Help with eating if needed',
    category: 'nutrition',
    icon_name: 'feeding',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 21,
  },
  {
    name: 'Grocery Shopping',
    description: 'Purchase groceries from a provided list',
    category: 'nutrition',
    icon_name: 'shopping',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 22,
  },

  // Mobility
  {
    name: 'Mobility Assistance',
    description: 'Help with walking, transferring, or using mobility aids',
    category: 'mobility',
    icon_name: 'mobility',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 30,
  },
  {
    name: 'Exercise Assistance',
    description: 'Assist with prescribed exercises or light stretching',
    category: 'mobility',
    icon_name: 'exercise',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 31,
  },

  // Personal Care
  {
    name: 'Bathing Assistance',
    description: 'Help with bathing or showering',
    category: 'personal_care',
    icon_name: 'bathing',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 40,
  },
  {
    name: 'Dressing Assistance',
    description: 'Help with getting dressed',
    category: 'personal_care',
    icon_name: 'dressing',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 41,
  },
  {
    name: 'Grooming',
    description: 'Hair care, shaving, nail care',
    category: 'personal_care',
    icon_name: 'grooming',
    requires_license: false,
    estimated_duration_minutes: 20,
    is_active: true,
    sort_order: 42,
  },
  {
    name: 'Toileting Assistance',
    description: 'Help with bathroom needs',
    category: 'personal_care',
    icon_name: 'toileting',
    requires_license: false,
    estimated_duration_minutes: 15,
    is_active: true,
    sort_order: 43,
  },

  // Health (Non-medical)
  {
    name: 'Medication Reminders',
    description: 'Remind to take medications (NOT administer)',
    category: 'health',
    icon_name: 'medication_reminder',
    requires_license: false,
    estimated_duration_minutes: 5,
    is_active: true,
    sort_order: 50,
  },
  {
    name: 'Medication Administration',
    description: 'Administer medications as prescribed',
    category: 'health',
    icon_name: 'medication',
    requires_license: true, // LICENSED ONLY
    estimated_duration_minutes: 10,
    is_active: false, // Off by default
    sort_order: 51,
  },
  {
    name: 'Vital Signs Monitoring',
    description: 'Check blood pressure, temperature, etc.',
    category: 'health',
    icon_name: 'vitals',
    requires_license: true, // LICENSED ONLY
    estimated_duration_minutes: 10,
    is_active: false,
    sort_order: 52,
  },

  // Errands
  {
    name: 'Run Errands',
    description: 'Pick up prescriptions, mail packages, etc.',
    category: 'errands',
    icon_name: 'errands',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 60,
  },
  {
    name: 'Pet Care',
    description: 'Feed pets, walk dogs, clean litter box',
    category: 'errands',
    icon_name: 'pet',
    requires_license: false,
    estimated_duration_minutes: 20,
    is_active: true,
    sort_order: 61,
  },
];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  companionship: 'Companionship',
  household: 'Household',
  nutrition: 'Nutrition & Meals',
  mobility: 'Mobility',
  personal_care: 'Personal Care',
  health: 'Health',
  errands: 'Errands',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  companionship: 'heart',
  household: 'home',
  nutrition: 'meal',
  mobility: 'mobility',
  personal_care: 'person',
  health: 'health',
  errands: 'car',
  other: 'more',
};
