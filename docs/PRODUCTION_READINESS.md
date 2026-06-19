# 🚀 Production-Readiness Audit — Happy Landlord App

_Last updated: 2026-06-19 (rev 3)_

Audit of HLApp (Expo SDK 54 / RN 0.81 / Expo Router v6 / Supabase / TanStack Query v5).

Legend: ✅ done · ⚠️ partial / needs work · ❌ missing · ❓ unknown / verify

---

## 1. App config & metadata

| Item                                         | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App name, slug, version, scheme              | ✅     | `app.json` (`Key Manager`, `happy-landlord-app`, `1.0.3`, `hlapp`). ⚠️ `package.json` `version` still `1.0.0` (cosmetic — build numbers come from EAS remote source).                                                                                                                                                                                                            |
| iOS bundle / Android package                 | ✅     | `au.com.happylandlord.app`                                                                                                                                                                                                                                                                                                                                                                  |
| Runtime version policy                       | ✅     | `appVersion` policy → OTA compatible per `version`                                                                                                                                                                                                                                                                                                                                          |
| Updates URL                                  | ✅     | EAS Update configured                                                                                                                                                                                                                                                                                                                                                                       |
| New Architecture + React Compiler            | ✅     | Both enabled                                                                                                                                                                                                                                                                                                                                                                                |
| Icons (iOS, adaptive Android)                | ⚠️     | Adaptive icon configured but `foregroundImage` + `monochromeImage` both point at `./assets/logo.png` rather than the dedicated `android-icon-foreground.png` / `android-icon-monochrome.png` silhouettes. Works, but a true monochrome silhouette is recommended for the themed-icon / notification look.                                                                                       |
| Splash screen (light/dark)                   | ✅     | `expo-splash-screen` plugin configured                                                                                                                                                                                                                                                                                                                                                      |
| Permissions / Info.plist strings             | ✅     | `NSCameraUsageDescription` ✅, `NSPhotoLibraryUsageDescription` ✅, `NSPhotoLibraryAddUsageDescription` ✅, FaceID via `expo-local-authentication` plugin ✅. All declared in `app.json` `ios.infoPlist`.                                                                                                                                                                                   |
| Android permissions                          | ✅     | Explicit allowlist in `app.json`: `CAMERA`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, `READ_MEDIA_IMAGES`. `WRITE_EXTERNAL_STORAGE` removed (unnecessary on API 30+).                                                                                                                                                                                                                             |
| `ITSAppUsesNonExemptEncryption`              | ✅     | `false`                                                                                                                                                                                                                                                                                                                                                                                     |
| iOS Privacy Manifest (PrivacyInfo.xcprivacy) | ✅     | `expo-build-properties` plugin added to `app.json` with all four required-reason API declarations: `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1), `NSPrivacyAccessedAPICategoryFileTimestamp` (C617.1), `NSPrivacyAccessedAPICategorySystemBootTime` (35F9.1), `NSPrivacyAccessedAPICategoryDiskSpace` (E174.1). Expo SDK 54 merges these into `PrivacyInfo.xcprivacy` at build time. |
| Hermes / R8                                  | ✅     | Default with SDK 54                                                                                                                                                                                                                                                                                                                                                                         |
| `experiments.typedRoutes`                    | ✅     | Enabled                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 2. Secrets & environment

| Item                               | Status | Notes                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local` ignored by git        | ✅     | `.env*.local` in `.gitignore`                                                                                                                                                                                                                                                                                                                                                |
| Supabase anon key in client        | ✅     | Anon key is public by design                                                                                                                                                                                                                                                                                                                                                 |
| No service-role key in client      | ✅     | Confirmed                                                                                                                                                                                                                                                                                                                                                                    |
| Google Places key in client bundle | ⚠️     | `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is bundled into the JS bundle. **Action required (GCP Console):** console.cloud.google.com → APIs & Services → Credentials → restrict the key to: Application restrictions = `Android apps` + `iOS apps` (add bundle id `au.com.happylandlord.app` / SHA-1 fingerprint); API restrictions = `Places API` only. Mark ✅ once saved.       |
| EAS env vars / Secrets             | ✅     | `SENTRY_AUTH_TOKEN` stored as EAS Secret ✅. `eas.json` `submit.production` now has real values — `appleId` (`tech@happylandlord.com.au`), `ascAppId` (`6779025764`), `appleTeamId` (`4S69N9TL92`), and Android `serviceAccountKeyPath` → `./credentials/google-play-service-account.json`. The `credentials/` folder is gitignored ✅ (key not committed). _For cloud builds, ensure the service-account JSON is available to EAS (local file or `GOOGLE_SERVICE_ACCOUNT_KEY` secret)._ |
| `.env.example`                     | ✅     | Added — covers `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, and `SENTRY_AUTH_TOKEN` with inline guidance. Copy to `.env.local` to get started.                                                                                                                                                                          |

