# HealthGuide — End-to-End Flows (Feb 19, 2026)

## Platform scope

HealthGuide is a **companionship network** — not a medical caregiving platform.

**Allowed tasks (hard limit, no exceptions):**
1. Companionship — conversation, games, walks, watching TV together, reading
2. Light cleaning — dishes, tidying, laundry, taking out trash
3. Groceries/errands — grocery shopping, pharmacy pickup, drive to store/appointment

**Explicitly blocked:** Toileting, bathing, dressing, feeding, medication/supplements, wound care, transfers, any ADL or medical activity.

---

## Actors

| Actor | Description |
|-------|------------|
| **Student** | Nursing/health student, 18+, .edu email, independent or agency-linked |
| **55+ Companion** | Adult 55+, provides peer companionship, independent or agency-linked |
| **Agency Owner** | Manages an agency, can recruit students/companions, assigns visits |
| **Elder** | Person receiving companionship (the care recipient) |
| **Family Member** | Relative of an elder, can browse/book on elder's behalf |

---

## Flow 1: Student signup

```
App launch
  → Landing screen shows 3 cards:
    [I'm a Student] [I'm a 55+ Companion] [I'm an Agency Owner]
    (+ existing links: "I need care" / "I'm a family member")

Student taps "I'm a Student"
  → Screen 1: Basic info
    - Full name
    - Age (must be 18+, self-declared)
    - College/university name
    - College address (city, state, zip)
    - .edu email address
    - Mobile number (not used for auth)
    - Password

  → System sends verification email to .edu address
  → Student opens email, taps confirm link
  → Account created (role: student_caregiver)

  → Screen 2: Profile setup
    - Profile photo (selfie encouraged)
    - Home zip code (for matching)
    - How far willing to travel (5 / 10 / 25 miles)
    - Availability (days + time slots — same picker as caregiver directory)
    - Tasks I can help with: [ ] Companionship [ ] Light Cleaning [ ] Groceries
    - Short bio ("I'm a 2nd-year nursing student at UT Austin...")
    - Program / expected graduation year (optional, visible to agencies)

  → Profile complete → lands on Student home screen
```

**Student is now:**
- Visible in the public companion directory (browsable by elders/families)
- Visible to agencies in their area (can receive invites)
- Able to browse and apply to agencies
- Able to receive visit requests from elders/families directly

---

## Flow 2: 55+ Companion signup

```
Companion taps "I'm a 55+ Companion"
  → Screen 1: Basic info
    - Full name
    - Date of birth (must be 55+, self-declared — app calculates age)
    - Email address (any email)
    - Mobile number (not used for auth)
    - Password

  → System sends verification email
  → Companion confirms email
  → Account created (role: companion_caregiver)

  → Screen 2: Profile setup
    - Profile photo (live selfie — taken in-app, not uploaded from gallery)
    - Home zip code
    - How far willing to travel (5 / 10 / 25 miles)
    - Availability (days + time slots)
    - Tasks I can help with: [ ] Companionship [ ] Light Cleaning [ ] Groceries
    - Short bio ("Retired teacher, love crosswords and long walks...")

  → Profile complete → lands on Companion home screen
```

**55+ Companion is now:**
- Visible in public companion directory
- Visible to agencies
- Can browse/apply to agencies
- Can receive visit requests
- Earns time credits for completed visits (future: redeemable when they need companionship)

---

## Flow 3: Agency Owner signup

```
Agency Owner taps "I'm an Agency Owner"
  → Existing signup flow (unchanged)
  → Creates agency
  → Lands on agency dashboard
```

**What changes for agencies:**
- Task list is restricted to the 3 allowed categories (existing tasks hidden/removed)
- Agency can now browse independent students/companions in their area and invite them
- Companions linked to the agency appear in the Caregivers tab (alongside any existing staff)

---

## Flow 4: Elder signup

```
Elder taps "I need care" (existing entry point)
  → Signup with email + mobile
  → Profile: name, date of birth, zip code, address
  → Needs selection:
    [ ] Companionship  [ ] Light Cleaning  [ ] Groceries
  → Preferred schedule (days + time slots)
  → Emergency contact (name, phone, relationship)

  → Profile complete → lands on Elder home screen
```

---

## Flow 5: Family Member signup

