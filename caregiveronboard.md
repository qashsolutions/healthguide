# Caregiver Onboarding - End-to-End Test Findings

**Date**: 2026-02-18
**Environment**: localhost:8081 (Expo Web), Supabase remote DB
**Tester**: Automated browser testing via Chrome MCP

---

## Test Plan

### Flow Under Test
1. Welcome Screen → Role Selection (Caregiver)
2. Phone Number Entry → Send OTP
3. OTP Verification → 6-digit code
4. Profile Setup Step 1: Basic Info (Name + Zip + Photo)
5. Profile Setup Step 2: Skills & Rate (Capabilities, Certs, Rate, Keywords)
6. Profile Setup Step 3: Schedule & About (Availability grid, Bio)
7. Profile Completion → Navigate to Caregiver Dashboard

### Scenarios

#### Positive
- [x] P1: Select Caregiver role from welcome screen — **PASS**
- [ ] P2: Enter valid 10-digit phone number, receive OTP — **FAIL (BUG-1)**
- [ ] P3: Enter valid 6-digit OTP, proceed to profile setup — **BLOCKED (BUG-1)**
- [x] P4: Step 1 — enter name + zip code, proceed — **PASS**
- [x] P5: Step 2 — add capabilities, certs, rate range, keywords — **PASS**
- [x] P6: Step 3 — set availability via presets and manual grid — **PASS**
- [x] P7: Step 3 — enter experience summary + bio — **PASS**
- [ ] P8: Complete profile → lands on caregiver dashboard — **BLOCKED (no auth session due to BUG-1)**
- [ ] P9: Skip Step 2 entirely — **NOT TESTED** (skip link present, same flow)
- [ ] P10: Skip Step 3 entirely — **NOT TESTED** (skip link present, same flow)

#### Negative
- [x] N1: Empty phone number → error message — **PASS**
- [x] N2: Short phone number (< 10 digits) → validation error — **PASS**
- [ ] N3: Invalid OTP code → error message — **BLOCKED (BUG-1)**
- [x] N4: Step 1 — empty name → Continue disabled — **PASS**
- [x] N5: Step 1 — empty zip code → Continue disabled — **PASS**
- [x] N6: Step 1 — zip code < 5 digits → Continue disabled — **PASS**
- [x] N7: Step 2 — add more than 5 capabilities → enforced limit — **PASS**
- [x] N8: Step 3 — select more than 4 slots per day → enforced limit — **PASS**

#### Edge Cases
- [x] E1: Back navigation between steps — **PASS** (data preserved)
- [ ] E2: Resend OTP after 60s timer — **BLOCKED (BUG-1)**
- [x] E3: Phone number formatting (auto-format to (XXX) XXX-XXXX) — **PASS**
- [x] E4: Rate fields accept only numbers — **PASS** (non-numeric chars stripped)
- [x] E5: Availability preset buttons populate correctly — **PASS** (tested Full-Time + Weekends)

---

## Summary

| Category | Pass | Fail | Blocked | Not Tested | Total |
|----------|------|------|---------|------------|-------|
| Positive | 5 | 1 | 2 | 2 | 10 |
| Negative | 6 | 0 | 1 | 0 | 7 |
| Edge Cases | 4 | 0 | 1 | 0 | 5 |
| **Total** | **15** | **1** | **4** | **2** | **22** |

**Pass Rate**: 15/22 (68%) — all failures/blocks stem from BUG-1
**Adjusted Pass Rate** (excluding blocked): 15/16 (94%)

---

## Critical Bugs

