---
name: healthguide-notifications-daily-reports
description: Automated daily care summaries delivered via push notifications. Compiles all visits, completed tasks, observations, and metrics into digestible reports. Sent via Expo Push to family members at configured time. Use when building daily report generation, report customization, or family digest features.
metadata:
  author: HealthGuide
  version: 2.0.0
  category: notifications
  tags: [reports, daily-summary, family, digest, push-notifications]
---

# HealthGuide Daily Reports (Push Notifications)

## Overview
Family members receive daily push notification digests summarizing all care activities for their elder. Reports are sent at a configured time (default 7 PM) and include visit summaries, task completion rates, and caregiver observations. Reports are delivered via Expo Push Notifications (FREE), not SMS.

**IMPORTANT:** Daily reports are delivered via push notifications only. Family members MUST have the HealthGuide Family app installed. See `healthguide-family/onboarding` for the invitation flow.

## Key Features

- Push notification delivery (FREE via Expo)
- Rich notification content with expandable details
- Configurable delivery time per family member
- Visit-by-visit breakdown
- Task completion summary
- Notable observations highlighted
- Missed visit alerts
- Tap to open detailed report in app
- Weekly trend comparison

## Data Models

```typescript
interface DailyReport {
  id: string;
  elder_id: string;
  report_date: string;
  visits: VisitSummary[];
  total_tasks_completed: number;
  total_tasks_assigned: number;
  observations: ObservationSummary[];
  missed_visits: number;
  generated_at: string;
}

interface VisitSummary {
  caregiver_name: string;
  check_in_time: string;
  check_out_time: string;
  duration_minutes: number;
  tasks_completed: number;
  tasks_total: number;
}

interface ObservationSummary {
  category: string;
  note: string;
  recorded_at: string;
  caregiver_name: string;
}

interface ReportPreferences {
  family_member_id: string;
  daily_report_enabled: boolean;
  delivery_time: string; // HH:MM format
  timezone: string;
  include_observations: boolean;
  include_task_details: boolean;
}
```

## Instructions

### Step 1: Daily Report Generation Function

```typescript
// supabase/functions/generate-daily-report/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, differenceInMinutes } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface ReportRequest {
  elder_id: string;
  date: string; // YYYY-MM-DD
}

serve(async (req) => {
  const { elder_id, date }: ReportRequest = await req.json();

  // Get elder info
  const { data: elder } = await supabase
    .from('elders')
    .select('first_name, last_name')
    .eq('id', elder_id)
    .single();

  if (!elder) {
    return new Response(JSON.stringify({ error: 'Elder not found' }), {
      status: 404,
    });
  }

  // Get all visits for the day
  const { data: visits } = await supabase
    .from('visits')
    .select(`
      id,
      actual_start,
      actual_end,
      status,
      caregiver:user_profiles (first_name),
      visit_tasks (
        status,
        task:task_library (name)
      )
    `)
    .eq('elder_id', elder_id)
    .eq('scheduled_date', date)
    .order('scheduled_start');

  // Get observations for the day
  const { data: observations } = await supabase
    .from('observations')
    .select(`
      category,
      note,
      created_at,
      caregiver:user_profiles (first_name)
    `)
    .eq('elder_id', elder_id)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .order('created_at');

  // Compile visit summaries
  const visitSummaries: VisitSummary[] = (visits || [])
    .filter((v: any) => v.status === 'completed')
    .map((v: any) => ({
      caregiver_name: v.caregiver.first_name,
      check_in_time: format(new Date(v.actual_start), 'h:mm a'),
      check_out_time: format(new Date(v.actual_end), 'h:mm a'),
      duration_minutes: differenceInMinutes(
        new Date(v.actual_end),
        new Date(v.actual_start)
      ),
      tasks_completed: v.visit_tasks.filter((t: any) => t.status === 'completed').length,
      tasks_total: v.visit_tasks.length,
    }));

  // Calculate totals
  const totalTasksCompleted = visitSummaries.reduce((sum, v) => sum + v.tasks_completed, 0);
  const totalTasksAssigned = visitSummaries.reduce((sum, v) => sum + v.tasks_total, 0);

  // Check for missed visits
  const missedVisits = (visits || []).filter((v: any) => v.status === 'missed').length;

  // Format observations
  const observationSummaries = (observations || []).map((o: any) => ({
    category: o.category,
    note: o.note,
    recorded_at: format(new Date(o.created_at), 'h:mm a'),
    caregiver_name: o.caregiver.first_name,
  }));

  // Store report
  const report = {
    elder_id,
    report_date: date,
    visits: visitSummaries,
    total_tasks_completed: totalTasksCompleted,
    total_tasks_assigned: totalTasksAssigned,
    observations: observationSummaries,
    missed_visits: missedVisits,
    generated_at: new Date().toISOString(),
  };

  const { data: savedReport } = await supabase
    .from('daily_reports')
    .insert(report)
    .select()
    .single();

  return new Response(
    JSON.stringify(savedReport),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 2: Send Daily Report via Push Notification

```typescript
// supabase/functions/send-daily-report-push/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface SendReportRequest {
  report: DailyReport;
  family_member: FamilyMember;
  elder_name: string;
}

