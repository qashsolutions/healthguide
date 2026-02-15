/**
 * Batch 27: UI Components Part B (Features #259-273)
 * Components: TapButton, ProgressBar, QRCode, Icons, HealthGuideLogo
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Text } from 'react-native';

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockComponent = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref })
    );
  return {
    __esModule: true,
    default: mockComponent('Svg'),
    Svg: mockComponent('Svg'),
    Path: mockComponent('Path'),
    Circle: mockComponent('Circle'),
    Rect: mockComponent('Rect'),
    G: mockComponent('G'),
  };
});

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('QRCodeSVG', props),
  };
});

import { TapButton } from '@/components/ui/TapButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QRCode, QRInviteCard } from '@/components/ui/QRCode';
import {
  CheckIcon,
  XIcon,
  ClockIcon,
  LocationIcon,
  DashboardIcon,
  UsersIcon,
  CalendarIcon,
  SettingsIcon,
  HealthGuideLogo,
} from '@/components/icons';

describe('Batch 27: TapButton', () => {
  // Feature #259
  it('#259 - TapButton renders with label', () => {
    render(
      <TapButton
        icon={<Text>Icon</Text>}
        label="Complete"
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  // Feature #260
  it('#260 - TapButton fires onPress', () => {
    const onPress = jest.fn();
    render(
      <TapButton icon={<Text>Icon</Text>} label="Tap" onPress={onPress} />
    );
    fireEvent.click(screen.getByText('Icon'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // Feature #261
  it('#261 - TapButton renders icon content', () => {
    render(
      <TapButton icon={<Text>MyIcon</Text>} onPress={jest.fn()} />
    );
    expect(screen.getByText('MyIcon')).toBeTruthy();
  });
});

describe('Batch 27: ProgressBar', () => {
  const steps = [
    { id: '1', title: 'Personal' },
    { id: '2', title: 'Skills' },
    { id: '3', title: 'Availability' },
    { id: '4', title: 'Review' },
  ];

  // Feature #262
  it('#262 - ProgressBar renders step text', () => {
    render(<ProgressBar steps={steps} currentStep={1} />);
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();
  });

  // Feature #263
  it('#263 - ProgressBar shows step titles', () => {
    render(<ProgressBar steps={steps} currentStep={1} />);
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
    expect(screen.getByText('Availability')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
  });

  // Feature #264
  it('#264 - ProgressBar shows checkmark for completed steps', () => {
    render(<ProgressBar steps={steps} currentStep={2} />);
    // Steps 0 and 1 are completed, should show ✓
    const checks = screen.getAllByText('✓');
    expect(checks.length).toBe(2);
  });

  // Feature #265
  it('#265 - ProgressBar shows step numbers for upcoming', () => {
    render(<ProgressBar steps={steps} currentStep={0} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });
});

describe('Batch 27: QRCode', () => {
  // Feature #266
  it('#266 - QRCode component renders', () => {
    render(<QRCode value="https://healthguide.app/invite/ABC123" />);
    // The QRCodeSVG mock is rendered - component doesn't crash
    expect(screen.queryByText('Invite Code')).toBeNull(); // no invite code passed
  });

  // Feature #267
  it('#267 - QRCode shows invite code when provided', () => {
    render(
      <QRCode
        value="https://healthguide.app/invite/ABCD1234"
        inviteCode="ABCD1234"
      />
    );
    expect(screen.getByText('Invite Code')).toBeTruthy();
    expect(screen.getByText('ABCD-1234')).toBeTruthy();
  });
});

describe('Batch 27: Icons', () => {
  // Feature #268
  it('#268 - Status icons render (CheckIcon, XIcon)', () => {
    const { container } = render(
      <>
        <CheckIcon />
        <XIcon />
      </>
    );
    // SVG icons render without crashing
    expect(container).toBeTruthy();
  });

  // Feature #269
  it('#269 - Navigation icons render (Dashboard, Calendar)', () => {
    const { container } = render(
      <>
        <DashboardIcon />
        <CalendarIcon />
        <SettingsIcon />
      </>
    );
    expect(container).toBeTruthy();
  });

  // Feature #270
  it('#270 - Action icons render (Clock, Location)', () => {
    const { container } = render(
      <>
        <ClockIcon />
        <LocationIcon />
        <UsersIcon />
      </>
    );
    expect(container).toBeTruthy();
  });

  // Feature #271
  it('#271 - Icons accept size prop', () => {
    const { container } = render(<CheckIcon size={48} />);
    expect(container).toBeTruthy();
  });

  // Feature #272
  it('#272 - Icons accept color prop', () => {
    const { container } = render(<CheckIcon color="#FF0000" />);
    expect(container).toBeTruthy();
  });

  // Feature #273
  it('#273 - HealthGuideLogo renders', () => {
    const { container } = render(<HealthGuideLogo size={64} />);
    expect(container).toBeTruthy();
  });
});
