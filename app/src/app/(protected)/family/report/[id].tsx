// HealthGuide Family Report Detail Screen
// Detailed view of a daily care report for family members

import { useState, useEffect } from 'react';
import { createShadow } from '@/theme/spacing';
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

function BackIcon({ size = 24, color = '#1F2937' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon({ size = 20, color = '#10B981' }) {
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

function AlertCircleIcon({ size = 20, color = '#F59E0B' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M12 8v4M12 16h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AlertTriangleIcon({ size = 20, color = '#EF4444' }) {
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

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    mood: '😊',
    appetite: '🍽️',
    mobility: '🚶',
    sleep: '😴',
    medication: '💊',
    hygiene: '🚿',
    social: '👥',
    pain: '🩹',
    cognitive: '🧠',
    vital_signs: '❤️',
    other: '📝',
  };
  return emojiMap[category] || '📝';
}

function getFlaggedConfig(isFlagged: boolean) {
  if (isFlagged) {
    return { color: '#EF4444', bgColor: '#FEF2F2', icon: AlertTriangleIcon };
  }
  return { color: '#10B981', bgColor: '#ECFDF5', icon: CheckCircleIcon };
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
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <BackIcon />
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
          <BackIcon />
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Flagged Observations</Text>

            {flaggedObservations.map((obs) => {
              const config = getFlaggedConfig(obs.is_flagged);
              const Icon = config.icon;
              return (
                <View
                  key={obs.id}
                  style={[styles.alertItem, { backgroundColor: config.bgColor }]}
                >
                  <Icon color={config.color} />
                  <View style={styles.alertContent}>
                    <Text style={[styles.alertCategory, { color: config.color }]}>
                      {getCategoryEmoji(obs.category)} {obs.category.replace('_', ' ')}
                    </Text>
                    <Text style={styles.alertText}>{obs.value}</Text>
                    {obs.note && (
                      <Text style={styles.alertNote}>{obs.note}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Visits Section */}
        <View style={styles.card}>
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
        </View>

        {/* Observations Section */}
        {normalObservations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Observations</Text>

            {normalObservations.map((obs) => (
              <View key={obs.id} style={styles.observationItem}>
                <View style={styles.observationHeader}>
                  <Text style={styles.observationCategory}>
                    {getCategoryEmoji(obs.category)} {obs.category.replace('_', ' ')}
                  </Text>
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
            ))}
          </View>
        )}

        {/* Summary */}
        {report.summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.summaryText}>{report.summary}</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  dateSection: {
    padding: 16,
    backgroundColor: '#3B82F6',
  },
  dateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  elderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...createShadow(1, 0.05, 4, 1),
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    ...createShadow(1, 0.05, 4, 1),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertCategory: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  alertNote: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  visitItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitCaregiver: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  visitTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  visitProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280',
    minWidth: 70,
  },
  visitNotes: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  observationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  observationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  observationCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  observationTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  observationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  observationNote: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  observationCaregiver: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 24,
  },
});
