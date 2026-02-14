# HealthGuide -- Feature Inventory

> Generated from codebase analysis. Last updated: Feb 13, 2026.

## Tech Stack

- **Mobile:** React Native 0.81.5 + Expo SDK 54 + expo-router v6
- **Backend:** Supabase (Auth, Postgres, Edge Functions, Storage)
- **Offline DB:** WatermelonDB 0.28 (local SQLite)
- **Billing:** Stripe ($15/elder/month, 14-day free trial)
- **Web:** Next.js (public caregiver directory)
- **Language:** TypeScript throughout (strict mode, zero compilation errors)

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
- Today's schedule preview and recent alerts (missed visits, late check-ins, unassigned visits)

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
- Add assignment screen with elder/caregiver/time/task selection, wired from schedule with date param

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
3. **QR Check-In:** Camera-based QR scanner as fallback to GPS, records check-in to Supabase with `check_in_method: 'qr_code'`
4. **Task Completion:** Task list with complete/skip actions, skip requires reason via modal, optimistic UI updates, haptic feedback
5. **Observations:** Icon-based observation recording by category (mood, appetite, mobility, activity)
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
- Falls back to 5 mock groups if `support_groups` table is empty
- Group detail: chat messaging interface with likes

### Visit History
- Paginated list of completed/missed visits grouped by date
- Shows elder name, time range, duration, task summary, status badge
- Supabase query with mock data fallback

### Profile Tab
- Profile overview with avatar and stats
- Marketplace status badge (active/inactive, NPI verified)
- "Edit Marketplace Profile" navigates to profile editor
- "My Schedule" navigates to schedule tab
- "Visit History" navigates to visit history screen

---

## 4. Careseeker (Elder) Features

### Tab Navigation (3 Tabs)
Home, Activities, Calls -- large touch targets, elder-friendly UI

### Home
- Large buttons for daily actions with oversized text and touch targets
- Greeting by time of day, next caregiver visit card

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
- Video calling via `family_video_contacts` table with `Linking.openURL()`, call stats tracking
- Emergency call fetches from `emergency_contacts` table (fallback to `elders.emergency_phone`), dials via `Linking.openURL('tel:...')`
- Agency-side video contact management screen linked from elder detail

---

## 5. Family Member Features

### Dashboard
- Care overview for the elder with recent visits and today's visit status
- Push notification integration with clearBadge() on focus

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

> Local table names differ from Supabase: `assignments` -> `visits`, `assignment_tasks` -> `visit_tasks`. The SyncQueueManager handles this mapping.

### Sync Queue Manager
- Singleton managing offline change queue with CRUD against Supabase
- Maps local table names to Supabase table names (`assignments` -> `visits`, `assignment_tasks` -> `visit_tasks`)
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
- **Typography:** Role-specific sizing -- `typography.styles.{h1-h4, body, bodyLarge, bodySmall, label, caption, button}`, `typography.caregiver.{heading, body, label}`, `typography.elder.{heading, body, button}`
- **Spacing:** Numeric scale -- `spacing[0]` through `spacing[40]`, `borderRadius` constants
- **Colors:** Object-based -- `colors.primary[50-900]`, `colors.text.{primary, secondary}`, `colors.neutral[50-900]`, `colors.success/error/warning/info[50-900]`, `roleColors.{agency_owner, caregiver, careseeker, family}`
- **UI Components:** Button (`title` prop), Input, LargeInput, OTPInput (`onChange` prop), Card, Badge (variants: success/error/warning/info/neutral), ProgressBar, TapButton, QRCode, QRInviteCard, TimePicker, CountBadge
- **Icon sets:** 40+ SVG icons -- navigation, task type, observation, role-specific (CaregiverIcon, FamilyIcon, ElderIcon)

---

## 15. Database (15 Migrations)

| # | Purpose |
|---|---|
| 001 | Core tables: user_profiles, agencies, elders, emergency_contacts, PostGIS setup |
| 002 | Task library, visits, visit_tasks |
| 003 | Observations, notifications |
| 004 | Functions & triggers (location geo-update, contact limit enforcement) |
| 005 | Seed 19 default tasks |
| 006 | Row-Level Security (RLS) policies for multi-tenant isolation |
| 007 | Family members table |
| 008 | Device tokens for push notifications |
| 009 | Stripe subscriptions, invoices |
| 010 | Elder task preferences |
| 011 | Care groups, invite codes, members, support groups |
| 012 | Caregiver profiles for marketplace (NPI, capabilities, availability) |
| 013 | Ratings system with triggers (denormalized counts, top tags RPC) |
| 014 | Family video contacts |
| 015 | Caregiver wellness logs, elder daily checkins |

---

## Screen Count by Role

| Role | Tab Screens | Stack Screens | Total |
|---|---|---|---|
| Auth (shared) | -- | 10 | 10 |
| Agency Owner | 5 | 12 | 17 |
| Caregiver | 4 | 12 | 16 |
| Careseeker (Elder) | 3 | 2 | 5 |
| Family Member | 3 | 5 | 8 |
| **Total** | **15** | **41** | **56** |

---

## Implementation Status

### Fully Implemented (backend-integrated)

**Authentication & Onboarding**
- Email login/signup for agency owners
- Phone OTP login/signup for caregivers and elders
- Multi-step caregiver profile setup (4 steps)
- Care group join flow with invite code + OTP
- Auth context with role-based routing
- Privacy Policy and Terms screens

**Agency Owner**
- Dashboard with real-time stats (edge function)
- Caregiver list with search, status badges, visit stats
- Elder list with search, care needs, family count
- Elder detail with address geocoding, care needs, emergency contacts
- Care group creation with QR invite
- Care group detail with member management
- Week schedule view with assignment creation
- Caregiver directory with marketplace search
- Caregiver profile view (read-only)
- Rating interface
- Task library with 19 defaults + custom creation
- Billing screens (Stripe portal)
- Settings with Help Center, Contact Support, Privacy Policy

**Caregiver**
- Today dashboard with assignments
- Week schedule with offline indicator
- Full visit flow: GPS check-in, QR check-in, task completion, observations, GPS check-out
- Marketplace profile editor (photo, NPI, capabilities, availability)
- Pending invitations (accept/decline)
- Visit history (paginated, grouped by date)
- Community: wellness logging, support groups, resources, journal, crisis line
- Profile with marketplace status

**Careseeker (Elder)**
- Large-button home screen
- Daily mood check-in with family alert
- Memory game with scoring
- Video calling via contacts table
- Emergency call with fallback

**Family Member**
- Care overview dashboard with push notifications
- Daily reports list and detail
- Visit detail with task/observation review
- Settings: profile edit, notification preferences, help & support

**Infrastructure**
- Offline sync with WatermelonDB (7 local tables)
- Sync queue with exponential backoff
- Data prefetching (7-day lookahead)
- EVV: GPS + QR code verification
- Push notifications with categories
- Invite system with deep links + QR codes
- 18 Supabase Edge Functions
- 15 database migrations with RLS
- Public web app (Next.js) with caregiver search

### Partial (UI built, some data mocked)

| Feature | Note |
|---|---|
| Caregiver profile stats | Total visits, rating displayed but use mock values |
| Support groups | Falls back to mock data if `support_groups` table is empty |
| Visit history | Has mock data fallback alongside real Supabase query |
| Family report detail | Layout exists, data fetching may be incomplete |
| Elder activities (Trivia, Music, Photos) | Navigation exists, game screens are stubs |
| Elder calls | UI exists, video integration depends on `family_video_contacts` data |
