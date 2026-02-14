---
name: healthguide-caregiver-marketplace
description: Caregiver Marketplace for HealthGuide. Independent caregiver profiles with public directory for agency discovery. Caregivers sign up for free, showcase their skills, availability, and NPI-verified credentials. Agency owners search by zip code and availability, then contact caregivers offline. Supports multi-agency relationships and consent-based care group joining.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: caregiver
  tags: [marketplace, caregiver-profiles, npi-verification, directory, multi-agency]
---

# HealthGuide Caregiver Marketplace

## Overview

The Caregiver Marketplace enables caregivers to create independent public profiles showcasing their skills, availability, certifications, and rates. Agency owners discover caregivers through a searchable directory filtered by zip code, availability, and capabilities. Contact happens offline (phone/text) and caregivers must explicitly consent before being added to any care group.

Caregivers sign up for free and can work with multiple agencies simultaneously. Optionally, they can verify credentials via the NPI (National Provider Identifier) registry, earning a verified badge that improves their visibility in search results.

## Key Features

- Independent caregiver signup via phone OTP (no agency required)
- 4-step profile creation: Basic Info, Professional, Skills & Availability, About Me
- NPI verification via NPPES registry (optional, earns verified badge)
- Public profile: name, photo, zip code, hourly rate, certifications, capabilities, availability grid
- Searchable directory for agency owners (zip code, availability, capabilities, verified status)
- Offline contact via Call/Text (no in-app messaging)
- Multi-agency support via `caregiver_agency_links` table
- Consent-based care group joining (caregiver must Accept/Decline)
- Profile management: edit, deactivate, re-verify NPI

## Landing Screen (3-Option Layout)

```
[HealthGuide Logo]

[ Agency Owner ]          → /(auth)/login
  "Manage your care agency"
  Deep Teal (#0F766E)
  Link: "New agency? Register here" → /(auth)/register

[ Caregiver ]             → /(auth)/caregiver-signup
  "Sign up to offer care services"
  Emerald (#059669)
  Link: "Already registered? Sign in" → /(auth)/phone-login?role=caregiver

─── divider ───

[ I have an invite code ] → /(auth)/join-group
  "Join as family member or elder"
  Outlined button (primary border)

[Privacy Policy • Terms]
```

Family members and elders join ONLY via invite code (no direct signup). Caregivers and agency owners have direct entry points.

## User Flows

### Caregiver Signup Flow

```
Landing screen → "Caregiver" card
       ↓
caregiver-signup.tsx (phone entry, Emerald theme)
       ↓
verify-otp.tsx (6-digit OTP verification)
       ↓
Check: caregiver_profiles exists for this user?
  YES → Navigate to caregiver dashboard (returning user)
  NO  → caregiver-profile-setup.tsx (4-step form)
       ↓
Step 1: Basic Info (name, zip, photo)
Step 2: Professional (NPI, certifications, rate)
Step 3: Skills & Availability (capability chips, 3×7 grid)
Step 4: About Me (experience, bio)
       ↓
INSERT caregiver_profiles → update user metadata → caregiver dashboard
```

### Agency Discovery Flow

```
Agency dashboard → "Find Caregivers" card
       ↓
caregiver-directory.tsx (search + filter)
  Filters: zip code, availability, verified only, max rate
       ↓
Tap caregiver card
       ↓
caregiver-profile-view.tsx (full read-only profile)
  Actions: Call | Text (via Linking.openURL)
       ↓
Agency owner contacts caregiver OFFLINE
       ↓
Agency owner creates care group → adds caregiver
       ↓
Caregiver receives push notification
       ↓
pending-invitations.tsx → Accept / Decline
       ↓
If accepted: caregiver_agency_links created, member activated
```

## Data Model

### caregiver_profiles Table

```sql
CREATE TABLE caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic profile
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,

  -- Geographic & Rate
  zip_code TEXT NOT NULL,
  hourly_rate DECIMAL(8, 2),

  -- NPI Verification
  npi_number TEXT UNIQUE,
  npi_verified BOOLEAN NOT NULL DEFAULT FALSE,
  npi_data JSONB,  -- {name, credentials, taxonomy_code, specialty, license_state, license_number}

  -- Credentials & Skills
  certifications TEXT[] NOT NULL DEFAULT '{}',
  experience_summary TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  -- Allowed: companionship, meal_preparation, light_housekeeping, errands,
  -- mobility_assistance, personal_care, medication_reminders, medication_administration

  -- Availability: {monday:[morning,afternoon,evening], ...}
  availability JSONB NOT NULL DEFAULT '{...}',

  -- About
  bio TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### caregiver_agency_links Table

```sql
CREATE TABLE caregiver_agency_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_caregiver_agency UNIQUE (caregiver_profile_id, agency_id)
);
```

### care_group_members Consent Columns (added by migration 012)

```sql
ALTER TABLE care_group_members
  ADD COLUMN caregiver_profile_id UUID REFERENCES caregiver_profiles(id),
  ADD COLUMN consent_status TEXT DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN consent_requested_at TIMESTAMPTZ,
  ADD COLUMN consent_given_at TIMESTAMPTZ;