```
Family Member taps "I'm a family member" (existing entry point)
  → Signup with email + mobile
  → Link to their elder (by elder's email or invite code)
  → Can now act on behalf of the elder:
    - Browse companions
    - Request visits
    - View visit history
    - Receive notifications (check-in, check-out, visit completed)
```

---

## Flow 6: Elder/Family browses companions (independent matching)

```
Elder or Family Member opens "Find a Companion" tab
  → Sees list of available companions, filtered by:
    - Zip code proximity (within elder's preferred radius)
    - Task match (companion offers what elder needs)
    - Availability overlap (companion free when elder wants visits)
  → Each card shows:
    - Photo, name, type badge (Student / 55+ Companion)
    - Distance ("2.3 miles away")
    - Tasks offered (icons: chat bubble, broom, shopping cart)
    - Availability summary ("Mon, Wed, Fri afternoons")
    - Bio snippet
    - Rating (after they have reviews)

  → Elder taps a companion card → sees full profile
  → Taps "Request Visit"
    → Pick date + time slot
    → Pick tasks for this visit
    → Add a note ("Mom loves talking about gardening")
    → Submit request

  → Companion receives push notification: "New visit request from Eleanor J."
  → Companion opens app → sees request details
    → [Accept] or [Decline]
    → If declined, elder is notified and can pick another companion

  → If accepted:
    → Visit confirmed
    → Both parties see it on their schedule
    → Reminders sent 24hr and 1hr before
```

---

## Flow 7: Auto-match (elder requests, system finds)

```
Elder or Family Member taps "Find me a match"
  → Confirms: tasks needed, preferred day/time, zip code
  → System searches companions matching ALL criteria:
    1. Within travel radius of elder's zip
    2. Available on requested day/time
    3. Offers the requested tasks
    4. Sorted by: distance (closest first), then rating
  → System sends request to top match
    → If companion accepts → visit confirmed
    → If companion declines or no response in 4 hours → system tries next match
    → If no matches found → elder notified: "No companions available for this time. Try another day?"
```

---

## Flow 8: Agency discovers and invites a companion

```
Agency Owner opens Caregivers tab → taps "Browse Directory"
  → Sees independent students/companions in agency's service area
  → Filtered by: zip proximity, availability, tasks, type (student/55+)
  → Each card shows same info as elder view + college info for students

  → Agency Owner taps "Invite to Agency"
    → Companion receives notification: "Sunny Day Home Care wants you to join their team"
    → Companion opens app → sees agency info (name, location, description)
      → [Accept] → linked to agency, appears in agency's Caregivers tab
      → [Decline] → nothing changes, companion stays independent

  → Once linked:
    → Agency can assign them to visits with agency's elders
    → Companion still visible in public directory (can also work independently)
    → Companion can leave the agency at any time (unlink)
```

---

## Flow 9: Companion applies to an agency

```
Student or 55+ Companion opens "Agencies near me"
  → Sees list of agencies in their area
  → Each card shows: agency name, location, number of elders served, description

  → Taps "Apply"
    → Agency Owner receives notification: "Maria S. (nursing student) wants to join your team"
    → Agency Owner reviews companion profile
      → [Accept] → companion linked to agency
      → [Decline] → companion notified politely
```

---

## Flow 10: During a visit (EVV)

```
Visit day — companion gets push reminder 1 hour before

Companion arrives at elder's location
  → Opens app → taps "Start Visit"
  → App captures:
    - GPS coordinates (must be within 500ft of elder's address)
    - Timestamp (check-in time)
    - If GPS doesn't match: "You don't appear to be at Eleanor's location. Are you sure?"
  → Visit starts — timer visible in app

During visit:
  → Companion can see today's tasks (Companionship, Groceries, etc.)
  → Optional: log notes ("We played cards, she talked about her grandkids")
  → Emergency button always visible:
    → Taps "Emergency" → shows:
      - Elder's emergency contact (one-tap call)
      - Call 911 button
      - Guidance text: "Do NOT attempt to lift or move them. Stay calm."

Companion finishes → taps "End Visit"
  → App captures:
    - GPS coordinates (check-out)
    - Timestamp (check-out time)
    - Duration calculated automatically
  → Companion marks tasks completed:
    [x] Companionship  [x] Groceries  [ ] Light Cleaning
  → Optional: add a visit note

  → Visit recorded as complete
```

---

## Flow 11: After a visit