serve(async (req) => {
  const { report, family_member, elder_name }: SendReportRequest = await req.json();

  // Get family member's push tokens
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('expo_push_token')
    .eq('user_id', family_member.user_id)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'No active push tokens' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build push notification content
  const { title, body, data } = buildPushContent(report, elder_name, family_member);

  // Send to all active tokens
  const messages = tokens.map(({ expo_push_token }) => ({
    to: expo_push_token,
    title,
    body,
    data,
    sound: 'default',
    badge: 1,
    categoryId: 'daily_report',
  }));

  // Send via Expo Push API
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();

  // Log notification in database
  await supabase.from('notifications').insert({
    user_id: family_member.user_id,
    type: 'daily_report',
    title,
    body,
    data: JSON.stringify(data),
    sent_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ success: true, result }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function buildPushContent(
  report: DailyReport,
  elderName: string,
  familyMember: FamilyMember
): { title: string; body: string; data: any } {
  const dateStr = format(new Date(report.report_date), 'EEEE, MMM d');
  const completionRate = report.total_tasks_assigned > 0
    ? Math.round((report.total_tasks_completed / report.total_tasks_assigned) * 100)
    : 0;

  // Title
  const title = `📋 ${elderName}'s Daily Report`;

  // Build body based on preferences
  let body = '';

  if (report.visits.length === 0 && report.missed_visits === 0) {
    body = `No visits scheduled for ${dateStr}`;
  } else if (report.visits.length === 0 && report.missed_visits > 0) {
    body = `⚠️ ${report.missed_visits} scheduled visit(s) missed today`;
  } else {
    body = `${report.visits.length} visit(s) completed`;
    body += ` • ${report.total_tasks_completed}/${report.total_tasks_assigned} tasks (${completionRate}%)`;

    if (report.missed_visits > 0) {
      body += ` • ⚠️ ${report.missed_visits} missed`;
    }

    if (report.observations.length > 0) {
      body += ` • ${report.observations.length} note(s)`;
    }
  }

  // Data payload for deep linking
  const data = {
    type: 'daily_report',
    report_id: report.id,
    elder_id: report.elder_id,
    report_date: report.report_date,
    screen: 'FamilyReportDetail',
  };

  return { title, body, data };
}
```

### Step 3: Scheduled Report Dispatcher (Cron)

```typescript
// supabase/functions/dispatch-daily-reports/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format } from 'https://esm.sh/date-fns@2.30.0';
import { utcToZonedTime } from 'https://esm.sh/date-fns-tz@2.0.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// This function runs every 15 minutes via cron
serve(async () => {
  const now = new Date();

  // Get all family members who want daily reports
  const { data: familyMembers } = await supabase
    .from('family_members')
    .select(`
      id,
      user_id,
      elder_id,
      notification_preferences,
      elder:elders (first_name, last_name, agency_id)
    `)
    .eq('invite_status', 'accepted')
    .eq('notification_preferences->>daily_report', 'true');

  if (!familyMembers || familyMembers.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }));
  }

  const processed = [];

  for (const member of familyMembers) {
    // Get member's timezone (default to agency's or EST)
    const timezone = member.notification_preferences?.timezone || 'America/New_York';
    const deliveryTime = member.notification_preferences?.delivery_time || '19:00';

    // Check if it's time to send (within 15-minute window)
    const memberLocalTime = utcToZonedTime(now, timezone);
    const currentTimeStr = format(memberLocalTime, 'HH:mm');

    const [deliveryHour, deliveryMin] = deliveryTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTimeStr.split(':').map(Number);

    const deliveryMinutes = deliveryHour * 60 + deliveryMin;
    const currentMinutes = currentHour * 60 + currentMin;

    // Check if within the 15-minute window
    if (currentMinutes >= deliveryMinutes && currentMinutes < deliveryMinutes + 15) {
      // Check if already sent today
      const today = format(memberLocalTime, 'yyyy-MM-dd');
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('type', 'daily_report')
        .gte('sent_at', `${today}T00:00:00`);

      if (existing && existing.length > 0) {
        continue; // Already sent today
      }

      // Generate report
      const reportDate = format(memberLocalTime, 'yyyy-MM-dd');

      const { data: report } = await supabase.functions.invoke('generate-daily-report', {
        body: {
          elder_id: member.elder_id,
          date: reportDate,
        },
      });

      if (report) {
        // Send push notification
        await supabase.functions.invoke('send-daily-report-push', {
          body: {
            report,
            family_member: member,
            elder_name: `${member.elder.first_name} ${member.elder.last_name}`,
          },
        });

        processed.push(member.id);
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: processed.length, family_members: processed }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Step 4: Report Detail Screen (Family App)

```typescript
// src/app/(protected)/family/report/[id].tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VisitCard } from '@/components/family/VisitCard';
import { ObservationList } from '@/components/family/ObservationList';
import { TaskSummary } from '@/components/family/TaskSummary';

interface DailyReport {
  id: string;
  elder_id: string;
  report_date: string;
  visits: any[];
  total_tasks_completed: number;
  total_tasks_assigned: number;
  observations: any[];
  missed_visits: number;
  generated_at: string;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [elderName, setElderName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  async function fetchReport() {
    const { data } = await supabase
      .from('daily_reports')
      .select(`
        *,
        elder:elders (first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (data) {
      setReport(data);
      setElderName(`${data.elder.first_name} ${data.elder.last_name}`);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.error}>
        <Text>Report not found</Text>
      </View>
    );
  }

  const completionRate = report.total_tasks_assigned > 0
    ? Math.round((report.total_tasks_completed / report.total_tasks_assigned) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.elderName}>{elderName}</Text>
          <Text style={styles.date}>
            {format(new Date(report.report_date), 'EEEE, MMMM d, yyyy')}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{report.visits.length}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{report.observations.length}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
        </View>

        {/* Missed Visits Warning */}
        {report.missed_visits > 0 && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠️ {report.missed_visits} scheduled visit(s) were missed
            </Text>
          </View>
        )}

        {/* Visits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visits</Text>
          {report.visits.length === 0 ? (
            <Text style={styles.emptyText}>No visits completed today</Text>
          ) : (
            report.visits.map((visit, index) => (
              <VisitCard key={index} visit={visit} />
            ))
          )}
        </View>

        {/* Task Summary */}
        <TaskSummary
          completed={report.total_tasks_completed}
          total={report.total_tasks_assigned}
        />

        {/* Observations */}
        {report.observations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caregiver Notes</Text>
            <ObservationList observations={report.observations} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  elderName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  warning: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
```

### Step 5: Report Preferences Screen (Family App)

```typescript
// src/app/(protected)/family/settings/reports.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimePicker } from '@/components/ui/TimePicker';
import { Button } from '@/components/ui/Button';

export default function ReportPreferencesScreen() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    daily_report: true,
    delivery_time: '19:00',
    timezone: 'America/New_York',
    include_observations: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const { data } = await supabase
      .from('family_members')
      .select('notification_preferences')
      .eq('user_id', user?.id)
      .single();

    if (data?.notification_preferences) {
      setPreferences({ ...preferences, ...data.notification_preferences });
    }
  }

  async function savePreferences() {
    setSaving(true);

    await supabase
      .from('family_members')
      .update({ notification_preferences: preferences })
      .eq('user_id', user?.id);

    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Daily Report Settings</Text>

        <View style={styles.option}>
          <Text style={styles.label}>Receive Daily Reports</Text>
          <Switch
            value={preferences.daily_report}
            onValueChange={(val) =>
              setPreferences({ ...preferences, daily_report: val })
            }
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={preferences.daily_report ? '#3B82F6' : '#F3F4F6'}
          />
        </View>

        {preferences.daily_report && (
          <>
            <View style={styles.option}>
              <Text style={styles.label}>Delivery Time</Text>
              <TimePicker
                value={preferences.delivery_time}
                onChange={(time) =>
                  setPreferences({ ...preferences, delivery_time: time })
                }
              />
            </View>

            <View style={styles.option}>
              <Text style={styles.label}>Include Caregiver Notes</Text>
              <Switch
                value={preferences.include_observations}
                onValueChange={(val) =>
                  setPreferences({ ...preferences, include_observations: val })
                }
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={preferences.include_observations ? '#3B82F6' : '#F3F4F6'}
              />
            </View>
          </>
        )}

        <Button
          title="Save Preferences"
          onPress={savePreferences}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#374151',
  },
  saveButton: {
    marginTop: 24,
  },
});
```

### Step 6: Cron Job Configuration

```sql
-- Enable pg_cron extension (Supabase Dashboard → Database → Extensions)
-- Then create the cron job:

