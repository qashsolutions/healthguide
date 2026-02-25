import type { PublicCaregiverResult } from '../../src/types/caregiver';

/** Maria Santos — has photo, NPI verified, 5 skills, 10 reviews (90% positive), bio text */
export const MARIA: PublicCaregiverResult = {
  id: 'fixture-maria-santos-001',
  full_name: 'Maria Santos',
  photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  zip_prefix: '782',
  capabilities: ['companionship', 'meal_preparation', 'light_housekeeping', 'errands', 'transportation'],
  npi_verified: true,
  bio: 'Experienced caregiver with 10 years of experience working with elderly clients. I specialize in companionship and daily living assistance, and love building meaningful relationships with those I care for.',
  rating_count: 10,
  positive_count: 9,
  created_at: '2024-01-15T00:00:00.000Z',
};

/** James Wilson — no photo (initials fallback), not NPI verified, 2 skills, 0 reviews, no bio */
export const JAMES: PublicCaregiverResult = {
  id: 'fixture-james-wilson-002',
  full_name: 'James Wilson',
  photo_url: null,
  zip_prefix: '100',
  capabilities: ['companionship', 'errands'],
  npi_verified: false,
  bio: null,
  rating_count: 0,
  positive_count: 0,
  created_at: '2024-02-10T00:00:00.000Z',
};

/** Caregiver with 5 skills → "+1 more" truncation on card */
export const MANY_SKILLS: PublicCaregiverResult = {
  id: 'fixture-many-skills-003',
  full_name: 'Alice Brown',
  photo_url: null,
  zip_prefix: '900',
  capabilities: ['companionship', 'meal_preparation', 'light_housekeeping', 'errands', 'transportation'],
  npi_verified: false,
  bio: 'Dedicated caregiver.',
  rating_count: 2,
  positive_count: 2,
  created_at: '2024-03-01T00:00:00.000Z',
};

/** 40% positive → 👎 badge */
export const LOW_RATING: PublicCaregiverResult = {
  id: 'fixture-low-rating-004',
  full_name: 'Bob Smith',
  photo_url: null,
  zip_prefix: '601',
  capabilities: ['companionship'],
  npi_verified: false,
  bio: 'Caregiver in Chicago area.',
  rating_count: 10,
  positive_count: 4,
  created_at: '2024-03-01T00:00:00.000Z',
};

/** 50% positive → thumbs UP (≥50% threshold) */
export const FIFTY_PERCENT: PublicCaregiverResult = {
  id: 'fixture-fifty-percent-005',
  full_name: 'Carol Davis',
  photo_url: null,
  zip_prefix: '770',
  capabilities: ['companionship', 'errands'],
  npi_verified: false,
  bio: 'Friendly and reliable.',
  rating_count: 10,
  positive_count: 5,
  created_at: '2024-03-01T00:00:00.000Z',
};

/** 49% positive → 👎 badge */
export const FORTY_NINE_PERCENT: PublicCaregiverResult = {
  id: 'fixture-49pct-006',
  full_name: 'Derek Hall',
  photo_url: null,
  zip_prefix: '334',
  capabilities: ['companionship'],
  npi_verified: false,
  bio: 'Caregiver.',
  rating_count: 100,
  positive_count: 49,
  created_at: '2024-03-01T00:00:00.000Z',
};

export const REVIEWS = [
  {
    id: 'review-001',
    is_positive: true,
    tags: ['reliable', 'compassionate'],
    comment: 'Maria was wonderful with my mother. Highly recommend!',
    created_at: '2024-12-01T00:00:00.000Z',
  },
  {
    id: 'review-002',
    is_positive: true,
    tags: ['punctual'],
    comment: 'Always on time and very professional.',
    created_at: '2024-11-15T00:00:00.000Z',
  },
];

/** Build a standard search response envelope */
export function searchResponse(
  caregivers: PublicCaregiverResult[],
  opts: { hasMore?: boolean; page?: number; total?: number } = {}
) {
  return {
    success: true,
    caregivers,
    total_count: opts.total ?? caregivers.length,
    has_more: opts.hasMore ?? false,
    page: opts.page ?? 1,
    limit: 20,
  };
}

/** Build a "not found" edge function response */
export function notFoundResponse() {
  return { success: true, caregivers: [], total_count: 0, has_more: false, page: 1, limit: 20 };
}

/** Build an error response */
export function errorResponse() {
  return { success: false, error: 'Internal server error', caregivers: [], total_count: 0, has_more: false };
}
