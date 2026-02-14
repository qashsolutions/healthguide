// HealthGuide Search Caregivers Edge Function
// Searches caregiver marketplace with filters for zip code, rate, capabilities, availability, and NPI verification.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface SearchCaregiversRequest {
  zip_code: string;
  radius?: 'exact' | 'area';
  hourly_rate_max?: number;
  capabilities?: string[];
  availability_day?: string;
  availability_time?: string;
  npi_verified_only?: boolean;
  page?: number;
  limit?: number;
}

interface CaregiverResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  zip_code: string;
  hourly_rate: number | null;
  npi_verified: boolean;
  capabilities: string[];
  availability: Record<string, unknown> | null;
  bio: string | null;
  rating_count: number;
  positive_count: number;
  created_at: string;
}

serve(async (req) => {
  try {
    const payload: SearchCaregiversRequest = await req.json();

    // Validate required fields
    if (!payload.zip_code) {
      return jsonResponse({ success: false, error: 'zip_code is required' }, 400);
    }

    // Set defaults
    const radius = payload.radius || 'area';
    const page = Math.max(1, payload.page || 1);
    const limit = Math.min(50, Math.max(1, payload.limit || 20));
    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from('caregiver_profiles')
      .select(
        `
        id,
        full_name,
        photo_url,
        zip_code,
        hourly_rate,
        npi_verified,
        capabilities,
        availability,
        bio,
        rating_count,
        positive_count,
        created_at
        `,
        { count: 'exact' }
      )
      .eq('is_active', true);

    // Apply zip code filter
    if (radius === 'exact') {
      query = query.eq('zip_code', payload.zip_code);
    } else {
      // Area match: first 3 digits of zip code
      const zipPrefix = payload.zip_code.substring(0, 3);
      query = query.ilike('zip_code', `${zipPrefix}%`);
    }

    // Apply hourly rate filter
    if (payload.hourly_rate_max !== undefined) {
      query = query.or(
        `hourly_rate.lte.${payload.hourly_rate_max},hourly_rate.is.null`
      );
    }

    // Apply capabilities filter
    if (payload.capabilities && payload.capabilities.length > 0) {
      query = query.contains('capabilities', payload.capabilities);
    }

    // Apply NPI verified filter
    if (payload.npi_verified_only) {
      query = query.eq('npi_verified', true);
    }

    // Execute query with ordering and pagination
    const { data, error, count } = await query
      .order('npi_verified', { ascending: false })
      .order('positive_count', { ascending: false })
      .order('rating_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database query error:', error);
      return jsonResponse({ success: false, error: error.message }, 400);
    }

    // Apply availability filter (client-side after fetching)
    let filteredResults = data || [];

    if (payload.availability_day && payload.availability_time) {
      filteredResults = filteredResults.filter((caregiver) => {
        if (!caregiver.availability) return false;

        const availability = caregiver.availability as Record<string, unknown>;
        const dayAvailability = availability[payload.availability_day!];

        if (!dayAvailability) return false;

        // Check if the time period is in the availability for this day
        if (Array.isArray(dayAvailability)) {
          return dayAvailability.includes(payload.availability_time);
        }

        return false;
      });
    }

    // Format caregiver results (truncate bio to 200 chars, limit capabilities to 5)
    const caregiverResults: CaregiverResult[] = filteredResults.map((caregiver) => ({
      ...caregiver,
      bio: caregiver.bio ? caregiver.bio.substring(0, 200) : null,
      capabilities: Array.isArray(caregiver.capabilities)
        ? caregiver.capabilities.slice(0, 5)
        : [],
    }));

    const totalCount = count || 0;
    const hasMore = offset + limit < totalCount;

    return jsonResponse({
      success: true,
      caregivers: caregiverResults,
      total_count: totalCount,
      page,
      limit,
      has_more: hasMore,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
