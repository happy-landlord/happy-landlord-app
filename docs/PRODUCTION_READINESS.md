# 🚀 Production-Readiness Audit — Happy Landlord App

_Last updated: 2026-06-03_

Audit of HLApp (Expo SDK 54 / RN 0.81 / Expo Router v6 / Supabase / TanStack Query v5).

Legend: ✅ done · ⚠️ partial / needs work · ❌ missing · ❓ unknown / verify

---

## 1. App config & metadata
| Item | Status | Notes |
|---|---|---|
| App name, slug, version, scheme | ✅ | `app.json` (`HLApp`, `happy-landlord-app`, `1.0.0`, `hlapp`) |
| iOS bundle / Android package | ✅ | `au.com.happylandlord.app` |
| Runtime version policy | ✅ | `appVersion` policy → OTA compatible per `version` |
| Updates URL | ✅ | EAS Update configured |
| New Architecture + React Compiler | ✅ | Both enabled |
| Icons (iOS, adaptive Android) | ✅ | Adaptive + monochrome configured |
| Splash screen (light/dark) | ✅ | `expo-splash-screen` plugin configured |
| Permissions / Info.plist strings | ⚠️ | Camera & Photos add ✅. FaceID via plugin ✅. **Missing** `NSPhotoLibraryUsageDescription` (read) — required for `expo-image-picker`. |
| Android permissions | ⚠️ | `WRITE_EXTERNAL_STORAGE` is unnecessary on API 30+; Play will flag it. Remove. |
| `ITSAppUsesNonExemptEncryption` | ✅ | `false` |
| iOS Privacy Manifest (PrivacyInfo.xcprivacy) | ❌ | Required since Apple May 2024. Verify Expo SDK 54 emits it; declare required-reason APIs (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace). |
| Hermes / R8 | ✅ | Default with SDK 54 |
| `experiments.typedRoutes` | ✅ | Enabled |

---

## 2. Secrets & environment
| Item | Status | Notes |
|---|---|---|
| `.env.local` ignored by git | ✅ | `.env*.local` in `.gitignore` |
| Supabase anon key in client | ✅ | Anon key is public by design |
| No service-role key in client | ✅ | Confirmed |
| Google Places key in client bundle | ⚠️ | `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` ships to clients. **Restrict in GCP** to Android package + iOS bundle id + Places API only. |
| EAS env vars / Secrets | ⚠️ | `SENTRY_AUTH_TOKEN` added to `eas.json` production `env` block. **Replace placeholder with real token or use `eas secret:create`** to keep it out of source control. Other prod/preview secrets still needed. |
| `.env.example` | ❌ | None — add for onboarding |

---

## 3. Auth & session
| Item | Status | Notes |
|---|---|---|
| Supabase client config | ⚠️ | `persistSession + autoRefreshToken` ✅. Uses AsyncStorage (not SecureStore) for session tokens. Consider SecureStore adapter. |
| App-state token refresh | ❌ | No `AppState` listener calling `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()`. Required per Supabase RN guide. |
| Deep link PKCE callback | ✅ | `(auth)/callback.tsx` handles code + fragment flows |
| Sign-out cleanup | ✅ | `useSignOut` clears query cache + lock store |
| Role gate | ✅ | `RoleGate`, `useRole`, `pending/rejected` screens |
| Biometric lock | ✅ | `expo-local-authentication` + SecureStore, behind feature flag |
| Biometric lock flag | ⚠️ | `FEATURES.BIOMETRIC_LOCK = false` — decide before launch |

---

## 4. Data layer
| Item | Status | Notes |
|---|---|---|
| QueryClient defaults | ⚠️ | `staleTime 30s`, `retry 1`. **No global `onError`** — silent failures possible. Add a `QueryCache`/`MutationCache` with toast/Sentry hook. |
| Offline persistence | ❌ | No `@tanstack/query-async-storage-persister` |
| Realtime subscription cleanup | ✅ | `useNotificationRealtime` removes channel on unmount |
| Service layer separation | ✅ | Clean `lib/services/*.service.ts` pattern |
| `.single()` misuse / N+1 | ❓ | Not exhaustively audited |

---