---

## 3. Auth & session

| Item                    | Status | Notes                                                                                                                                                                                             |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase client config  | ⚠️     | `persistSession + autoRefreshToken` ✅. Uses AsyncStorage (not SecureStore) for session tokens. Consider SecureStore adapter.                                                                     |
| Primary auth method     | ✅     | **Phone OTP** (`signInWithOtp` / `verifyOtp`, AU mobile, E.164). Email/password is _not_ used. `(auth)/callback.tsx` deep-link handler remains for email-link flows.                              |
| App-state token refresh | ✅     | `AppState` listener in `lib/supabase/client.ts` calls `supabase.auth.startAutoRefresh()` on `active` and `stopAutoRefresh()` on background/inactive. Web is excluded via `Platform.OS !== "web"`. |
| Deep link PKCE callback | ✅     | `(auth)/callback.tsx` handles code + fragment flows, validating scheme (`hlapp`) + path before exchanging.                                                                                        |
| Sign-out cleanup        | ✅     | `useSignOut` clears query cache, resets lock store, and deactivates the current device's push token                                                                                              |
| Role gate               | ✅     | `RoleGate`, `useRole`, `pending/rejected` screens                                                                                                                                                 |
| Biometric lock          | ✅     | `expo-local-authentication` + per-user SecureStore preference, behind feature flag. Hardened: **phone-OTP re-verification fallback** (replaced a broken email/password fallback), **re-lock on app background** via `AppState`, enrolment prompt now verifies the biometric before enabling, platform-correct labels (Face ID/Touch ID on iOS; Face Unlock/Fingerprint on Android). |
| Biometric lock flag     | ⚠️     | `FEATURES.BIOMETRIC_LOCK = false` — decide before launch. Face ID needs a custom dev/production build (not Expo Go).                                                                              |

---

## 4. Data layer

| Item                          | Status | Notes                                                                                                                                                                                                                      |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QueryClient defaults          | ✅     | `staleTime 30s`, `retry 1`. `QueryCache` + `MutationCache` `onError` handlers added — surface an error toast via `react-native-toast-message` and drop a Sentry breadcrumb. 401s are silenced (handled by the auth layer). |
| Offline persistence           | ❌     | No `@tanstack/query-async-storage-persister`                                                                                                                                                                               |
| Realtime subscription cleanup | ✅     | `useNotificationRealtime` removes channel on unmount                                                                                                                                                                       |
| Service layer separation      | ✅     | Clean `lib/services/*.service.ts` pattern                                                                                                                                                                                  |
| `.single()` misuse / N+1      | ❓     | Not exhaustively audited                                                                                                                                                                                                   |

---

## 5. Error handling & observability

