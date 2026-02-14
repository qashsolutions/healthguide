---
name: healthguide-agency-dashboard
description: Weekly and monthly dashboard views for HealthGuide agency owners. Shows caregiver assignments, visit statistics, alerts, and operational metrics. Use when building dashboard screens, stats cards, or overview visualizations.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: agency
  tags: [dashboard, analytics, metrics, overview]
---

# HealthGuide Agency Dashboard

## Overview
Agency owners need at-a-glance views of their operation. The dashboard shows caregiver assignments, upcoming visits, completion rates, and alerts requiring attention.

## Dashboard Sections

1. **Quick Stats** - Key metrics at a glance
2. **Today's Schedule** - Visits happening today
3. **Weekly Overview** - Caregiver-to-careseeker assignments
4. **Alerts** - Items requiring attention
5. **Recent Activity** - Latest check-ins/outs

## Instructions

### Step 1: Dashboard Screen

```typescript
// app/(protected)/agency/(tabs)/dashboard.tsx
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/hooks/useResponsive';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { TodaySchedule } from '@/components/dashboard/TodaySchedule';
import { WeeklyOverview } from '@/components/dashboard/WeeklyOverview';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { ViewToggle } from '@/components/ui/ViewToggle';

type ViewMode = 'weekly' | 'monthly';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { isTablet } = useResponsive();
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [viewMode]);

  async function fetchDashboardData() {
    setLoading(true);

    const [statsData, alertsData] = await Promise.all([
      fetchStats(user!.agency_id, viewMode),
      fetchAlerts(user!.agency_id),
    ]);

    setStats(statsData);
    setLoading(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} />
      }
    >
      <View style={styles.header}>
        <ViewToggle
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
          selected={viewMode}
          onChange={setViewMode}
        />
      </View>

      {stats && (
        <>
          <StatsGrid stats={stats} isTablet={isTablet} />
          <AlertsList alerts={stats.alerts} />
          <TodaySchedule visits={stats.todayVisits} />
          <WeeklyOverview
            assignments={stats.assignments}
            viewMode={viewMode}
          />
        </>
      )}
    </ScrollView>
  );
}

interface DashboardStats {
  totalCaregivers: number;
  activeCaregivers: number;
  totalCareseekers: number;
  activeCareseekers: number;
  visitsThisPeriod: number;
  completedVisits: number;
  missedVisits: number;
  completionRate: number;
  todayVisits: Visit[];
  assignments: Assignment[];
  alerts: Alert[];
}

async function fetchStats(agencyId: string, period: ViewMode): Promise<DashboardStats> {
  const { data, error } = await supabase.functions.invoke('get-dashboard-stats', {
    body: { agency_id: agencyId, period },
  });
  if (error) throw error;
  return data;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
});
```

### Step 2: Stats Grid Component

```typescript
// components/dashboard/StatsGrid.tsx
import { View, Text, StyleSheet } from 'react-native';
import { UsersIcon, CalendarIcon, CheckIcon, AlertIcon } from '@/components/icons';

interface Props {
  stats: DashboardStats;
  isTablet: boolean;
}

export function StatsGrid({ stats, isTablet }: Props) {
  const cards = [
    {
      label: 'Active Caregivers',
      value: `${stats.activeCaregivers}/${stats.totalCaregivers}`,
      icon: UsersIcon,
      color: '#3B82F6',
    },
    {
      label: 'Active Elders',
      value: `${stats.activeCareseekers}/${stats.totalCareseekers}`,
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
      icon: CheckIcon,
      color: stats.completionRate >= 90 ? '#10B981' : '#F59E0B',
    },
  ];

  return (
    <View style={[styles.grid, isTablet && styles.gridTablet]}>
      {cards.map((card) => (
        <View
          key={card.label}
          style={[styles.card, isTablet && styles.cardTablet]}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${card.color}20` }]}>
            <card.icon size={24} color={card.color} />
          </View>
          <Text style={styles.value}>{card.value}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
```

### Step 3: Today's Schedule Component

```typescript
// components/dashboard/TodaySchedule.tsx
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Visit } from '@/types/scheduling';
import { format } from 'date-fns';
import { ClockIcon, PersonIcon, LocationIcon } from '@/components/icons';

interface Props {
  visits: Visit[];
}

export function TodaySchedule({ visits }: Props) {
  const router = useRouter();

  if (visits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.empty}>No visits scheduled for today</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.count}>{visits.length} visits</Text>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.visitCard}
            onPress={() => router.push(`/agency/visit/${item.id}`)}
          >
            <View style={styles.timeRow}>
              <ClockIcon size={14} color="#6B7280" />
              <Text style={styles.time}>
                {format(new Date(item.scheduled_start), 'h:mm a')} -
                {format(new Date(item.scheduled_end), 'h:mm a')}
              </Text>
            </View>

            <Text style={styles.careseeker}>{item.careseeker?.full_name}</Text>
            <Text style={styles.caregiver}>
              <PersonIcon size={12} color="#9CA3AF" /> {item.caregiver?.full_name}
            </Text>

            <View style={[styles.status, styles[`status_${item.status}`]]}>
              <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    padding: 24,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  visitCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  careseeker: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  caregiver: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  status_scheduled: {
    backgroundColor: '#DBEAFE',
  },
  status_checked_in: {
    backgroundColor: '#D1FAE5',
  },
  status_in_progress: {
    backgroundColor: '#FEF3C7',
  },
  status_completed: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
