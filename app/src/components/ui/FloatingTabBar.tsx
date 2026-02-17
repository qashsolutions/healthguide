// HealthGuide Floating Tab Bar
// Rounded, elevated tab bar with role-specific theming

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '@/theme/colors';
import { borderRadius, shadows } from '@/theme/spacing';

interface FloatingTabBarOptions {
  roleColor: string;
  tabHeight?: number;
  labelSize?: number;
  iconSize?: number;
}

export function createFloatingTabBar(options: FloatingTabBarOptions) {
  const { roleColor, tabHeight = 60, labelSize = 12, iconSize = 24 } = options;

  return function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
      <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
        <View style={[styles.container, { height: tabHeight }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            // Skip routes hidden with href: null (sub-routes without icons)
            if (!options.tabBarIcon || (options as any).href === null) return null;

            const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            const color = isFocused ? roleColor : colors.neutral[400];

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color,
                  size: iconSize,
                })}
                <Text
                  style={[
                    styles.label,
                    { color, fontSize: labelSize },
                    isFocused && styles.labelFocused,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {isFocused && (
                  <View style={[styles.indicator, { backgroundColor: roleColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius['2xl'],
    marginBottom: Platform.OS === 'web' ? 8 : 4,
    width: '100%',
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  label: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  labelFocused: {
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 4,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});