| Item                              | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Global `ErrorBoundary`            | ✅     | Defined in `app/_layout.tsx` (`ErrorBoundary` export)                                                                                                                                                                                                                                                                                                                                            |
| Crash reporting (Sentry/Bugsnag)  | ✅     | `@sentry/react-native` installed and configured. DSN, session replay & feedback in `app/_layout.tsx`. App wrapped with `Sentry.wrap()`. Metro config uses `getSentryExpoConfig`. Expo plugin configured in `app.json`. User identified via `Sentry.setUser()` in `app/(app)/_layout.tsx`. `SENTRY_AUTH_TOKEN` in `.env.local` for local source-map uploads; add to EAS Secrets for cloud builds. |
| `console.warn` in production code | ✅     | All 10 occurrences replaced with `logger` from `lib/utils/logger.ts`. Dev builds proxy to `console.*`; production adds Sentry breadcrumbs (errors also captured as Sentry exceptions).                                                                                                                                                                                                           |
| Unified error UX                  | ✅     | `lib/utils/errors.ts` (`getErrorMessage`, `alertError`) + `lib/utils/toast.ts` (`showErrorToast`, `showSuccessToast`, `showInfoToast` via `react-native-toast-message`). `<Toast />` mounted in root layout.                                                                                                                                                                                     |
| Network offline UX                | ❌     | No `@react-native-community/netinfo` integration / banner                                                                                                                                                                                                                                                                                                                                        |

---

## 6. Performance

| Item                             | Status | Notes                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------- |
| FlatList usage                   | ✅     | Notifications, properties, agents, requests                   |
| `keyExtractor` / `getItemLayout` | ❓     | Not audited line-by-line — verify                             |
| `expo-image` for caching         | ✅     | Installed and used                                            |
| React Compiler                   | ✅     | Enabled — reduces need for manual memo                        |
| Reanimated v4 + worklets         | ✅     | Up-to-date                                                    |
| LogBox suppression               | ⚠️     | Suppresses VirtualizedLists warning — acceptable with comment |

---

## 7. Notifications

| Item                          | Status | Notes                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expo-notifications` setup    | ✅     | Handler, Android channel, project id resolution                                                                                                                                                                                                                                                                              |
| Permission UX                 | ✅     | Silent on launch, prompt on explicit toggle                                                                                                                                                                                                                                                                                  |
| Push token storage in DB      | ✅     | `user_push_tokens` upsert with conflict handling                                                                                                                                                                                                                                                                             |
| Token cleanup on sign-out     | ✅     | `useSignOut` calls `deactivateCurrentDevicePushToken` so the previous user stops receiving pushes on this device (other devices preserved). Also applied in `useDeleteAccount`.                                                                                                                                                              |
| Notification tap → navigation | ✅     | `useNotificationResponseNavigation`                                                                                                                                                                                                                                                                                          |
| iOS APNs config in EAS        | ⚠️     | **Action required:** run `npx eas credentials --platform ios`, select the production profile → Push Notifications → upload an APNs Auth Key (`.p8`) from [developer.apple.com](https://developer.apple.com) → Keys. Note the Key ID and Team ID. Test with a direct Expo Push API call after upload. Mark ✅ once confirmed. |
| Android notification icon     | ⚠️     | `expo-notifications` plugin configured with `icon: ./assets/logo.png` and brand `color: #FDC107`. The icon is the full-colour logo rather than a flat white silhouette — Android renders notification icons as a monochrome mask, so a dedicated silhouette asset is recommended to avoid a solid blob.                          |

---

## 8. Navigation / routing

| Item                        | Status | Notes                                                                                             |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| File-based routes structure | ✅     | Clean `(auth)` / `(app)` / `(tabs)` separation                                                    |
| Protected route gating      | ✅     | `(app)/_layout.tsx` redirects to login + status screens                                           |
| Typed routes                | ✅     | Enabled — some `as never` casts could be tightened                                                |
| 404 / `+not-found.tsx`      | ✅     | `app/+not-found.tsx` added — renders a styled "Page not found" screen with a back-to-home button. |
| Modal presentation          | ✅     | `scan` uses `fullScreenModal`                                                                     |

---

## 9. Accessibility & UX

| Item                                     | Status | Notes                                                                                                                               |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `accessibilityLabel/Role` on key buttons | ⚠️     | Present on header, tab bar, biometric prompt, signup, agents. Most other Pressables (cards, list items) lack labels.                |
| Safe-area insets                         | ✅     | Used across all main screens                                                                                                        |
| Dark mode                                | ✅     | Set `userInterfaceStyle: "light"` — no dark theme planned; claim dropped. Status bar remains `style="dark"` (correct for light UI). |
| Dynamic Type / font scaling              | ❓     | Not verified                                                                                                                        |
| RTL                                      | ❓     | Not verified                                                                                                                        |
| Hit slop on small touch targets          | ❓     | Not verified                                                                                                                        |