```

### Step 4: Weekly Overview Grid

```typescript
// components/dashboard/WeeklyOverview.tsx
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { format, startOfWeek, addDays } from 'date-fns';
import { Assignment } from '@/types/scheduling';

interface Props {
  assignments: Assignment[];
  viewMode: 'weekly' | 'monthly';
}

export function WeeklyOverview({ assignments, viewMode }: Props) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group assignments by caregiver and day
  const grid = buildAssignmentGrid(assignments, days);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {viewMode === 'weekly' ? 'This Week' : 'This Month'}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Header row - days */}
          <View style={styles.row}>
            <View style={styles.caregiverCell} />
            {days.map((day) => (
              <View key={day.toISOString()} style={styles.dayCell}>
                <Text style={styles.dayName}>{format(day, 'EEE')}</Text>
                <Text style={styles.dayNumber}>{format(day, 'd')}</Text>
              </View>
            ))}
          </View>

          {/* Caregiver rows */}
          {Object.entries(grid).map(([caregiverId, caregiverData]) => (
            <View key={caregiverId} style={styles.row}>
              <View style={styles.caregiverCell}>
                <Text style={styles.caregiverName}>{caregiverData.name}</Text>
              </View>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayAssignments = caregiverData.days[dateStr] || [];

                return (
                  <View key={day.toISOString()} style={styles.assignmentCell}>
                    {dayAssignments.map((assignment, i) => (
                      <View
                        key={i}
                        style={[styles.assignmentBadge, { backgroundColor: assignment.color }]}
                      >
                        <Text style={styles.assignmentText} numberOfLines={1}>
                          {assignment.careseeker}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function buildAssignmentGrid(assignments: Assignment[], days: Date[]) {
  const grid: Record<string, { name: string; days: Record<string, any[]> }> = {};

  assignments.forEach((assignment) => {
    if (!grid[assignment.caregiver_id]) {
      grid[assignment.caregiver_id] = {
        name: assignment.caregiver_name,
        days: {},
      };
    }

    const dateStr = format(new Date(assignment.date), 'yyyy-MM-dd');
    if (!grid[assignment.caregiver_id].days[dateStr]) {
      grid[assignment.caregiver_id].days[dateStr] = [];
    }

    grid[assignment.caregiver_id].days[dateStr].push({
      careseeker: assignment.careseeker_name,
      color: getColorForCareseeker(assignment.careseeker_id),
    });
  });

  return grid;
}

function getColorForCareseeker(id: string): string {
  const colors = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#E0E7FF'];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  grid: {
    minWidth: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  caregiverCell: {
    width: 100,
    padding: 8,
    justifyContent: 'center',
  },
  caregiverName: {
    fontSize: 13,
    fontWeight: '500',
  },
  dayCell: {
    width: 80,
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  assignmentCell: {
    width: 80,
    minHeight: 60,
    padding: 4,
    gap: 4,
  },
  assignmentBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  assignmentText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
```

### Step 5: Alerts List Component

```typescript
// components/dashboard/AlertsList.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertIcon, ClockIcon, PersonIcon } from '@/components/icons';

interface Alert {
  id: string;
  type: 'missed_visit' | 'late_checkin' | 'pending_handshake' | 'expiring_license';
  title: string;
  description: string;
  link?: string;
  priority: 'high' | 'medium' | 'low';
}

interface Props {
  alerts: Alert[];
}

export function AlertsList({ alerts }: Props) {
  const router = useRouter();

  if (alerts.length === 0) return null;

  const highPriority = alerts.filter((a) => a.priority === 'high');
  const otherAlerts = alerts.filter((a) => a.priority !== 'high');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Alerts {alerts.length > 0 && `(${alerts.length})`}
      </Text>

      {highPriority.map((alert) => (
        <Pressable
          key={alert.id}
          style={[styles.alert, styles.alertHigh]}
          onPress={() => alert.link && router.push(alert.link)}
        >
          <AlertIcon size={20} color="#DC2626" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertDescription}>{alert.description}</Text>
          </View>
        </Pressable>
      ))}

      {otherAlerts.map((alert) => (
        <Pressable
          key={alert.id}
          style={styles.alert}
          onPress={() => alert.link && router.push(alert.link)}
        >
          <AlertIcon size={20} color="#F59E0B" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertDescription}>{alert.description}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  alertHigh: {
    backgroundColor: '#FEE2E2',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
});
```

## Troubleshooting

### Dashboard loading slowly
**Cause:** Too many database queries
**Solution:** Use Supabase Edge Function to aggregate stats server-side

### Stats not updating after visit completion
**Cause:** Realtime subscription not set up
**Solution:** Subscribe to visits table changes or refresh on focus
