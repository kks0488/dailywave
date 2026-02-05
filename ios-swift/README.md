# DailyWave iPhone App (SwiftUI)

This folder contains a **native iPhone app** implementation for DailyWave using **SwiftUI + SwiftData**.

## Why this exists

The existing `mobile/` Flutter app currently loads the web app in a WebView. That approach often fails App Store review due to “web wrapper / minimum functionality” concerns. This native app is designed to be App Store-friendly.

## Project generation (recommended)

This repo is Linux-based, so we keep the iOS project **generator-first**:

1. Install XcodeGen on your Mac:
   - `brew install xcodegen`
2. Generate the Xcode project:
   - `cd ios-swift`
   - `xcodegen generate`
3. Open in Xcode:
   - Open `DailyWave.xcodeproj`

## Required configuration

### 1) Backend URL (AI proxy)

Set a build setting (or scheme env var) named:
- `DW_BACKEND_URL`

Example (device testing needs a reachable URL; `localhost` won’t work on a physical iPhone):
- `https://api.yourdomain.com`

The app also lets you override the backend URL in Settings at runtime.

### 2) Supabase (Sign in with Apple for AI gating)

Set build settings:
- `DW_SUPABASE_URL`
- `DW_SUPABASE_ANON_KEY`

Notes:
- The Supabase **anon key is publishable** (not a server secret), but manage it via build settings.
- This project includes a `DailyWave.entitlements` file, but you still need a valid **Development Team** and (if needed) enable **Sign in with Apple** in Xcode (Signing & Capabilities).
- In Supabase dashboard, enable Apple provider and add your **bundle identifier** as an Authorized Client ID.

### 3) Notifications (routine reminders)

DailyWave can schedule **local notifications** for routines.

- App-level toggle lives in Settings (`dw_notifications_enabled`).
- Per-routine toggle is stored on each routine and re-schedules notifications when changed.

### 4) Account deletion (App Store)

If you ship AI sign-in, App Store policy requires **in-app account deletion**.

The iPhone app calls backend:
- `DELETE /api/auth/account` (with `Authorization: Bearer <supabase access token>`)

Backend must be configured with:
- `SUPABASE_PROJECT_URL` (or `SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## App Store notes (high-level)

- This app is **local-first**: workflows/routines/chaos work offline.
- AI calls are protected by **Sign in with Apple** (Supabase access token → backend `/api/ai/ask`).
- For production, keep AI endpoint protected with `REQUIRE_SUPABASE_AUTH_FOR_AI=1` and rate limits.
- The repo includes `PrivacyInfo.xcprivacy` and placeholder AppIcon assets under `DailyWaveApp/Resources/` — update them before submission.
