/**
 * public-caregiver-search — Public-facing caregiver directory search
 *
 * No authentication required. Uses service_role to query, but returns
 * ONLY safe columns (no phone, email, rate, full zip, NPI number).
 *
 * Used by the public web directory (healthguide-web).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PublicSearchRequest {
  zip_code?: string;
  capabilities?: string[];
  npi_verified_only?: boolean;
  page?: number;
  page_size?: number;
}

interface PublicCaregiverResult {
  id: string;
  full_name: string;
  photo_url: string | null;
  zip_prefix: string; // First 3 digits only
  capabilities: string[];
  npi_verified: boolean;
  bio: string | null;
  rating_count: number;
  positive_count: number;
  created_at: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: PublicSearchRequest = await req.json();
    const {
      zip_code,
      capabilities,
      npi_verified_only = false,
      page = 1,
      page_size = 20,
    } = body;

    // Clamp page_size
    const limit = Math.min(Math.max(page_size, 1), 50);
    const offset = (Math.max(page, 1) - 1) * limit;

    // Build query — only select SAFE columns
    let query = supabase
      .from('caregiver_profiles')
      .select(
        'id, full_name, photo_url, zip_code, capabilities, npi_verified, bio, rating_count, positive_count, created_at',
        { count: 'exact' }
      )
      .eq('is_active', true);

    // Zip code filter
    if (zip_code) {
      const cleaned = zip_code.replace(/\D/g, '');
      if (cleaned.length === 5) {
        // Exact zip match
        query = query.eq('zip_code', cleaned);
      } else if (cleaned.length >= 3) {
        // Area prefix match (~50 mile radius)
        const prefix = cleaned.substring(0, 3);
        query = query.like('zip_code', `${prefix}%`);
      }
    }

    // Capabilities filter
    if (capabilities && capabilities.length > 0) {
      query = query.contains('capabilities', capabilities);
    }

    // NPI verified filter
    if (npi_verified_only) {
      query = query.eq('npi_verified', true);
    }

    // Order: best-rated first, then verified, then newest
    query = query
      .order('positive_count', { ascending: false })
      .order('rating_count', { ascending: false })
      .order('npi_verified', { ascending: false })
      .order('created_at', { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform: replace full zip with 3-digit prefix
    const safeResults: PublicCaregiverResult[] = (data || []).map((c: any) => ({
      id: c.id,
      full_name: c.full_name,
      photo_url: c.photo_url,
      zip_prefix: c.zip_code ? c.zip_code.substring(0, 3) : '',
      capabilities: c.capabilities || [],
      npi_verified: c.npi_verified,
      bio: c.bio,
      rating_count: c.rating_count || 0,
      positive_count: c.positive_count || 0,
      created_at: c.created_at,
    }));

    return new Response(
      JSON.stringify({
        caregivers: safeResults,
        total_count: count || 0,
        page,
        page_size: limit,
        has_more: offset + limit < (count || 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
