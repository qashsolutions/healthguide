import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RatingBadge } from '@/components/RatingBadge';
import { DownloadCTA } from '@/components/DownloadCTA';
import { CAPABILITY_LABELS } from '@/types/caregiver';
import type { PublicCaregiverResult } from '@/types/caregiver';

// ISR: revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: { id: string };
}

async function fetchCaregiver(id: string): Promise<PublicCaregiverResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('public-caregiver-search', {
      body: { caregiver_id: id },
    });

    // If the edge function doesn't support single-caregiver lookup,
    // fall back to fetching all and filtering. For now, attempt direct lookup.
    if (data?.caregivers && data.caregivers.length > 0) {
      return data.caregivers[0];
    }

    // Fallback: query directly with safe column selection
    const { data: profileData, error: profileError } = await supabase
      .from('caregiver_profiles')
      .select('id, full_name, photo_url, zip_code, capabilities, npi_verified, bio, rating_count, positive_count, created_at')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (profileError || !profileData) return null;

    return {
      id: profileData.id,
      full_name: profileData.full_name,
      photo_url: profileData.photo_url,
      zip_prefix: profileData.zip_code ? profileData.zip_code.substring(0, 3) : '',
      capabilities: profileData.capabilities || [],
      npi_verified: profileData.npi_verified,
      bio: profileData.bio,
      rating_count: profileData.rating_count || 0,
      positive_count: profileData.positive_count || 0,
      created_at: profileData.created_at,
    };
  } catch {
    return null;
  }
}

async function fetchReviews(caregiverId: string) {
  try {
    const { data } = await supabase
      .from('caregiver_ratings')
      .select('id, is_positive, tags, comment, created_at')
      .eq('caregiver_profile_id', caregiverId)
      .order('created_at', { ascending: false })
      .limit(5);

    return data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const caregiver = await fetchCaregiver(params.id);

  if (!caregiver) {
    return { title: 'Caregiver Not Found — HealthGuide' };
  }

  const percentage = caregiver.rating_count > 0
    ? Math.round((caregiver.positive_count / caregiver.rating_count) * 100)
    : 0;

  const ratingText = caregiver.rating_count > 0
    ? ` | ${percentage}% positive (${caregiver.rating_count} reviews)`
    : '';

  return {
    title: `${caregiver.full_name} — Caregiver Profile | HealthGuide`,
    description: `${caregiver.full_name} is a${caregiver.npi_verified ? ' verified' : ''} caregiver in the ${caregiver.zip_prefix}xx area${ratingText}. ${caregiver.bio?.substring(0, 120) || 'View their full profile on HealthGuide.'}`,
  };
}

const TAG_LABELS: Record<string, string> = {
  reliable: 'Reliable',
  compassionate: 'Compassionate',
  skilled: 'Skilled',
  punctual: 'Punctual',
  professional: 'Professional',
  communicative: 'Communicative',
};

export default async function CaregiverProfilePage({ params }: PageProps) {
  const caregiver = await fetchCaregiver(params.id);
  if (!caregiver) notFound();

  const reviews = await fetchReviews(caregiver.id);

  const initials = caregiver.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const percentage = caregiver.rating_count > 0
    ? Math.round((caregiver.positive_count / caregiver.rating_count) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <a
        href="/caregivers"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-hg-teal-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to search
      </a>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          {caregiver.photo_url ? (
            <img
              src={caregiver.photo_url}
              alt={caregiver.full_name}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-hg-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-2xl">{initials}</span>
            </div>
          )}

          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {caregiver.full_name}
              </h1>
              {caregiver.npi_verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-2.108-2.108 3 3 0 01-5.304 0 3 3 0 00-2.108 2.108 3 3 0 010 5.304 3 3 0 002.108 2.108 3 3 0 015.304 0 3 3 0 002.108-2.108zM13.768 8.232a.75.75 0 10-1.036-1.036L9.5 10.428 8.268 9.196a.75.75 0 00-1.036 1.036l1.75 1.75a.75.75 0 001.036 0l3.75-3.75z" clipRule="evenodd" />
                  </svg>
                  NPI Verified
                </span>
              )}
            </div>
            <p className="text-gray-500">Area: {caregiver.zip_prefix}xx</p>

            {/* Rating */}
            <div className="mt-3">
              <RatingBadge
                ratingCount={caregiver.rating_count}
                positiveCount={caregiver.positive_count}
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {caregiver.capabilities.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-sans font-bold text-gray-900 mb-3">Skills & Capabilities</h2>
          <div className="flex flex-wrap gap-2">
            {caregiver.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-3 py-1.5 rounded-full bg-hg-emerald-50 text-hg-emerald-600 text-sm font-medium border border-hg-emerald-200"
              >
                {CAPABILITY_LABELS[cap] || cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {caregiver.bio && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-sans font-bold text-gray-900 mb-3">About</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{caregiver.bio}</p>
        </div>
      )}

      {/* Ratings summary + recent reviews */}
      {caregiver.rating_count > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-sans font-bold text-gray-900 mb-4">Reviews</h2>

          {/* Summary bar */}
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
            <span className="text-3xl">{percentage >= 50 ? '\uD83D\uDC4D' : '\uD83D\uDC4E'}</span>
            <div>
              <p className="text-2xl font-bold text-hg-emerald-600">{percentage}% positive</p>
              <p className="text-sm text-gray-500">{caregiver.rating_count} total reviews</p>
            </div>
          </div>

          {/* Recent reviews */}
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{review.is_positive ? '\uD83D\uDC4D' : '\uD83D\uDC4E'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {review.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                        {TAG_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}
                {review.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download CTA */}
      <DownloadCTA caregiverName={caregiver.full_name} />
    </div>
  );
}
