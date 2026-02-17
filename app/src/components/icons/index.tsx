// HealthGuide Icon Library
// Per healthguide-core/theming skill - Professional SVG icons

import React from 'react';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
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
// FAMILY-SPECIFIC ICONS
// ==========================================

// Home icon - house outline
export function HomeIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9L12 2L21 9V20A2 2 0 0 1 19 22H5A2 2 0 0 1 3 20V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12H15V22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// File Text icon - document with lines
export function FileTextIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Help circle icon
export function HelpIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M9.09 9A3 3 0 0 1 14.83 10C14.83 12 12 13 12 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 17H12.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Log out icon
export function LogOutIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17L21 12L16 7M21 12H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Map pin icon
export function MapPinIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10A9 9 0 0 1 21 10Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Note icon
export function NoteIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2V8H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// BRAND / APP ICONS
// ==========================================

// Chevron Left - Back navigation (alias for ArrowLeftIcon)
export function ChevronLeftIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Shield Check - Verified badge
export function ShieldCheckIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Filter icon
export function FilterIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Message / Chat icon
export function MessageIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Send icon
export function SendIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

// ==========================================
// MOOD / EXPRESSION ICONS
// ==========================================

// Happy face - Great mood
export function SmileFaceIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M8 14C8.5 15.5 10 17 12 17C14 17 15.5 15.5 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
    </Svg>
  );
}

// Neutral face - Okay mood
export function NeutralFaceIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
    </Svg>
  );
}

// Sad face - Low mood
export function SadFaceIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M16 16C15.5 14.5 14 13 12 13C10 13 8.5 14.5 8 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
    </Svg>
  );
}

// Love face - Excellent mood
export function LoveFaceIcon({ size = 24, color = colors.error[400] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M8 14C8.5 15.5 10 17 12 17C14 17 15.5 15.5 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7.5 8.5C7.5 8 8 7 9 7C10 7 10.5 8 10.5 8.5C10.5 9.5 9 10.5 9 10.5C9 10.5 7.5 9.5 7.5 8.5Z" fill={color} />
      <Path d="M13.5 8.5C13.5 8 14 7 15 7C16 7 16.5 8 16.5 8.5C16.5 9.5 15 10.5 15 10.5C15 10.5 13.5 9.5 13.5 8.5Z" fill={color} />
    </Svg>
  );
}

// Slightly frowning - A Little Low mood
export function FrownFaceIcon({ size = 24, color = colors.warning[600] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path d="M15 16C14.7 15 13.5 14 12 14C10.5 14 9.3 15 9 16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="15" cy="9" r="1.5" fill={color} />
    </Svg>
  );
}

// ==========================================
// HEALTH / MEDICAL ICONS
// ==========================================

// Pill - Medication
export function PillIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.5 1.5L3 9C1.34 10.66 1.34 13.34 3 15L9 21C10.66 22.66 13.34 22.66 15 21L22.5 13.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="6.75" y1="12.75" x2="12.75" y2="6.75" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Brain - Cognitive
export function BrainIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C9.5 2 7.5 3.5 7 5.5C5 5.5 3 7.5 3 10C3 12 4.5 13.5 6 14V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V14C19.5 13.5 21 12 21 10C21 7.5 19 5.5 17 5.5C16.5 3.5 14.5 2 12 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 2V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Walking person - Mobility
export function WalkingIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="13" cy="4" r="2" stroke={color} strokeWidth={2} />
      <Path d="M10 10L8 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 10L16 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 10H14L16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 14L10 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Fork & knife - Appetite / Nutrition
export function UtensilsIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 2V10C3 11.1 3.9 12 5 12H7C8.1 12 9 11.1 9 10V2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 2V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18 2V8C18 10.21 16.21 12 14 12H18V22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Shower head - Hygiene
export function ShowerIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4V8C4 13.52 8.48 18 14 18H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="4" cy="4" r="2" stroke={color} strokeWidth={2} />
      <Path d="M18 14V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M14 16V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22 16V22" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Bandage - Skin / Pain