```

## Edge Functions

### verify-npi

**File:** `app/supabase/functions/verify-npi/index.ts`

Validates caregiver NPI credentials against the NPPES registry.

- Input: `{ npi_number, caregiver_profile_id }`
- Validates NPI format (10 digits) and Luhn checksum (healthcare prefix "80840")
- Calls NPPES API: `https://npiregistry.cms.hhs.gov/api/?number={npi}&version=2.1`
- Extracts: name, credentials, taxonomy code, specialty, license state/number
- Updates caregiver_profiles: `npi_verified = TRUE`, `npi_data = {...}`
- Returns: `{ verified, provider_name, credentials, specialty }`

### search-caregivers

**File:** `app/supabase/functions/search-caregivers/index.ts`

Searchable directory for agency owners.

- Input: `{ zip_code?, zip_area?, hourly_rate_max?, capabilities?, availability?, npi_verified_only?, page?, page_size? }`
- Filters: zip prefix match (3-digit ~50mi, 5-digit exact), rate cap, capabilities array overlap, availability JSONB containment, NPI verification status
- Ordered by: npi_verified DESC, created_at DESC
- Paginated: default 20/page, max 50
- Returns: `{ caregivers[], total_count, page, has_more }`

### respond-care-group-invite

**File:** `app/supabase/functions/respond-care-group-invite/index.ts`

Handles caregiver acceptance or decline of care group invitations.

- Input: `{ member_id, response: 'accepted' | 'declined' }`
- If accepted: updates consent_status, creates caregiver_agency_links record, sets invite_status='accepted'
- If declined: updates consent_status to 'declined'
- Sends push notification to agency owner with result
- Returns: `{ success, care_group_id, agency_name }`

### create-care-group (Modified)

**File:** `app/supabase/functions/create-care-group/index.ts`

Updated to support caregiver consent flow:

- When adding caregiver member: sets `consent_status='pending'`, `consent_requested_at`
- Looks up `caregiver_profiles` by phone to link `caregiver_profile_id` and `user_id`
- Sends push notification to caregiver requesting consent
- Family/elder members: existing direct invite flow unchanged

## Frontend Screens

### Auth Flow

| Screen | File | Purpose |
|--------|------|---------|
| Landing | `(auth)/index.tsx` | 3-option vertical layout |
| Caregiver Signup | `(auth)/caregiver-signup.tsx` | Phone OTP entry (Emerald theme) |
| Profile Setup | `(auth)/caregiver-profile-setup.tsx` | 4-step profile creation |

### Agency Screens

| Screen | File | Purpose |
|--------|------|---------|
| Directory | `(protected)/agency/caregiver-directory.tsx` | Search + filter caregivers |
| Profile View | `(protected)/agency/caregiver-profile-view.tsx` | Read-only profile with Call/Text |
| Dashboard | `(protected)/agency/(tabs)/index.tsx` | "Find Caregivers" quick action card |

### Caregiver Screens

| Screen | File | Purpose |
|--------|------|---------|
| My Profile | `(protected)/caregiver/my-profile.tsx` | Edit marketplace profile |
| Profile Tab | `(protected)/caregiver/(tabs)/profile.tsx` | Marketplace status + edit link |
| Invitations | `(protected)/caregiver/pending-invitations.tsx` | Accept/Decline care group invites |
| Today | `(protected)/caregiver/(tabs)/index.tsx` | Pending invitation banner |

## NPI Verification

### What is NPI?

The National Provider Identifier (NPI) is a unique 10-digit identification number issued by CMS to healthcare providers. It is public information and can be verified via the free NPPES API.

### Verification Process

1. Caregiver enters NPI number during profile setup (Step 2)
2. App calls `verify-npi` edge function
3. Edge function validates format (10 digits + Luhn check with "80840" prefix)
4. Calls NPPES API to retrieve provider data
5. If match found: extracts name, credentials, taxonomy, specialty, license info
6. Updates caregiver_profiles with npi_verified=TRUE and npi_data JSONB
7. Verified badge appears on profile card and detail view

### NPI Data Stored

```json
{
  "name": "Jane Smith",
  "credentials": "CNA",
  "taxonomy_code": "372600000X",
  "specialty": "Adult Day Care",
  "license_state": "TX",
  "license_number": "CNA-12345"
}
```

### Important Notes

- NPI is optional; caregivers without NPI can still create profiles
- Verified caregivers appear higher in search results (npi_verified DESC)
- NPPES API is public and free (no API key required)
- Re-verification available in profile edit screen

## RLS Policies

### caregiver_profiles

- Caregivers: full CRUD on own profile (`user_id = auth.uid()`)
- Agency owners: SELECT on active profiles (`is_active = TRUE` and role = 'agency_owner')
- Service role: full access (for edge functions)

