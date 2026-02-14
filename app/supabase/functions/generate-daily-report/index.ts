// HealthGuide Daily Report Generation Edge Function
// Generates daily care reports for elders and notifies family members

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { format, subDays } from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface DailyReportRequest {
  elder_id?: string; // Optional: generate for specific elder
  report_date?: string; // Optional: defaults to yesterday
  send_notifications?: boolean; // Whether to notify family members
}

interface VisitSummary {
  id: string;
  caregiver_name: string;
  start_time: string;
  end_time: string;
  tasks_completed: number;
  tasks_total: number;
  tasks_skipped: number;
  notes: string | null;
}

interface ObservationSummary {
  id: string;
  category: string;
  value: string;
  note: string | null;
  is_flagged: boolean;
  caregiver_name: string;
  recorded_at: string;
}

serve(async (req) => {
  try {
    const payload: DailyReportRequest = await req.json();

    // Default to yesterday's date
    const reportDate = payload.report_date || format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const sendNotifications = payload.send_notifications !== false;

    // Get elders to generate reports for
    let elderQuery = supabase
      .from('elders')
      .select('id, first_name, last_name, agency_id, is_active')
      .eq('is_active', true);

    if (payload.elder_id) {
      elderQuery = elderQuery.eq('id', payload.elder_id);
    }

    const { data: elders, error: elderError } = await elderQuery;

    if (elderError) {
      return new Response(
        JSON.stringify({ success: false, error: elderError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!elders || elders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reports_generated: 0, message: 'No elders found' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const elder of elders) {
      try {
        // Get visits for the report date
        const { data: visits, error: visitError } = await supabase
          .from('visits')
          .select(`
            id,
            actual_start,
            actual_end,
            status,
            notes,
            caregiver:user_profiles!caregiver_id (first_name, last_name),
            visit_tasks (
              id,
              task_name,
              status
            )
          `)
          .eq('elder_id', elder.id)
          .eq('scheduled_date', reportDate);

        if (visitError) throw visitError;

        // Get observations for the report date
        const { data: observations, error: obsError } = await supabase
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
          .eq('elder_id', elder.id)
          .gte('created_at', `${reportDate}T00:00:00`)
          .lt('created_at', `${reportDate}T23:59:59`);

        if (obsError) throw obsError;

        // Process visits
        const visitSummaries: VisitSummary[] = (visits || [])
          .filter((v: any) => v.status === 'completed')
          .map((v: any) => ({
            id: v.id,
            caregiver_name: `${v.caregiver.first_name} ${v.caregiver.last_name}`,
            start_time: v.actual_start,
            end_time: v.actual_end,
            tasks_completed: v.visit_tasks?.filter((t: any) => t.status === 'completed').length || 0,
            tasks_total: v.visit_tasks?.length || 0,
            tasks_skipped: v.visit_tasks?.filter((t: any) => t.status === 'skipped').length || 0,
            notes: v.notes,
          }));

        // Process observations
        const observationSummaries: ObservationSummary[] = (observations || []).map((o: any) => ({
          id: o.id,
          category: o.category,
          value: o.value,
          note: o.note,
          is_flagged: o.is_flagged,
          caregiver_name: o.caregiver.first_name,
          recorded_at: o.created_at,
        }));

        // Calculate totals
        const totalTasksCompleted = visitSummaries.reduce((sum, v) => sum + v.tasks_completed, 0);
        const totalTasksAssigned = visitSummaries.reduce((sum, v) => sum + v.tasks_total, 0);
        const missedVisits = (visits || []).filter((v: any) => v.status === 'missed').length;

        // Upsert daily report
        const { data: report, error: reportError } = await supabase
          .from('daily_reports')
          .upsert({
            elder_id: elder.id,
            agency_id: elder.agency_id,
            report_date: reportDate,
            visits: visitSummaries,
            total_tasks_completed: totalTasksCompleted,
            total_tasks_assigned: totalTasksAssigned,
            observations: observationSummaries,
            missed_visits: missedVisits,
            generated_at: new Date().toISOString(),
          }, {
            onConflict: 'elder_id,report_date',
          })
          .select()
          .single();

        if (reportError) throw reportError;

        // Send notifications to family members if requested
        if (sendNotifications && report) {
          const notifyResult = await supabase.functions.invoke('notify-daily-report', {
            body: {
              report_id: report.id,
              elder_id: elder.id,
              elder_name: `${elder.first_name} ${elder.last_name}`,
              report_date: reportDate,
              summary: {
                visits_count: visitSummaries.length,
                tasks_completed: totalTasksCompleted,
                tasks_total: totalTasksAssigned,
                observations_count: observationSummaries.length,
                flagged_observations: observationSummaries.filter(o => o.is_flagged).length,
              },
            },
          });

          results.push({
            elder_id: elder.id,
            elder_name: `${elder.first_name} ${elder.last_name}`,
            report_id: report.id,
            notifications_sent: notifyResult.data?.sent || 0,
            success: true,
          });
        } else {
          results.push({
            elder_id: elder.id,
            elder_name: `${elder.first_name} ${elder.last_name}`,
            report_id: report?.id,
            success: true,
          });
        }
      } catch (error) {
        results.push({
          elder_id: elder.id,
          elder_name: `${elder.first_name} ${elder.last_name}`,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        reports_generated: successCount,
        total_elders: elders.length,
        report_date: reportDate,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
