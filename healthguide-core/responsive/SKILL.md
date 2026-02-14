---
name: healthguide-core-responsive
description: Phone and tablet adaptive layouts for HealthGuide elder care app. Implements responsive breakpoints, adaptive components, and platform-specific optimizations for iOS and Android. Use when building screens that need to work across phone and tablet form factors.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [responsive, tablet, phone, adaptive-layout, expo]
---

# HealthGuide Core Responsive

## Overview
HealthGuide runs on phones and tablets for both iOS and Android. Agency owners often use tablets for dashboard views while caregivers primarily use phones. This skill provides responsive utilities and patterns.

## Breakpoint System

```typescript
// theme/breakpoints.ts
export const breakpoints = {
  phone: 0,      // 0 - 767px
  tablet: 768,   // 768 - 1023px
  desktop: 1024, // 1024px+ (rarely used in mobile app)
};

export type DeviceType = 'phone' | 'tablet';
```

## useResponsive Hook

```typescript
// hooks/useResponsive.ts
import { useWindowDimensions, Platform, ScaledSize } from 'react-native';
import { breakpoints, DeviceType } from '@/theme/breakpoints';

interface ResponsiveInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  platform: 'ios' | 'android';
  columns: number; // For grid layouts
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isTablet = width >= breakpoints.tablet;
  const isLandscape = width > height;

  // Determine optimal column count for grids
  const columns = isTablet
    ? (isLandscape ? 4 : 3)
    : (isLandscape ? 3 : 2);

  return {
    width,
    height,
    deviceType: isTablet ? 'tablet' : 'phone',
    isPhone: !isTablet,
    isTablet,
    isLandscape,
    isPortrait: !isLandscape,
    platform: Platform.OS as 'ios' | 'android',
    columns,
  };
}
```

## Responsive Value Helper

```typescript
// utils/responsive.ts
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale based on screen width
export function wp(percentage: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
}

// Scale based on screen height
export function hp(percentage: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
}

// Scale font sizes
export function fontScale(size: number): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// Get responsive value based on device type
export function responsive<T>(values: { phone: T; tablet: T }): T {
  return SCREEN_WIDTH >= 768 ? values.tablet : values.phone;
}
```

## Responsive Container Component

```typescript
// components/ui/ResponsiveContainer.tsx
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  maxWidth?: number;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function ResponsiveContainer({
  children,
  style,
  maxWidth = 1200,
  padding = 'medium',
}: ResponsiveContainerProps) {
  const { width, isTablet } = useResponsive();

  const paddingValues = {
    none: 0,
    small: 8,
    medium: isTablet ? 24 : 16,
    large: isTablet ? 40 : 24,
  };

  return (
    <View
      style={[
        styles.container,
        {
          maxWidth,
          paddingHorizontal: paddingValues[padding],
          width: width > maxWidth ? maxWidth : '100%',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
  },
});
```

## Adaptive Grid Component

```typescript
// components/ui/AdaptiveGrid.tsx
import { View, StyleSheet, FlatList, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface AdaptiveGridProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  minItemWidth?: number;
  gap?: number;
  style?: ViewStyle;
}

export function AdaptiveGrid<T>({
  data,
  renderItem,
  keyExtractor,
  minItemWidth = 160,
  gap = 12,
  style,
}: AdaptiveGridProps<T>) {
  const { width } = useResponsive();

  // Calculate columns based on available width and minimum item width
  const availableWidth = width - (gap * 2);
  const columns = Math.max(1, Math.floor(availableWidth / minItemWidth));
  const itemWidth = (availableWidth - (gap * (columns - 1))) / columns;

  return (
    <FlatList
      data={data}
      numColumns={columns}
      key={columns} // Re-render when columns change
      keyExtractor={keyExtractor}
      contentContainerStyle={[styles.grid, { gap }, style]}
      columnWrapperStyle={columns > 1 ? { gap } : undefined}
      renderItem={({ item, index }) => (
        <View style={{ width: itemWidth }}>
          {renderItem(item, index)}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    padding: 12,
  },
});
```

## Split View for Tablets

