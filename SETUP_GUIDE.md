# HealthGuide - Setup & Deployment Guide

Complete guide for setting up development environment, configuring APIs, and building for iOS/Android.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [API Keys & Services](#api-keys--services)
5. [iOS Build (Xcode)](#ios-build-xcode)
6. [Android Build (Android Studio)](#android-build-android-studio)
7. [Push Notifications Setup](#push-notifications-setup)
8. [Stripe Integration](#stripe-integration)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or 20.x | JavaScript runtime |
| npm or yarn | Latest | Package manager |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Xcode | 15.0+ | iOS builds (macOS only) |
| Android Studio | Hedgehog+ | Android builds |
| Git | Latest | Version control |

### Accounts Required

- [Expo Account](https://expo.dev/signup) - For builds and OTA updates
- [Supabase Account](https://supabase.com) - Backend database & auth
- [Stripe Account](https://stripe.com) - Payment processing
- [Apple Developer Account](https://developer.apple.com) - iOS distribution ($99/year)
- [Google Play Console](https://play.google.com/console) - Android distribution ($25 one-time)

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd HealthGuide/app

# Install dependencies
npm install

# Install Google Fonts packages (distinctive typography)
npx expo install @expo-google-fonts/plus-jakarta-sans @expo-google-fonts/fraunces @expo-google-fonts/jetbrains-mono

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..
```

> **Typography Note:** HealthGuide uses distinctive fonts (Plus Jakarta Sans, Fraunces, JetBrains Mono) instead of generic fonts like Inter or Roboto for a more professional, unique appearance.

### 2. Create Environment File

Create `.env` in the `/app` directory:

```env
# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# STRIPE CONFIGURATION
# ===========================================
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# ===========================================
# PUSH NOTIFICATIONS (Expo)
# ===========================================
# No key needed - Expo handles this automatically
# Just ensure you have an Expo account configured

# ===========================================
# GOOGLE MAPS (Optional - for address autocomplete)
# ===========================================
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# ===========================================
# ENVIRONMENT
# ===========================================
EXPO_PUBLIC_APP_ENV=development
```

### 3. Configure app.json

Update `app.json` with your app details:

```json
{
  "expo": {
    "name": "HealthGuide",
    "slug": "healthguide",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "healthguide",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#3B82F6"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.healthguide",
      "buildNumber": "1",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "HealthGuide needs your location to verify caregiver check-ins at client locations.",
        "NSLocationAlwaysUsageDescription": "HealthGuide uses background location to verify visits.",
        "NSCameraUsageDescription": "HealthGuide uses the camera to scan QR codes for check-in.",
        "NSMicrophoneUsageDescription": "HealthGuide uses the microphone for voice notes during visits."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#3B82F6"
      },
      "package": "com.yourcompany.healthguide",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow HealthGuide to use your location for visit verification."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow HealthGuide to use the camera for QR code scanning."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## Supabase Configuration

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings > API

### 2. Run Database Migrations

Navigate to the SQL Editor in Supabase and run the migrations in order:

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_user_profiles.sql
├── 003_agencies.sql
├── 004_caregivers.sql
├── 005_elders.sql
├── 006_assignments.sql
├── 007_tasks.sql
├── 008_family_members.sql          # DEPRECATED - see 011_care_groups.sql
├── 009_notifications.sql
├── 010_daily_reports.sql
├── 011_care_groups.sql              # Care groups + members (replaces family invitations)
├── 012_caregiver_marketplace.sql    # Caregiver marketplace profiles, agency links, consent flow
├── 013_caregiver_ratings.sql        # Caregiver ratings (thumbs up/down + tags), triggers, aggregates
├── 013_volunteer_tables.sql
├── 014_community_tables.sql
├── 014_elder_engagement.sql
└── 015_rls_policies.sql
```

> **Note:** Migration `011_care_groups.sql` creates the `care_groups` and `care_group_members` tables which replace the old `family_invitations` and `sms_invitations` tables. Existing data from `family_members` is migrated automatically.
>
> **Note:** Migration `012_caregiver_marketplace.sql` adds the caregiver marketplace: `caregiver_profiles` (independent public profiles), `caregiver_agency_links` (multi-agency support), and consent columns on `care_group_members`. Caregivers sign up independently and agency owners discover them via the directory.

> **Note:** Migration `013_caregiver_ratings.sql` adds the caregiver ratings system: `caregiver_ratings` table with thumbs up/down + selectable tags, UNIQUE constraint (one rating per user per caregiver), self-rating prevention trigger, denormalized aggregate columns (rating_count, positive_count) on `caregiver_profiles` with auto-update trigger, and `get_caregiver_top_tags()` helper function.

### 3. Configure Authentication

In Supabase Dashboard > Authentication > Providers:

**Email Auth:**
- Enable Email provider
- Disable "Confirm email" for development (enable for production)

**Phone Auth (OTP):**
- Enable Phone provider
- Supabase includes built-in SMS for OTP (limited free tier)
- For production, you can optionally configure a custom SMS provider

### 4. Storage Buckets

Create these storage buckets in Supabase Storage:

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('visit-photos', 'visit-photos', false),
  ('voice-notes', 'voice-notes', false);
```

### 5. Edge Functions

Deploy the edge functions:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Deploy functions
supabase functions deploy notify-check-in
supabase functions deploy notify-check-out
supabase functions deploy notify-daily-report
supabase functions deploy notify-family-elder-mood
supabase functions deploy send-push-notification
supabase functions deploy create-care-group
supabase functions deploy join-care-group
supabase functions deploy verify-npi
supabase functions deploy search-caregivers
supabase functions deploy respond-care-group-invite
supabase functions deploy public-caregiver-search

# DEPRECATED - no longer needed (Twilio removed):
# supabase functions deploy send-sms
# supabase functions deploy send-family-invitation
```

### 6. Required Environment Variables for Edge Functions

Set these in Supabase Dashboard > Edge Functions > Secrets:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> **Note:** HealthGuide uses Expo Push Notifications (free) instead of SMS for all notifications. No Twilio or SMS provider is required.

---

## API Keys & Services

### Required APIs

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| Supabase | Database, Auth, Storage | supabase.com |
| Stripe | Payments | stripe.com |
| Expo | Push Notifications (FREE) | expo.dev |

### Optional APIs

| Service | Purpose | Where to Get |
|---------|---------|--------------|
| NPPES Registry | NPI verification for caregivers | npiregistry.cms.hhs.gov (free, no key) |
| Google Maps | Address autocomplete | console.cloud.google.com |
| Sentry | Error tracking | sentry.io |

> **Note:** HealthGuide uses Expo's free push notification service for ALL notifications (check-in alerts, daily reports, mood alerts, etc.). No SMS/Twilio integration is required, which significantly reduces operational costs.

---

## iOS Build (Xcode)

### Prerequisites

- macOS computer
- Xcode 15.0 or later
- Apple Developer Account ($99/year)
- Valid provisioning profiles and certificates

### Option A: EAS Build (Recommended)

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Or for development/testing
eas build --platform ios --profile development
```

### Option B: Local Xcode Build

#### 1. Generate Native Project

```bash
# Generate iOS native project
npx expo prebuild --platform ios
```

#### 2. Open in Xcode

```bash
open ios/HealthGuide.xcworkspace
```

#### 3. Configure Signing

1. Select the project in the navigator
2. Go to "Signing & Capabilities"
3. Select your Team
4. Set Bundle Identifier: `com.yourcompany.healthguide`
5. Xcode will auto-generate provisioning profiles

#### 4. Configure Push Notifications

1. In Xcode, go to "Signing & Capabilities"
2. Click "+ Capability"
3. Add "Push Notifications"
4. Add "Background Modes" and check:
   - Remote notifications
   - Background fetch
   - Location updates

#### 5. Build & Archive

1. Select "Any iOS Device" as destination
2. Product > Archive
3. Once complete, Organizer window opens
4. Click "Distribute App" > "App Store Connect"
5. Follow prompts to upload to TestFlight/App Store

### App Store Submission Checklist

- [ ] App icons (all sizes)
- [ ] Screenshots for all device sizes
- [ ] App Store description
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] Export compliance (encryption)

---

## Android Build (Android Studio)

### Prerequisites

- Android Studio Hedgehog or later
- JDK 17
- Android SDK 34
- Google Play Developer Account ($25 one-time)

### Option A: EAS Build (Recommended)

```bash
# Build for Android
eas build --platform android --profile production

# Or for development/testing
eas build --platform android --profile development
```

### Option B: Local Android Studio Build

#### 1. Generate Native Project

```bash
# Generate Android native project
npx expo prebuild --platform android
```

#### 2. Open in Android Studio

```bash
# Open the android folder
studio android/
# Or: File > Open > select android folder
```

#### 3. Configure Signing

Create `android/app/keystore.properties`:

```properties
storeFile=healthguide-release.keystore
storePassword=your-store-password
keyAlias=healthguide
keyPassword=your-key-password
```

Generate a keystore:

```bash
keytool -genkey -v -keystore healthguide-release.keystore \
  -alias healthguide -keyalg RSA -keysize 2048 -validity 10000
```

#### 4. Update build.gradle

In `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("app/keystore.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 5. Build Release APK/AAB

```bash
# From android folder
cd android

# Build AAB (for Play Store)
./gradlew bundleRelease

# Build APK (for testing)
./gradlew assembleRelease
```

Output locations:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### Google Play Submission Checklist

- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone & tablet)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience declaration

---

## Push Notifications Setup

### Expo Push Notifications (Free - No SMS Required!)

HealthGuide uses Expo's **completely free** push notification service for ALL notifications:
- ✅ Check-in/check-out alerts to care group members (family, elder)
- ✅ Daily care reports to all care group members
- ✅ Elder mood alerts
- ✅ Visit reminders
- ✅ Volunteer visit requests

**No Twilio or SMS costs!** Push notifications are unlimited and free through Expo.

#### Care Group Invite Delivery

Care group invitations are delivered via the **native OS Share Sheet** (iOS/Android) and **QR codes**. No third-party SMS provider is needed. The agency owner creates a care group per elder, then shares the invite code via SMS, WhatsApp, email, or any messaging app using the built-in share sheet.

#### 1. Configure in app.json

Already configured in the plugins section above.

#### 2. Get Push Token

The app automatically registers for push notifications in `src/lib/notifications.ts`.

#### 3. Sending Notifications

Notifications are sent via Supabase Edge Functions using Expo's push API:

```typescript
// In edge function
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: expoPushToken,
    title: 'Visit Started',
    body: 'Sarah has checked in for the visit with Mom',
    data: { screen: 'FamilyVisitDetail', visitId: '123' },
  }),
});
```

### iOS-Specific Setup

1. Create Push Notification Key in Apple Developer Portal
2. Upload to Expo: `eas credentials`
3. Or configure manually in Expo Dashboard > Credentials

### Android-Specific Setup

1. Create Firebase project at console.firebase.google.com
2. Add Android app with package name
3. Download `google-services.json` to `android/app/`
4. Upload FCM Server Key to Expo Dashboard

---

## Stripe Integration

### 1. Get API Keys

From [Stripe Dashboard](https://dashboard.stripe.com/apikeys):
- Publishable key (starts with `pk_`)
- Secret key (starts with `sk_`)

### 2. Configure Products

Create products in Stripe Dashboard:

```
Product: HealthGuide Per-Elder Plan
Price: $15/month per elder
Billing: Recurring monthly
```

### 3. Configure Webhooks

In Stripe Dashboard > Developers > Webhooks:

1. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
2. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### 4. Customer Portal

Enable Customer Portal in Stripe Dashboard:
- Settings > Billing > Customer portal
- Configure allowed actions (cancel, update payment, etc.)

---

## Public Web Directory (healthguide-web)

The public web directory is a Next.js 14 app that lets anyone browse caregiver profiles without logging in. No contact info is exposed — visitors must download the HealthGuide app to connect.

### Setup

```bash
cd HealthGuide/healthguide-web
npm install
```

### Environment Variables

Create `.env.local` in `healthguide-web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Run Development Server

```bash
npm run dev
# Opens at http://localhost:3000
```

### Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with search bar + value props |
| `/caregivers` | Search results grid (SSR, filtered by zip/capabilities) |
| `/caregivers/[id]` | Individual profile page (ISR, revalidate 3600s) |

### Deploy

The web directory can be deployed to Vercel, Netlify, or any platform supporting Next.js:

```bash
npm run build
npm run start
```

### Data Safety

The `public-caregiver-search` edge function returns ONLY safe columns: id, full_name, photo_url, zip_prefix (3-digit), capabilities, npi_verified, bio, rating_count, positive_count. Phone, email, hourly_rate, full zip code, NPI number, NPI data, and availability are NEVER exposed.

---

## Production Deployment

### Pre-Launch Checklist

- [ ] All environment variables set to production values
- [ ] Supabase RLS policies verified
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured
- [ ] Terms of Service URL
- [ ] Privacy Policy URL
- [ ] HIPAA compliance review (if applicable)
- [ ] Accessibility audit
- [ ] Performance testing
- [ ] Security audit

### EAS Production Build

```bash
# Create production builds
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### OTA Updates

For minor updates without app store review:

```bash
# Publish OTA update
eas update --branch production --message "Bug fixes"
```

---

## Troubleshooting

### Common Issues

#### "Supabase not configured"

Ensure `.env` file exists with correct values and restart Metro bundler:

```bash
npx expo start --clear
```

#### iOS Build Fails - Signing Issues

```bash
# Reset certificates
eas credentials --platform ios
# Select "Remove" then "Generate new"
```

#### Android Build Fails - SDK Issues

```bash
# Accept licenses
cd android && ./gradlew --refresh-dependencies
sdkmanager --licenses
```

#### Push Notifications Not Working

1. Check device has valid push token
2. Verify Expo credentials are configured
3. Check Edge Function logs in Supabase

#### Location Not Working

1. Check permissions are granted
2. iOS: Ensure location capability added in Xcode
3. Android: Check manifest permissions

### Debug Commands

```bash
# Clear all caches
npx expo start --clear

# View native logs (iOS)
npx react-native log-ios

# View native logs (Android)
npx react-native log-android

# Check Expo config
npx expo config --type public
```

### Support Resources

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs)
- [Stripe Documentation](https://stripe.com/docs)

---

## Quick Start Summary

```bash
# 1. Clone and install
git clone <repo> && cd HealthGuide/app && npm install

# 2. Create .env with Supabase credentials

# 3. Start development
npx expo start

# 4. Run on device
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app for physical device

# 5. Build for production
eas build --platform all --profile production
```

---

## Cost Summary

| Service | Cost |
|---------|------|
| **Supabase** | Free tier (500MB DB, 1GB storage) / $25/mo Pro |
| **Expo Push Notifications** | **FREE & Unlimited** ✅ |
| **Stripe** | 2.9% + $0.30 per transaction |
| **Apple Developer** | $99/year |
| **Google Play** | $25 one-time |
| **SMS/Twilio** | **NOT REQUIRED** ✅ |

> **Total monthly cost to start:** $0 (using free tiers) + app store fees

---

*Last updated: February 2025*
