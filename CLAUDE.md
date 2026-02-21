# HealthGuide — Companionship Pivot

## Skill Files (`.claude/skills/companionship-pivot/`)

| File | Description |
|------|-------------|
| `SKILL.md` | Overview of the 14-phase companionship pivot |
| `01-db-migration.md` | Phase 1: Database schema changes |
| `02-task-restriction.md` | Phase 2: Restrict tasks to 3 non-medical categories |
| `03-landing-signup.md` | Phase 3: Landing screen & signup cards |
| `04-student-signup.md` | Phase 4: Student signup + profile setup |
| `05-companion-signup.md` | Phase 5: 55+ Companion signup + profile setup |
| `06-directory-matching.md` | Phase 6: Companion directory & matching |
| `07-visit-requests.md` | Phase 7: Visit request flow |
| `08-agency-linking.md` | Phase 8: Agency ↔ companion linking |
| `09-evv-emergency.md` | Phase 9: EVV & emergency protocols |
| `10-ratings-reviews.md` | Phase 10: Ratings & reviews |
| `11-cancellations.md` | Phase 11: Cancellation policies |
| `12-recurring-visits.md` | Phase 12: Recurring visit scheduling |
| `13-notifications.md` | Phase 13: Push notifications |
| `14-home-screens.md` | Phase 14: Updated home screens |

---

## Completed Phases

### Phase 1 — Database Migration
**Migration:** `app/supabase/migrations/021_companionship_network.sql`

New tables: `visit_requests`, `visit_ratings`, `visit_emergencies`, `agency_invites`, `elder_favorites`, `scope_acceptances`
New view: `user_ratings_summary`
Extended: `caregiver_profiles` (caregiver_type, gender, college fields, travel_radius, languages, selfie_url, profile_completed, etc.), `elders` (needs, preferred_schedule, preferred_gender, languages, emergency contacts), `visits` (nullable agency_id, duration_minutes, reminder flags)

### Phase 2 — Task Restriction
Restricted platform to 3 non-medical task categories: Companionship, Light Cleaning, Groceries & Errands.

**Created:**
- `app/src/constants/tasks.ts` — ALLOWED_TASKS, TASK_DB_NAMES, TASK_CATEGORIES, SCOPE_ALERT_TEXT, CAPABILITIES_MAP, ALLOWED_CATEGORY_LABELS
- `app/src/components/ScopeAlert.tsx` — Non-dismissible scope limitation modal, records to `scope_acceptances`
- `app/supabase/migrations/022_task_restriction.sql` — Deactivate non-allowed tasks, update seed trigger

**Modified:**
- `app/src/components/scheduling/AssignmentModal.tsx` — 3-step flow (elder → caregiver → tasks), creates visit_tasks with task_id FK
- `app/src/app/(protected)/agency/settings/task-library.tsx` — Fixed table name to `task_library`, restricted to 3 categories
- `app/src/app/(protected)/agency/settings/add-task.tsx` — Fixed table name, restricted categories

### Phase 3 — Landing Screen & Signup Cards
Redesigned welcome screen with 3 primary signup cards + 2 secondary links.

**Created:**
- `app/src/app/(auth)/signup-student.tsx` (stub, replaced in Phase 4)
- `app/src/app/(auth)/signup-companion.tsx` (stub, replaced in Phase 5)

**Modified:**
- `app/src/components/icons/index.tsx` — Added `StudentIcon` (graduation cap) and `CompanionIcon` (two people)
- `app/src/app/(auth)/index.tsx` — Redesigned: 3 cards (Student, 55+ Companion, Agency Owner) + secondary links + tagline

### Phase 4 — Student Signup Flow
Full signup form + profile setup for student caregivers.

**Created:**
- `app/src/app/(auth)/signup-student.tsx` — Full form: name, age (≥18), college fields, .edu email, password, email verification
- `app/src/app/(protected)/caregiver/profile-setup-student.tsx` — Photo, zip, travel radius, availability, tasks, languages, gender, bio, program/grad year, ScopeAlert