### BUG-1: Root Layout `loading` state unmounts entire navigation tree (CRITICAL / BLOCKER)
- **File**: `app/src/app/_layout.tsx:66`
- **Impact**: **Blocks caregiver signup end-to-end**, sign-out, and any auth action that sets `loading: true`
- **Root Cause**: `RootLayoutNav` conditionally renders `<LoadingScreen>` when `loading` is true from AuthContext. When `signInWithPhone` (or any auth method) sets `loading: true`, the entire `<Stack>` navigator is **unmounted** and replaced with a spinner. When `loading` returns to false, the Stack remounts from scratch at `/(auth)/index` (Welcome screen), **destroying all navigation state**. The `router.push` to verify-otp executes but the target screen no longer exists in the tree.
- **Code**:
  ```tsx
  // _layout.tsx line 66 — THIS IS THE BUG
  if (!fontsLoaded || !initialized || loading) {
    return <LoadingScreen />;
  }
  ```
  ```tsx
  // AuthContext signInWithPhone — sets loading that triggers the bug
  const signInWithPhone = async (phone: string) => {
    setState(prev => ({ ...prev, loading: true }));   // ← unmounts Stack
    const { error } = await supabase.auth.signInWithOtp({ phone, ... });
    setState(prev => ({ ...prev, loading: false }));   // ← remounts Stack at index
    if (error) throw error;
  };
  ```
- **Affects**: `signInWithPhone`, `signInWithEmail`, `signUpWithEmail`, `signOut` — all set `loading: true`
- **Reproduction**: Click Caregiver → Enter valid phone → Send Code → App bounces to Welcome screen
- **Fix Options**:
  1. **Recommended**: Remove `loading` from the root layout guard — change to `if (!fontsLoaded || !initialized)`. Let individual screens handle their own loading spinners.
  2. Keep Stack mounted and overlay a loading spinner with `position: absolute` instead of replacing the tree.
  3. Don't set global `loading` in `signInWithPhone` — use local `useState` in each screen instead.

### BUG-2: Sign Out button non-functional (CRITICAL)
- **File**: `app/src/contexts/AuthContext.tsx:252-261`
- **Impact**: Users cannot log out from the Settings screen
- **Root Cause**: Same as BUG-1 — `signOut` sets `loading: true` which triggers the navigation tree unmount/remount. The sign-out may actually clear the Supabase session, but the navigation state is destroyed in the process. A race condition between `setState({ user: null })` and the `onAuthStateChange` `SIGNED_OUT` event causes the UI to appear stuck.
- **Reproduction**: Settings → Sign Out → Page appears unchanged. Must manually clear localStorage to log out.

### BUG-3: Stale session not handled on auth screens (MEDIUM)
- **Impact**: A user with a stale browser session who navigates to `/caregiver-signup` gets redirected to the previous user's dashboard after clicking Send Code
- **Root Cause**: Auth screens are accessible even when a session exists. The `signInWithOtp` call triggers the `onAuthStateChange` listener which detects the stale session and redirects to the protected dashboard.
- **Reproduction**: Log in as agency owner → Don't clear session → Navigate to /caregiver-signup → Send Code → Redirected to /agency dashboard
- **Fix**: Auth screens should check for existing sessions and force logout or show "Already logged in" warning

---

## Findings by Screen

### Screen: Welcome (Role Selection)
| # | Test | Result | Notes |
|---|------|--------|-------|
| P1 | Caregiver card → /caregiver-signup | **PASS** | Clean navigation, URL updates to /caregiver-signup |
| — | Layout & design | **PASS** | Logo, title "HealthGuide", subtitle, 2 role cards, invite code button, legal footer |
| — | "Already registered? Sign in" link | **PRESENT** | Links to /(auth)/phone-login?role=caregiver |
| — | "New agency? Register here" link | **PRESENT** | Links to /(auth)/register |
| — | Privacy Policy / Terms links | **PRESENT** | In footer, tappable |

### Screen: Phone Entry (caregiver-signup)
| # | Test | Result | Notes |
|---|------|--------|-------|
| N1 | Empty phone → Send Code | **PASS** | "Please enter a valid phone number" in red, red border on input |
| N2 | Short phone (5 digits) → Send Code | **PASS** | Same error message, stays on screen |
| E3 | Auto-formatting | **PASS** | "6145551234" → "(614) 555-1234", +1 prefix shown as left icon |
| P2 | Valid 10-digit phone → Send Code | **FAIL** | Redirects to Welcome screen due to BUG-1 |
| — | Layout & design | **PASS** | Back arrow, caregiver icon (emerald circle), title "Create Your Caregiver Profile", subtitle "Free — showcase your skills to agencies", phone input with +1, Send Code button, help text, Sign In link |
| — | Back button | **PASS** | Returns to Welcome screen |