---

## 10. Internationalisation

| Item         | Status | Notes                                                      |
| ------------ | ------ | ---------------------------------------------------------- |
| i18n library | ❌     | None. App is English-only — acceptable for AU-only launch. |

---

## 11. Testing

| Item                  | Status | Notes                                                                                                                                                                                                                                                                               |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests            | ❌     | No `*.test.*` files                                                                                                                                                                                                                                                                 |
| E2E (Detox / Maestro) | ✅     | Six Maestro smoke flows: `.maestro/login.yaml`, `.maestro/checkout.yaml`, `.maestro/return.yaml`, `.maestro/scan_qr.yaml`, `.maestro/add_property.yaml`, `.maestro/agent_invite.yaml`. Run with `maestro test .maestro/<flow>.yaml`. Required env vars per flow — see file headers. |
| Smoke checklist       | ✅     | login → checkout → return → scan QR → add property → agent invite all covered                                                                                                                                                                                                       |

---

## 12. CI/CD

| Item                           | Status | Notes                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub Actions / EAS Workflows | ✅     | `.github/workflows/ci.yml` added — runs `npm run lint` + `npm run typecheck` on push/PR to `main`.                                                                                                                                                                       |
| Pre-commit / lint-staged       | ✅     | `husky` + `lint-staged` installed. `.husky/pre-commit` runs `lint-staged` on every commit. `*.{ts,tsx}` → `eslint --max-warnings=0 --fix` then `prettier --write`; `*.{js,json,md,yaml,yml}` → `prettier --write`. Activated via `"prepare": "husky"` in `package.json`. |
| `npm run typecheck` clean      | ❓     | Verify before release                                                                                                                                                                                                                                                    |
| OTA update wiring              | ⚠️     | `expo-updates` installed + EAS URL set, but no JS code calls `Updates.checkForUpdateAsync()`. Consider a "Check for updates" trigger in Settings.                                                                                                                        |
| `appVersionSource: remote`     | ✅     | Build numbers managed in EAS                                                                                                                                                                                                                                             |

---

## 13. Security

| Item                          | Status | Notes                                                                                                                                                     |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency CVEs               | ✅     | Core deps scanned — no known CVEs: `@supabase/supabase-js@2.105.4`, `@sentry/react-native@7.2.0`, `react-native@0.81.5`, `expo@54.0.35`, `@tanstack/react-query@5.100.9`, `zod@4.4.3`. (Project does not use `axios`.) Re-scan before each release. |
| RLS reliance                  | ✅     | Confirmed — RLS is enabled on all Supabase tables.                                                                                                       |
| JWT in logs                   | ✅     | No matches                                                                                                                                                |
| WebView usage                 | ✅     | None                                                                                                                                                      |
| Clipboard secrets             | ✅     | None                                                                                                                                                      |
| Deep-link validation          | ✅     | `callback.tsx` validates `parsed.scheme === "hlapp"` and the auth-callback path before calling `exchangeCodeForSession`; non-matching URLs redirect to `/`. |
| Google Places key restriction | ⚠️     | See §2 for exact GCP Console steps.                                                                                                                       |

---

## 14. Build & release

| Item                      | Status | Notes                                                                                                                         |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| iOS signing               | ✅     | Configured via `eas credentials`.                                                                                            |
| Android signing           | ✅     | Configured via `eas credentials`.                                                                                          |
| EAS submit placeholders   | ✅     | `eas.json` filled with real values (`appleId`, `ascAppId`, `appleTeamId`, Android track/releaseStatus).                                                                                        |
| Play service-account JSON | ✅     | Referenced as `./credentials/google-play-service-account.json`; `credentials/` is gitignored so the key is not committed. Ensure the file (or a secret) is present in the EAS build context.    |
| App Store / Play listings | ✅     | Screenshots, description, keywords, age rating, and content rating questionnaire completed.                                   |
| Privacy Manifest (iOS)    | ✅     | See §1 — declared via `expo-build-properties` in `app.json`.                                                                  |
| Data Safety form (Play)   | ✅     | Completed — App Store privacy details and Play Data Safety form submitted.                                                    |