SELECT cron.schedule(
  'dispatch-daily-reports',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/dispatch-daily-reports',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

## Cost Comparison

| Delivery Method | Cost per 100 family members/month |
|-----------------|-----------------------------------|
| **SMS Daily Reports** | ~$90/month (30 SMS × $0.03 × 100) |
| **Push Notifications** | FREE (Expo Push) |

**Annual savings:** ~$1,080 per 100 family members

## Notification Categories

Register notification categories for interactive actions:

```typescript
// src/lib/notifications.ts
import * as Notifications from 'expo-notifications';

export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('daily_report', [
    {
      identifier: 'view',
      buttonTitle: 'View Full Report',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);
}
```

## Deep Linking

Handle notification taps to open report details:

```typescript
// src/app/_layout.tsx
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;

      if (data.type === 'daily_report' && data.report_id) {
        router.push(`/family/report/${data.report_id}`);
      }
    }
  );

  return () => subscription.remove();
}, []);
```

## Troubleshooting

### Reports not sending at scheduled time
**Cause:** Cron job timing or timezone mismatch
**Solution:** Verify cron runs every 15 min, check timezone calculations

### Family member not receiving reports
**Cause:** No active push token or notifications disabled
**Solution:** Check device_tokens table, verify notification permissions in app

### Report shows "No visits" but visits occurred
**Cause:** Visits not marked as completed before report generation
**Solution:** Ensure check-out completes properly before report delivery time

### Notification not opening report detail
**Cause:** Deep linking not configured
**Solution:** Verify notification response listener and router setup
