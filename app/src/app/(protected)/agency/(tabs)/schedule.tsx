// HealthGuide Agency Scheduling
// Per healthguide-agency/scheduling skill

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Badge, Button } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { CalendarIcon, ClockIcon, CaregiverIcon, ElderIcon, ChevronRightIcon, ChevronDownIcon } from '@/components/icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ScheduledVisit {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  caregiver_name: string;
  elder_name: string;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday start

  const toggleExpand = (visitId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) {
        next.delete(visitId);
      } else {
        next.add(visitId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedVisits.size === selectedDayVisits.length) {
      // All expanded → collapse all
      setExpandedVisits(new Set());
    } else {
      // Expand all
      setExpandedVisits(new Set(selectedDayVisits.map((v) => v.id)));
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVisits();
    }, [selectedDate])
  );

  async function fetchVisits() {
    if (!user?.agency_id) {
      setLoading(false);
      return;
    }

    try {
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          scheduled_start,
          scheduled_end,
          status,
          caregiver:user_profiles!caregiver_id (
            first_name,
            last_name
          ),
          elder:elders (
            first_name,
            last_name
          )
        `)
        .eq('agency_id', user.agency_id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('scheduled_date')
        .order('scheduled_start');

      if (error) throw error;

      if (data) {
        const formattedVisits = data.map((v: any) => {
          // Transform caregiver join
          const caregiverRaw = Array.isArray(v.caregiver) ? v.caregiver[0] : v.caregiver;
          const caregiverName = caregiverRaw
            ? [caregiverRaw.first_name, caregiverRaw.last_name].filter(Boolean).join(' ') || 'Unassigned'
            : 'Unassigned';

          // Transform elder join
          const elderRaw = Array.isArray(v.elder) ? v.elder[0] : v.elder;
          const elderName = elderRaw
            ? [elderRaw.first_name, elderRaw.last_name].filter(Boolean).join(' ') || 'Unknown Elder'
            : 'Unknown Elder';

          return {
            id: v.id,
            scheduled_date: v.scheduled_date,
            scheduled_start: v.scheduled_start || '',
            scheduled_end: v.scheduled_end || '',
            status: v.status || 'scheduled',
            caregiver_name: caregiverName,
            elder_name: elderName,
          };
        });

        setVisits(formattedVisits);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    }

    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchVisits();
    setRefreshing(false);
  }

  // Generate dates for the week view
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter visits for selected day
  const selectedDayVisits = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return visits.filter((v) => v.scheduled_date === dateStr);
  }, [visits, selectedDate]);

  // Get visit count for a day
  function getVisitCountForDay(date: Date): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    return visits.filter((v) => v.scheduled_date === dateStr).length;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', variant: 'success' as const };
      case 'in_progress':
        return { label: 'In Progress', variant: 'warning' as const };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'error' as const };
      case 'missed':
        return { label: 'Missed', variant: 'error' as const };
      default:
        return { label: 'Scheduled', variant: 'neutral' as const };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success[500];
      case 'in_progress':
        return colors.warning[500];
      case 'cancelled':
      case 'missed':
        return colors.error[500];
      default:
        return colors.neutral[400];
    }
  };

  function formatTime(time: string): string {
    if (!time) return '';
    // Handle ISO timestamp (e.g. "2024-01-15T09:00:00") or time string (e.g. "09:00")
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      const hour = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }
    // Fallback: parse as "HH:MM" string
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  const allExpanded = selectedDayVisits.length > 0 && expandedVisits.size === selectedDayVisits.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Week Navigation */}
      <View style={styles.calendarSection}>
        <View style={styles.weekNav}>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, -7))}>
            <Text style={styles.navButton}>Prev</Text>
          </Pressable>
          <Text style={styles.weekLabel}>
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </Text>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, 7))}>
            <Text style={styles.navButton}>Next</Text>
          </Pressable>
        </View>

        {/* Week Days */}
        <View style={styles.weekRow}>
          {weekDates.map((date, index) => {
            const isToday = isSameDay(date, new Date());
            const isSelected = isSameDay(date, selectedDate);
            const visitCount = getVisitCountForDay(date);

            return (
              <Pressable
                key={index}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && !isSelected && styles.dayButtonToday,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {format(date, 'EEE')}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
                {visitCount > 0 && (
                  <View style={[styles.slotIndicator, isSelected && styles.slotIndicatorSelected]}>
                    <Text style={[styles.slotCount, isSelected && styles.slotCountSelected]}>
                      {visitCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Day Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateTitle}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>
          {selectedDayVisits.length > 0 && (
            <Text style={styles.visitCountLabel}>
              {selectedDayVisits.length} visit{selectedDayVisits.length !== 1 ? 's' : ''} scheduled
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {selectedDayVisits.length > 0 && (
            <Pressable onPress={toggleExpandAll} style={styles.expandAllBtn}>
              <Text style={styles.expandAllText}>
                {allExpanded ? 'Collapse' : 'Expand'}
              </Text>
            </Pressable>
          )}
          <Button
            title="+ Add"
            variant="primary"
            size="sm"
            onPress={() => {
              router.push(`/(protected)/agency/assignment/new?date=${format(selectedDate, 'yyyy-MM-dd')}` as any);
            }}
          />
        </View>
      </View>

      {/* Schedule List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading schedule...</Text>
          </View>
        ) : selectedDayVisits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <CalendarIcon size={48} color={colors.neutral[300]} />
            </View>
            <Text style={styles.emptyText}>No visits scheduled</Text>
            <Text style={styles.emptySubtext}>
              Tap "+ Add" to schedule a visit
            </Text>
          </View>
        ) : (
          selectedDayVisits.map((visit, index) => {
            const isExpanded = expandedVisits.has(visit.id);
            const statusBadge = getStatusBadge(visit.status);

            return (
              <Pressable
                key={visit.id}
                onPress={() => toggleExpand(visit.id)}
                style={styles.visitCard}
              >
                <View style={[styles.cardInner, isExpanded && styles.cardInnerExpanded]}>
                  {/* Status indicator bar */}
                  <View
                    style={[
                      styles.statusBar,
                      { backgroundColor: getStatusColor(visit.status) },
                    ]}
                  />

                  {/* Collapsed row: always visible */}
                  <View style={styles.collapsedRow}>
                    <View style={styles.visitNumber}>
                      <Text style={styles.visitNumberText}>{index + 1}</Text>
                    </View>
                    <ElderIcon size={18} color={roleColors.careseeker} />
                    <Text style={styles.elderNameText} numberOfLines={1}>
                      {visit.elder_name}
                    </Text>
                    <Text style={styles.timeChip}>
                      {formatTime(visit.scheduled_start)}
                    </Text>
                    <View style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
                      <ChevronDownIcon size={16} color={colors.text.tertiary} />
                    </View>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.detailRow}>
                        <ClockIcon size={16} color={colors.text.secondary} />
                        <Text style={styles.detailText}>
                          {formatTime(visit.scheduled_start)} - {formatTime(visit.scheduled_end)}
                        </Text>
                        <Badge
                          label={statusBadge.label}
                          variant={statusBadge.variant}
                          size="sm"
                        />
                      </View>
                      <View style={styles.detailRow}>
                        <CaregiverIcon size={18} color={roleColors.caregiver} />
                        <Text style={styles.detailText}>{visit.caregiver_name}</Text>
                        <ChevronRightIcon size={14} color={colors.text.tertiary} />
                        <ElderIcon size={18} color={roleColors.careseeker} />
                        <Text style={styles.detailText}>{visit.elder_name}</Text>
                      </View>
                      <Pressable
                        onPress={() => router.push(`/(protected)/agency/assignment/${visit.id}` as any)}
                        style={styles.viewDetailsBtn}
                      >
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <ChevronRightIcon size={14} color={roleColors.agency_owner} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendarSection: {
    backgroundColor: colors.surface,
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  navButton: {
    ...typography.styles.body,
    color: colors.primary[500],
    fontWeight: '500',
  },
  weekLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[2],
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    minWidth: 44,
  },
  dayButtonSelected: {
    backgroundColor: roleColors.agency_owner,
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  dayLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  dayLabelSelected: {
    color: colors.white,
  },
  dayNumber: {
    ...typography.styles.label,
    color: colors.text.primary,
  },
  dayNumberToday: {
    color: colors.primary[500],
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: colors.white,
  },
  slotIndicator: {
    backgroundColor: colors.success[500],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  slotIndicatorSelected: {
    backgroundColor: colors.white,
  },
  slotCount: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  slotCountSelected: {
    color: roleColors.agency_owner,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  expandAllBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  expandAllText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  dateTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  visitCountLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[0.5],
  },
  scrollContent: {
    padding: spacing[4],
    paddingTop: 0,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyIcon: {
    marginBottom: spacing[3],
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  visitCard: {
    marginBottom: spacing[1.5],
  },
  cardInner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  cardInnerExpanded: {
    borderColor: roleColors.agency_owner,
    borderWidth: 1.5,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    paddingLeft: spacing[4],
    gap: spacing[2],
  },
  visitNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: roleColors.agency_owner,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  elderNameText: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  timeChip: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  expandedContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    paddingTop: spacing[1],
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    marginTop: spacing[1],
    backgroundColor: roleColors.agency_owner + '10',
    borderRadius: borderRadius.md,
  },
  viewDetailsText: {
    ...typography.styles.caption,
    color: roleColors.agency_owner,
    fontWeight: '600',
  },
  statusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
});