**Modified:**
- `app/src/types/auth.ts` — Added `CaregiverType = 'student' | 'companion_55' | 'professional'`
- `app/src/contexts/AuthContext.tsx` — `signUpWithEmail` now passes `caregiver_type` and `phone` in metadata
- `app/src/app/(protected)/caregiver/_layout.tsx` — Type-specific profile routing (student/companion/professional)

### Phase 5 — 55+ Companion Signup Flow
Full signup form + profile setup for 55+ companions.

**Created/Replaced:**
- `app/src/app/(auth)/signup-companion.tsx` — Full form: name, DOB (3 dropdowns, validates 55+), email (any), phone, password, email verification. Green theme (#059669).
- `app/src/app/(protected)/caregiver/profile-setup-companion.tsx` — Camera selfie (launchCameraAsync + web file input fallback), zip, travel radius, transportation checkbox, availability, tasks, languages, gender, bio, time credits teaser card, ScopeAlert

### Phase 6 — Companion Directory & Matching
Browse/filter companions for elders and family members.

**Created:**
- `app/src/app/(protected)/careseeker/find-companion.tsx` — Directory screen: search (name/zip), expandable filter panel (tasks, days, language, gender, transportation), companion cards with photo/badge/rating/favorite, FlatList with pull-to-refresh
- `app/src/app/(protected)/careseeker/companion/[id].tsx` — Detail screen: large photo, type badge, bio, services, availability, languages, transportation, travel radius, bottom bar (favorite + Request Visit)
- `app/src/app/(protected)/family/find-companion.tsx` — Redirect to shared careseeker directory

**Modified:**
- `app/src/app/(protected)/careseeker/_layout.tsx` — Registered `find-companion` and `companion/[id]` routes
- `app/src/app/(protected)/careseeker/(tabs)/index.tsx` — Added green "Find a Companion" button to elder home
- `app/src/app/(protected)/family/_layout.tsx` — Registered `find-companion` as hidden tab route
- `app/src/app/(protected)/family/dashboard.tsx` — Added "Find Companion" action card to quick actions

### Phase 7 — Visit Request Flow
Request → Accept/Decline → Confirmed visit lifecycle.

**Created:**
- `app/src/app/(protected)/careseeker/request-visit.tsx` — Visit request form: date picker (next 14 days), smart time slot highlighting (green for companion's available slots), task checkboxes, optional note. Warns if picking unavailable slot. Success screen links to My Requests.
- `app/src/app/(protected)/caregiver/requests.tsx` — Companion request inbox: pending requests with elder name, date, time, tasks, note, zip. Accept creates visit + visit_tasks (via task_library FK). Decline notifies elder. Push notifications on accept/decline.
- `app/src/app/(protected)/careseeker/my-requests.tsx` — Elder request tracker: SectionList grouped by Pending/Confirmed/Past. Cancel pending requests. Links to companion directory if empty.

**Modified:**
- `app/src/app/(protected)/careseeker/_layout.tsx` — Registered `request-visit` and `my-requests` routes
- `app/src/app/(protected)/caregiver/_layout.tsx` — Registered `requests` route
- `app/src/app/(protected)/caregiver/(tabs)/index.tsx` — Added visit request count + blue banner ("X new visit requests — tap to respond") with link to requests screen

### Phase 8 — Agency ↔ Companion Linking
Bidirectional linking: agencies invite companions, companions apply to agencies.

**Created:**
- `app/src/app/(protected)/agency/browse-directory.tsx` — Agency owner browses independent companions: search (name/zip), filters (type student/55+, tasks, transportation), invite action per card. Checks existing invites + links to show correct status (Invite / Pending / Linked). Unique constraint handling for duplicate invites.
- `app/src/app/(protected)/caregiver/agencies-near-me.tsx` — Companion browses agencies: search (name/city/zip), agency cards with elder/caregiver counts, Apply to Join button. Shows My Agencies section for linked agencies with Leave option. Application creates `agency_invites` with `direction: 'companion_to_agency'`.

**Modified:**
- `app/src/app/(protected)/agency/_layout.tsx` — Registered `browse-directory` route
- `app/src/app/(protected)/caregiver/_layout.tsx` — Registered `agencies-near-me` route
- `app/src/app/(protected)/agency/(tabs)/caregivers.tsx` — Added green "Browse" button (CompanionIcon) in header next to "+ Add"
- `app/src/app/(protected)/caregiver/(tabs)/index.tsx` — Added green "Find agencies near you" banner for student/companion_55 types

### Phase 9 — EVV & Emergency Protocols
EVV GPS check-in/out was already built. Phase 9 adds emergency SOS protocol during active visits.

**Note:** EVV infrastructure was pre-existing: `check-in.tsx` (GPS-gated, 150m radius), `tasks.tsx`, `notes.tsx`, `check-out.tsx` (GPS capture), `services/location.ts`, `ScopeAlert.tsx`. Database columns `check_in_latitude/longitude`, `actual_start/end`, `check_in_method` already on `visits` table. `visit_emergencies` table existed from migration 021.

**Created:**
- `app/src/components/caregiver/EmergencySOS.tsx` — Floating red SOS button + full-screen emergency modal. Features: Call 911 (large red button, opens `tel:911`), family/emergency contacts list (from both `elders` inline fields and `emergency_contacts` table) with tap-to-call, safety reminders (don't move fallen elder, no medical procedures, stay calm), additional resources (988 Crisis Line, Elder Abuse Hotline). Logs incident to `visit_emergencies` table, sets `visits.status = 'emergency'`, sends agency notification.

**Modified:**
- `app/src/app/(protected)/caregiver/visit/[id]/tasks.tsx` — Added EmergencySOS floating button. Enhanced `fetchElderInfo` to also fetch emergency contacts from both `elders.emergency_contact_*` fields and `emergency_contacts` table.
- `app/src/app/(protected)/caregiver/visit/[id]/notes.tsx` — Added EmergencySOS floating button with same emergency contact fetching.
- `app/src/app/(protected)/caregiver/visit/[id]/check-out.tsx` — Added EmergencySOS floating button (only shown in 'idle' state, hidden during processing/success). Enhanced `fetchData` to include emergency contacts.

### Phase 10 — Ratings & Reviews
Bidirectional 1-5 star ratings after completed visits. Both companions and elders can rate each other.

**Created:**
- `app/src/components/ui/StarRating.tsx` — Interactive 1-5 star selector with labels (Poor/Fair/Good/Great/Excellent). Supports interactive mode (tap to select) and static display mode. Uses existing StarIcon.
- `app/src/app/(protected)/caregiver/rate-visit.tsx` — Companion rates elder after check-out. Shows elder card with duration, star selector, reason textarea (min 10 chars, max 500), Submit/Skip buttons. Inserts to `visit_ratings` with unique constraint handling. Auto-redirects home after submission.
- `app/src/app/(protected)/careseeker/rate-visit.tsx` — Elder rates companion. Same pattern: companion card, stars, reason, Submit/Skip. Fetches companion name from user_profiles. Navigates back on complete.

**Modified:**
- `app/src/app/(protected)/caregiver/visit/[id]/check-out.tsx` — After successful check-out, redirects to `rate-visit?visitId=` instead of straight to home
- `app/src/app/(protected)/caregiver/_layout.tsx` — Registered `rate-visit` route
- `app/src/app/(protected)/careseeker/_layout.tsx` — Registered `rate-visit` route
- `app/src/app/(protected)/careseeker/my-requests.tsx` — Added "Rate this visit" button (StarIcon + gold text) on completed visits. Enriches accepted requests with visit lookup + existing rating check. Shows "Rated" label for already-rated visits.
- `app/src/app/(protected)/careseeker/companion/[id].tsx` — Switched from manual `visit_ratings` aggregation to `user_ratings_summary` view for cleaner rating display

### Phase 11 — Cancellation Policies
Time-based cancellation with auto-penalties and elder-unavailable handling.

**Created:**
- `app/src/lib/cancelVisit.ts` — Shared cancellation logic. `cancelVisit(visitId, cancelledBy, userId)`: companion ≥30 min = no penalty (`status='cancelled'`), companion <30 min = late penalty (`status='cancelled_late'` + auto 1-star via `visit_ratings`), elder = no penalty. `markElderUnavailable(visitId, note, coords?)`: companion arrived but elder absent (`status='elder_unavailable'`), no penalty. `isLateCancellation(scheduledStart)`: boolean check.

**Modified:**
- `app/src/types/visit.ts` — Updated `VisitStatus` union to include all DB statuses: `pending_acceptance`, `cancelled_late`, `elder_unavailable`, `declined`, `missed`, `emergency`
- `app/src/app/(protected)/caregiver/visit/[id]/index.tsx` — Added "Cancel Visit" red text link below "Start Visit" button (scheduled visits only). Late-cancellation warning dialog (<30 min). Uses `cancelVisit()` from shared lib.
- `app/src/app/(protected)/caregiver/visit/[id]/check-in.tsx` — Added "Elder not available?" option when within GPS range. Inline form with optional note. Uses `markElderUnavailable()`. Records GPS coords.
- `app/src/app/(protected)/careseeker/my-requests.tsx` — Added "Cancel Visit" button for confirmed (accepted) visits that haven't completed. Uses `cancelVisit(visitId, 'elder', userId)` from shared lib.

### Phase 12 — Recurring Visit Scheduling
"Every Tuesday at 2pm with Maria" type schedules. Parent visit + child visit generation.

**Created:**
- `app/src/lib/recurringVisits.ts` — Core utilities: `buildRecurrenceRule()` (format: `weekly:tuesday,thursday`), `parseRecurrenceRule()`, `generateChildVisits()` (creates 4-week rolling window of child visits with cloned tasks, skips duplicates, handles biweekly), `cancelRecurringSeries()` (cancels all future scheduled children + marks parent `is_recurring=false`), `getDayFromDateString()`.
- `app/src/app/(protected)/caregiver/recurring-setup.tsx` — Setup screen after accepting a visit. Frequency picker (weekly/biweekly), 7-day multi-select circles, end condition (no end / after N visits), live preview text. Sets `is_recurring=true` + `recurrence_rule` on parent, calls `generateChildVisits()`. Skip option for one-time visits. Success state shows count of generated visits.

**Modified:**
- `app/src/app/(protected)/caregiver/_layout.tsx` — Registered `recurring-setup` route
- `app/src/app/(protected)/caregiver/requests.tsx` — After accepting a visit, navigates to recurring-setup (passing visitId, elderName, date, time, tasks as params) instead of showing simple alert
- `app/src/app/(protected)/caregiver/visit/[id]/index.tsx` — Added `is_recurring`/`parent_visit_id` to VisitData interface + query. Shows "Recurring" badge. Cancel handler offers 3-way choice for recurring visits: Keep / This Visit Only / All Future Visits
- `app/src/app/(protected)/caregiver/(tabs)/index.tsx` — Added `is_recurring`/`parent_visit_id` to Assignment interface + query. Shows repeat emoji prefix on recurring visit elder names
- `app/src/app/(protected)/careseeker/my-requests.tsx` — Added `visit_is_recurring`/`visit_parent_id` to RequestItem. Enriches with recurring fields from visits query. Shows "Recurring" badge on confirmed recurring visits. Cancel button says "Cancel Visit / Series" for recurring, offers 3-way choice (this only / all future)

**DB columns used (already exist):** `visits.is_recurring`, `visits.recurrence_rule`, `visits.parent_visit_id`
**Recurrence rule format:** `weekly:tuesday` or `biweekly:monday,wednesday,friday`
**Child visits:** `parent_visit_id` → parent, `is_recurring = false`, clone tasks via `visit_tasks.task_id`

### Phase 13 — Push Notifications
Full notification matrix: in-app notification center, push registration, edge functions, bell component.

**Pre-existing infrastructure:** `lib/notifications.ts` (push token registration, handlers, categories), `send-push-notification` edge function, `device_tokens` table, `notifications` table, `expo-notifications` package, family dashboard push registration.

**Created:**
- `app/supabase/functions/send-notification/index.ts` — Unified edge function matching the `supabase.functions.invoke('send-notification', ...)` calls used across screens. Accepts `userId`/`user_id`/`elderId`, stores in `notifications` table (`read: false`, `type` from data), sends Expo push to all active `device_tokens`. Handles `DeviceNotRegistered` cleanup.
- `app/supabase/functions/schedule-reminders/index.ts` — Cron-based edge function for 24h and 1h visit reminders. Queries visits by `scheduled_date` and `reminder_24h_sent`/`reminder_1h_sent` flags. Sends to both companion and elder. Marks flags as sent.
- `app/src/components/NotificationBell.tsx` — Bell icon with unread count badge. Queries `notifications` table for `read=false` count. Refreshes on screen focus. Navigates to `/(protected)/notifications`.
- `app/src/app/(protected)/notifications.tsx` — In-app notification center. SectionList grouped by day (Today/Yesterday/date). Shows type icon, title, body, time-ago, unread dot. Tap marks as read + navigates to visit. "Mark all read" header button. Pull-to-refresh. Last 100 notifications.

**Modified:**
- `app/src/app/(protected)/_layout.tsx` — Registered `notifications` route. Added 'notifications' to allowed segments so role-redirect doesn't interfere.
- `app/src/app/(protected)/caregiver/(tabs)/index.tsx` — Added NotificationBell to header. Added `registerForPushNotifications(userId, 'caregiver')` on mount.
- `app/src/app/(protected)/careseeker/(tabs)/index.tsx` — Added NotificationBell to header. Added push token registration on mount. Made header flexDirection row.
- `app/src/app/(protected)/agency/(tabs)/index.tsx` — Added NotificationBell to welcome header.
- `app/src/app/(protected)/family/dashboard.tsx` — Added NotificationBell to header (already had push registration).

**DB tables used (already exist):** `notifications` (user_id, title, body, type, data, read), `device_tokens` (user_id, expo_push_token, user_type, platform, is_active)
**Notification types:** visit_request, visit_confirmed, visit_declined, visit_cancelled, visit_completed, emergency, agency_invite, agency_application, rating_request, no_show, auto_match, shift_reminder, check_in_alert, check_out_alert

### Phase 14 — Updated Home Screens
Data-driven, role-specific home screens for all 4 actor types.

**Modified:**
- `app/src/app/(protected)/caregiver/(tabs)/index.tsx` — Added: caregiver_type detection from `caregiver_profiles`, upcoming visits section (next 7 days excluding today), quick stats card (completed visits, avg rating from `user_ratings_summary`, hours logged from `duration_minutes`), linked agencies section via `caregiver_agency_links`, time credits teaser for `companion_55` type. New fetch: `fetchProfileAndStats()` runs in parallel with existing fetches.
- `app/src/app/(protected)/agency/(tabs)/index.tsx` — Added: pending invites stat card (from `agency_invites` count), pending applications section (companion_to_agency direction) with companion name/type/message. New queries in parallel fetch: `agency_invites` count + applications with `caregiver_profiles` join.
- `app/src/app/(protected)/careseeker/(tabs)/index.tsx` — Replaced hardcoded "Maria at 10:30 AM" with real data. Added: upcoming visits from `visits` table (scheduled, next 3), favorites from `elder_favorites` → `caregiver_profiles`, recent completed visits with duration. Fetches elder record first, then parallel queries. ScrollView with pull-to-refresh. Kept large accessible buttons but reordered (Find a Companion first).
- `app/src/app/(protected)/family/dashboard.tsx` — Added: upcoming scheduled visits section with companion names, EVV indicators on recent visits (GPS verified check-in/out with green dot + "GPS ✓"), duration display from `duration_minutes`. Updated visits query to include `check_in_latitude/longitude`, `check_out_latitude/longitude`, `duration_minutes`.

**DB tables/views used:** `caregiver_profiles` (caregiver_type), `user_ratings_summary` (avg_rating), `caregiver_agency_links` (linked agencies), `agency_invites` (pending applications), `elder_favorites` (companion favorites), `visits` (EVV fields, duration_minutes)

---

## All 14 Phases Complete
