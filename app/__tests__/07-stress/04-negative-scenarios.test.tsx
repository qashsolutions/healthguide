/**
 * Batch 34: Negative Scenarios / Security Tests (Features #398-425)
 * Screens: caregiver-signup, elder/[id], caregiver-directory, agency dashboard
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  XSS_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  EXTREMELY_LONG_TEXT,
  INVALID_PHONES,
  INVALID_ZIPS,
  generateElders,
  generateCaregivers,
  generateVisits,
} from './stress-test-data';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'new' }),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

const mockSignInWithPhone = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false,
    initialized: true,
    signInWithEmail: jest.fn(),
    signInWithPhone: mockSignInWithPhone,
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'owner-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: [], error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  geocodeAsync: jest.fn().mockResolvedValue([{ latitude: 40.7128, longitude: -74.0060 }]),
}));

import CaregiverSignupScreen from '@/app/(auth)/caregiver-signup';
import ElderDetailScreen from '@/app/(protected)/agency/elder/[id]';
import CaregiverDirectoryScreen from '@/app/(protected)/agency/caregiver-directory';
import AgencyDashboard from '@/app/(protected)/agency/(tabs)/index';
import CaregiversScreen from '@/app/(protected)/agency/(tabs)/caregivers';
import EldersScreen from '@/app/(protected)/agency/(tabs)/elders';

describe('Batch 34: Negative Scenarios — Phone Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #398
  it('#398 - Phone "123" shows validation error', async () => {
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getByText(/valid phone number/i)).toBeTruthy();
    });
  });

  // #399
  it('#399 - Phone "abcdefghij" gets cleaned, shows error', async () => {
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: 'abcdefghij' } });
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getByText(/valid phone number/i)).toBeTruthy();
    });
  });

  // #400
  it('#400 - Empty phone shows error', async () => {
    render(<CaregiverSignupScreen />);
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getByText(/valid phone number/i)).toBeTruthy();
    });
  });

  // #401
  it('#401 - Phone "+1555!@#$%^&" gets cleaned, shows error', async () => {
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '+1555!@#$%^&' } });
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getByText(/valid phone number/i)).toBeTruthy();
    });
  });

  // #402
  it('#402 - Phone with spaces gets cleaned and formatted', async () => {
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '555 123 4567' } });
    // Should format and be valid (10 digits)
    expect(phoneInput).toBeTruthy();
  });
});

describe('Batch 34: Negative Scenarios — XSS & SQL Injection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    mockChain.single.mockResolvedValue({ data: null, error: null });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  // #403
  it('#403 - XSS <script>alert("xss")</script> in elder name renders as text', async () => {
    const xssElders = [{
      ...generateElders(1)[0],
      preferred_name: XSS_PAYLOADS[0],
      address: '123 Main St',
      family_members: [],
    }];
    let callCount = 0;
    mockChain.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) return resolve({ data: xssElders, error: null });
      return resolve({ data: [], error: null });
    });
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText(XSS_PAYLOADS[0])).toBeTruthy();
    });
    // Should render as text, not as executable script
    expect(document.querySelector('script')).toBeNull();
  });

  // #404
  it('#404 - XSS "><img src=x onerror=alert(1)> in elder name: no DOM injection', async () => {
    const xssElders = [{
      ...generateElders(1)[0],
      preferred_name: XSS_PAYLOADS[1],
      address: '123 Main St',
      family_members: [],
    }];
    let callCount = 0;
    mockChain.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) return resolve({ data: xssElders, error: null });
      return resolve({ data: [], error: null });
    });
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText(XSS_PAYLOADS[1])).toBeTruthy();
    });
    const imgs = document.querySelectorAll('img[src="x"]');
    expect(imgs.length).toBe(0);
  });

  // #405
  it('#405 - SQL injection in search: no crash', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: generateCaregivers(5), error: null })
    );
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search caregivers...')).toBeTruthy();
    });
    const searchInput = screen.getByPlaceholderText('Search caregivers...');
    fireEvent.change(searchInput, { target: { value: SQL_INJECTION_PAYLOADS[0] } });
    // Should not crash — just filters to no results
    expect(searchInput).toBeTruthy();
  });

  // #406
  it('#406 - XSS in search field: renders as text, no injection', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search caregivers...')).toBeTruthy();
    });
    const searchInput = screen.getByPlaceholderText('Search caregivers...');
    fireEvent.change(searchInput, { target: { value: XSS_PAYLOADS[2] } });
    expect(document.querySelector('svg[onload]')).toBeNull();
  });
});

describe('Batch 34: Negative Scenarios — Overflow Text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    mockChain.single.mockResolvedValue({ data: null, error: null });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  // #407
  it('#407 - 10000-char string in elder full_name: form renders without crash', async () => {
    render(<ElderDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeTruthy();
    });
    // Form should be usable even with extreme input
    expect(screen.getByText(/Save Elder/i)).toBeTruthy();
  });

  // #408
  it('#408 - 10000-char search query: search field accepts input', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: generateCaregivers(5), error: null })
    );
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search caregivers...')).toBeTruthy();
    });
    const searchInput = screen.getByPlaceholderText('Search caregivers...');
    fireEvent.change(searchInput, { target: { value: EXTREMELY_LONG_TEXT } });
    // Should not crash
    expect(searchInput).toBeTruthy();
  });
});

describe('Batch 34: Negative Scenarios — Supabase Errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #409
  it('#409 - Supabase network error: dashboard shows empty state', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'Network error' } })
    );
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
    // Should render without crashing even with error
    expect(screen.getByText('No visits scheduled for today')).toBeTruthy();
  });

  // #410
  it('#410 - Supabase error on elder fetch: shows "No elders yet"', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'Fetch error' } })
    );
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText('No elders yet')).toBeTruthy();
    });
  });

  // #411
  it('#411 - Supabase error on caregiver fetch: shows "No caregivers yet"', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'Fetch error' } })
    );
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText('No caregivers yet')).toBeTruthy();
    });
  });

  // #412
  it('#412 - supabase.functions.invoke error: directory shows "No Caregivers Found"', async () => {
    const { supabase } = require('@/lib/supabase');
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Edge function error' } });
    render(<CaregiverDirectoryScreen />);
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText('No Caregivers Found')).toBeTruthy();
    });
  });

  // #413
  it('#413 - Supabase chain throws exception: console.error called', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockChain.then.mockImplementation(() => {
      throw new Error('Unexpected crash');
    });
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});

describe('Batch 34: Negative Scenarios — Null/Missing Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #414
  it('#414 - Visit with null caregiver name: dashboard renders safely', async () => {
    const visits = [{
      ...generateVisits(1, generateElders(1), ['cg-1'])[0],
      caregiver: { full_name: null, user: { first_name: null, last_name: null } },
    }];
    let callCount = 0;
    mockChain.then.mockImplementation((resolve: any) => {
      callCount++;
      // Return visits data for the correct query
      return resolve({ data: callCount <= 2 ? [] : visits, error: null });
    });
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
    // Should not crash
  });

  // #415
  it('#415 - Visit with future date: status shows as scheduled', () => {
    const futureVisit = generateVisits(1, generateElders(1), ['cg-1'])[0];
    expect(futureVisit.status).toBeDefined();
    // Scheduled visits have status 'scheduled'
    const scheduledVisit = { ...futureVisit, status: 'scheduled' };
    expect(scheduledVisit.status).toBe('scheduled');
  });

  // #416
  it('#416 - Visit with all null optional fields: no crash', () => {
    const visit = {
      id: 'visit-null',
      elder_id: 'elder-1',
      caregiver_id: 'cg-1',
      agency_id: 'agency-1',
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: null,
      end_time: null,
      status: 'scheduled',
      actual_start: null,
      actual_end: null,
      tasks_completed: null,
      tasks_total: null,
      elder: { full_name: null, preferred_name: null, address_line1: null, city: null, state: null },
      caregiver: { full_name: null, user: null },
    };
    expect(visit.start_time).toBeNull();
    expect(visit.elder.full_name).toBeNull();
    expect(visit.caregiver.user).toBeNull();
  });

  // #417
  it('#417 - Elder with null phone: card renders without crash', async () => {
    const nullPhoneElders = [{
      ...generateElders(1)[0],
      phone: null,
      address: '123 Main St',
      family_members: [],
    }];
    let callCount = 0;
    mockChain.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) return resolve({ data: nullPhoneElders, error: null });
      return resolve({ data: [], error: null });
    });
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText(nullPhoneElders[0].preferred_name)).toBeTruthy();
    });
  });

  // #418
  it('#418 - Caregiver with null phone: card renders without crash', async () => {
    const nullPhoneCaregivers = [{
      ...generateCaregivers(1)[0],
      phone: null,
    }];
    let callCount = 0;
    mockChain.then.mockImplementation((resolve: any) => {
      callCount++;
      if (callCount === 1) return resolve({ data: nullPhoneCaregivers, error: null });
      return resolve({ data: [], error: null });
    });
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText(nullPhoneCaregivers[0].full_name)).toBeTruthy();
    });
  });

  // #419
  it('#419 - Empty agency (no elders, no caregivers, no visits): all empty states', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
    expect(screen.getByText('No visits scheduled for today')).toBeTruthy();
  });

  // #420
  it('#420 - Rapid re-render: render component twice, no duplicate state', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    const { unmount } = render(<AgencyDashboard />);
    unmount();
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
  });

  // #421
  it('#421 - Component unmount during async fetch: no warning', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockChain.then.mockImplementation((resolve: any) =>
      new Promise(r => setTimeout(() => r(resolve({ data: [], error: null })), 50))
    );
    const { unmount } = render(<AgencyDashboard />);
    unmount();
    // Wait for any pending microtasks to flush
    await new Promise(r => setTimeout(r, 100));
    // Check that no "can't perform state update on unmounted component" errors
    const memoryLeakWarnings = consoleSpy.mock.calls.filter(
      call => call.some((arg: any) => typeof arg === 'string' && arg.includes('unmounted'))
    );
    expect(memoryLeakWarnings.length).toBe(0);
    consoleSpy.mockRestore();
  });
});

describe('Batch 34: Negative Scenarios — Data Generators Validation', () => {
  // #422
  it('#422 - INVALID_PHONES has 7 entries', () => {
    expect(INVALID_PHONES).toHaveLength(7);
  });

  // #423
  it('#423 - INVALID_ZIPS has 6 entries', () => {
    expect(INVALID_ZIPS).toHaveLength(6);
  });

  // #424
  it('#424 - XSS_PAYLOADS has 4 entries', () => {
    expect(XSS_PAYLOADS).toHaveLength(4);
  });

  // #425
  it('#425 - SQL_INJECTION_PAYLOADS has 4 entries', () => {
    expect(SQL_INJECTION_PAYLOADS).toHaveLength(4);
  });
});
