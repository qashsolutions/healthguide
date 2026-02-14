// HealthGuide Task Category Icons
// Per healthguide-core/theming skill - Large icons for caregiver task completion

import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '@/theme/colors';

export interface TaskIconProps {
  size?: number;
  color?: string;
}

// ==========================================
// CARE TASK ICONS (48x48 default for caregiver UI)
// ==========================================

// Companionship - Two people together
export function CompanionshipIcon({ size = 48, color = colors.primary[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="18" cy="16" r="6" stroke={color} strokeWidth={2.5} />
      <Circle cx="30" cy="16" r="6" stroke={color} strokeWidth={2.5} />
      <Path
        d="M8 40V36C8 32.69 10.69 30 14 30H22C25.31 30 28 32.69 28 36V40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M28 40V36C28 32.69 30.69 30 34 30H34C37.31 30 40 32.69 40 36V40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Meal Preparation - Plate with steam
export function MealIcon({ size = 48, color = colors.warning[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="28" r="14" stroke={color} strokeWidth={2.5} />
      <Path d="M24 8V14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M17 10L19 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M31 10L29 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Light Housekeeping - Broom
export function CleaningIcon({ size = 48, color = colors.success[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M12 40L16 20H32L36 40"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M24 8V20" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M18 12H30" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Errands - Shopping bag
export function ErrandsIcon({ size = 48, color = '#8B5CF6' }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="8" y="16" width="32" height="24" rx="3" stroke={color} strokeWidth={2.5} />
      <Path
        d="M16 16V12C16 9.79 17.79 8 20 8H28C30.21 8 32 9.79 32 12V16"
        stroke={color}
        strokeWidth={2.5}
      />
      <Circle cx="18" cy="28" r="3" fill={color} />
      <Circle cx="30" cy="28" r="3" fill={color} />
    </Svg>
  );
}

// Mobility Assistance - Person with support
export function MobilityIcon({ size = 48, color = '#EC4899' }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="10" r="4" stroke={color} strokeWidth={2.5} />
      <Path
        d="M20 20H28L30 32H36"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="30" cy="38" r="4" stroke={color} strokeWidth={2.5} />
      <Path d="M18 20V38H12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Medication Reminder - Pill bottle
export function MedicationIcon({ size = 48, color = colors.error[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="12" y="16" width="24" height="28" rx="4" stroke={color} strokeWidth={2.5} />
      <Rect x="14" y="8" width="20" height="8" rx="2" stroke={color} strokeWidth={2.5} />
      <Path d="M12 28H36" stroke={color} strokeWidth={2} />
      <Path d="M24 28V36" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Personal Care - Hygiene/Bathing
export function PersonalCareIcon({ size = 48, color = colors.primary[400] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="12" r="6" stroke={color} strokeWidth={2.5} />
      <Path
        d="M10 44V40C10 34.48 14.48 30 20 30H28C33.52 30 38 34.48 38 40V44"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path d="M16 22L18 26" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M32 22L30 26" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Transportation
export function TransportIcon({ size = 48, color = colors.primary[600] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M8 28V20C8 16.69 10.69 14 14 14H34C37.31 14 40 16.69 40 20V28"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Rect x="6" y="28" width="36" height="10" rx="2" stroke={color} strokeWidth={2.5} />
      <Circle cx="14" cy="38" r="4" stroke={color} strokeWidth={2.5} />
      <Circle cx="34" cy="38" r="4" stroke={color} strokeWidth={2.5} />
      <Path d="M16 22H32" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Vital Signs Check
export function VitalsIcon({ size = 48, color = colors.error[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 6C18.48 6 14 10.48 14 16C14 25 24 38 24 38C24 38 34 25 34 16C34 10.48 29.52 6 24 6Z"
        stroke={color}
        strokeWidth={2.5}
      />
      <Path d="M18 18H22L24 14L26 22L28 18H30" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Laundry
export function LaundryIcon({ size = 48, color = colors.primary[500] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect x="8" y="6" width="32" height="36" rx="4" stroke={color} strokeWidth={2.5} />
      <Circle cx="24" cy="28" r="10" stroke={color} strokeWidth={2.5} />
      <Circle cx="24" cy="28" r="4" stroke={color} strokeWidth={2} />
      <Circle cx="16" cy="12" r="2" fill={color} />
      <Circle cx="24" cy="12" r="2" fill={color} />
    </Svg>
  );
}

// Reading/Entertainment
export function ReadingIcon({ size = 48, color = colors.warning[600] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M8 10V38C8 38 14 34 24 34C34 34 40 38 40 38V10C40 10 34 6 24 6C14 6 8 10 8 10Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M24 6V34" stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

// Exercise/Physical Activity
export function ExerciseIcon({ size = 48, color = colors.success[600] }: TaskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="10" r="4" stroke={color} strokeWidth={2.5} />
      <Path d="M24 14V26" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M16 20L24 26L32 20" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 26L24 26L24 38L18 44" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 26L24 26L24 38L30 44" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
