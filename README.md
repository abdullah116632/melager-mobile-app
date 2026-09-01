# Mealager — Mobile (Expo + React Native)

Expo Router + React Native + TanStack Query.

## Setup

```bash
npm install
cp .env.example .env       # set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:5000
npm run dev                # Expo CLI — choose web/Android/iOS
```

## Connecting to the backend

`lib/api.ts` resolves the API base URL like this:

1. `EXPO_PUBLIC_API_URL` (full URL, e.g. `http://192.168.0.105:5000`) — used as-is.
2. `EXPO_PUBLIC_DOMAIN` — wrapped as `https://${DOMAIN}/api` (for production deploys).
3. Falls back to `/api` (only works if Metro is serving the API).

For local dev, set `EXPO_PUBLIC_API_URL` to your PC's LAN IP plus `5000`:

```bash
# Find your IPv4: look under Wi-Fi adapter
ipconfig

# Set the env var (PowerShell)
$env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:5000"
npm run dev
```

## Scripts

- `npm run dev` — Expo CLI (Metro bundler, default port 8081)
- `npm run dev:web` — open in browser
- `npm run android` / `npm run ios` — open in emulator/simulator
- `npm run build` — production build (Android/iOS/web)
- `npm run typecheck`

## Layout

```
app/                       Expo Router file-based routes
  (tabs)/                  Bottom tab screens (home, deposits, expenses, profile)
  auth.tsx                 Login / signup / OTP
  mess-setup.tsx           Onboarding
  index.tsx                Mess chooser (root route)
  consumers.tsx, meal-status.tsx, member-requests.tsx
  settings/security.tsx
components/                Reusable UI (AppDrawer, NotificationBell, etc.)
redux/                     Redux store, typed hooks, and feature slices (including auth)
hooks/                     useColors, etc.
lib/                       api.ts (fetch client), cache, offlineQueue
assets/                    Icons, splash
constants/                 Color tokens
scripts/build.js           EAS-style build helper
server/                    Optional static landing page
metro.config.js            Metro bundler config
babel.config.js            babel-preset-expo
app.json                   Expo config
```