```typescript
// components/ui/SplitView.tsx
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface SplitViewProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  masterWidth?: number | string;
  style?: ViewStyle;
}

export function SplitView({
  master,
  detail,
  masterWidth = '35%',
  style,
}: SplitViewProps) {
  const { isTablet, isLandscape } = useResponsive();

  // Only show split view on tablets in landscape
  if (!isTablet || !isLandscape) {
    return <View style={[styles.fullWidth, style]}>{master}</View>;
  }

  return (
    <View style={[styles.splitContainer, style]}>
      <View style={[styles.master, { width: masterWidth }]}>
        {master}
      </View>
      <View style={styles.detail}>
        {detail}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  master: {
    borderRightWidth: 1,
    borderRightColor: '#E4E4E7',
  },
  detail: {
    flex: 1,
  },
  fullWidth: {
    flex: 1,
  },
});
```

## Agency Dashboard - Responsive Example

```typescript
// app/(protected)/agency/(tabs)/dashboard.tsx
import { ScrollView, StyleSheet } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { AdaptiveGrid } from '@/components/ui/AdaptiveGrid';
import { SplitView } from '@/components/ui/SplitView';

export default function AgencyDashboard() {
  const { isTablet, columns } = useResponsive();

  // Tablet: Split view with list + detail
  // Phone: Single column scrollable

  if (isTablet) {
    return (
      <SplitView
        master={<CaregiverList />}
        detail={<DashboardStats />}
        masterWidth="40%"
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ResponsiveContainer>
        {/* Stats cards - responsive grid */}
        <AdaptiveGrid
          data={statsCards}
          renderItem={(card) => <StatCard {...card} />}
          keyExtractor={(card) => card.id}
          minItemWidth={150}
        />

        {/* Caregiver assignments */}
        <CaregiverAssignmentList columns={columns} />
      </ResponsiveContainer>
    </ScrollView>
  );
}
```

## Caregiver Interface - Large Touch Targets

```typescript
// Caregiver screens prioritize large buttons regardless of device
// components/caregiver/TaskButton.tsx
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

interface TaskButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant: 'success' | 'error' | 'pending';
}

export function TaskButton({ icon, label, onPress, variant }: TaskButtonProps) {
  const { isTablet } = useResponsive();

  // Even larger on tablets
  const size = isTablet ? 140 : 100;
  const iconSize = isTablet ? 64 : 48;
  const fontSize = isTablet ? 18 : 14;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        styles[variant],
        { width: size, height: size },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {React.cloneElement(icon as React.ReactElement, { size: iconSize })}
      <Text style={[styles.label, { fontSize }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  success: {
    backgroundColor: '#D1FAE5',
  },
  error: {
    backgroundColor: '#FEE2E2',
  },
  pending: {
    backgroundColor: '#F4F4F5',
  },
  label: {
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

## Platform-Specific Adjustments

```typescript
// utils/platform.ts
import { Platform, StatusBar } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Safe area insets
export const statusBarHeight = Platform.select({
  ios: 47, // iPhone 14 Pro
  android: StatusBar.currentHeight || 24,
  default: 0,
});

// Platform-specific shadow
export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

// Platform-specific haptics
export async function hapticFeedback(type: 'light' | 'medium' | 'heavy') {
  if (isIOS) {
    const Haptics = await import('expo-haptics');
    const impactStyle = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[type];
    await Haptics.impactAsync(impactStyle);
  }
  // Android handles haptics through system
}
```

## File Structure

```
src/
├── theme/
│   └── breakpoints.ts
├── hooks/
│   └── useResponsive.ts
├── utils/
│   ├── responsive.ts
│   └── platform.ts
└── components/
    └── ui/
        ├── ResponsiveContainer.tsx
        ├── AdaptiveGrid.tsx
        └── SplitView.tsx
```

## Testing Responsive Layouts

```bash
# iOS Simulator - Different devices
xcrun simctl boot "iPhone 15 Pro"
xcrun simctl boot "iPad Pro (12.9-inch)"

# Android Emulator - Create tablet AVD
# In Android Studio: Tools > Device Manager > Create Virtual Device
# Select tablet form factor
```

## Troubleshooting

### Layout breaks on rotation
**Cause:** Using fixed dimensions instead of responsive
**Solution:** Use `useWindowDimensions` or `useResponsive` hook

### Grid columns don't update on resize
**Cause:** FlatList caching
**Solution:** Add `key={columns}` prop to force re-render

### Safe area issues on different devices
**Cause:** Hardcoded insets
**Solution:** Use `react-native-safe-area-context` for dynamic insets
