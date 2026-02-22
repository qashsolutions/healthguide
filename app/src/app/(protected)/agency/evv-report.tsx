// HealthGuide EVV Report Screen
// Agency owners view and export completed visit EVV data as CSV

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Card, Badge } from '@/components/ui';
import { colors, roleColors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import {
  ArrowLeftIcon,
  CalendarIcon,
  LocationIcon,
  CheckIcon,
  QRCodeIcon,
  ChevronDownIcon,
} from '@/components/icons';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface EvvVisit {
  id: string;
  scheduled_date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_in_method: string | null;
  duration_minutes: number | null;
  elder_first: string;
  elder_last: string;
  elder_id: string;
  caregiver_name: string;
  caregiver_id: string;
  tasks: string[];
}

interface CaregiverOption {
  id: string;
  full_name: string;
}

export default function EvvReportScreen() {
  const router = useRouter();
  const { agency } = useAuth();
  const agencyId = agency?.id;

  // Date range defaults to current month
  const now = new Date();
  const [fromDate, setFromDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [selectedCaregiver, setSelectedCaregiver] = useState<string | null>(null);
  const [caregivers, setCaregivers] = useState<CaregiverOption[]>([]);
  const [visits, setVisits] = useState<EvvVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showCaregiverPicker, setShowCaregiverPicker] = useState(false);

  // Stats
  const totalVisits = visits.length;
  const gpsVerified = visits.filter(
    (v) => v.check_in_latitude != null && v.check_out_latitude != null
  ).length;
  const qrCheckIns = visits.filter((v) => v.check_in_method === 'qr').length;
  const avgDuration =
    totalVisits > 0
      ? Math.round(
          visits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0) / totalVisits
        )
      : 0;

  // Fetch caregivers for filter dropdown
  useEffect(() => {
    if (!agencyId) return;
    (async () => {
      const { data } = await supabase
        .from('caregiver_agency_links')
        .select('caregiver_id, user_profiles!inner(id, full_name)')
        .eq('agency_id', agencyId)
        .eq('status', 'active');

      if (data) {
        const opts: CaregiverOption[] = data.map((row: any) => ({
          id: row.caregiver_id,
          full_name: (row.user_profiles as any)?.full_name || 'Unknown',
        }));
        setCaregivers(opts);
      }
    })();
  }, [agencyId]);

  // Fetch visits
  const fetchVisits = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    let query = supabase
      .from('visits')
      .select(`
        id,
        scheduled_date,
        scheduled_start,
        scheduled_end,
        actual_start,
        actual_end,
        status,
        check_in_latitude,
        check_in_longitude,
        check_out_latitude,
        check_out_longitude,
        check_in_method,
        duration_minutes,
        elder_id,
        caregiver_id,
        elder:elders!inner(id, first_name, last_name),
        caregiver:user_profiles!inner(id, full_name)
      `)
      .eq('agency_id', agencyId)
      .in('status', ['completed', 'cancelled_late', 'elder_unavailable'])
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', toDate)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_start', { ascending: false });

    if (selectedCaregiver) {
      query = query.eq('caregiver_id', selectedCaregiver);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching EVV visits:', error);
      setLoading(false);
      return;
    }

    // Fetch tasks for all visits in one query
    const visitIds = (data || []).map((v: any) => v.id);
    let taskMap: Record<string, string[]> = {};
    if (visitIds.length > 0) {
      const { data: taskData } = await supabase
        .from('visit_tasks')
        .select('visit_id, task_library!inner(name)')
        .in('visit_id', visitIds);

      if (taskData) {
        for (const t of taskData as any[]) {
          const vid = t.visit_id;
          const name = t.task_library?.name || 'Unknown';
          if (!taskMap[vid]) taskMap[vid] = [];
          taskMap[vid].push(name);
        }
      }
    }

    const mapped: EvvVisit[] = (data || []).map((row: any) => {
      const elder = Array.isArray(row.elder) ? row.elder[0] : row.elder;
      const caregiver = Array.isArray(row.caregiver) ? row.caregiver[0] : row.caregiver;
      return {
        id: row.id,
        scheduled_date: row.scheduled_date,
        scheduled_start: row.scheduled_start,
        scheduled_end: row.scheduled_end,
        actual_start: row.actual_start,
        actual_end: row.actual_end,
        status: row.status,
        check_in_latitude: row.check_in_latitude,
        check_in_longitude: row.check_in_longitude,
        check_out_latitude: row.check_out_latitude,
        check_out_longitude: row.check_out_longitude,
        check_in_method: row.check_in_method,
        duration_minutes: row.duration_minutes,
        elder_first: elder?.first_name || '',
        elder_last: elder?.last_name || '',
        elder_id: row.elder_id,
        caregiver_name: caregiver?.full_name || 'Unknown',
        caregiver_id: row.caregiver_id,
        tasks: taskMap[row.id] || [],
      };
    });

    setVisits(mapped);
    setLoading(false);
  }, [agencyId, fromDate, toDate, selectedCaregiver]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '--';
    try {
      if (time.includes('T')) {
        return format(parseISO(time), 'h:mm a');
      }
      const [h, m] = time.split(':');
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m));
      return format(d, 'h:mm a');
    } catch {
      return time;
    }
  };

  // Build CSV and share/download
  async function handleExportCSV() {
    if (visits.length === 0) {
      Alert.alert('No Data', 'There are no visits to export for this date range.');
      return;
    }

    setExporting(true);

    const header =
      'Service Type,Recipient Name,Recipient ID,Provider Name,Provider ID,Date,Start Time,End Time,Duration (min),Check-In Method,Check-In Lat,Check-In Long,Check-Out Lat,Check-Out Long,Status,Tasks';
    const rows = visits.map((v) => {
      const serviceType = v.tasks.length > 0 ? v.tasks[0] : 'Companionship';
      const recipientName = `${v.elder_first} ${v.elder_last}`;
      const startTime = v.actual_start ? formatTime(v.actual_start) : formatTime(v.scheduled_start);
      const endTime = v.actual_end ? formatTime(v.actual_end) : formatTime(v.scheduled_end);
      const tasks = v.tasks.join('; ');
      return [
        `"${serviceType}"`,
        `"${recipientName}"`,
        v.elder_id,
        `"${v.caregiver_name}"`,
        v.caregiver_id,
        v.scheduled_date,
        startTime,
        endTime,
        v.duration_minutes ?? '',
        v.check_in_method || 'gps',
        v.check_in_latitude ?? '',
        v.check_in_longitude ?? '',
        v.check_out_latitude ?? '',
        v.check_out_longitude ?? '',
        v.status,
        `"${tasks}"`,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const filename = `evv-report-${fromDate}-to-${toDate}.csv`;

    if (Platform.OS === 'web') {
      // Web: Blob download
      try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Web CSV export error:', err);
      }
    } else {
      // Native: expo-file-system + expo-sharing
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const fileUri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export EVV Report',
          });
        } else {
          Alert.alert('Saved', `Report saved to ${fileUri}`);
        }
      } catch (err) {
        console.error('Native CSV export error:', err);
        Alert.alert('Export Error', 'Could not export the report. Please try again.');
      }
    }

    setExporting(false);
  }

  const renderVisitItem = ({ item }: { item: EvvVisit }) => {
    const hasGpsIn = item.check_in_latitude != null;
    const hasGpsOut = item.check_out_latitude != null;
    const isQr = item.check_in_method === 'qr';

    return (
      <Card variant="outlined" padding="md" style={styles.visitCard}>
        <View style={styles.visitHeader}>
          <View style={styles.visitDate}>
            <Text style={styles.visitDateText}>
              {format(parseISO(item.scheduled_date), 'MMM d, yyyy')}
            </Text>
            <Text style={styles.visitTimeText}>
              {formatTime(item.actual_start || item.scheduled_start)} —{' '}
              {formatTime(item.actual_end || item.scheduled_end)}
            </Text>
          </View>
          <View style={styles.visitBadges}>
            {isQr && <Badge label="QR" variant="info" size="sm" />}
            {hasGpsIn && (
              <View style={styles.gpsIndicator}>
                <LocationIcon size={12} color={colors.success[600]} />
                <Text style={styles.gpsText}>In</Text>
              </View>
            )}
            {hasGpsOut && (
              <View style={styles.gpsIndicator}>
                <LocationIcon size={12} color={colors.success[600]} />
                <Text style={styles.gpsText}>Out</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.visitDetails}>
          <Text style={styles.visitDetailLabel}>Caregiver</Text>
          <Text style={styles.visitDetailValue}>{item.caregiver_name}</Text>
        </View>
        <View style={styles.visitDetails}>
          <Text style={styles.visitDetailLabel}>Client</Text>
          <Text style={styles.visitDetailValue}>
            {item.elder_first} {item.elder_last}
          </Text>
        </View>
        <View style={styles.visitDetails}>
          <Text style={styles.visitDetailLabel}>Duration</Text>
          <Text style={styles.visitDetailValue}>
            {item.duration_minutes ? `${item.duration_minutes} min` : '--'}
          </Text>
        </View>
        {item.tasks.length > 0 && (
          <View style={styles.visitDetails}>
            <Text style={styles.visitDetailLabel}>Services</Text>
            <Text style={styles.visitDetailValue}>{item.tasks.join(', ')}</Text>
          </View>
        )}
        <View style={styles.visitDetails}>
          <Text style={styles.visitDetailLabel}>Status</Text>
          <Badge
            label={item.status.replace('_', ' ')}
            variant={item.status === 'completed' ? 'success' : 'warning'}
            size="sm"
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon size={24} />}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>EVV Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={renderVisitItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Date Range Picker */}
            <Card variant="outlined" padding="md" style={styles.filterCard}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateFieldLabel}>From</Text>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => {
                      // Simple date cycling: go back one month
                      const d = parseISO(fromDate);
                      d.setMonth(d.getMonth() - 1);
                      setFromDate(format(startOfMonth(d), 'yyyy-MM-dd'));
                      setToDate(format(endOfMonth(d), 'yyyy-MM-dd'));
                    }}
                  >
                    <CalendarIcon size={16} color={colors.text.secondary} />
                    <Text style={styles.dateInputText}>
                      {format(parseISO(fromDate), 'MMM d, yyyy')}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateFieldLabel}>To</Text>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => {
                      // Cycle forward one month
                      const d = parseISO(fromDate);
                      d.setMonth(d.getMonth() + 1);
                      setFromDate(format(startOfMonth(d), 'yyyy-MM-dd'));
                      setToDate(format(endOfMonth(d), 'yyyy-MM-dd'));
                    }}
                  >
                    <CalendarIcon size={16} color={colors.text.secondary} />
                    <Text style={styles.dateInputText}>
                      {format(parseISO(toDate), 'MMM d, yyyy')}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Caregiver filter */}
              {caregivers.length > 0 && (
                <View style={styles.caregiverFilter}>
                  <Text style={styles.filterLabel}>Caregiver</Text>
                  <Pressable
                    style={styles.caregiverSelect}
                    onPress={() => setShowCaregiverPicker(!showCaregiverPicker)}
                  >
                    <Text style={styles.caregiverSelectText}>
                      {selectedCaregiver
                        ? caregivers.find((c) => c.id === selectedCaregiver)?.full_name ||
                          'Unknown'
                        : 'All Caregivers'}
                    </Text>
                    <ChevronDownIcon size={16} color={colors.text.secondary} />
                  </Pressable>
                  {showCaregiverPicker && (
                    <View style={styles.caregiverDropdown}>
                      <Pressable
                        style={styles.caregiverOption}
                        onPress={() => {
                          setSelectedCaregiver(null);
                          setShowCaregiverPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.caregiverOptionText,
                            !selectedCaregiver && styles.caregiverOptionActive,
                          ]}
                        >
                          All Caregivers
                        </Text>
                      </Pressable>
                      {caregivers.map((cg) => (
                        <Pressable
                          key={cg.id}
                          style={styles.caregiverOption}
                          onPress={() => {
                            setSelectedCaregiver(cg.id);
                            setShowCaregiverPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.caregiverOptionText,
                              selectedCaregiver === cg.id && styles.caregiverOptionActive,
                            ]}
                          >
                            {cg.full_name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Card>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalVisits}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{gpsVerified}</Text>
                <Text style={styles.statLabel}>GPS Verified</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{qrCheckIns}</Text>
                <Text style={styles.statLabel}>QR Check-In</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{avgDuration}</Text>
                <Text style={styles.statLabel}>Avg Min</Text>
              </View>
            </View>

            {/* Export Button */}
            <Button
              title={exporting ? 'Exporting...' : 'Export CSV'}
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleExportCSV}
              disabled={exporting || visits.length === 0}
              style={styles.exportButton}
            />

            {/* Section header */}
            <Text style={styles.sectionTitle}>
              {loading ? 'Loading...' : `${visits.length} Visit${visits.length !== 1 ? 's' : ''}`}
            </Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={roleColors.agency_owner} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No completed visits in this date range.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  filterCard: {
    marginBottom: spacing[4],
  },
  filterLabel: {
    ...typography.styles.label,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dateField: {
    flex: 1,
  },
  dateFieldLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  dateInputText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  caregiverFilter: {
    marginTop: spacing[3],
  },
  caregiverSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  caregiverSelectText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  caregiverDropdown: {
    marginTop: spacing[1],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    maxHeight: 200,
  },
  caregiverOption: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  caregiverOptionText: {
    ...typography.styles.body,
    color: colors.text.primary,
  },
  caregiverOptionActive: {
    color: roleColors.agency_owner,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  statNumber: {
    ...typography.styles.h3,
    color: roleColors.agency_owner,
  },
  statLabel: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[0.5],
  },
  exportButton: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    ...typography.styles.label,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visitCard: {
    marginBottom: spacing[3],
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  visitDate: {},
  visitDateText: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  visitTimeText: {
    ...typography.styles.caption,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  visitBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gpsText: {
    ...typography.styles.caption,
    color: colors.success[700],
    fontWeight: '600',
    fontSize: 10,
  },
  visitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  visitDetailLabel: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  visitDetailValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
});