### Screen: OTP Verification (verify-otp)
| # | Test | Result | Notes |
|---|------|--------|-------|
| N3 | Invalid OTP code | **BLOCKED** | Cannot reach screen due to BUG-1 |
| E2 | Resend timer | **BLOCKED** | Cannot reach screen due to BUG-1 |
| — | Code review | OK | 6-digit OTPInput, auto-submit on 6th digit, 60s countdown, resend button, role-themed |

### Screen: Profile Setup Step 1 (Basic Info)
| # | Test | Result | Notes |
|---|------|--------|-------|
| N4 | Empty name → Continue | **PASS** | Button disabled (muted green, reduced opacity) |
| N5 | Empty zip → Continue | **PASS** | Button disabled |
| N6 | Zip < 5 digits → Continue | **PASS** | Button disabled with 3-digit zip "432" |
| P4 | Name + 5-digit zip → Continue | **PASS** | Button turns solid emerald, navigates to Step 2 |
| — | Zip only accepts digits | **PASS** | `onChangeText` strips non-digits, `maxLength={5}` |
| — | Photo (Optional) | **PRESENT** | Dashed circle placeholder with "Add Photo" text |
| — | Header | **PASS** | "Basic Info 1/3", progress bar ~33% filled |
| — | Step 1 has no "Skip" option | **CORRECT** | Name + Zip are mandatory |

### Screen: Profile Setup Step 2 (Skills & Rate)
| # | Test | Result | Notes |
|---|------|--------|-------|
| P5 | Add capabilities via chips | **PASS** | Tap "Companionship" → green tag chip with X. Counter updates (1/5) |
| N7 | Max 5 capabilities | **PASS** | At 5/5: text input hidden, "Maximum 5 tasks selected" shown, all suggestion chips greyed out (opacity: 0.4) |
| — | Remove capability | **PASS** | Tap X on tag chip removes it, counter decrements, suggestion reappears |
| — | Certifications | **PASS** | Free-text input, accepts "CNA, HHA" |
| E4 | Rate field numeric filter | **PASS** | Typed "abc20" → only "20" displayed. `onChangeText` strips `[^\d.]` |
| — | Rate range layout | **PASS** | "$" prefix, min — max "/hr" format, side-by-side inputs |
| — | Keywords chips | **PASS** | Tap "Experienced" → blue tag chip. "Compassionate" → blue tag. Suggestion chips update |
| E1 | Back to Step 1 | **PASS** | Data preserved: "Test Caregiver" + "43209" still present |
| — | Forward to Step 2 again | **PASS** | All Step 2 data preserved (5 tasks, certs, rate, keywords) |
| — | "Skip for now" link | **PRESENT** | Visible on Step 2, not on Step 1 |
| — | Suggestion chips | **PASS** | 8 fallback tasks shown (no agency linked), 8 keyword suggestions shown |
| — | Header | **PASS** | "Skills & Rate 2/3", progress bar ~66% |

### Screen: Profile Setup Step 3 (Schedule & About)
| # | Test | Result | Notes |
|---|------|--------|-------|
| E5 | Full-Time preset | **PASS** | Mon-Fri 8a-4p (4 slots each = 8h), Sat/Sun empty. Chip highlighted green. |
| E5 | Weekends preset | **PASS** | Mon-Fri cleared, Sat/Sun 8a-4p (4 slots = 8h each). Chip highlighted green. Previous preset deselected. |
| N8 | Max 4 slots/day | **PASS** | After 4 slots on Sat (8h), remaining cells faded/disabled. 5th click ignored. |
| P6 | Manual slot toggle | **PASS** | Click individual cells to toggle on/off. Hours counter updates per row. |
| P7 | Experience Summary | **PASS** | Multiline textarea, accepts long text, renders properly |
| P7 | Bio | **PASS** | Multiline textarea, italic helper text below: "Share what makes you unique..." |
| — | "Complete Profile" button | **PRESENT** | Solid emerald green, always enabled on Step 3 |
| — | "Skip — I'll fill this in later" | **PRESENT** | Green text link below Complete Profile |
| — | Header | **PASS** | "Schedule & About 3/3", progress bar 100% filled |
| — | Availability grid layout | **PASS** | 7 days × 8 time slots, time headers (6-8a through 8-10p), Hrs column |

