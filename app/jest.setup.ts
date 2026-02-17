/* HealthGuide Test Setup
 * Mocks for native modules, Expo APIs, and external services
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
  Stack: {
    Screen: ({ children }: any) => children ?? null,
  },
  Tabs: {
    Screen: ({ children }: any) => children ?? null,
  },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const React = require('react');
    React.useEffect(() => { callback(); }, []);
  }),
}));

// --- Supabase ---
const mockSupabaseFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-id', email: 'test@test.com' } } }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'test-id' } }, error: null }),
      verifyOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.com/photo.jpg' } })),
      })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
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
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// --- expo-device ---
jest.mock('expo-device', () => ({
  isDevice: false,
  brand: 'Test',
  modelName: 'TestDevice',
}));

// --- expo-linking ---
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `healthguide://${path}`),
  parse: jest.fn(),
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

// --- expo-splash-screen ---
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

// --- expo-web-browser ---
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// --- expo-font ---
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
}));

// --- react-native-reanimated ---
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: any) => Component,
      call: () => {},
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View: View,
      ScrollView: View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      FlatList: require('react-native').FlatList,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (fn: any) => fn(),
    useDerivedValue: (fn: any) => ({ value: fn() }),
    useAnimatedScrollHandler: () => jest.fn(),
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
    withDelay: (_: any, value: any) => value,
    withSequence: (...args: any[]) => args[args.length - 1],
    withRepeat: (value: any) => value,
    cancelAnimation: jest.fn(),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      out: jest.fn(() => jest.fn()),
      in: jest.fn(() => jest.fn()),
      inOut: jest.fn(() => jest.fn()),
      bezier: jest.fn(),
    },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: jest.fn(),
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
    SlideInRight: {},
    SlideOutLeft: {},
    Layout: { springify: jest.fn().mockReturnThis() },
    createAnimatedComponent: (Component: any) => Component,
  };
});

// --- react-native-gesture-handler ---
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  GestureDetector: ({ children }: any) => children,
  Gesture: {
    Pan: jest.fn(() => ({
      onStart: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    })),
    Tap: jest.fn(() => ({
      onStart: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    })),
  },
  Directions: {},
  State: {},
}));

// --- react-native-safe-area-context ---
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// --- react-native-screens ---
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

// --- react-native-svg ---
jest.mock('react-native-svg', () => {
  const React = require('react');
  const createMockComponent = (name: string) => {
    const Component = (props: any) => React.createElement(name, props, props.children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: createMockComponent('Svg'),
    Svg: createMockComponent('Svg'),
    Circle: createMockComponent('Circle'),
    Rect: createMockComponent('Rect'),
    Path: createMockComponent('Path'),
    G: createMockComponent('G'),
    Text: createMockComponent('SvgText'),
    Line: createMockComponent('Line'),
    Defs: createMockComponent('Defs'),
    LinearGradient: createMockComponent('LinearGradient'),
    Stop: createMockComponent('Stop'),
  };
});

// --- react-native-qrcode-svg ---
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// --- WatermelonDB ---
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
  Model: class MockModel {
    static table = '';
    static associations = {};
  },
  Q: {
    where: jest.fn(),
    and: jest.fn(),
    or: jest.fn(),
    on: jest.fn(),
    sortBy: jest.fn(),
    take: jest.fn(),
  },
  tableName: jest.fn(),
  appSchema: (schema: any) => schema,
  tableSchema: (table: any) => table,
  columnName: jest.fn((name: string) => name),
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn());

jest.mock('@nozbe/watermelondb/decorators', () => ({
  field: () => () => {},
  text: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
  relation: () => () => {},
  children: () => () => {},
  json: () => () => {},
  lazy: () => () => {},
  action: () => () => {},
  writer: () => () => {},
  reader: () => () => {},
}));

// --- @react-native-async-storage ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// --- @react-native-community/netinfo ---
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

// --- @expo/vector-icons ---
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const createIconMock = (name: string) => {
    const Icon = (props: any) => React.createElement(Text, props, props.name || name);
    Icon.displayName = name;
    return Icon;
  };
  return {
    Ionicons: createIconMock('Ionicons'),
    MaterialIcons: createIconMock('MaterialIcons'),
    MaterialCommunityIcons: createIconMock('MaterialCommunityIcons'),
    FontAwesome: createIconMock('FontAwesome'),
    FontAwesome5: createIconMock('FontAwesome5'),
    Feather: createIconMock('Feather'),
    AntDesign: createIconMock('AntDesign'),
    Entypo: createIconMock('Entypo'),
  };
});

// --- Expo Fonts ---
jest.mock('@expo-google-fonts/fraunces', () => ({
  useFonts: jest.fn(() => [true, null]),
  Fraunces_400Regular: 'Fraunces_400Regular',
  Fraunces_600SemiBold: 'Fraunces_600SemiBold',
  Fraunces_700Bold: 'Fraunces_700Bold',
}));

jest.mock('@expo-google-fonts/jetbrains-mono', () => ({
  useFonts: jest.fn(() => [true, null]),
  JetBrainsMono_400Regular: 'JetBrainsMono_400Regular',
}));

jest.mock('@expo-google-fonts/plus-jakarta-sans', () => ({
  useFonts: jest.fn(() => [true, null]),
  PlusJakartaSans_400Regular: 'PlusJakartaSans_400Regular',
  PlusJakartaSans_500Medium: 'PlusJakartaSans_500Medium',
  PlusJakartaSans_600SemiBold: 'PlusJakartaSans_600SemiBold',
  PlusJakartaSans_700Bold: 'PlusJakartaSans_700Bold',
}));

// --- ThemeContext ---
jest.mock('@/contexts/ThemeContext', () => {
  const React = require('react');
  const { colors } = require('@/theme/colors');
  return {
    ThemeProvider: ({ children }: any) => children,
    useTheme: () => ({
      colors,
      colorScheme: 'light',
      isDark: false,
    }),
  };
});

// --- Silence noisy console.warn/error for cleaner test output ---
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Reanimated')) return;
  if (typeof args[0] === 'string' && args[0].includes('NativeModule')) return;
  originalWarn(...args);
};

console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('act(')) return;
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
  if (typeof args[0] === 'string' && args[0].includes('incorrect casing')) return;
  if (typeof args[0] === 'string' && args[0].includes('is deprecated')) return;
  if (typeof args[0] === 'string' && args[0].includes('is unrecognized in this browser')) return;
  if (typeof args[0] === 'string' && args[0].includes('cannot be a descendant of')) return;
  if (typeof args[0] === 'string' && args[0].includes('cannot contain a nested')) return;
  originalError(...args);
};
