# ProChauffeur — Operations Portal

Admin web portal for managing a professional chauffeur business: dispatch, bookings,
fleet, drivers, billing, company configuration and reporting. Built on Next.js 16 +
React 19 + Tailwind v4 + shadcn/ui, backed by Firebase, and aligned 1:1 with the
existing iOS app's Firestore schema.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · **shadcn/ui** (ported primitives)
- **Firebase**: Authentication, Cloud Firestore, Realtime Database (live locations),
  Admin SDK (server-side session cookies + role gate)
- **react-map-gl / Mapbox** for the live Dispatch map
- **Recharts** for reporting · **TanStack Table** patterns for data grids

## Sections

| Route | Purpose |
| --- | --- |
| `/dashboard` | Operations overview (KPIs, bookings trend, upcoming trips) |
| `/dashboard/dispatch` | Live map of driver positions (RTDB) + active trips |
| `/dashboard/bookings` | Trip lifecycle management |
| `/dashboard/drivers` | Chauffeur management & compliance |
| `/dashboard/fleet` | Vehicle management (keyed to chauffeurs) |
| `/dashboard/billing` | Invoices (new `invoices` collection) |
| `/dashboard/locations` | City markets (list → detail: hours, classes, pricing) |
| `/dashboard/settings/company` | Company (org profile) |
| `/dashboard/reports` | Client-side aggregation over trips & invoices |
| `/dashboard/settings` | Account · Appearance · Company · Integrations · License · Locale · Profile · Team |

## Getting started

1. Install dependencies (Node 20+):

```bash
npm install --legacy-peer-deps
```

2. Copy env and fill in values:

```bash
cp .env.example .env.local
```

3. Run the dev server:

```bash
npm run dev
```

The portal is **admin-only**. Sign in requires a Firebase Auth account whose
`users/{uid}` document has `role == "admin"`.

## Data model

Auth users live at `users/{uid}`. Operational data is scoped under branches:

`branches/{branchId}/` with nested `settings`, `trips`, `vehicles`, `locations`,
`vehicle_classes`, `invoices`, and `drivers`.

Company-wide: `app_settings` (`license`, `plans`, `workspace`, `integrations`, `company`, `locale`).
Branch settings: `branches/{branchId}/settings` (`pricing`, `operating_hours`).

Default branch id: `brisbane`. Backfill with `npm run backfill:brisbane-branch`.

### Live locations

The Dispatch map reads `liveLocations/{branchId}/{driverId}` from Realtime Database.
Payload shape: `{ lat, lng, heading?, status?, tripId?, updatedAt }`.

When a trip is **completed** or **cancelled**, `tripId` is cleared on that node
while keeping the last GPS fix.

## Deployment (Vercel)

Set every variable from `.env.example` in Project Settings → Environment Variables.
`FIREBASE_SERVICE_ACCOUNT_KEY` must be the **base64-encoded** service-account JSON and
must NOT be prefixed with `NEXT_PUBLIC_`.

## Firebase rules & indexes

- `firestore.rules` — admin-gated Firestore access
- `storage.rules` — profile photo uploads under `users/{uid}/`
- `database.rules.json` — RTDB live-location rules
- `firestore.indexes.json` — composite indexes

Deploy with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,database
```
