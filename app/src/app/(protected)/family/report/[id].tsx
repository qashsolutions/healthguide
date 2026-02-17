// HealthGuide Family Report Detail Screen
// Detailed view of a daily care report for family members

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday } from 'date-fns';
import Svg, { Path, Circle } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import {
  ArrowLeftIcon,
  SmileFaceIcon,
  UtensilsIcon,
  WalkingIcon,
  MoonIcon,
  PillIcon,
  ShowerIcon,
  UsersIcon,
  BandageIcon,
  BrainIcon,
  HeartIcon,
  NoteIcon,
  IconProps,
} from '@/components/icons';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows, layout } from '@/theme/spacing';

interface DailyReport {
  id: string;
  report_date: string;
  created_at: string;
  summary: string | null;
  elder: {
    first_name: string;
    last_name: string;
  };
  visits: ReportVisit[];
  observations: Observation[];
}

interface ReportVisit {
  id: string;
  actual_start: string;
  actual_end: string;
  caregiver: {
    first_name: string;
    last_name: string;
  };
  tasks_completed: number;
  tasks_total: number;
  notes: string | null;
}

interface Observation {
  id: string;
  category: string;
  value: string;
  note: string | null;
  is_flagged: boolean;
  created_at: string;
  caregiver: {
    first_name: string;
  };
}