### caregiver_agency_links

- Caregivers: SELECT own links
- Agency owners: SELECT links for their agency
- Service role: full access

### care_group_members (consent update)

- Caregivers: can UPDATE consent_status on own records (where `user_id = auth.uid()` and `role = 'caregiver'`)

## Search & Filtering

### Zip Code Search

- **Exact match (5 digits):** Caregivers in same zip code
- **Area match (3-digit prefix):** Approximate 50-mile radius coverage
- Example: searching "782" matches 78201, 78205, 78216, etc.

### Availability Matching

Availability stored as JSONB grid:
```json
{
  "monday": ["morning", "afternoon"],
  "tuesday": ["morning", "afternoon", "evening"],
  "wednesday": [],
  ...
}
```

Search filters by day + time slot containment using JSONB `@>` operator.

### Capability Filtering

Capabilities stored as TEXT array. Search uses `@>` (contains) operator:
```sql
WHERE capabilities @> ARRAY['personal_care', 'medication_reminders']
```

Available capabilities: companionship, meal_preparation, light_housekeeping, errands, mobility_assistance, personal_care, medication_reminders, medication_administration.

## Theming

Caregiver screens use Emerald (#059669) as the primary color, consistent with the role-based theming system:

- Agency Owner: Deep Teal (#0F766E)
- Caregiver: Emerald (#059669)
- Elder: Amber (#D97706)
- Family Member: Blue (#2563EB)

Touch targets for caregiver screens: 72px (larger than standard 56px for field workers).

## Multi-Agency Support

A caregiver can work with multiple agencies simultaneously:

1. Caregiver creates ONE marketplace profile
2. Agency A discovers caregiver, contacts offline, creates care group → caregiver accepts
3. Agency B discovers same caregiver, contacts offline, creates care group → caregiver accepts
4. Both agencies appear in `caregiver_agency_links`
5. Caregiver sees shifts from both agencies in their schedule

## Consent Flow

Caregivers are never silently added to care groups. The consent flow ensures:

1. Agency owner creates care group and adds caregiver member
2. `consent_status` set to 'pending', push notification sent
3. Caregiver sees banner on Today screen: "You have X pending invitation(s)"
4. Caregiver taps banner → pending-invitations.tsx
5. Caregiver sees care group details (elder name, agency name)
6. Caregiver taps Accept or Decline
7. `respond-care-group-invite` edge function processes response
8. Agency owner receives push notification with result
9. Care group detail shows status badges: Pending (amber), Joined (green), Declined (red)

## Database Migration

**File:** `app/supabase/migrations/012_caregiver_marketplace.sql`

This migration creates the full marketplace infrastructure:

1. `caregiver_profiles` table with indexes (zip, capabilities GIN, rate, active, verified)
2. `caregiver_agency_links` table with unique constraint
3. ALTER `care_group_members` with consent columns
4. RLS policies for all three tables
5. Helper functions: `auth.has_caregiver_profile()`, `auth.caregiver_profile_id()`
6. Auto-update timestamp triggers

## Troubleshooting

### NPI verification fails
**Cause:** NPI not found in NPPES registry or API timeout
**Solution:** Verify NPI number is correct (10 digits). The NPPES API is public but can be slow; retry after a moment. Caregiver can skip NPI and add it later from profile edit.

### Caregiver not appearing in directory
**Cause:** Profile `is_active` is FALSE or profile incomplete
**Solution:** Check that the caregiver profile has is_active=TRUE and required fields (full_name, phone, zip_code) are populated.

### Consent notification not received
**Cause:** Caregiver device token not registered or push permissions denied
**Solution:** Caregiver should check notification permissions in device settings. Ensure device_tokens table has an active token for the caregiver's user_id.

### Multi-agency link not created
**Cause:** `respond-care-group-invite` edge function failed to create link
**Solution:** Check edge function logs. The caregiver_agency_links table has a UNIQUE constraint on (caregiver_profile_id, agency_id) — if the link already exists, it won't create a duplicate.

### Search returns no results
**Cause:** No active caregivers in the searched zip area
**Solution:** Try a broader search with 3-digit zip prefix instead of full 5-digit zip. Remove capability and availability filters to broaden results.

## Related Systems

### Caregiver Ratings
See `healthguide-caregiver/ratings/SKILL.md` for the full ratings documentation. Summary: thumbs up/down + selectable tags (reliable, compassionate, skilled, punctual, professional, communicative). One rating per user per caregiver (UPSERT). Denormalized aggregates (rating_count, positive_count) on caregiver_profiles. Migration: `013_caregiver_ratings.sql`.

### Public Web Directory
See `SETUP_GUIDE.md` > "Public Web Directory" section. A Next.js 14 website (`healthguide-web/`) where anyone can browse caregiver profiles without logging in. Returns only safe columns (no phone, email, rate, or full zip). Uses the `public-caregiver-search` edge function. SEO-optimized with SSR/ISR.
