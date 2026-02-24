/**
 * HealthGuide Integration Test Config
 * Runs tests that write/read from the REAL Supabase test database.
 * Uses the anon key + test user sign-in (no mocking of Supabase).
 *
 * Run: npx jest --config jest.integration.config.js
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
 * Test DB superadmin: superadmin@healthguide.test / TestPass123!
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/web',
  maxWorkers: 1,
  testTimeout: 30000, // 30s for real network calls
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@nozbe/.*|date-fns|react-native-qrcode-svg|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-url-polyfill)',
  ],
  // Use ONLY the integration setup (does NOT mock Supabase)
  setupFiles: ['./jest.integration.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.tsx', '<rootDir>/__tests__/integration/**/*.test.ts'],
  globals: {
    // Pass env vars to tests
    'SUPABASE_URL': process.env.EXPO_PUBLIC_SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};
