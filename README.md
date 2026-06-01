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
| `/dashboard/company` | Overview · Operating Hours · Locations · Pricing |
| `/dashboard/reports` | Client-side aggregation over trips & invoices |
| `/dashboard/settings` | Branding · Locale · License · Admins · Integrations |

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

TypeScript types and helpers in `lib/models/` mirror the iOS Swift `Codable` models.
Firestore collections: `users`, `trips`, `vehicles`, `locations`, `invoices`, and the
`app_settings` documents (`pricing`, `operating_hours`, `limits`, `branding`, `locale`,
`integrations`).

### Live locations

The Dispatch map reads `liveLocations/{driverId}` from Realtime Database. The iOS
driver app dual-writes GPS to RTDB in the shape:
`{ lat, lng, heading?, status?, tripId?, updatedAt }`.

## Deployment (Vercel)

Set every variable from `.env.example` in Project Settings → Environment Variables.
`FIREBASE_SERVICE_ACCOUNT_KEY` must be the **base64-encoded** service-account JSON and
must NOT be prefixed with `NEXT_PUBLIC_`.

## Firebase rules & indexes

- `firestore.rules` — admin-gated Firestore access
- `database.rules.json` — RTDB live-location rules
- `firestore.indexes.json` — composite indexes

Deploy with the Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes,database
```