## 5. Error handling & observability
| Item | Status | Notes |
|---|---|---|
| Global `ErrorBoundary` | ❌ | None defined. Expo Router supports per-segment `ErrorBoundary` exports — add at root. |
| Crash reporting (Sentry/Bugsnag) | ✅ | `@sentry/react-native` installed. `Sentry.init()` with DSN, session replay & feedback in `app/_layout.tsx`. App wrapped with `Sentry.wrap()`. Metro config uses `getSentryExpoConfig`. Expo plugin configured in `app.json`. User identified via `Sentry.setUser()` in `app/(app)/_layout.tsx`. `SENTRY_AUTH_TOKEN` in `.env.local` for local source-map uploads; add to EAS Secrets for cloud builds. |
| `console.warn` in production code | ⚠️ | 9 occurrences — pipe through logger / Sentry breadcrumbs. |
| Unified error UX | ✅ | `lib/utils/errors.ts` + `alertError` |
| Network offline UX | ❌ | No `@react-native-community/netinfo` integration / banner |

---

## 6. Performance
| Item | Status | Notes |
|---|---|---|
| FlatList usage | ✅ | Notifications, properties, agents, requests |
| `keyExtractor` / `getItemLayout` | ❓ | Not audited line-by-line — verify |
| `expo-image` for caching | ✅ | Installed and used |
| React Compiler | ✅ | Enabled — reduces need for manual memo |
| Reanimated v4 + worklets | ✅ | Up-to-date |
| LogBox suppression | ⚠️ | Suppresses VirtualizedLists warning — acceptable with comment |

---

## 7. Notifications
| Item | Status | Notes |
|---|---|---|
| `expo-notifications` setup | ✅ | Handler, Android channel, project id resolution |
| Permission UX | ✅ | Silent on launch, prompt on explicit toggle |
| Push token storage in DB | ✅ | `user_push_tokens` upsert with conflict handling |
| Token cleanup on sign-out | ⚠️ | `useSignOut` does NOT call `deactivateAllPushTokens` — previous user keeps receiving push on this device. **Fix.** |
| Notification tap → navigation | ✅ | `useNotificationResponseNavigation` |
| iOS APNs config in EAS | ❓ | Verify push key/cert via `eas credentials` |
| Android notification icon | ⚠️ | No `icon` in `expo-notifications` plugin config — Android falls back to generic bell. Add monochrome `notification-icon.png`. |

---

## 8. Navigation / routing
| Item | Status | Notes |
|---|---|---|
| File-based routes structure | ✅ | Clean `(auth)` / `(app)` / `(tabs)` separation |
| Protected route gating | ✅ | `(app)/_layout.tsx` redirects to login + status screens |
| Typed routes | ✅ | Enabled — some `as never` casts could be tightened |
| 404 / `+not-found.tsx` | ❌ | Missing |
| Modal presentation | ✅ | `scan` uses `fullScreenModal` |

---

## 9. Accessibility & UX
| Item | Status | Notes |
|---|---|---|
| `accessibilityLabel/Role` on key buttons | ⚠️ | Present on header, tab bar, biometric prompt, signup, agents. Most other Pressables (cards, list items) lack labels. |
| Safe-area insets | ✅ | Used across all main screens |
| Dark mode | ❌ | `userInterfaceStyle: "automatic"` declared but no `useColorScheme` usage; status bar hard-coded `style="dark"`. Effectively light-only — either build dark theme or set `light`. |
| Dynamic Type / font scaling | ❓ | Not verified |
| RTL | ❓ | Not verified |
| Hit slop on small touch targets | ❓ | Not verified |

---

## 10. Internationalisation
| Item | Status | Notes |
|---|---|---|
| i18n library | ❌ | None. App is English-only — acceptable for AU-only launch. |

---

## 11. Testing
| Item | Status | Notes |
|---|---|---|
| Unit tests | ❌ | No `*.test.*` files |
| E2E (Detox / Maestro) | ❌ | None |
| Smoke checklist | ❌ | None documented |

Recommend at minimum: Maestro flows for login, checkout, return, scan.

---

## 12. CI/CD
| Item | Status | Notes |
|---|---|---|
| GitHub Actions / EAS Workflows | ❌ | No `.github/` directory. Add lint + typecheck + EAS preview build on PR. |
| Pre-commit / lint-staged | ❌ | Not configured |
| `npm run typecheck` clean | ❓ | Verify before release |
| OTA update wiring | ⚠️ | `expo-updates` installed + EAS URL set, but no JS code calls `Updates.checkForUpdateAsync()`. Consider a "Check for updates" trigger in Settings. |
| `appVersionSource: remote` | ✅ | Build numbers managed in EAS |

---

