// HealthGuide Observation Icons
// Per healthguide-caregiver/observations skill - Icons for mood, appetite, mobility, activity

import React from 'react';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import { colors } from '@/theme/colors';

interface IconProps {
  size?: number;
  color?: string;
}

// ==========================================
// MOOD ICONS
// ==========================================

export function MoodHappyIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="14" r="2" fill={color} />
      <Circle cx="24" cy="14" r="2" fill={color} />
      <Path
        d="M10 22C12 26 24 26 26 22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodCalmIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="14" r="2" fill={color} />
      <Circle cx="24" cy="14" r="2" fill={color} />
      <Path
        d="M12 23C14 25 22 25 24 23"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodQuietIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="14" r="2" fill={color} />
      <Circle cx="24" cy="14" r="2" fill={color} />
      <Path d="M12 23H24" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MoodConfusedIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth={2} />
      <Path d="M10 14L15 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M26 14L21 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="16" r="2" fill={color} />
      <Circle cx="24" cy="16" r="2" fill={color} />
      <Path
        d="M12 24C14 22 22 26 24 24"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoodAnxiousIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="18" r="15" stroke={color} strokeWidth={2} />
      <Path d="M10 12L15 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M26 12L21 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="2" fill={color} />
      <Circle cx="24" cy="17" r="2" fill={color} />
      <Path
        d="M12 26C14 22 22 22 24 26"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ==========================================
// APPETITE ICONS
// ==========================================

export function AppetiteGoodIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="20" r="12" stroke={color} strokeWidth={2} />
      <Path d="M18 4V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 5V8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M24 5V8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Full plate - multiple food lines */}
      <Path d="M11 17H25" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 20H24" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M11 23H25" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function AppetiteSomeIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="20" r="12" stroke={color} strokeWidth={2} />
      <Path d="M18 4V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Half plate */}
      <Path d="M12 18H24" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M14 21H22" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function AppetiteLittleIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="20" r="12" stroke={color} strokeWidth={2} />
      <Path d="M18 4V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Small portion */}
      <Path d="M16 20H20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function AppetiteNoneIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="20" r="12" stroke={color} strokeWidth={2} />
      <Path d="M18 4V10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* X mark on plate */}
      <Path d="M14 16L22 24" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22 16L14 24" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ==========================================
// MOBILITY ICONS
// ==========================================

export function MobilityGoodIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path d="M18 11V20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16L18 20L24 16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 20L18 20L18 28L12 34" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 20L18 20L18 28L24 34" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MobilitySlowIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="16" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path d="M16 12V18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 16L16 18L20 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Cane */}
      <Path d="M24 14V32" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22 14H26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Slower leg position */}
      <Path d="M12 18L16 18L16 26L10 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 18L16 18L16 26L18 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MobilityHelpIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Main person */}
      <Circle cx="14" cy="8" r="3" stroke={color} strokeWidth={2} />
      <Path d="M14 11V17" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 15L14 17L18 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 17L14 17L14 24L10 30" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 17L14 17L14 24L16 30" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Helper person */}
      <Circle cx="26" cy="10" r="3" stroke={color} strokeWidth={1.5} />
      <Path d="M26 13V18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Supporting arm */}
      <Path d="M20 15L18 17" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MobilitySeatedIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path d="M18 12V18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Chair back */}
      <Path d="M10 14V26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Chair seat */}
      <Path d="M10 22H26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Chair legs */}
      <Path d="M10 26V32" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M26 26V32" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Person's legs */}
      <Path d="M18 22V28L16 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 22V28L20 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// ACTIVITY ICONS
// ==========================================

export function ActivityHighIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="6" r="4" stroke={color} strokeWidth={2} />
      {/* Running pose */}
      <Path d="M18 10V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 13L18 16L26 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 16L18 16L14 28L8 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 16L18 16L24 26L28 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Motion lines */}
      <Path d="M4 14H7" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M4 18H6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function ActivityMediumIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Circle cx="18" cy="7" r="4" stroke={color} strokeWidth={2} />
      {/* Walking pose */}
      <Path d="M18 11V18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 15L18 18L24 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 18L18 18L18 26L14 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 18L18 18L18 26L22 32" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ActivityLowIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Reclining person */}
      <Circle cx="10" cy="16" r="4" stroke={color} strokeWidth={2} />
      <Path d="M14 16H26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 16L28 24" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 16L28 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Couch/chair base */}
      <Path d="M6 24H30" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 24V28" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M28 24V28" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ActivitySleepIcon({ size = 36, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Sleeping person in bed */}
      <Circle cx="10" cy="18" r="4" stroke={color} strokeWidth={2} />
      <Path d="M14 18H28" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Bed */}
      <Rect x="4" y="22" width="28" height="4" stroke={color} strokeWidth={2} rx={1} />
      <Path d="M6 22V26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M30 22V26" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Zzz */}
      <Path d="M26 6H30L26 10H30" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 10H23L20 13H23" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// ICON MAPPING
// ==========================================

type ObservationIconComponent = React.ComponentType<IconProps>;

const OBSERVATION_ICONS: Record<string, ObservationIconComponent> = {
  // Mood
  mood_happy: MoodHappyIcon,
  mood_calm: MoodCalmIcon,
  mood_quiet: MoodQuietIcon,
  mood_confused: MoodConfusedIcon,
  mood_anxious: MoodAnxiousIcon,

  // Appetite
  appetite_good: AppetiteGoodIcon,
  appetite_some: AppetiteSomeIcon,
  appetite_little: AppetiteLittleIcon,
  appetite_none: AppetiteNoneIcon,

  // Mobility
  mobility_good: MobilityGoodIcon,
  mobility_slow: MobilitySlowIcon,
  mobility_help: MobilityHelpIcon,
  mobility_seated: MobilitySeatedIcon,

  // Activity
  activity_high: ActivityHighIcon,
  activity_medium: ActivityMediumIcon,
  activity_low: ActivityLowIcon,
  activity_sleep: ActivitySleepIcon,
};

/**
 * Get the observation icon component by name
 * @param iconName - The icon name from observation options
 * @returns The corresponding icon component
 */
export function getObservationIcon(iconName: string): ObservationIconComponent {
  return OBSERVATION_ICONS[iconName] || MoodQuietIcon;
}
