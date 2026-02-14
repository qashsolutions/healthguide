// HealthGuide Verify NPI Edge Function
// Validates NPI number against NPPES registry and updates caregiver profile.
// Uses Luhn algorithm with healthcare prefix 80840 for validation.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface VerifyNPIRequest {
  npi_number: string;
  user_id: string;
}

serve(async (req) => {
  try {
    const payload: VerifyNPIRequest = await req.json();

    // Validate NPI format: must be exactly 10 digits
    if (!payload.npi_number || !/^\d{10}$/.test(payload.npi_number)) {
      return jsonResponse(
        { success: false, error: 'NPI must be exactly 10 digits' },
        400
      );
    }

    if (!payload.user_id) {
      return jsonResponse({ success: false, error: 'user_id is required' }, 400);
    }

    // Validate Luhn check digit with healthcare prefix 80840
    const prefixedNPI = '80840' + payload.npi_number;
    if (!isValidLuhn(prefixedNPI)) {
      return jsonResponse(
        { success: false, error: 'Invalid NPI check digit' },
        400
      );
    }

    // Call NPPES API to verify NPI
    const nppesUrl = `https://npiregistry.cms.hhs.gov/api/?number=${payload.npi_number}&version=2.1`;
    const nppesResponse = await fetch(nppesUrl);

    if (!nppesResponse.ok) {
      console.error('NPPES API error:', nppesResponse.statusText);
      return jsonResponse(
        { success: false, error: 'Failed to query NPPES registry' },
        500
      );
    }

    const nppesData = await nppesResponse.json() as Record<string, unknown>;
    const resultCount = (nppesData.result_count as number) || 0;

    if (resultCount === 0) {
      return jsonResponse({
        success: true,
        npi_verified: false,
        error: 'NPI not found in NPPES registry',
      });
    }

    // Extract provider information from NPPES response
    const results = nppesData.results as unknown[];
    if (!results || results.length === 0) {
      return jsonResponse({
        success: true,
        npi_verified: false,
        error: 'NPI not found in NPPES registry',
      });
    }

    const providerData = results[0] as Record<string, unknown>;
    const basicInfo = providerData.basic as Record<string, unknown>;
    const taxonomies = providerData.taxonomies as Record<string, unknown>[];

    const name = `${basicInfo?.first_name || ''} ${basicInfo?.last_name || ''}`.trim();
    const credentials = basicInfo?.credential as string || '';
    const enumerationType = providerData.enumeration_type as string || '';

    // Extract taxonomy (primary is first in list)
    let taxonomyCode = '';
    let specialty = '';
    let licenseState = '';
    let licenseNumber = '';

    if (taxonomies && taxonomies.length > 0) {
      const primaryTaxonomy = taxonomies[0];
      taxonomyCode = (primaryTaxonomy.code as string) || '';
      specialty = (primaryTaxonomy.desc as string) || '';
      licenseState = (primaryTaxonomy.state as string) || '';
      licenseNumber = (primaryTaxonomy.license as string) || '';
    }

    // Build NPI data object
    const npiData = {
      name,
      credentials,
      taxonomy_code: taxonomyCode,
      specialty,
      license_state: licenseState,
      license_number: licenseNumber,
      enumeration_type: enumerationType,
      verified_at: new Date().toISOString(),
    };

    // Update caregiver profile with NPI verification
    const { error: updateError } = await supabase
      .from('caregiver_profiles')
      .update({
        npi_verified: true,
        npi_number: payload.npi_number,
        npi_data: npiData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payload.user_id);

    if (updateError) {
      console.error('Caregiver profile update error:', updateError);
      return jsonResponse(
        { success: false, error: updateError.message },
        400
      );
    }

    return jsonResponse({
      success: true,
      npi_verified: true,
      npi_number: payload.npi_number,
      npi_data: npiData,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

/**
 * Validates an NPI number using the Luhn algorithm.
 * The NPI should be prepended with "80840" (healthcare prefix) before validation.
 */
function isValidLuhn(numberString: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = numberString.length - 1; i >= 0; i--) {
    let digit = parseInt(numberString[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
