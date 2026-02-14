// HealthGuide Dashboard Stats Edge Function
// Aggregates agency statistics for dashboard view

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
} from 'https://esm.sh/date-fns@2.30.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface DashboardRequest {
  agency_id: string;
  period: 'weekly' | 'monthly';
}

interface Alert {
  id: string;
  type: 'missed_visit' | 'late_checkin' | 'pending_handshake' | 'expiring_license' | 'unassigned_visit';
  title: string;
  description: string;
  link?: string;
  priority: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  try {
    const { agency_id, period }: DashboardRequest = await req.json();

    const now = new Date();
    const periodStart =
      period === 'weekly'
        ? startOfWeek(now, { weekStartsOn: 1 })
        : startOfMonth(now);
    const periodEnd =
      period === 'weekly' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now);

    const periodStartStr = format(periodStart, 'yyyy-MM-dd');
    const periodEndStr = format(periodEnd, 'yyyy-MM-dd');
    const todayStr = format(now, 'yyyy-MM-dd');

    // Fetch all data in parallel
    const [
      caregiversResult,
      eldersResult,
      visitsResult,
      todayVisitsResult,
      assignmentsResult,
    ] = await Promise.all([
      // Caregivers count
      supabase
        .from('user_profiles')
        .select('id, is_active')
        .eq('agency_id', agency_id)
        .eq('role', 'caregiver'),

      // Elders count
      supabase
        .from('elders')
        .select('id, is_active')
        .eq('agency_id', agency_id),

      // Visits for the period
      supabase
        .from('visits')
        .select('id, status, scheduled_date, actual_start')
        .eq('agency_id', agency_id)
        .gte('scheduled_date', periodStartStr)
        .lte('scheduled_date', periodEndStr),

      // Today's visits with details
      supabase
        .from('visits')
        .select(`
          id,
          scheduled_start,
          scheduled_end,
          status,
          caregiver:user_profiles!caregiver_id (first_name),
          elder:elders!elder_id (first_name, last_name)
        `)
        .eq('agency_id', agency_id)
        .eq('scheduled_date', todayStr)
        .order('scheduled_start'),

      // Assignments for weekly overview
      supabase
        .from('visits')
        .select(`
          id,
          scheduled_date,
          caregiver_id,
          elder_id,
          caregiver:user_profiles!caregiver_id (first_name, last_name),
          elder:elders!elder_id (first_name, last_name)
        `)
        .eq('agency_id', agency_id)
        .gte('scheduled_date', periodStartStr)
        .lte('scheduled_date', periodEndStr)
        .order('scheduled_date'),
    ]);

    // Process caregivers
    const caregivers = caregiversResult.data || [];
    const totalCaregivers = caregivers.length;
    const activeCaregivers = caregivers.filter((c) => c.is_active).length;

    // Process elders
    const elders = eldersResult.data || [];
    const totalElders = elders.length;
    const activeElders = elders.filter((e) => e.is_active).length;

    // Process visits
    const visits = visitsResult.data || [];
    const visitsThisPeriod = visits.length;
    const completedVisits = visits.filter((v) => v.status === 'completed').length;
    const missedVisits = visits.filter((v) => v.status === 'missed').length;
    const completionRate =
      visitsThisPeriod > 0
        ? ((completedVisits / (completedVisits + missedVisits)) * 100) || 0
        : 100;

    // Today's visits
    const todayVisits = todayVisitsResult.data || [];

    // Process assignments for grid
    const assignments = (assignmentsResult.data || []).map((a: any) => ({
      id: a.id,
      caregiver_id: a.caregiver_id,
      caregiver_name: a.caregiver
        ? `${a.caregiver.first_name} ${a.caregiver.last_name}`
        : 'Unknown',
      elder_id: a.elder_id,
      elder_name: a.elder
        ? `${a.elder.first_name} ${a.elder.last_name}`
        : 'Unknown',
      date: a.scheduled_date,
    }));

    // Generate alerts
    const alerts: Alert[] = [];

    // Missed visits (high priority)
    const recentMissed = visits.filter(
      (v) => v.status === 'missed' && isRecent(v.scheduled_date, 3)
    );
    if (recentMissed.length > 0) {
      alerts.push({
        id: 'missed-visits',
        type: 'missed_visit',
        title: `${recentMissed.length} Missed Visit${recentMissed.length > 1 ? 's' : ''}`,
        description: 'Visits that were not completed as scheduled',
        link: '/agency/visits?status=missed',
        priority: 'high',
      });
    }

    // Late check-ins today
    const lateCheckins = todayVisits.filter(
      (v: any) =>
        v.status === 'scheduled' &&
        new Date(v.scheduled_start) < new Date() &&
        new Date() < new Date(new Date(v.scheduled_start).getTime() + 60 * 60 * 1000) // Within 1 hour of scheduled start
    );
    if (lateCheckins.length > 0) {
      alerts.push({
        id: 'late-checkins',
        type: 'late_checkin',
        title: `${lateCheckins.length} Late Check-in${lateCheckins.length > 1 ? 's' : ''}`,
        description: 'Caregivers who haven\'t checked in yet',
        link: '/agency/visits?status=scheduled',
        priority: 'medium',
      });
    }

    // Unassigned visits
    const unassigned = todayVisits.filter((v: any) => !v.caregiver_id);
    if (unassigned.length > 0) {
      alerts.push({
        id: 'unassigned',
        type: 'unassigned_visit',
        title: `${unassigned.length} Unassigned Visit${unassigned.length > 1 ? 's' : ''}`,
        description: 'Visits without a caregiver assigned',
        link: '/agency/scheduling',
        priority: 'high',
      });
    }

    const stats = {
      totalCaregivers,
      activeCaregivers,
      totalElders,
      activeElders,
      visitsThisPeriod,
      completedVisits,
      missedVisits,
      completionRate,
      todayVisits,
      assignments,
      alerts,
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function isRecent(dateStr: string, daysAgo: number): boolean {
  const date = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  return date >= cutoff;
}
