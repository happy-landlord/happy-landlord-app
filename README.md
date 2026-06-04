# Happy Landlord App (HLApp)

React Native mobile app for **Happy Landlord** — a key-management platform for real estate agencies. Built with Expo (SDK 54, New Architecture) and Expo Router v6.

---

## Tech stack

| Layer              | Choice                                                      |
| ------------------ | ----------------------------------------------------------- |
| Framework          | Expo SDK 54 · React Native 0.81                             |
| Navigation         | Expo Router v6 (file-based, typed routes)                   |
| Backend            | Supabase (Postgres + Auth + Edge Functions + Realtime)      |
| Data fetching      | TanStack Query v5                                           |
| Styling            | NativeWind v4 (Tailwind CSS) + `StyleSheet`                 |
| Forms              | React Hook Form + Zod                                       |
| State              | Zustand (lock screen store)                                 |
| Icons              | Lucide React Native · Ionicons                              |
| Push notifications | Expo Notifications → Supabase Edge Function → Expo Push API |
| Biometrics         | Expo Local Authentication                                   |
| OTA updates        | EAS Update (`appVersion` runtime policy)                    |

---

## Roles

| Role      | Capabilities                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| **Admin** | Full access — manage properties, key sets, agents, approve/reject registration requests, see all activity  |
| **Agent** | Checkout / return / transfer company key sets assigned to properties they work on; view their own activity |

New sign-ups land in a **pending** state until an admin approves their registration request.

---

## Key features

- **Key set management** — company and tenant key sets per property, each with a typed inventory (main door, mailbox, fob, garage remote, etc.)
- **Checkout / return / transfer** — atomic RPCs via Supabase; status and holder updated in a single transaction
- **QR / barcode scan** — scan a key-set code to jump straight to the detail screen
- **Activity feed** — full movement history across all key sets, filterable by user
- **Push notifications** — checkout, return, due-soon, overdue, recall, and registration events
- **Biometric lock** — optional Face ID / fingerprint gate on app open
- **Countdown timer** — live due-back countdown on checked-out key sets
- **Property detail** — address, landlord info, key-set list, and admin edit shortcut

---

## Folder structure

```
app/                    Expo Router screens (file-based routing)
  (auth)/               Unauthenticated stack — login, signup, OAuth callback
  (app)/                Authenticated stack
    (tabs)/             Bottom tab screens — Home, Keys, Activity, Profile
    properties/[id]/    Property detail + key-set detail
    scan.tsx            QR / barcode scanner
    settings.tsx        Push notifications + biometric settings
    requests.tsx        Admin — pending registration requests
    pending.tsx         Shown while account awaits approval
    rejected.tsx        Shown after account rejection

components/
  keyset/               Key-set specific cards, modals, countdown
  property/             Property header, summary, landlord card, key-sets section
  ui/                   Shared primitives — Button, Card, Screen, Input, etc.

constants/              Theme, roles, icons, query keys, movement configs
hooks/                  Data hooks (useProfile, useKeySets, useProperties, …)
lib/                    Supabase client, React Query client, lock store, formatters
services/               Supabase query/mutation functions per domain
types/
  database.ts           Hand-maintained Supabase schema types
supabase/
  sql/                  Migration SQL files
```

---

## Environment

Copy `.env.example` to `.env.local` and fill in your values:

```
cp .env.example .env.local
```

| Variable                            | Where to find it                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`          | Supabase dashboard → Project Settings → API                                                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`     | Supabase dashboard → Project Settings → API                                                    |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | GCP console → APIs & Services → Credentials (restrict to Places API + your app bundle IDs)     |
| `SENTRY_AUTH_TOKEN`                 | sentry.io → Settings → Auth Tokens (`project:releases` scope) — build-time only, never bundled |

> **`.env.local` is git-ignored.** For EAS cloud builds store `SENTRY_AUTH_TOKEN` as an EAS Secret:
>
> ```
> npx eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>
> ```

---

## Local development

### 1. Install dependencies

```
npm install
```

### 2. Start the dev server

```
npm run start
```

Open on a specific platform:

```
npm run android
npm run ios
npm run web
```

Clear Metro cache if you see stale bundle issues:

```
npm run start:clear
```

---

## Quality checks

```
npm run lint        # ESLint (expo + prettier config)
npm run typecheck   # tsc --noEmit
```