export function BandageIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 2L22 6L6 22L2 18L18 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="12" y1="8" x2="8" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="11" cy="11" r="1" fill={color} />
      <Circle cx="13" cy="13" r="1" fill={color} />
    </Svg>
  );
}

// Stethoscope - Medical / Pain
export function StethoscopeIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2V8C6 10.21 7.79 12 10 12H14C16.21 12 18 10.21 18 8V2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12V16C12 18.21 10.21 20 8 20C5.79 20 4 18.21 4 16V14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="20" cy="14" r="2" stroke={color} strokeWidth={2} />
      <Path d="M20 16V18C20 20.21 18.21 22 16 22C13.79 22 12 20.21 12 18V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Moon - Sleep
export function MoonIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Apple - Nutrition (onboarding)
export function AppleIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3C12 3 14 1 16 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 6C19.5 6 22 8.5 22 12C22 17 18 22 15 22C14 22 13 21.5 12 21.5C11 21.5 10 22 9 22C6 22 2 17 2 12C2 8.5 4.5 6 7 6C9 6 10.5 7 12 7C13.5 7 15 6 17 6Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// ENERGY / WELLNESS ICONS
// ==========================================

// Battery - Energy level
export function BatteryIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="18" height="10" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M22 11V13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x="5" y="10" width="12" height="4" rx="1" fill={color} opacity={0.3} />
    </Svg>
  );
}

// Battery Low - Low energy
export function BatteryLowIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="18" height="10" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M22 11V13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x="5" y="10" width="4" height="4" rx="1" fill={color} opacity={0.3} />
    </Svg>
  );
}

// Lightning bolt - Energy
export function LightningIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Muscle / Flexed arm - Strong
export function MuscleIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 15C4 15 5 9 7 7C9 5 11 7 11 9V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 9C11 9 13 5 15 5C17 5 18 7 18 9C18 11 17 15 17 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 15H17C19 15 20 16 20 18V19C20 20 19 21 18 21H6C5 21 4 20 4 19V15Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Fire - High energy
export function FireIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C12 2 8 6 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 6 12 2 12 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 18C6 14.69 8.69 12 12 12C15.31 12 18 14.69 18 18C18 20.21 15.31 22 12 22C8.69 22 6 20.21 6 18Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Meditation - Low stress
export function MeditateIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="3" stroke={color} strokeWidth={2} />
      <Path d="M6 20C6 20 6 14 12 14C18 14 18 20 18 20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 17L6 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M21 17L18 14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// SOS - Emergency / Crisis
export function SOSIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="12" rx="3" stroke={color} strokeWidth={2} />
      <Path d="M7 10C7.55 10 8 10.45 8 11C8 11.55 7.55 12 7 12H6V13C6 13.55 5.55 14 5 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 10V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 10H14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 14H14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 10C17.55 10 18 10.45 18 11C18 11.55 17.55 12 17 12H16V13C16 13.55 16.45 14 17 14" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// Star - Rating
export function StarIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// OBJECT / ACTIVITY ICONS
// ==========================================

