// HealthGuide Card Component
// Per healthguide-core/ui-components skill

import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing, borderRadius, shadows, createTintedShadow } from '@/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
}

const paddingMap = {
  none: 0,
  sm: spacing[3],
  md: spacing[4],
  lg: spacing[6],
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  tintColor,
}: CardProps) {
  const scale = useSharedValue(1);

  const shadow = tintColor
    ? createTintedShadow(tintColor)
    : variant === 'elevated'
      ? shadows.lg
      : variant === 'outlined'
        ? shadows.none
        : shadows.sm;

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: paddingMap[padding],
    borderWidth: variant === 'outlined' ? 1 : 1,
    borderColor: variant === 'outlined' ? colors.neutral[200] : colors.neutral[100],
    ...shadow,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        }}
        style={[cardStyle, animatedStyle, style]}
        accessibilityRole="button"
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
