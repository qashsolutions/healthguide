---
name: healthguide-caregiver-ratings
description: Caregiver Ratings System for HealthGuide. Thumbs up/down ratings with selectable tags (reliable, compassionate, skilled, punctual, professional, communicative). One rating per user per caregiver. Denormalized aggregates on caregiver_profiles for fast reads. Displayed in mobile directory cards, profile views, caregiver's own profile, and public web directory.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [ratings, reviews, thumbs, tags, aggregates]
---

# HealthGuide Caregiver Ratings

## Overview

The Caregiver Ratings system allows any authenticated user to rate caregivers using a thumbs up/down model with optional selectable tags and a short comment (max 200 characters). Each user can submit one rating per caregiver, which can be updated (UPSERT). Self-rating is prevented by a database trigger.

Rating aggregates (rating_count, positive_count) are stored directly on caregiver_profiles via database triggers for O(1) read performance in directory listings.

## Rating Model

- **Thumbs up (is_positive = TRUE):** Positive experience
- **Thumbs down (is_positive = FALSE):** Needs improvement
- **Tags (optional):** reliable, compassionate, skilled, punctual, professional, communicative
- **Comment (optional):** Free text, max 200 characters
- **One rating per user per caregiver:** Enforced by UNIQUE constraint, supports UPSERT
- **Self-rating prevention:** Database trigger checks caregiver_profiles.user_id

## Data Model

### caregiver_ratings Table

```sql
CREATE TABLE caregiver_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_positive BOOLEAN NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT CHECK (char_length(comment) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_caregiver_rating UNIQUE (caregiver_profile_id, reviewer_user_id)
);
```

### Denormalized Columns on caregiver_profiles

```sql
ALTER TABLE caregiver_profiles
  ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN positive_count INTEGER NOT NULL DEFAULT 0;
```

### Indexes

- `idx_caregiver_ratings_profile` — caregiver_profile_id
- `idx_caregiver_ratings_reviewer` — reviewer_user_id
- `idx_caregiver_ratings_positive` — (caregiver_profile_id, is_positive)
- `idx_caregiver_ratings_tags` — GIN index on tags array
- `idx_caregiver_ratings_created` — (caregiver_profile_id, created_at DESC)

## Triggers

### prevent_self_rating
Fires BEFORE INSERT OR UPDATE. Raises exception if reviewer_user_id matches the caregiver's user_id.

### update_caregiver_rating_aggregates
Fires AFTER INSERT, UPDATE, or DELETE. Recomputes rating_count and positive_count on the affected caregiver_profiles row.

### update_caregiver_ratings_timestamp
Fires BEFORE UPDATE. Sets updated_at to NOW().

## Helper Function

### get_caregiver_top_tags(p_caregiver_profile_id UUID, p_limit INTEGER DEFAULT 3)
Returns the most-used tags from positive ratings for a given caregiver. Used by the RatingSummary component in full mode.

## RLS Policies

- **Anyone can view ratings:** authenticated + anon can SELECT
- **Users can create own ratings:** authenticated, WITH CHECK reviewer_user_id = auth.uid()
- **Users can update own ratings:** authenticated, USING + WITH CHECK reviewer_user_id = auth.uid()
- **Users can delete own ratings:** authenticated, USING reviewer_user_id = auth.uid()
- **Service role full access:** for edge functions and admin

## Mobile Components

### RatingModal (`app/src/components/caregiver/RatingModal.tsx`)
- Modal with thumbs up/down toggle + 6 tag chips + comment field (200 char max)
- Loads existing rating for UPSERT on open
- Self-rating error handling
- Props: caregiverProfileId, caregiverName, isVisible, onClose, onSuccess

### RatingSummary (`app/src/components/caregiver/RatingSummary.tsx`)
- Two modes: compact (single line for cards) and full (multi-line with top tags)
- Compact: "👍 87% · 23 reviews"
- Full: large percentage + review count + top 3 tags via RPC
- Props: caregiverProfileId?, ratingCount?, positiveCount?, mode?, onViewReviews?

### ReviewsList (`app/src/components/caregiver/ReviewsList.tsx`)
- Paginated FlatList modal (10 per page)
- Shows: thumbs icon, tag pills, comment text, relative timestamps
- Props: caregiverProfileId, caregiverName, isVisible, onClose

## Integration Points

### Agency Directory (`caregiver-directory.tsx`)
- RatingSummary compact displayed between capabilities and chevron on each card
- rating_count and positive_count passed from search-caregivers edge function

### Agency Profile View (`caregiver-profile-view.tsx`)
- Ratings card section with RatingSummary full mode + "View All Reviews" + "Rate This Caregiver" button
- RatingModal and ReviewsList modals

### Caregiver My Profile (`my-profile.tsx`)
- Read-only "Your Ratings" section with RatingSummary full mode + "View All Reviews"
- Caregivers cannot modify or delete others' ratings

### Search Caregivers Edge Function (`search-caregivers/index.ts`)
- Returns rating_count and positive_count in SELECT
- Ordered by: npi_verified DESC, positive_count DESC, rating_count DESC, created_at DESC

## Public Web Directory

Ratings are displayed on the public web directory at healthguide-web/:
- CaregiverCard: RatingBadge (thumbs % + count)
- Profile page: Full rating summary + recent 5 reviews
- No ability to submit ratings from web (must use app)

## Database Migration

**File:** `app/supabase/migrations/013_caregiver_ratings.sql`

## Troubleshooting

### Rating submission fails with "cannot rate themselves"
**Cause:** The reviewer_user_id matches the caregiver's user_id in caregiver_profiles.
**Solution:** This is expected behavior. Caregivers cannot rate their own profile.

### Rating counts not updating
**Cause:** The update_caregiver_rating_aggregates trigger may have failed.
**Solution:** Check that the trigger exists on caregiver_ratings. Manually recompute by running:
```sql
UPDATE caregiver_profiles SET
  rating_count = (SELECT COUNT(*) FROM caregiver_ratings WHERE caregiver_profile_id = id),
  positive_count = (SELECT COUNT(*) FROM caregiver_ratings WHERE caregiver_profile_id = id AND is_positive = TRUE);
```

### Top tags not showing in full mode
**Cause:** The get_caregiver_top_tags RPC function may not exist or may be returning empty.
**Solution:** Verify the function exists. Tags are only counted from positive ratings (is_positive = TRUE).

### UPSERT creates duplicate instead of updating
**Cause:** The onConflict parameter may not match the constraint name.
**Solution:** Ensure upsert uses `onConflict: 'caregiver_profile_id,reviewer_user_id'` matching the UNIQUE constraint columns.
