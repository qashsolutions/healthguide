/**
 * Batch 10: Agency Settings Tests (Features #95-104)
 * Screen: agency/settings/index.tsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn(),
}));

import AgencySettingsScreen from '@/app/(protected)/agency/settings/index';

describe('Batch 10: Agency Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature #95: Settings page renders
  it('#95 - Settings page renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Task Library')).toBeTruthy();
  });

  // Feature #96: Task Library link renders
  it('#96 - Task Library link renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Task Library')).toBeTruthy();
  });

  // Feature #97: Agency Profile link renders
  it('#97 - Agency Profile link renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Agency Profile')).toBeTruthy();
  });

  // Feature #98: Notification Settings link renders
  it('#98 - Notification Settings link renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });

  // Feature #99: Task Library description
  it('#99 - Task Library description text renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Manage care services your agency offers')).toBeTruthy();
  });

  // Feature #100: Agency Profile description
  it('#100 - Agency Profile description text renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Update agency name, contact info, and branding')).toBeTruthy();
  });

  // Feature #101: Notification Settings description
  it('#101 - Notification Settings description text renders', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Configure alerts and notification preferences')).toBeTruthy();
  });

  // Feature #102: Settings items are pressable
  it('#102 - Task Library item navigates on press', () => {
    render(<AgencySettingsScreen />);
    fireEvent.click(screen.getByText('Task Library'));
    expect(mockPush).toHaveBeenCalledWith('/(protected)/agency/settings/task-library');
  });

  // Feature #103: All 3 settings items render
  it('#103 - All 3 settings items render', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getByText('Task Library')).toBeTruthy();
    expect(screen.getByText('Agency Profile')).toBeTruthy();
    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });

  // Feature #104: Agency Profile navigates on press
  it('#104 - Agency Profile navigates on press', () => {
    render(<AgencySettingsScreen />);
    fireEvent.click(screen.getByText('Agency Profile'));
    expect(mockPush).toHaveBeenCalledWith('/(protected)/agency/settings/profile');
  });
});
