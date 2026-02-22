/**
 * Integration test setup — does NOT mock Supabase.
 * Mocks only native modules that can't run in Node/JSDOM.
 */

// --- expo-router ---
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs:  { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const React = require('react');
    React.useEffect(() => { callback(); }, []);
  }),
}));

// --- expo-location ---
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
    timestamp: Date.now(),
  }),
  Accuracy: { High: 4, Balanced: 3 },
}));

// --- expo-haptics ---
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// --- expo-camera ---
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ granted: false }, jest.fn()]),
  CameraType: { back: 'back', front: 'front' },
}));

// --- expo-notifications ---
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(null),
  setBadgeCountAsync: jest.fn().mockResolvedValue(true),
  getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
}));

// --- expo-image-picker ---
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  MediaTypeOptions: { Images: 'Images' },
}));

// --- expo-secure-store ---
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// --- expo-constants ---
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

// --- expo-device ---
jest.mock('expo-device', () => ({
  isDevice: false,
  brand: 'Test',
  modelName: 'TestDevice',
}));

// --- expo-linear-gradient ---
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      React.createElement(View, { ...props, testID: 'linear-gradient' }, children),
  };
});

// --- react-native-reanimated ---
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (C: any) => C,
      View, ScrollView: View, Text: require('react-native').Text,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withDelay: (_: any, v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    withRepeat: (v: any) => v,
    cancelAnimation: jest.fn(),
    Easing: { linear: jest.fn(), ease: jest.fn(), out: jest.fn(() => jest.fn()), in: jest.fn(() => jest.fn()) },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: jest.fn(),
    runOnJS: (fn: any) => fn,
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
    createAnimatedComponent: (C: any) => C,
  };
});

// --- react-native-safe-area-context ---
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// --- react-native-svg ---
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: mk('Svg'), Svg: mk('Svg'), Circle: mk('Circle'), Rect: mk('Rect'),
    Path: mk('Path'), G: mk('G'), Text: mk('SvgText'), Line: mk('Line'),
    Defs: mk('Defs'), LinearGradient: mk('LinearGradient'), Stop: mk('Stop'),
  };
});

// --- react-native-qrcode-svg ---
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// --- react-native-gesture-handler ---
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: jest.fn(() => ({ onStart: jest.fn().mockReturnThis(), onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() })),
    Tap: jest.fn(() => ({ onStart: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() })),
  },
  Directions: {}, State: {},
}));

// --- react-native-screens ---
jest.mock('react-native-screens', () => ({ enableScreens: jest.fn() }));

// --- WatermelonDB ---
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
  Model: class { static table = ''; static associations: Record<string, any> = {}; },
  Q: { where: jest.fn(), and: jest.fn(), or: jest.fn() },
  tableName: jest.fn(),
  appSchema: (s: any) => s,
  tableSchema: (t: any) => t,
  columnName: jest.fn((n: string) => n),
}));
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn());
jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: () => () => {}, text: () => () => {}, date: () => () => {},
  readonly: () => () => {}, relation: () => () => {}, children: () => () => {},
  json: () => () => {}, lazy: () => () => {}, action: () => () => {},
  writer: () => () => {}, reader: () => () => {},
}));

// --- @react-native-async-storage ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

// --- @expo/vector-icons ---
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mk = (name: string) => {
    const Icon = (props: any) => React.createElement(Text, props, props.name || name);
    Icon.displayName = name;
    return Icon;
  };
  return {
    Ionicons: mk('Ionicons'), MaterialIcons: mk('MaterialIcons'),
    FontAwesome: mk('FontAwesome'), Feather: mk('Feather'), AntDesign: mk('AntDesign'),
  };
});

// --- ThemeContext ---
jest.mock('@/contexts/ThemeContext', () => {
  const React = require('react');
  const { colors } = require('@/theme/colors');
  return {
    ThemeProvider: ({ children }: any) => children,
    useTheme: () => ({ colors, colorScheme: 'light', isDark: false }),
  };
});

// Suppress noisy warnings
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('Reanimated') || args[0].includes('NativeModule'))) return;
  originalWarn(...args);
};
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('act(') || args[0].includes('Warning:') || args[0].includes('is deprecated'))) return;
  originalError(...args);
};
