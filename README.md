# HLApp

Expo + Expo Router app for Happy Landlord.

## Setup

### 1) Install dependencies

```bash
npm install
```

### 2) One-time EAS setup

```bash
npx eas login
npm run eas:configure
```

This links the app to an EAS project and creates platform build credentials when needed.

## Run locally

```bash
npm run start
```

Useful variants:

```bash
npm run android
npm run ios
npm run web
npm run start:clear
```

## Quality checks

```bash
npm run lint
npm run typecheck
```

## Build and publish with EAS

### Internal preview builds

```bash
npm run build:preview:android
npm run build:preview:ios
```

### Production store builds

```bash
npm run build:production
```

### Submit latest builds to stores

```bash
npm run submit:android
npm run submit:ios
```

### Publish OTA updates (EAS Update)

```bash
npm run publish:preview
npm run publish:production
```

## Notes

- Build profiles are defined in `eas.json`.
- `publish:*` sends JavaScript/asset updates to the matching branch.
- App store metadata and signing credentials must be configured in EAS before first submit.
