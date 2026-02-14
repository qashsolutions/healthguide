# HealthGuide -- Feature Inventory

> Generated from codebase analysis. Not based on any existing documentation.

## Tech Stack

- **Mobile:** React Native 0.81.5 + Expo SDK 54 + expo-router v6
- **Backend:** Supabase (Auth, Postgres, Edge Functions, Storage)
- **Offline DB:** WatermelonDB 0.28 (local SQLite)
- **Billing:** Stripe ($15/elder/month, 14-day free trial)
- **Web:** Next.js (public caregiver directory)
- **Language:** TypeScript throughout

## Roles

5 user roles: `agency_owner`, `caregiver`, `careseeker` (elder), `volunteer`, `family_member`. Each has role-based theming and protected route groups.

---

## 1. Authentication & Onboarding

### Role Selection Landing
- 3 entry paths: Agency Owner, Caregiver, Elder/Family
- Privacy Policy and Terms & Conditions links navigate to dedicated legal screens

### Agency Owner Auth (Email/Password)
- Login via `supabase.auth.signInWithPassword`
- Registration creates user + agency + initializes 14-day Stripe trial subscription

### Phone OTP Auth (Caregivers & Elders)
- Phone number entry sends OTP via `supabase.auth.signInWithOtp`
- 6-digit code verification with auto-submit on final digit

### Caregiver Signup
- Phone OTP -> user creation with `caregiver` role
- 4-step profile setup wizard: Personal Info, Capabilities, Availability, Review
- Creates marketplace `caregiver_profiles` record

### Care Group Join Flow
- Multi-step: enter invite code -> select role -> phone OTP -> join via edge function
- Supports caregiver, family, and elder roles

### Auth Context
- Global `AuthProvider` wrapping the app with `user`, `profile`, `signIn`, `signUp`, `signOut`
- Profile data read/written via `user_profiles` table

### Deprecated
- `family-signup.tsx` is deprecated and redirects to `join-group`

---

## 2. Agency Owner Features

### Dashboard
- Real-time stats via `get-dashboard-stats` edge function: active elders, caregivers, today's visits, completion rate
- Today's schedule preview and recent alerts

### Tab Navigation (5 Tabs)
Home, Caregivers, Schedule, Elders, Settings

### Caregiver Management
- Searchable list (15-max displayed), status badges
- Detail/edit: basic info, licensing toggle with license number/expiry, 7 capabilities (8 if licensed -- adds medication administration), 7-day x 3-slot availability grid, send invitation, deactivate

### Elder Management
- Searchable list with status badges
- Detail/edit: personal info, address with EVV geocoding via expo-location, 7 care-need chip options, special instructions, emergency contacts, handshake workflow (care agreement confirmation), care group management
- Legacy family contacts shown read-only with migration note

### Care Groups
- Create: primary caregiver (required), up to 3 family members with relationship picker, optional elder, consent note
- Success shows QR code for sharing
- Detail: QR invite card, share/refresh invite code, member sections (Active/Awaiting/Declined), remove members

### Scheduling
- Week calendar view with daily assignment slots
- **DONE:** Add assignment screen with elder/caregiver/time/task selection, wired from schedule with date param

### Caregiver Directory (Marketplace)
- Search with filters: zip code, availability (3 time slots), verified only, max hourly rate
- Calls `search-caregivers` edge function
- Results show avatar, name, verification badge, rate, top 3 capabilities, rating summary
- Profile view: read-only, contact buttons (call/text via `Linking`), skills grid, ratings/reviews, availability grid, bio

### Rate Caregiver
- Accessible from directory profile view and as standalone screen

### Settings & Billing
- Profile card, subscription info, navigation rows, sign out
- Settings menu: Task Library, Agency Profile, Notification Settings
- Billing: Stripe subscription info, payment method via billing portal, elder count updates (prorated), subscription cancellation
- Help Center opens external URL, Contact Support opens `mailto:`, Privacy Policy navigates to shared legal screen
- SettingsRow component uses `Pressable` for proper touch handling

### Task Library
- SectionList grouped by 8 categories
- Toggle active/inactive per task
- Auto-initializes with 19 default tasks on first load
- Shows license requirement badges
- Custom task creation: name, description, duration, category picker, license requirement toggle

---

## 3. Caregiver Features

### Tab Navigation (4 Tabs)
Today, Schedule, Community, Profile

### Today Dashboard
- Today's assignments with elder info, times, status badges
- Quick actions: Start Visit, Continue Visit

