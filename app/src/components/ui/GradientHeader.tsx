// HealthGuide Gradient Header
// Role-tinted gradient background for screen headers

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { layout } from '@/theme/spacing';

interface GradientHeaderProps {
  children: React.ReactNode;
  roleColor: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GradientHeader({
  children,
  roleColor,
  opacity = 0.1,
  style,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={[hexToRgba(roleColor, opacity), 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[{ paddingHorizontal: layout.screenPadding, paddingTop: 16, paddingBottom: 8 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
