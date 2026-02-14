// HealthGuide Task Icon Mapper
// Per healthguide-caregiver/task-completion skill - Maps icon names to components

import {
  CompanionshipIcon,
  MealIcon,
  CleaningIcon,
  ErrandsIcon,
  MobilityIcon,
  MedicationIcon,
  PersonalCareIcon,
  TransportIcon,
  VitalsIcon,
  LaundryIcon,
  ReadingIcon,
  ExerciseIcon,
} from './TaskIcons';
import { CheckIcon } from './index';
import { TaskIconProps } from './TaskIcons';

type TaskIconComponent = React.ComponentType<TaskIconProps>;

const TASK_ICON_MAP: Record<string, TaskIconComponent> = {
  // Task categories
  companionship: CompanionshipIcon,
  meal: MealIcon,
  meal_prep: MealIcon,
  cleaning: CleaningIcon,
  housekeeping: CleaningIcon,
  errands: ErrandsIcon,
  mobility: MobilityIcon,
  medication: MedicationIcon,
  medication_reminder: MedicationIcon,
  personalCare: PersonalCareIcon,
  personal_care: PersonalCareIcon,
  bathing: PersonalCareIcon,
  grooming: PersonalCareIcon,
  transport: TransportIcon,
  transportation: TransportIcon,
  vitals: VitalsIcon,
  laundry: LaundryIcon,
  reading: ReadingIcon,
  exercise: ExerciseIcon,

  // Default
  check: CheckIcon,
  default: CheckIcon,
};

/**
 * Get the icon component for a task based on its icon name
 * @param iconName - The name of the icon from the task definition
 * @returns The corresponding icon component
 */
export function getTaskIcon(iconName: string): TaskIconComponent {
  return TASK_ICON_MAP[iconName] || TASK_ICON_MAP.default;
}

/**
 * Get all available task icon names
 * @returns Array of available icon names
 */
export function getAvailableTaskIcons(): string[] {
  return Object.keys(TASK_ICON_MAP);
}