### Schedule
- Week strip with day selection, dot indicators for days with visits
- Fetches assignments per date, week counts for indicators
- Haptic feedback on interactions
- Status-based navigation (check-in, tasks, or visit detail)
- Offline indicator integration

### Visit Flow (Enforced Linear Stack)
Gesture-disabled stack: Visit Detail -> Check-In -> QR Check-In -> Tasks -> Notes -> Check-Out

1. **Visit Detail:** Elder info card, time range, task preview grid, special instructions, "Start Visit" button
2. **GPS Check-In:** Location permission request, GPS capture, 150-meter radius validation via Haversine formula, records to Supabase with `check_in_method: 'gps'`
3. **QR Check-In:** Camera-based QR scanner as fallback to GPS
   - **DONE:** Records check-in to Supabase with `check_in_method: 'qr_code'`
4. **Task Completion:** Task list with complete/skip actions, skip requires reason via modal, optimistic UI updates, haptic feedback
5. **Observations:** Icon-based observation recording by category
6. **GPS Check-Out:** GPS capture, records check-out, triggers `notify-check-out` edge function for family notifications

### Marketplace Profile
- Full profile editor: photo (ImagePicker), name, zip code, NPI verification (via `verify-npi` edge function), certifications, hourly rate, 8 capabilities, 7x3 availability grid, experience, bio
- Read-only ratings section
- Save changes, deactivate/reactivate profile toggle

### Pending Invitations
- Lists pending care group invitations with agency/elder/group info
- Accept/decline via `respond-care-group-invite` edge function
- Decline requires confirmation dialog

### Community & Support
- Support section with wellness check, groups, resources, crisis line, journal
- Wellness logging navigates to daily check-in screen (mood/energy/stress with history)
- Chat navigates to existing support groups screen
- Resources navigates to curated resource links (Training, Wellness, Legal, Benefits)
- Crisis line calls 988 Suicide & Crisis Lifeline via `Linking.openURL('tel:988')`
- Journal navigates to AsyncStorage-backed journaling screen with mood tracking

### Support Groups
- Search + category filter (All/Wellness/Specialty/Local/Skills)
- Join groups
- Falls back to 5 mock groups if `support_groups` table doesn't exist -- **suggests table may not be migrated yet**
- Group detail: chat messaging interface with likes

### Visit History
- Paginated list of completed/missed visits grouped by date
- Shows elder name, time range, duration, task summary, status badge
- Supabase query with mock data fallback

### Profile Tab
- Profile overview with avatar and stats
- "My Schedule" navigates to schedule tab
- "Visit History" navigates to visit history screen

---

## 4. Careseeker (Elder) Features

### Tab Navigation (3 Tabs)
Home, Activities, Calls -- large touch targets, elder-friendly UI

### Home
- Large buttons for daily actions with oversized text and touch targets

### Activities
- Grid of 4 large activity buttons with 64px emojis: Memory Game, Trivia, Music, Photos

### Memory Game
- 6 flower emoji pairs (12 cards total), 100x100 card size
- Haptic feedback on flip and match
- 1200ms delay for non-match reveal (extended for elder usability)
- Score saved to `game_sessions` table: `100 - (moves * 5)`, minimum 10

### Daily Mood Check-In
- 5 mood options (Not Good through Great) with large emoji cards
- Haptic feedback, saves to `elder_daily_checkins` table (upsert by date)
- If mood <= 2: triggers `notify-family-elder-mood` edge function to alert family

### Calls
- **DONE:** Video calling via `family_video_contacts` table with `Linking.openURL()`, call stats tracking
- **DONE:** Emergency call fetches from `emergency_contacts` table (fallback to `elders.emergency_phone`), dials via `Linking.openURL('tel:...')`
- **DONE:** Agency-side video contact management screen linked from elder detail

---

## 5. Family Member Features

### Dashboard
- Care overview for the elder

### Reports
- Daily reports list: date, visit count, task completion percentage, observation count, missed visit warnings, progress bars
- Report detail: visit summaries and observations

### Visit Detail
- Caregiver info (name, phone), scheduled vs actual times, location verification, task list with status icons and skip reasons, visit notes

### Settings
- Menu: Notification Settings, Profile, Help & Support, Log Out
- Logout removes device push token before sign out
- Profile navigates to edit screen (name, phone, relationship picker)
- Help & Support opens `mailto:support@healthguide.app`