function CheckCircleIcon({ size = 20, color = colors.success[500] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertTriangleIcon({ size = 20, color = colors.error[500] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function getCategoryIcon(category: string): React.ComponentType<IconProps> {
  const iconMap: Record<string, React.ComponentType<IconProps>> = {
    mood: SmileFaceIcon,
    appetite: UtensilsIcon,
    mobility: WalkingIcon,
    sleep: MoonIcon,
    medication: PillIcon,
    hygiene: ShowerIcon,
    social: UsersIcon,
    pain: BandageIcon,
    cognitive: BrainIcon,
    vital_signs: HeartIcon,
    other: NoteIcon,
  };
  return iconMap[category] || NoteIcon;
}

function getFlaggedConfig(isFlagged: boolean) {
  if (isFlagged) {
    return { color: colors.error[500], bgColor: colors.error[50], icon: AlertTriangleIcon };
  }
  return { color: colors.success[500], bgColor: colors.success[50], icon: CheckCircleIcon };
}

export default function FamilyReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id]);

  async function loadReport() {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          id,
          report_date,
          created_at,
          summary,
          elder:elders!elder_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get visits for the report date
      const { data: visits } = await supabase
        .from('visits')
        .select(`
          id,
          actual_start,
          actual_end,
          notes,
          caregiver:user_profiles!caregiver_id (
            first_name,
            last_name
          ),
          visit_tasks (status)
        `)
        .eq('elder_id', (Array.isArray(data.elder) ? data.elder[0] : data.elder).id)
        .eq('scheduled_date', data.report_date)
        .eq('status', 'completed');

      // Transform Supabase join (array) to object
      const elderData = Array.isArray(data.elder) ? data.elder[0] : data.elder;

      // Get observations for the report date
      const { data: observations } = await supabase
        .from('observations')
        .select(`
          id,
          category,
          value,
          note,
          is_flagged,
          created_at,
          caregiver:user_profiles!caregiver_id (first_name)
        `)
        .eq('elder_id', elderData.id)
        .gte('created_at', `${data.report_date}T00:00:00`)
        .lt('created_at', `${data.report_date}T23:59:59`)
        .order('created_at', { ascending: false });

      const formattedVisits = (visits || []).map((v: any) => ({
        ...v,
        tasks_completed: v.visit_tasks?.filter((t: any) => t.status === 'completed').length || 0,
        tasks_total: v.visit_tasks?.length || 0,
      }));

      // Transform observations caregiver joins
      const formattedObservations = (observations || []).map((o: any) => ({
        ...o,
        caregiver: Array.isArray(o.caregiver) ? o.caregiver[0] : o.caregiver,
      }));

      setReport({
        ...data,
        elder: elderData,
        visits: formattedVisits,
        observations: formattedObservations,
      } as DailyReport);
    } catch (error) {
      console.error('Error loading report:', error);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={roleColors.family} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIcon color={colors.text.primary} />
          </Pressable>
          <Text style={styles.title}>Report Not Found</Text>
        </View>
        <View style={styles.loading}>
          <Text style={styles.errorText}>This report could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalTasks = report.visits.reduce((sum, v) => sum + v.tasks_total, 0);
  const completedTasks = report.visits.reduce((sum, v) => sum + v.tasks_completed, 0);
  const flaggedObservations = report.observations.filter((o) => o.is_flagged);
  const normalObservations = report.observations.filter((o) => !o.is_flagged);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeftIcon color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Daily Report</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll}>
        {/* Date and Elder */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formatDate(report.report_date)}</Text>
          <Text style={styles.elderText}>
            Care for {report.elder.first_name} {report.elder.last_name}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{report.visits.length}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {completedTasks}/{totalTasks}
            </Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{report.observations.length}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </View>

        {/* Alerts Section */}
        {flaggedObservations.length > 0 && (
          <Card style={styles.cardSpacing}>
            <Text style={styles.cardTitle}>Flagged Observations</Text>

            {flaggedObservations.map((obs) => {
              const config = getFlaggedConfig(obs.is_flagged);
              const FlagIcon = config.icon;
              const CategoryIcon = getCategoryIcon(obs.category);
              return (
                <View
                  key={obs.id}
                  style={[styles.alertItem, { backgroundColor: config.bgColor }]}
                >
                  <FlagIcon color={config.color} />
                  <View style={styles.alertContent}>
                    <View style={styles.categoryRow}>
                      <CategoryIcon size={16} color={config.color} />
                      <Text style={[styles.alertCategory, { color: config.color }]}>
                        {obs.category.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.alertText}>{obs.value}</Text>
                    {obs.note && (
                      <Text style={styles.alertNote}>{obs.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Visits Section */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardTitle}>Visits</Text>

          {report.visits.length > 0 ? (
            report.visits.map((visit) => (
              <Pressable
                key={visit.id}
                style={styles.visitItem}
                onPress={() => router.push(`/family/visit/${visit.id}`)}
              >
                <View style={styles.visitHeader}>
                  <Text style={styles.visitCaregiver}>
                    {visit.caregiver.first_name} {visit.caregiver.last_name}
                  </Text>
                  <Text style={styles.visitTime}>
                    {format(new Date(visit.actual_start), 'h:mm a')} -{' '}
                    {format(new Date(visit.actual_end), 'h:mm a')}
                  </Text>
                </View>

                <View style={styles.visitProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            visit.tasks_total > 0
                              ? (visit.tasks_completed / visit.tasks_total) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {visit.tasks_completed}/{visit.tasks_total} tasks
                  </Text>
                </View>

                {visit.notes && (
                  <Text style={styles.visitNotes} numberOfLines={2}>
                    {visit.notes}
                  </Text>
                )}
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No visits recorded</Text>
          )}
        </Card>

        {/* Observations Section */}
        {normalObservations.length > 0 && (
          <Card style={styles.cardSpacing}>
            <Text style={styles.cardTitle}>Observations</Text>

            {normalObservations.map((obs) => {
              const CategoryIcon = getCategoryIcon(obs.category);
              return (
              <View key={obs.id} style={styles.observationItem}>
                <View style={styles.observationHeader}>
                  <View style={styles.categoryRow}>
                    <CategoryIcon size={16} color={colors.text.secondary} />
                    <Text style={styles.observationCategory}>
                      {obs.category.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.observationTime}>
                    {format(new Date(obs.created_at), 'h:mm a')}
                  </Text>
                </View>
                <Text style={styles.observationText}>{obs.value}</Text>
                {obs.note && (
                  <Text style={styles.observationNote}>{obs.note}</Text>
                )}
                <Text style={styles.observationCaregiver}>
                  - {obs.caregiver.first_name}
                </Text>
              </View>
              );
            })}
          </Card>
        )}

        {/* Summary */}
        {report.summary && (
          <Card style={styles.cardSpacing}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing[2],
  },
  title: {
    ...typography.styles.h4,
    fontSize: 18,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  dateSection: {
    padding: layout.screenPadding,
    backgroundColor: roleColors.family,
  },
  dateText: {
    ...typography.styles.h3,
    color: colors.white,
  },
  elderText: {
    ...typography.styles.body,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing[1],
  },
  statsRow: {
    flexDirection: 'row',
    padding: layout.screenPadding,
    gap: layout.cardGap,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: layout.screenPadding,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    ...typography.styles.stat,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  cardSpacing: {
    marginHorizontal: layout.screenPadding,
    marginBottom: layout.cardGap,
  },
  cardTitle: {
    ...typography.styles.label,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  alertItem: {
    flexDirection: 'row',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  alertContent: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  alertCategory: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: spacing[1],
  },
  alertText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  alertNote: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
  visitItem: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  visitCaregiver: {
    ...typography.styles.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  visitTime: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
  },
  visitProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    marginRight: spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success[500],
    borderRadius: 3,
  },
  progressText: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    minWidth: 70,
  },
  visitNotes: {
    ...typography.styles.bodySmall,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  emptyText: {
    ...typography.styles.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingVertical: layout.screenPadding,
  },
  observationItem: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  observationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1.5],
  },
  observationCategory: {
    ...typography.styles.bodySmall,
    fontWeight: '500',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  observationTime: {
    ...typography.styles.caption,
    color: colors.neutral[400],
  },
  observationText: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  observationNote: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
  observationCaregiver: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  summaryText: {
    ...typography.styles.body,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  bottomPadding: {
    height: layout.sectionGap,
  },
});
