import Link from 'next/link';
import { PublicCaregiverResult, CAPABILITY_LABELS } from '@/types/caregiver';
import { RatingBadge } from './RatingBadge';

interface Props {
  caregiver: PublicCaregiverResult;
}

export function CaregiverCard({ caregiver }: Props) {
  const initials = caregiver.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href={`/caregivers/${caregiver.id}`}
      className="block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-hg-teal-200 transition-all group"
    >
      {/* Top row: Avatar + Name + Badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        {caregiver.photo_url ? (
          <img
            src={caregiver.photo_url}
            alt={caregiver.full_name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-hg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-hg-teal-700 transition-colors">
              {caregiver.full_name}
            </h3>
            {caregiver.npi_verified && (
              <span
                className="flex-shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium"
                title="NPI Verified"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-2.108-2.108 3 3 0 01-5.304 0 3 3 0 00-2.108 2.108 3 3 0 010 5.304 3 3 0 002.108 2.108 3 3 0 015.304 0 3 3 0 002.108-2.108zM13.768 8.232a.75.75 0 10-1.036-1.036L9.5 10.428 8.268 9.196a.75.75 0 00-1.036 1.036l1.75 1.75a.75.75 0 001.036 0l3.75-3.75z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Area: {caregiver.zip_prefix}xx</p>
        </div>
      </div>

      {/* Capabilities */}
      {caregiver.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {caregiver.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium"
            >
              {CAPABILITY_LABELS[cap] || cap}
            </span>
          ))}
          {caregiver.capabilities.length > 4 && (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-400 text-xs">
              +{caregiver.capabilities.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Rating */}
      <div className="flex items-center justify-between">
        <RatingBadge
          ratingCount={caregiver.rating_count}
          positiveCount={caregiver.positive_count}
          size="sm"
        />
        <span className="text-hg-teal-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View Profile &rarr;
        </span>
      </div>
    </Link>
  );
}
