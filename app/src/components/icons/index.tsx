// HealthGuide Icon Library
// Per healthguide-core/theming skill - Professional SVG icons

import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { colors } from '@/theme/colors';

export interface IconProps {
  size?: number;
  color?: string;
}

// ==========================================
// STATUS ICONS
// ==========================================

// Task Complete - Large green checkmark
export function CheckIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={0.15} />
      <Path
        d="M8 12L11 15L16 9"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Task Incomplete - Large red X
export function XIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} opacity={0.15} />
      <Path
        d="M15 9L9 15M9 9L15 15"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Clock - For scheduling
export function ClockIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path
        d="M12 7V12L15 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Location Pin - For EVV
export function LocationIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill={color}
        opacity={0.15}
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx="12" cy="9" r="2.5" fill={color} />
    </Svg>
  );
}

// ==========================================
// NAVIGATION ICONS
// ==========================================

// Dashboard
export function DashboardIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="9" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="14" y="3" width="7" height="5" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="14" y="12" width="7" height="9" rx="1" stroke={color} strokeWidth={2} />
      <Rect x="3" y="16" width="7" height="5" rx="1" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Users - For caregiver/careseeker lists
export function UsersIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M2 21V19C2 16.79 3.79 15 6 15H12C14.21 15 16 16.79 16 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="17" cy="7" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M18 15H19C21.21 15 23 16.79 23 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Person - Single user
export function PersonIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M4 21V19C4 16.79 5.79 15 8 15H16C18.21 15 20 16.79 20 19V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Calendar
export function CalendarIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M16 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 10H21" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Settings
export function SettingsIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Today/Home
export function TodayIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 22V12H15V22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Profile
export function ProfileIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="5" stroke={color} strokeWidth={2} />
      <Path
        d="M3 21C3 17.13 7.03 14 12 14C16.97 14 21 17.13 21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Community
export function CommunityIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="5" cy="19" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="19" cy="19" r="3" stroke={color} strokeWidth={2} />
      <Path d="M12 8V12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8.5 14L5.5 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M15.5 14L18.5 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ==========================================
// ACTION ICONS
// ==========================================

// Microphone - For voice notes
export function MicrophoneIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth={2} />
      <Path
        d="M5 10V11C5 14.87 8.13 18 12 18C15.87 18 19 14.87 19 11V10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M12 18V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 22H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Camera
export function CameraIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Phone
export function PhoneIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92V19.92C22 20.48 21.55 20.94 21 20.99C20.4 21.04 19.81 21.05 19.23 21.02C10.07 20.45 3.55 13.93 2.98 4.77C2.95 4.19 2.96 3.6 3.01 3C3.06 2.45 3.52 2 4.08 2H7.08C7.56 2 8 2.35 8.11 2.82C8.28 3.58 8.52 4.32 8.83 5.04C9 5.43 8.9 5.89 8.57 6.17L7.26 7.26C8.44 9.74 10.26 11.56 12.74 12.74L13.83 11.43C14.11 11.1 14.57 11 14.96 11.17C15.68 11.48 16.42 11.72 17.18 11.89C17.65 12 18 12.44 18 12.92V16.92C18 17.4 17.66 17.8 17.18 17.89C16.47 18.02 15.74 18.05 15 17.99"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// QR Code - For EVV fallback
export function QRCodeIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth={2} />
      <Rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth={2} />
      <Rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth={2} />
      <Rect x="14" y="14" width="3" height="3" fill={color} />
      <Rect x="18" y="14" width="3" height="3" fill={color} />
      <Rect x="14" y="18" width="3" height="3" fill={color} />
      <Rect x="18" y="18" width="3" height="3" fill={color} />
      <Rect x="5.5" y="5.5" width="2" height="2" fill={color} />
      <Rect x="16.5" y="5.5" width="2" height="2" fill={color} />
      <Rect x="5.5" y="16.5" width="2" height="2" fill={color} />
    </Svg>
  );
}

// Plus
export function PlusIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M5 12H19" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

