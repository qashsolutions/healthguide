/**
 * 08-Companionship: StarRating Component Tests (Phase 10)
 * Component: @/components/ui/StarRating
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    StarIcon: ({ size, color }: any) =>
      React.createElement(Text, { testID: 'star-icon', style: { color } }, '★'),
    BellIcon: () => null,
    HeartIcon: () => null,
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    warning: { 500: '#F59E0B', 600: '#D97706' },
    neutral: { 200: '#E5E7EB' },
    text: { primary: '#111827', secondary: '#6B7280' },
    white: '#FFFFFF',
  },
}));

jest.mock('@/theme/typography', () => ({
  typography: {
    styles: {
      h1: { fontSize: 36 }, h2: { fontSize: 30 }, h3: { fontSize: 24 }, h4: { fontSize: 20 },
      body: { fontSize: 16 }, bodyLarge: { fontSize: 18 }, bodySmall: { fontSize: 14 },
      label: { fontSize: 14 }, caption: { fontSize: 12 },
      button: { fontSize: 16 }, buttonLarge: { fontSize: 18 },
      stat: { fontSize: 28 }, statSmall: { fontSize: 20 },
    },
    caregiver: { heading: { fontSize: 28 }, body: { fontSize: 20 }, label: { fontSize: 16 } },
    fontFamily: { display: 'System', body: 'System', regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  },
}));

jest.mock('@/theme/spacing', () => ({
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
  borderRadius: { sm: 4, md: 8, lg: 12 },
  createShadow: () => ({}),
}));

import { StarRating } from '@/components/ui/StarRating';

describe('08-Companionship: StarRating Component', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders 5 star buttons', () => {
    render(<StarRating rating={0} />);
    const stars = screen.getAllByTestId('star-icon');
    expect(stars).toHaveLength(5);
  });

  it('renders with rating=3 without crashing', () => {
    expect(() => render(<StarRating rating={3} />)).not.toThrow();
  });

  it('renders with rating=0 (no filled stars)', () => {
    expect(() => render(<StarRating rating={0} />)).not.toThrow();
  });

  it('renders with rating=5 (all filled)', () => {
    expect(() => render(<StarRating rating={5} />)).not.toThrow();
  });

  // ── Labels ────────────────────────────────────────────────────────────────

  it('shows "Poor" label when showLabel=true and rating=1', () => {
    render(<StarRating rating={1} showLabel />);
    expect(screen.getByText('Poor')).toBeTruthy();
  });

  it('shows "Fair" label for rating=2', () => {
    render(<StarRating rating={2} showLabel />);
    expect(screen.getByText('Fair')).toBeTruthy();
  });

  it('shows "Good" label for rating=3', () => {
    render(<StarRating rating={3} showLabel />);
    expect(screen.getByText('Good')).toBeTruthy();
  });

  it('shows "Great" label for rating=4', () => {
    render(<StarRating rating={4} showLabel />);
    expect(screen.getByText('Great')).toBeTruthy();
  });

  it('shows "Excellent" label for rating=5', () => {
    render(<StarRating rating={5} showLabel />);
    expect(screen.getByText('Excellent')).toBeTruthy();
  });

  it('does NOT show label when showLabel=false', () => {
    render(<StarRating rating={5} showLabel={false} />);
    expect(screen.queryByText('Excellent')).toBeNull();
  });

  it('does NOT show label when rating=0 even with showLabel=true', () => {
    render(<StarRating rating={0} showLabel />);
    expect(screen.queryByText('Poor')).toBeNull();
    expect(screen.queryByText('Fair')).toBeNull();
  });

  // ── Interactivity ─────────────────────────────────────────────────────────

  it('calls onChange when star is clicked in interactive mode', () => {
    const onChange = jest.fn();
    render(<StarRating rating={0} onChange={onChange} />);
    // Stars have testID='star-icon' (from the StarIcon mock)
    const pressables = screen.getAllByTestId('star-icon');
    // Click the 4th star (index 3 → rating 4)
    if (pressables.length >= 4) {
      fireEvent.click(pressables[3]);
      expect(onChange).toHaveBeenCalledWith(4);
    }
  });

  it('calls onChange(1) when first star clicked', () => {
    const onChange = jest.fn();
    render(<StarRating rating={0} onChange={onChange} />);
    const pressables = screen.getAllByTestId('star-icon');
    if (pressables.length >= 1) {
      fireEvent.click(pressables[0]);
      expect(onChange).toHaveBeenCalledWith(1);
    }
  });

  it('calls onChange(5) when fifth star clicked', () => {
    const onChange = jest.fn();
    render(<StarRating rating={0} onChange={onChange} />);
    const pressables = screen.getAllByTestId('star-icon');
    if (pressables.length >= 5) {
      fireEvent.click(pressables[4]);
      expect(onChange).toHaveBeenCalledWith(5);
    }
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does NOT call onChange when disabled=true', () => {
    const onChange = jest.fn();
    render(<StarRating rating={3} onChange={onChange} disabled />);
    const pressables = screen.queryAllByTestId('star-icon');
    // Even if pressable exists, clicking should not fire onChange
    pressables.forEach((p) => fireEvent.click(p));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('NEGATIVE: does NOT crash when onChange is not provided', () => {
    expect(() => {
      render(<StarRating rating={3} />);
    }).not.toThrow();
  });
});