## 13. Security
| Item | Status | Notes |
|---|---|---|
| Dependency CVEs | ❓ | Not run — audit `@supabase/supabase-js@2.105.4`, `lucide-react-native`, etc. |
| RLS reliance | ❓ | Verify all Supabase tables have RLS enabled on the backend. |
| JWT in logs | ✅ | No matches |
| WebView usage | ✅ | None |
| Clipboard secrets | ✅ | None |
| Deep-link validation | ⚠️ | `callback.tsx` calls `exchangeCodeForSession` on any URL with `?code=`. Validate `parsed.scheme === "hlapp"` and `parsed.path === "auth/callback"` first. |
| Google Places key restriction | ⚠️ | See §2 |

---

## 14. Build & release
| Item | Status | Notes |
|---|---|---|
| iOS signing | ❓ | Set up via `eas credentials` before first build |
| Android signing | ❓ | Same |
| EAS submit placeholders | ❌ | `eas.json` still has `YOUR_APPLE_ID_EMAIL`, `YOUR_APP_STORE_CONNECT_APP_ID`, `YOUR_APPLE_TEAM_ID` — fill before `eas submit`. |
| Play service-account JSON | ❌ | Referenced as `./google-play-service-account.json` but not in repo (good — use `eas secret`). |
| App Store / Play listings | ❓ | Screenshots, description, keywords, age rating, content rating questionnaire |
| Privacy Manifest (iOS) | ❌ | See §1 |
| Data Safety form (Play) | ❌ | Required; collect data inventory |

---

## 15. Legal / compliance
| Item | Status | Notes |
|---|---|---|
| Privacy policy URL | ⚠️ | Linked in `help.tsx` (`happylandlord.com.au/privacy`). Confirm live and matches store listings. |
| Terms of Service | ❓ | Not seen in code |
| Account deletion in-app | ❓ | Required by Apple (App Store Review 5.1.1(v)). Verify a "Delete account" path exists. |
| GDPR / consent | ❓ | No consent flow visible (probably OK for AU B2B; required for EU). |
| Telemetry opt-in | n/a | None present |

---

## 16. Code quality
| Item | Status | Notes |
|---|---|---|
| TypeScript `strict` | ✅ | On |
| ESLint config | ✅ | `expo` flat config |
| Prettier | ✅ | Installed |
| `any` abuse | ✅ | Minimal — only `as any`/`as never` for Supabase type gaps |
| Dead code / TODOs | ✅ | Only 1 TODO-like marker (comment example) |

---

## 🔥 Top 10 blockers before shipping
1. ✅ **Sentry crash reporting** — `@sentry/react-native` installed and configured. DSN, session replay, feedback integration, user identification, source-map upload via `SENTRY_AUTH_TOKEN`. Dev-only test button in Settings. _Move `SENTRY_AUTH_TOKEN` to EAS Secret for cloud builds._
2. ✅ **Add `ErrorBoundary` + `+not-found.tsx`** at the root — _done (`app/_layout.tsx`, `app/+not-found.tsx`)._
3. **Fill EAS submit placeholders** (`appleId`, `ascAppId`, `appleTeamId`, Play service-account secret). _(open — needs real account info)_
4. ⚠️ **Add EAS env vars / Secrets** — `SENTRY_AUTH_TOKEN` is in `eas.json` production env block but as a placeholder. Run `eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>` and remove the plaintext value from `eas.json`. _(open)_
5. ✅ **Deactivate push tokens on sign-out** — _done. `useSignOut` now calls `deactivateCurrentDevicePushToken` so the current device stops receiving the previous user's pushes (other devices preserved)._
6. ✅ **Validate deep-link origin** in `(auth)/callback.tsx` before calling `exchangeCodeForSession` — _done (scheme + path guard)._
7. **Restrict Google Places API key** in GCP to your iOS/Android fingerprints + Places API only. _(open — GCP console action)_
8. ✅ **Wire Supabase `AppState.startAutoRefresh()`** so sessions refresh while app is foregrounded — _done in `lib/supabase/client.ts`._
9. ⚠️ **iOS Privacy Manifest** _(still open — verify EAS build output)_; ✅ removed deprecated Android `WRITE_EXTERNAL_STORAGE`; ✅ added `NSPhotoLibraryUsageDescription`.
10. **Decide on Biometric Lock flag** (`FEATURES.BIOMETRIC_LOCK`) and ensure an in-app **Delete Account** flow exists (App Store requirement). _(open — product decisions)_

### Strong "should-do" next
- Notification icon for Android (`expo-notifications` plugin).
- Basic CI (typecheck + lint on PR via GitHub Actions).
- Maestro smoke tests for login → checkout → return.
- Dark theme or explicitly set `userInterfaceStyle: "light"` and drop the claim.
- Replace 9 `console.warn` calls with a structured logger / Sentry breadcrumb.

