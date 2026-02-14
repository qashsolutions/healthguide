// HealthGuide Agency Dashboard Stats Grid
// Shows key metrics at a glance with responsive layout

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface DashboardStats {
  totalCaregivers: number;
  activeCaregivers: number;
  totalElders: number;
  activeElders: number;
  visitsThisPeriod: number;
  completedVisits: number;
  missedVisits: number;
  completionRate: number;
}

interface Props {
  stats: DashboardStats;
  isTablet?: boolean;
}

// Icons
function UsersIcon({ size = 24, color = '#3B82F6' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ size = 24, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 24, color = '#10B981' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m9 11 3 3L22 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertIcon({ size = 24, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StatsGrid({ stats, isTablet = false }: Props) {
  const cards = [
    {
      label: 'Active Caregivers',
      value: `${stats.activeCaregivers}/${stats.totalCaregivers}`,
      icon: UsersIcon,
      color: '#3B82F6',
    },
    {
      label: 'Active Elders',
      value: `${stats.activeElders}/${stats.totalElders}`,
      icon: UsersIcon,
      color: '#8B5CF6',
    },
    {
      label: 'Visits This Period',
      value: stats.visitsThisPeriod.toString(),
      icon: CalendarIcon,
      color: '#10B981',
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(stats.completionRate)}%`,
      icon: stats.completionRate >= 90 ? CheckIcon : AlertIcon,
      color: stats.completionRate >= 90 ? '#10B981' : '#F59E0B',
    },
  ];

  return (
    <View style={[styles.grid, isTablet && styles.gridTablet]}>
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <View
            key={card.label}
            style={[styles.card, isTablet && styles.cardTablet]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${card.color}20` },
              ]}
            >
              <IconComponent size={24} color={card.color} />
            </View>
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  gridTablet: {
    padding: 16,
    gap: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTablet: {
    width: '23%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