### Notification Preferences
- Toggles: Caregiver Arrival, Visit Completed, Daily Care Summary
- Daily report: delivery time picker + include caregiver notes toggle
- Saves to `family_members.notification_preferences` JSON column

---

## 6. Offline-First Sync System

### WatermelonDB Schema (7 Local Tables)
`assignments`, `assignment_tasks`, `observations`, `elders_cache`, `emergency_contacts_cache`, `sync_queue`, `app_settings`

> Local table names differ from Supabase: `assignments` → `visits`, `assignment_tasks` → `visit_tasks`. The SyncQueueManager handles this mapping.

### Sync Queue Manager
- Singleton managing offline change queue with CRUD against Supabase
- Maps local table names to Supabase table names (`assignments` → `visits`, `assignment_tasks` → `visit_tasks`)
- Exponential backoff retries: 1s, 5s, 15s, 1m, 5m (max 5 retries)
- Status notifications via listener pattern
- Graceful degradation in Expo Go (WatermelonDB requires dev build)

### Offline Operations
- Assignment: check-in, check-out, add notes
- Tasks: complete, skip, undo
- Observations: create, update, flag
- Queries: get assignments with tasks, today's assignments, cached elder, unsynced count

### Data Prefetching
- Downloads 7 days of upcoming visits (from `visits` table) with elder details, tasks, and emergency contacts
- Clears data older than 30 days
- Cache stats reporting

### Sync UI
- **SyncProvider:** Auto-syncs on reconnect and app foreground, auto-prefetches caregiver data
- **SyncStatusBar:** Color-coded banner -- red (offline), blue (syncing), amber (pending), dark red (failed + tap to retry); auto-hides when synced
- **OfflineIndicator:** Small badge in 3 sizes, only visible when offline

---

## 7. Electronic Visit Verification (EVV)

- GPS capture via `expo-location`
- Haversine distance calculation for 150-meter radius check-in/check-out validation
- Elder addresses geocoded for lat/long storage
- Check-in methods: GPS (fully implemented), QR code (fully implemented)

---

## 8. Push Notifications

- Expo Notifications with categories: `visit_update`, `daily_report`, `assignment_reminder`
- Device token registration/removal on login/logout
- Triggers: check-in, check-out, daily report, low mood alert
- Family notification preferences respected per toggle

---

## 9. Invite & Care Group System

- Deep links: `healthguide://join/{code}` and universal links
- Native OS share sheet via `expo-sharing`
- Invite code: 8-char alphanumeric (excludes ambiguous chars 0/O/I/L/1), displayed as `ABCD-1234`
- API: create group, validate code, join group, refresh code (extends expiry 7 days)
- QR code generation component for invite codes

---

## 10. Caregiver Ratings System

- Thumbs up/down (`is_positive`) with 6 selectable tags: reliable, compassionate, skilled, punctual, professional, communicative
- Optional comment (max 200 chars)
- One rating per user per caregiver (upsert on conflict)
- Self-rating prevention trigger
- Denormalized counts on `caregiver_profiles` with auto-update trigger
- `get_caregiver_top_tags` RPC (returns top 3 tags)
- Full RLS policies
- UI: modal for rating, compact/full summary display, paginated reviews list (10/page)

---

## 11. Task Library

19 default tasks across 7 categories (+1 "other" for custom):

| Category | Tasks |
|---|---|
| Companionship | Companionship, Accompany to Appointments |
| Household | Light Housekeeping, Laundry, Organize Living Space |
| Nutrition | Meal Preparation, Feeding Assistance, Grocery Shopping |
| Mobility | Mobility Assistance, Exercise Assistance |
| Personal Care | Bathing, Dressing, Grooming, Toileting |
| Health | Medication Reminders, Medication Administration*, Vital Signs Monitoring* |
| Errands | Run Errands, Pet Care |

*\* Requires license, off by default*

---

## 12. Supabase Edge Functions (18)

| Function | Purpose |
|---|---|
| `get-dashboard-stats` | Agency dashboard stats |
| `generate-daily-report` | Daily care report generation |
| `get-billing-info` | Fetch Stripe subscription info |
| `create-billing-portal-session` | Stripe billing portal redirect |
| `update-subscription` | Update elder count / prorate billing |
| `cancel-subscription` | Cancel Stripe subscription |
| `stripe-webhook` | Stripe webhook handler |
| `join-care-group` | Join care group via invite code |
| `create-care-group` | Create new care group |
| `respond-care-group-invite` | Accept/decline invitation |
| `notify-check-in` | Push notification on check-in |
| `notify-check-out` | Push notification on check-out |
| `notify-daily-report` | Push notification for daily report |
| `send-push-notification` | Generic push notification sender |
| `send-family-invitation` | Send family invite |
| `verify-npi` | Verify caregiver NPI credentials |
| `public-caregiver-search` | Public web search (privacy-safe) |
| `search-caregivers` | Authenticated in-app search |