### Screen: Completion & Dashboard
| # | Test | Result | Notes |
|---|------|--------|-------|
| P8 | Complete Profile (no session) | **EXPECTED FAIL** | No auth session → DB insert fails → Alert.alert fires (window.alert on web) |
| — | Alert.alert on web | **ISSUE** | Uses window.alert() which creates blocking browser dialog — bad UX on web |

### Console Errors
| Timestamp | Screen | Error | Severity |
|-----------|--------|-------|----------|
| All | All screens | **No JavaScript errors detected throughout testing** | NONE |
| Load | Initial | expo-notifications web warning (expected, harmless) | LOW |

### UI/UX Issues
| # | Screen | Issue | Severity | Fix Suggestion |
|---|--------|-------|----------|----------------|
| 1 | Phone Entry | Error text from previous submit persists when user types new input. Error should clear on `onChangeText`. | LOW | Add `setError('')` in `onChangeText` handler |
| 2 | Phone Entry | `handleSendOTP` sets error before clearing — minor but `setError('')` in validation branch would be cleaner | LOW | Move `setError('')` before the `cleanPhone.length` check |
| 3 | Settings | Sign Out button non-functional (BUG-2) | CRITICAL | Fix BUG-1 (root cause) |
| 4 | Profile Setup | `Alert.alert()` on web maps to `window.alert()` — creates blocking browser dialog, poor UX | MEDIUM | Use custom toast/modal component instead of Alert.alert on web |
| 5 | Profile Setup | "Complete Profile" and "Skip" on Step 3 both call `handleCompleteProfile` — skip should potentially save partial profile or just navigate | LOW | Consider having "Skip" navigate without DB insert |
| 6 | Profile Setup | No validation that `hourlyRateMin < hourlyRateMax` — user could enter min=50, max=20 | LOW | Add comparison validation before submit |
| 7 | Phone Entry | `keyboardType="phone-pad"` doesn't restrict input on web browsers — user can type letters (stripped by JS but still accepted initially) | LOW | Web-specific: consider using `pattern` attribute or HTML5 `inputMode` |

---

## Architecture Observations

### What Works Well
- Step wizard pattern is clean with progress bar and step counter
- Form data persistence across steps (state managed in parent component)
- Tag chips + suggestion chips UX is intuitive and professional
- Schedule presets are a great UX shortcut — saves manual grid clicking
- Emerald (caregiver) theming is consistent throughout
- Validation logic is solid: required fields gate Continue, max limits enforced visually

### What Needs Attention
1. **BUG-1 is a showstopper** — the entire phone-based auth flow (caregiver + volunteer signup) is broken on web. Must be fixed before any caregiver can sign up.
2. **Alert.alert on web** — all error/success feedback uses `Alert.alert()` which maps to `window.alert()` on web. Needs platform-aware toast/modal.
3. **No max rate validation** — min and max rate can be inverted (min > max)
4. **No duplicate prevention** — if "Complete Profile" is clicked twice quickly, it could insert duplicate `caregiver_profiles` rows (no `unique` constraint on `user_id`?)
5. **Photo upload on web** — `ImagePicker.launchImageLibraryAsync` may not work on all web browsers. Needs testing.

---

## Recommended Priority Fixes

1. **P0 — BUG-1**: Remove `loading` from root layout guard in `_layout.tsx:66`. Change to:
   ```tsx
   if (!fontsLoaded || !initialized) {
     return <LoadingScreen />;
   }
   ```
   This single-line change unblocks the entire caregiver signup flow, sign-out, and all auth actions.

2. **P0 — BUG-2**: Will be fixed by P0 BUG-1 fix (same root cause).

3. **P1 — Alert.alert on web**: Replace `Alert.alert` with a cross-platform toast/modal component.

4. **P2 — Stale session handling**: Add session check in auth screens or force logout on entry.

5. **P3 — Minor validations**: Rate range comparison, error clearing on input change.