---

## 15. Legal / compliance

| Item                    | Status | Notes                                                                                           |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Privacy policy URL      | ⚠️     | Linked in `help.tsx` (`happylandlord.com.au/privacy`). Confirm live and matches store listings.                                                          |
| Terms of Service        | ⚠️     | Linked in `help.tsx` as "Terms of Use" (`happy-landlord.netlify.app/terms`). ⚠️ Different domain from the Privacy Policy — align both to the production domain before launch. |
| Account deletion in-app | ✅     | Implemented — Settings → `DeleteAccountSheet` calls `useDeleteAccount` → `delete_account` SECURITY DEFINER RPC, then signs out and clears caches. Satisfies App Store 5.1.1(v). |
| GDPR / consent          | ❓     | No consent flow visible (probably OK for AU B2B; required for EU).                              |
| Telemetry opt-in        | n/a    | None present                                                                                    |

---

## 16. Code quality

| Item                | Status | Notes                                                     |
| ------------------- | ------ | --------------------------------------------------------- |
| TypeScript `strict` | ✅     | On                                                        |
| ESLint config       | ✅     | `expo` flat config                                        |
| Prettier            | ✅     | Installed                                                 |
| `any` abuse         | ✅     | Minimal — only `as any`/`as never` for Supabase type gaps |
| Dead code / TODOs   | ✅     | Only 1 TODO-like marker (comment example)                 |

---

## 🔥 Top 10 blockers before shipping

1. ✅ **Sentry crash reporting** — `@sentry/react-native` installed and configured. DSN, session replay, feedback integration, user identification, source-map upload via `SENTRY_AUTH_TOKEN`. Dev-only test button in Settings. _Move `SENTRY_AUTH_TOKEN` to EAS Secret for cloud builds._
2. ✅ **Add `ErrorBoundary` + `+not-found.tsx`** at the root — _done (`app/_layout.tsx`, `app/+not-found.tsx`)._
3. ✅ **Fill EAS submit placeholders** — done. `eas.json` has real `appleId`, `ascAppId`, `appleTeamId`, and the Android service-account path. _(remaining: confirm the Play service-account file is available to the EAS build context.)_
4. ✅ **Add EAS env vars / Secrets** — `SENTRY_AUTH_TOKEN` stored as EAS Secret; Apple IDs and Play service-account wired in `eas.json`. _(verify `eas credentials` signing before first build.)_
5. ✅ **Deactivate push tokens on sign-out** — _done. `useSignOut` now calls `deactivateCurrentDevicePushToken` so the current device stops receiving the previous user's pushes (other devices preserved)._
6. ✅ **Validate deep-link origin** in `(auth)/callback.tsx` before calling `exchangeCodeForSession` — _done (scheme + path guard)._
7. **Restrict Google Places API key** in GCP to your iOS/Android fingerprints + Places API only. _(open — GCP console action)_
8. ✅ **Wire Supabase `AppState.startAutoRefresh()`** so sessions refresh while app is foregrounded — _done in `lib/supabase/client.ts`._
9. ✅ **iOS Privacy Manifest** — `expo-build-properties` plugin added to `app.json` with all four required-reason API declarations (UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, DiskSpace E174.1). ✅ removed deprecated Android `WRITE_EXTERNAL_STORAGE`; ✅ added `NSPhotoLibraryUsageDescription`.
10. ⚠️ **Decide on Biometric Lock flag** (`FEATURES.BIOMETRIC_LOCK`, still `false`). The feature is now production-hardened (phone-OTP fallback, background re-lock, verified enrolment). In-app **Delete Account** flow ✅ exists. _(open — product decision on whether to enable the lock at launch.)_
