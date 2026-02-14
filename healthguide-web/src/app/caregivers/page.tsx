import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { SearchFilters } from '@/components/SearchFilters';
import { CaregiverCard } from '@/components/CaregiverCard';
import { DownloadCTA } from '@/components/DownloadCTA';
import type { PublicCaregiverResult, SearchResponse } from '@/types/caregiver';

interface PageProps {
  searchParams: { zip?: string; capabilities?: string; page?: string };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const zip = searchParams.zip;
  const title = zip
    ? `Caregivers near ${zip} — HealthGuide`
    : 'Find Caregivers — HealthGuide';

  return {
    title,
    description: `Browse verified caregiver profiles${zip ? ` near ${zip}` : ''}. See skills, ratings, and NPI verification status.`,
  };
}

async function searchCaregivers(
  zip?: string,
  capabilities?: string[],
  page: number = 1
): Promise<{ caregivers: PublicCaregiverResult[]; totalCount: number; hasMore: boolean }> {
  try {
    const body: Record<string, unknown> = {
      page,
      limit: 20,
    };

    if (zip) body.zip_code = zip;
    if (capabilities && capabilities.length > 0) body.capabilities = capabilities;

    const { data, error } = await supabase.functions.invoke('public-caregiver-search', {
      body,
    });

    if (error || !data?.success) {
      return { caregivers: [], totalCount: 0, hasMore: false };
    }

    return {
      caregivers: data.caregivers || [],
      totalCount: data.total_count || 0,
      hasMore: data.has_more || false,
    };
  } catch {
    return { caregivers: [], totalCount: 0, hasMore: false };
  }
}

export default async function CaregiversPage({ searchParams }: PageProps) {
  const zip = searchParams.zip || '';
  const capabilitiesStr = searchParams.capabilities || '';
  const capabilities = capabilitiesStr ? capabilitiesStr.split(',') : [];
  const page = parseInt(searchParams.page || '1', 10);

  const hasSearch = !!zip || capabilities.length > 0;
  const { caregivers, totalCount, hasMore } = hasSearch
    ? await searchCaregivers(zip, capabilities, page)
    : { caregivers: [], totalCount: 0, hasMore: false };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Caregivers</h1>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <SearchFilters initialZip={zip} initialCapabilities={capabilities} />
        </div>
      </div>

      {/* Results */}
      {!hasSearch ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">
            Enter a zip code to find caregivers in your area
          </p>
        </div>
      ) : caregivers.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Caregivers Found</h2>
          <p className="text-gray-400">
            Try a different zip code or remove some skill filters to see more results.
          </p>
        </div>
      ) : (
        <>
          {/* Result count */}
          <p className="text-sm text-gray-500 mb-4">
            {totalCount} caregiver{totalCount !== 1 ? 's' : ''} found
            {zip ? ` near ${zip.slice(0, 3)}xx` : ''}
          </p>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {caregivers.map((caregiver) => (
              <CaregiverCard key={caregiver.id} caregiver={caregiver} />
            ))}
          </div>

          {/* Pagination */}
          {hasMore && (
            <div className="text-center">
              <a
                href={`/caregivers?zip=${zip}&capabilities=${capabilitiesStr}&page=${page + 1}`}
                className="inline-block bg-hg-teal-700 text-white px-8 py-3 rounded-xl font-semibold hover:bg-hg-teal-800 transition-colors"
              >
                Load More
              </a>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <div className="mt-16">
        <DownloadCTA />
      </div>
    </div>
  );
}