// Arrow Left (Back)
export function ArrowLeftIcon({ size = 24, color = colors.neutral[700] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Bell (Notifications)
export function BellIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21C13.37 21.46 12.82 21.78 12.2 21.89C11.58 22 10.95 21.89 10.4 21.59C9.85 21.29 9.43 20.81 9.2 20.24"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Heart (Wellness)
export function HeartIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61C20.33 4.1 19.73 3.69 19.06 3.41C18.39 3.13 17.67 2.99 16.95 2.99C16.22 2.99 15.5 3.13 14.83 3.41C14.16 3.69 13.55 4.1 13.05 4.61L12 5.67L10.95 4.61C9.93 3.59 8.56 3 7.13 3C5.7 3 4.33 3.59 3.31 4.61C2.29 5.63 1.7 7 1.7 8.43C1.7 9.86 2.29 11.23 3.31 12.25L4.36 13.31L12 21L19.64 13.31L20.69 12.25C21.2 11.75 21.61 11.14 21.89 10.47C22.17 9.8 22.31 9.08 22.31 8.35C22.31 7.62 22.17 6.9 21.89 6.23C21.61 5.56 21.34 5.11 20.84 4.61Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Search
export function SearchIcon({ size = 24, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
      <Path
        d="M21 21L16.65 16.65"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Edit/Pencil
export function EditIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Trash
export function TrashIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6H5H21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Alert/Warning
export function AlertIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.56 19C1.57 19.35 1.67 19.69 1.86 19.99C2.04 20.28 2.3 20.52 2.62 20.68C2.93 20.84 3.28 20.93 3.64 20.93H20.37C20.72 20.93 21.07 20.84 21.39 20.68C21.7 20.52 21.96 20.28 22.15 19.99C22.33 19.69 22.44 19.35 22.45 19C22.45 18.64 22.37 18.3 22.19 18L13.72 3.86C13.53 3.56 13.27 3.31 12.96 3.15C12.64 2.98 12.29 2.9 11.93 2.9C11.57 2.9 11.22 2.98 10.91 3.15C10.59 3.31 10.33 3.56 10.29 3.86Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 9V13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 17H12.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Chevron Right
export function ChevronRightIcon({ size = 24, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18L15 12L9 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Chevron Down
export function ChevronDownIcon({ size = 24, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9L12 15L18 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ==========================================
// ROLE ICONS (for Welcome Screen 2x2 Grid)
// ==========================================

// Agency Owner - Building with management dashboard
export function AgencyOwnerIcon({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21H21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 21V7L12 3L19 7V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 21V15H15V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="9" y="9" width="2" height="2" fill={color} />
      <Rect x="13" y="9" width="2" height="2" fill={color} />
    </Svg>
  );
}

// Caregiver - Hands holding heart (care symbol)
export function CaregiverIcon({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8C12 8 14.5 5.5 17 5.5C19 5.5 20.5 7 20.5 9C20.5 12 12 17 12 17C12 17 3.5 12 3.5 9C3.5 7 5 5.5 7 5.5C9.5 5.5 12 8 12 8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4.5 14C3 15.5 2 17.5 2 19C2 19 4 21 7 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.5 14C21 15.5 22 17.5 22 19C22 19 20 21 17 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Elder - Seated person with care symbol
export function ElderIcon({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M8 11H16C17.1 11 18 11.9 18 13V15C18 16.1 17.1 17 16 17H14L12 21L10 17H8C6.9 17 6 16.1 6 15V13C6 11.9 6.9 11 8 11Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13V15"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Family - Connected people (parent and child)
export function FamilyIcon({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="6" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="17" cy="8" r="2.5" stroke={color} strokeWidth={2} />
      <Path
        d="M3 20V18C3 15.79 4.79 14 7 14H11C13.21 14 15 15.79 15 18V20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 14H18C19.66 14 21 15.34 21 17V20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ==========================================
// BRAND / APP ICONS
// ==========================================

// HealthGuide Logo - Medical cross with shield
export function HealthGuideLogo({ size = 48, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Shield outline */}
      <Path
        d="M24 4L6 10V22C6 33.05 13.68 43.22 24 46C34.32 43.22 42 33.05 42 22V10L24 4Z"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Medical cross */}
      <Path
        d="M24 15V33"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M15 24H33"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