// Book - Resources / Training
export function BookIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19.5C4 18.12 5.12 17 6.5 17H20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 2H20V22H6.5C5.12 22 4 20.88 4 19.5V4.5C4 3.12 5.12 2 6.5 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 11H13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Scale - Legal / Balance
export function ScaleIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3V21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 21H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 7L12 5L21 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 7L6 15H0L3 7Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 7L24 15H18L21 7Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Hospital - Healthcare facility
export function HospitalIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M12 8V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8 12H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 10H21" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Thumbs up - Positive
export function ThumbsUpIcon({ size = 24, color = colors.success[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 22H4C3.46957 22 2.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V13C2 12.4696 2.21071 11.9609 2.58579 11.5858C2.96086 11.2107 3.46957 11 4 11H7M14 9V5C14 4.20435 13.6839 3.44129 13.1213 2.87868C12.5587 2.31607 11.7956 2 11 2L7 11V22H18.28C18.7623 22.0055 19.2304 21.8364 19.5979 21.524C19.9654 21.2116 20.2077 20.7769 20.28 20.3L21.66 11.3C21.7035 11.0134 21.6842 10.7207 21.6033 10.4423C21.5225 10.1638 21.3821 9.90629 21.1919 9.68751C21.0016 9.46873 20.7661 9.29393 20.5016 9.17522C20.2371 9.0565 19.9499 8.99672 19.66 9H14Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Thumbs down - Negative
export function ThumbsDownIcon({ size = 24, color = colors.error[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M17 2H19.67C20.236 1.98999 20.7859 2.18813 21.2154 2.55681C21.6449 2.92549 21.9241 3.43905 22 4V11C21.9241 11.5609 21.6449 12.0745 21.2154 12.4432C20.7859 12.8119 20.236 13.01 19.67 13H17M10 15V19C10 19.7956 10.3161 20.5587 10.8787 21.1213C11.4413 21.6839 12.2044 22 13 22L17 13V2H5.72C5.23767 1.99454 4.76959 2.16359 4.40209 2.47599C4.0346 2.78839 3.79227 3.22309 3.72 3.7L2.34 12.7C2.29651 12.9866 2.31583 13.2793 2.39666 13.5577C2.4775 13.8362 2.61793 14.0937 2.80817 14.3125C2.99842 14.5313 3.23393 14.7061 3.49843 14.8248C3.76294 14.9435 4.05009 15.0033 4.34 15H10Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Wave hand - Greeting
export function WaveIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7.5 12.5L5.5 10.5C4.95 9.95 4.95 9.05 5.5 8.5C6.05 7.95 6.95 7.95 7.5 8.5L11.5 12.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.5 10.5L7.5 8.5C6.95 7.95 6.95 7.05 7.5 6.5C8.05 5.95 8.95 5.95 9.5 6.5L13.5 10.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.5 8.5L10.5 7.5C9.95 6.95 9.95 6.05 10.5 5.5C11.05 4.95 11.95 4.95 12.5 5.5L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 6.5L13 6C12.45 5.45 12.45 4.55 13 4C13.55 3.45 14.45 3.45 15 4L19 8C20.5 9.5 21 11.5 20.5 14C20 16.5 18 19 15 20.5C12 22 9 21.5 7 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Sparkle - Decoration / Empty state
export function SparkleIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Party / Celebration
export function PartyIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 22L8.5 8.5L15.5 15.5L2 22Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 9L15 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 13L22 11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18 6L22 3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="19" cy="7" r="1" fill={color} />
      <Circle cx="14" cy="5" r="1" fill={color} />
      <Circle cx="20" cy="12" r="1" fill={color} />
    </Svg>
  );
}

// Music note
export function MusicIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18V5L21 3V16" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="16" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// Hand / Personal care
export function HandCareIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 11V6C18 5.45 17.55 5 17 5C16.45 5 16 5.45 16 6V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M14 11V4C14 3.45 13.55 3 13 3C12.45 3 12 3.45 12 4V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M10 11V6C10 5.45 9.55 5 9 5C8.45 5 8 5.45 8 6V14L5.5 11.5C5.07 11.07 4.31 11.07 3.88 11.5C3.45 11.93 3.45 12.69 3.88 13.12L9 18.24C9.75 19 10.75 19.5 12 19.5H16C18.21 19.5 20 17.71 20 15.5V11C20 10.45 19.55 10 19 10C18.45 10 18 10.45 18 11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// SYNC STATUS ICONS
// ==========================================

// Cloud - Offline
export function CloudIcon({ size = 24, color = colors.neutral[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 10H16.74C16.36 8.22 15.36 6.66 13.89 5.59C12.42 4.52 10.58 4.02 8.74 4.17C6.9 4.33 5.18 5.13 3.93 6.41C2.68 7.69 2 9.37 2 11.12C2 12.87 2.68 14.55 3.93 15.83C5.18 17.11 6.9 17.91 8.74 18.07C10.58 18.22 12.42 17.72 13.89 16.65C15.36 15.58 16.36 14.02 16.74 12.24H18C19.06 12.24 20.08 12.66 20.83 13.41C21.58 14.16 22 15.18 22 16.24C22 17.3 21.58 18.32 20.83 19.07C20.08 19.82 19.06 20.24 18 20.24H6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Sync / Refresh arrows
export function SyncIcon({ size = 24, color = colors.primary[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M23 4V10H17" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M1 20V14H7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 9A9 9 0 0 1 20.49 4.51L23 7M1 17L3.51 19.49A9 9 0 0 0 20.49 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Hourglass - Pending
export function HourglassIcon({ size = 24, color = colors.warning[500] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2H18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M6 22H18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 2V7.5L12 12L17 7.5V2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 22V16.5L12 12L17 16.5V22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ==========================================
// MEMORY GAME CARD ICONS
// ==========================================

// Flower 1 - Rose
export function FlowerRoseIcon({ size = 24, color = '#E11D48' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="4" fill={color} opacity={0.2} stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="10" r="1.5" fill={color} />
      <Path d="M12 14V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 17L9 15" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Flower 2 - Sunflower
export function FlowerSunIcon({ size = 24, color = '#EAB308' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="3" fill="#92400E" stroke="#92400E" strokeWidth={1} />
      <Path d="M12 3V5M12 15V17M7 10H5M19 10H17M8.5 6.5L9.5 7.5M14.5 12.5L15.5 13.5M15.5 6.5L14.5 7.5M9.5 12.5L8.5 13.5" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M12 17V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Flower 3 - Tulip
export function FlowerTulipIcon({ size = 24, color = '#DB2777' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3C10 3 8 5 8 8C8 10 10 12 12 12C14 12 16 10 16 8C16 5 14 3 12 3Z" fill={color} opacity={0.2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16L8 19" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 16L16 19" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Flower 4 - Daisy
export function FlowerDaisyIcon({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="10" r="2" fill="#EAB308" />
      <Path d="M12 4V6M12 14V16M6 10H8M16 10H18M8 6L9.5 7.5M14.5 12.5L16 14M16 6L14.5 7.5M9.5 12.5L8 14" stroke={color === colors.white ? '#A855F7' : color} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M12 16V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Flower 5 - Cherry Blossom
export function FlowerBlossomIcon({ size = 24, color = '#F9A8D4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="2" fill={color} stroke={color} strokeWidth={1} />
      <Circle cx="9" cy="10" r="2" fill={color} stroke={color} strokeWidth={1} />
      <Circle cx="15" cy="10" r="2" fill={color} stroke={color} strokeWidth={1} />
      <Circle cx="10" cy="13" r="2" fill={color} stroke={color} strokeWidth={1} />
      <Circle cx="14" cy="13" r="2" fill={color} stroke={color} strokeWidth={1} />
      <Circle cx="12" cy="10" r="1.5" fill="#BE185D" />
      <Path d="M12 15V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// Flower 6 - Hibiscus
export function FlowerHibiscusIcon({ size = 24, color = '#DC2626' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4C10.5 4 9 5.5 9 7.5C9 8.5 10 10 12 10C14 10 15 8.5 15 7.5C15 5.5 13.5 4 12 4Z" fill={color} opacity={0.3} stroke={color} strokeWidth={1.5} />
      <Path d="M7 8C6 9 6 11 7.5 12C8.5 12.7 10 12 10 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M17 8C18 9 18 11 16.5 12C15.5 12.7 14 12 14 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx="12" cy="9" r="1.5" fill={color} />
      <Path d="M12 12V22" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
