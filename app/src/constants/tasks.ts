// HealthGuide Allowed Tasks
// Companionship pivot: restrict platform to 3 non-medical task categories

export const ALLOWED_TASKS = [
  {
    id: 'companionship' as const,
    label: 'Companionship',
    icon: 'chatbubble-ellipses-outline',
    description: 'Conversation, games, walks, watching TV, reading',
  },
  {
    id: 'light_cleaning' as const,
    label: 'Light Cleaning',
    icon: 'home-outline',
    description: 'Dishes, tidying, laundry, taking out trash',
  },
  {
    id: 'groceries' as const,
    label: 'Groceries & Errands',
    icon: 'cart-outline',
    description: 'Grocery shopping, pharmacy pickup, drive to store/appointment',
  },
] as const;

export type AllowedTaskId = (typeof ALLOWED_TASKS)[number]['id'];

// Maps AllowedTaskId to the task_library.name stored in the DB
export const TASK_DB_NAMES: Record<AllowedTaskId, string> = {
  companionship: 'Companionship',
  light_cleaning: 'Light Cleaning',
  groceries: 'Groceries & Errands',
};

// Maps AllowedTaskId to task_library.category
export const TASK_CATEGORIES: Record<AllowedTaskId, string> = {
  companionship: 'companionship',
  light_cleaning: 'housekeeping',
  groceries: 'errands',
};

export const SCOPE_ALERT_TEXT = `HealthGuide companions provide companionship, light cleaning, and grocery help ONLY.

Do NOT attempt:
\u2022 Toileting or bathing
\u2022 Dressing or feeding
\u2022 Medication or supplements
\u2022 Wound care or transfers
\u2022 Any medical activity

By continuing, you accept these terms.`;

// Maps old caregiver_profiles.capabilities values to new AllowedTaskId
export const CAPABILITIES_MAP: Record<string, AllowedTaskId> = {
  companionship: 'companionship',
  light_housekeeping: 'light_cleaning',
  light_cleaning: 'light_cleaning',
  errands: 'groceries',
  groceries: 'groceries',
};

// Category labels for the 3 allowed categories
export const ALLOWED_CATEGORY_LABELS: Record<string, string> = {
  companionship: 'Companionship',
  housekeeping: 'Housekeeping',
  errands: 'Errands & Transport',
};
