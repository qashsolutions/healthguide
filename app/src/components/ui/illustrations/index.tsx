// HealthGuide Empty State Illustrations
// Simple SVG illustrations using react-native-svg

import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IllustrationProps {
  size?: number;
  color?: string;
}

export function CalendarIllustration({ size = 80, color = '#0D9488' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Rect x="12" y="18" width="56" height="50" rx="8" fill={color} opacity={0.1} />
      <Rect x="12" y="18" width="56" height="16" rx="8" fill={color} opacity={0.2} />
      <Circle cx="28" cy="26" r="3" fill={color} opacity={0.6} />
      <Circle cx="52" cy="26" r="3" fill={color} opacity={0.6} />
      <Rect x="22" y="42" width="10" height="10" rx="2" fill={color} opacity={0.15} />
      <Rect x="35" y="42" width="10" height="10" rx="2" fill={color} opacity={0.15} />
      <Rect x="48" y="42" width="10" height="10" rx="2" fill={color} opacity={0.3} />
      <Rect x="22" y="55" width="10" height="10" rx="2" fill={color} opacity={0.15} />
      <Rect x="35" y="55" width="10" height="10" rx="2" fill={color} opacity={0.15} />
    </Svg>
  );
}

export function ClipboardIllustration({ size = 80, color = '#0D9488' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Rect x="18" y="12" width="44" height="58" rx="6" fill={color} opacity={0.1} />
      <Rect x="28" y="8" width="24" height="12" rx="4" fill={color} opacity={0.25} />
      <G opacity={0.4}>
        <Rect x="26" y="32" width="28" height="3" rx="1.5" fill={color} />
        <Rect x="26" y="40" width="22" height="3" rx="1.5" fill={color} />
        <Rect x="26" y="48" width="26" height="3" rx="1.5" fill={color} />
        <Rect x="26" y="56" width="18" height="3" rx="1.5" fill={color} />
      </G>
      <Path d="M32 28l3 3 6-6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
    </Svg>
  );
}

export function SearchIllustration({ size = 80, color = '#0D9488' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Circle cx="36" cy="36" r="18" fill={color} opacity={0.1} />
      <Circle cx="36" cy="36" r="18" stroke={color} strokeWidth="3" opacity={0.35} />
      <Path d="M49 49l14 14" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity={0.4} />
      <Circle cx="36" cy="36" r="8" fill={color} opacity={0.08} />
    </Svg>
  );
}

export function CommunityIllustration({ size = 80, color = '#0D9488' }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Circle cx="40" cy="28" r="10" fill={color} opacity={0.2} />
      <Circle cx="22" cy="36" r="8" fill={color} opacity={0.15} />
      <Circle cx="58" cy="36" r="8" fill={color} opacity={0.15} />
      <Path d="M16 62c0-10 8-18 24-18s24 8 24 18" fill={color} opacity={0.12} />
      <Path d="M8 66c0-8 5-14 14-14" stroke={color} strokeWidth="2" opacity={0.2} strokeLinecap="round" />
      <Path d="M72 66c0-8-5-14-14-14" stroke={color} strokeWidth="2" opacity={0.2} strokeLinecap="round" />
    </Svg>
  );
}