### Pre-commit hook

[husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/okonet/lint-staged) run automatically on every `git commit`:

| Staged file pattern       | Commands                                             |
| ------------------------- | ---------------------------------------------------- |
| `*.{ts,tsx}`              | `eslint --max-warnings=0 --fix` → `prettier --write` |
| `*.{js,json,md,yaml,yml}` | `prettier --write`                                   |

The hook is bootstrapped via `"prepare": "husky"` in `package.json` — no extra setup needed after `npm install`.

---

## E2E smoke tests (Maestro)

Six [Maestro](https://maestro.mobile.dev/) flows live in `.maestro/`:

| Flow         | File                | Key env vars                                                                                              |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| Login        | `login.yaml`        | `MAESTRO_TEST_EMAIL`, `MAESTRO_TEST_PASSWORD`                                                             |
| Checkout     | `checkout.yaml`     | _(inherits login vars)_                                                                                   |
| Return       | `return.yaml`       | _(inherits login vars)_                                                                                   |
| QR scan      | `scan_qr.yaml`      | `MAESTRO_SCAN_CODE`                                                                                       |
| Add property | `add_property.yaml` | `MAESTRO_PROPERTY_NAME`, `MAESTRO_PROPERTY_SUBURB`, `MAESTRO_PROPERTY_STATE`, `MAESTRO_PROPERTY_POSTCODE` |
| Agent invite | `agent_invite.yaml` | _(needs a pending request pre-seeded)_                                                                    |

Run a single flow:

```
maestro test .maestro/login.yaml
```

Run the full suite:

```
maestro test .maestro/
```

---

## EAS setup (first time)

```
npx eas login
npm run eas:configure
```

Links the app to EAS project `55bce2dd-5c0f-4aca-a7f6-634e684acd3f` and generates platform signing credentials.

---

## Build & publish

### Preview builds (internal distribution)

```
npm run build:preview:android
npm run build:preview:ios
```

### Production store builds

```
npm run build:production   # both platforms, auto-increments build number
```

### Submit to stores

```
npm run submit:android
npm run submit:ios
```

### OTA updates (EAS Update)

```
npm run publish:preview      # → preview branch
npm run publish:production   # → production branch
```

OTA updates deliver JS/asset changes without a new store release. The runtime version policy is `appVersion` — updates are compatible within the same `version` in `app.json`.

---

## Supabase

See [`supabase/README.md`](supabase/README.md) for:

- Notification automation SQL (triggers, scheduled jobs, Edge Function contract)
- Required Vault secrets
- `pg_cron` schedule for due-soon / overdue notifications

### Push token schema

`user_push_tokens` tracks one row per device:

| Column            | Type                | Notes                         |
| ----------------- | ------------------- | ----------------------------- |
| `id`              | uuid                | PK                            |
| `user_id`         | uuid                | FK → `auth.users`             |
| `expo_push_token` | text                | Expo token string             |
| `device_name`     | text \| null        |                               |
| `platform`        | text \| null        | `ios` \| `android`            |
| `is_active`       | bool \| null        | Set to `false` on token error |
| `created_at`      | timestamptz         |                               |
| `updated_at`      | timestamptz         | NOT NULL DEFAULT now()        |
| `last_seen_at`    | timestamptz \| null | Updated on each app open      |

---

## Notes

- Build profiles are in `eas.json` (`development`, `preview`, `production`).
- App store metadata and signing credentials must be configured in EAS before first store submit.
- New Architecture (`newArchEnabled: true`) and React Compiler (`reactCompiler: true`) are both enabled.
- The app uses `expo-secure-store` for session persistence and biometric state storage.
- **Global error feedback** — `QueryCache` and `MutationCache` in `lib/query/queryClient.ts` carry an `onError` handler that (1) shows a `react-native-toast-message` error toast and (2) adds a Sentry breadcrumb. `<Toast />` is mounted at the root in `app/_layout.tsx`. 401 errors are silenced (handled by the auth redirect layer). Use `showErrorToast` / `showSuccessToast` / `showInfoToast` from `lib/utils/toast.ts` for ad-hoc toasts.
- **Pre-commit quality gate** — `husky` + `lint-staged` run ESLint (auto-fix) and Prettier on every staged file before a commit lands.