```
Both parties notified: "Visit complete"

Elder receives:
  → "How was your visit with Maria?" → 1-5 star rating + optional comment
  → Rating is private (only visible to HealthGuide, not the companion)

Family Member receives:
  → Push notification: "Maria completed a visit with Mom today (2.5 hours)"
  → Can view: check-in/out times, GPS verification, tasks completed, notes

Companion receives:
  → "How was your visit with Eleanor?" → optional feedback
  → Visit hours logged to their profile (visible to agencies/elders)
  → [Future] Time credits added to their balance

Agency (if companion is agency-linked):
  → Visit appears in agency dashboard with EVV data
  → Agency can review, flag, or approve
```

---

## Flow 12: Emergency during visit

```
Something goes wrong (elder falls, chest pain, confusion)

Companion taps "Emergency" button (always visible during active visit)
  → Screen shows:
    ┌─────────────────────────────────┐
    │  EMERGENCY                      │
    │                                 │
    │  [Call 911]          (red)      │
    │                                 │
    │  [Call Family: Emily Johnson]   │
    │  (555) 123-4567                 │
    │                                 │
    │  ─────────────────────────────  │
    │  DO NOT attempt to lift, move,  │
    │  or give any medication.        │
    │  Stay with them. Stay calm.     │
    │  Help is on the way.            │
    └─────────────────────────────────┘

  → If 911 is called:
    → App logs the emergency event
    → Family member auto-notified: "Emergency reported during visit with Mom"
    → Agency auto-notified (if linked)
    → Visit flagged for review
```

---

## Notification summary

| Event | Who gets notified | Channel |
|-------|------------------|---------|
| New visit request | Companion | Push + in-app |
| Request accepted/declined | Elder + family | Push + in-app |
| Visit reminder (24hr) | Both parties | Push |
| Visit reminder (1hr) | Both parties | Push |
| Companion checked in | Family member | Push |
| Companion checked out | Family member | Push |
| Visit completed | Elder, family, agency | Push + in-app |
| Emergency triggered | Family + agency | Push (urgent) |
| Agency invite received | Companion | Push + in-app |
| Agency application received | Agency owner | Push + in-app |
| Rating received | Companion (summary only) | In-app |

---

## What each actor sees after login

### Student / 55+ Companion home screen
- **Upcoming visits** — today and next 7 days
- **New requests** — pending visit requests to accept/decline
- **My profile** — edit availability, tasks, bio
- **Agencies** — linked agencies + browse/apply
- **Visit history** — past visits with hours logged
- [Future] **Time bank** — credits earned/spent

### Agency Owner home screen
- **Dashboard** — existing stats (active companions, visits today, elders)
- **Caregivers tab** — linked companions + "Browse Directory" to invite more
- **Elders tab** — existing
- **Schedule tab** — existing, tasks limited to 3 categories
- **Settings** — existing

### Elder home screen
- **Upcoming visits** — next scheduled companion visit
- **Find a Companion** — browse directory or request auto-match
- **My companions** — people they've had visits with (favorites)
- **Visit history** — past visits

### Family Member home screen
- **Elder's upcoming visits** — who's coming and when
- **Find a Companion** — browse/book on behalf of elder
- **Visit history** — with EVV data (check-in/out, duration)
- **Notifications** — real-time updates on visits

---

## Data model changes needed

| Change | Details |
|--------|---------|
| New `caregiver_type` field | `student` or `companion_55` on `caregiver_profiles` |
| New signup fields | `college_name`, `college_address`, `date_of_birth`, `travel_radius_miles` on `caregiver_profiles` |
| Task restriction | Only 3 task categories allowed in `agency_tasks` / visit creation |
| Visit request table | New `visit_requests` table for the request/accept/decline flow |
| EVV fields | `check_in_lat`, `check_in_lng`, `check_out_lat`, `check_out_lng` on `visits` |
| Agency invites | New `agency_invites` table (agency_id, companion_id, status, direction) |
| Emergency log | New `visit_emergencies` table (visit_id, type, timestamp) |
| [Future] Time credits | `time_credits` ledger table (companion_id, visit_id, hours, balance) |

---

## Open items for future phases

- **Time bank credit system** — earn/spend/transfer credits
- **Background check integration** (Checkr API) — for specialized tier if ever needed
- **Nursing school partnerships** — verified hour certificates
- **Health plan billing** — companionship as a covered benefit
- **In-app messaging** — companion and elder/family chat before a visit
- **Recurring visits** — "Every Tuesday at 2pm with Maria"