---

## 13. Public Web App (Next.js)

- **Home page:** Hero with search bar, 3 value prop cards, download CTA
- **Caregiver search:** Server-rendered, zip/capabilities filters, paginated grid (20/page), calls `public-caregiver-search` edge function, SEO metadata
- **Caregiver profile:** ISR with 1-hour revalidation, profile header with NPI badge, skills, bio, latest 5 reviews, download CTA, full SEO metadata
- **Privacy:** Only shows 3-digit zip prefix, no PII exposed

---

## 14. Theme & Design System

- **Role-based colors:** Deep Teal `#0D6E6E` (agency), Emerald `#059669` (caregiver), Warm Amber `#D97706` (elder), Soft Purple `#7C3AED` (family)
- **Typography:** Fraunces (display), Plus Jakarta Sans (body), JetBrains Mono (mono)
- **Spacing:** Defined scale with border radius constants
- **UI Components:** Button, Input, LargeInput, Card, Badge, ProgressBar, TapButton, QRCode, TimePicker
- **Icon sets:** Navigation icons, task icons with mapper, observation icons

---

## 15. Database Migrations

| # | Purpose |
|---|---|
| 001 | Core tables: user_profiles, agencies, elders, caregivers, family_members |
| 002 | Task library, visits, visit_tasks |
| 009 | Stripe subscriptions, invoices |
| 011 | Care groups, invites, members |
| 012 | Caregiver profiles for marketplace |
| 013 | Ratings system with triggers |
| 014 | Family video contacts |
| 015 | Caregiver wellness logs (mood/energy/stress 1-5, daily unique) |

---

## Completion Status

### Implemented (core features)
| Feature | Location | Status |
|---|---|---|
| QR code check-in recording | `caregiver/visit/[id]/qr-checkin.tsx` | DONE - Records to Supabase with `check_in_method: 'qr_code'` |
| Video calling | `careseeker/(tabs)/calls.tsx` | DONE - `family_video_contacts` table + agency management screen |
| Emergency call | `careseeker/(tabs)/calls.tsx` | DONE - Fetches contact, dials via `Linking.openURL` |
| Add assignment (agency schedule) | `agency/assignment/new.tsx` | DONE - Multi-step form with validation |

### Recently Implemented
| Feature | Location | Status |
|---|---|---|
| Privacy Policy screen | `(auth)/privacy-policy.tsx` | DONE - ScrollView with 8-section legal text |
| Terms & Conditions screen | `(auth)/terms.tsx` | DONE - ScrollView with 10-section legal text |
| Caregiver wellness logging | `caregiver/community/wellness.tsx` | DONE - Daily check-in with mood/energy/stress scales + history |
| Caregiver chat | `caregiver/(tabs)/community.tsx` | DONE - Navigates to existing support groups |
| Caregiver resources | `caregiver/community/resources.tsx` | DONE - 4-category curated resource links |
| Crisis line | `caregiver/(tabs)/community.tsx` | DONE - Calls 988 via `Linking.openURL('tel:988')` |
| Journal | `caregiver/community/journal.tsx` | DONE - AsyncStorage-backed entries with mood + text |
| View schedule (caregiver profile) | `caregiver/(tabs)/profile.tsx` | DONE - Navigates to schedule tab |
| Visit history | `caregiver/visit-history.tsx` | DONE - Paginated list grouped by date with Supabase query |
| Agency Help Center | `agency/(tabs)/settings.tsx` | DONE - Opens external URL |
| Agency Contact Support | `agency/(tabs)/settings.tsx` | DONE - Opens mailto: link |
| Agency Privacy Policy | `agency/(tabs)/settings.tsx` | DONE - Navigates to shared privacy-policy screen |
| Family Profile settings | `family/settings/profile.tsx` | DONE - Edit name, phone, relationship |
| Family Help & Support | `family/settings/index.tsx` | DONE - Opens mailto: link |

### Possibly Missing Backend
| Feature | Location | Note |
|---|---|---|
| `support_groups` table | `caregiver/community/groups/index.tsx` | Table created in consolidated migration; code still falls back to mock data if empty |
