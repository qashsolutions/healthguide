// HealthGuide Default Tasks
// Non-critical services only — caregivers are NOT verified

export type TaskCategory =
  | 'companionship'
  | 'household'
  | 'nutrition'
  | 'mobility'
  | 'personal_care'
  | 'errands'
  | 'childcare'
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
    description: 'Escort to appointments or social activities',
    category: 'companionship',
    icon_name: 'car',
    requires_license: false,
    estimated_duration_minutes: 120,
    is_active: true,
    sort_order: 2,
  },

  // Household
  {
    name: 'House Cleaning',
    description: 'Dusting, vacuuming, mopping, tidying up living spaces',
    category: 'household',
    icon_name: 'cleaning',
    requires_license: false,
    estimated_duration_minutes: 60,
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
  {
    name: 'Lawn & Yard Care',
    description: 'Mowing, raking, light gardening, watering plants',
    category: 'household',
    icon_name: 'garden',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 13,
  },

  // Nutrition & Meals
  {
    name: 'Meal Preparation',
    description: 'Prepare nutritious meals according to dietary preferences',
    category: 'nutrition',
    icon_name: 'meal',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 20,
  },
  {
    name: 'Grocery Shopping & Errands',
    description: 'Purchase groceries and household essentials',
    category: 'nutrition',
    icon_name: 'shopping',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 21,
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
    description: 'Assist with light stretching or walking exercises',
    category: 'mobility',
    icon_name: 'exercise',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 31,
  },

  // Personal Care
  {
    name: 'Personal Care',
    description: 'Assist with bathing, grooming, and dressing',
    category: 'personal_care',
    icon_name: 'person',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 40,
  },

  // Errands & Transportation
  {
    name: 'Transportation & Driving',
    description: 'Drive to appointments, shopping, or social events',
    category: 'errands',
    icon_name: 'car',
    requires_license: false,
    estimated_duration_minutes: 60,
    is_active: true,
    sort_order: 50,
  },
  {
    name: 'Run Errands',
    description: 'Pick up prescriptions, mail packages, etc.',
    category: 'errands',
    icon_name: 'errands',
    requires_license: false,
    estimated_duration_minutes: 45,
    is_active: true,
    sort_order: 51,
  },
  {
    name: 'Pet Care',
    description: 'Feed pets, walk dogs, clean litter box',
    category: 'errands',
    icon_name: 'pet',
    requires_license: false,
    estimated_duration_minutes: 20,
    is_active: true,
    sort_order: 52,
  },
  {
    name: 'Tech Help',
    description: 'Help with phones, tablets, computers, and smart devices',
    category: 'errands',
    icon_name: 'tech',
    requires_license: false,
    estimated_duration_minutes: 30,
    is_active: true,
    sort_order: 53,
  },

  // Childcare & Education
  {
    name: 'Nanny / Childcare',
    description: 'Supervise and care for children in the home',
    category: 'childcare',
    icon_name: 'child',
    requires_license: false,
    estimated_duration_minutes: 120,
    is_active: true,
    sort_order: 60,
  },
  {
    name: 'Tutoring',
    description: 'Help with homework, reading, or learning activities',
    category: 'childcare',
    icon_name: 'book',
    requires_license: false,
    estimated_duration_minutes: 60,
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
  errands: 'Errands & Transport',
  childcare: 'Childcare & Education',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  companionship: 'heart',
  household: 'home',
  nutrition: 'meal',
  mobility: 'mobility',
  personal_care: 'person',
  errands: 'car',
  childcare: 'child',
  other: 'more',
};
