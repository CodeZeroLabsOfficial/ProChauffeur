# Quote / license contract

## Public API (`@prochauffeur/pricing`)

| Export | Role |
|---|---|
| `buildTripQuote(request, context)` | Pure fare math. Returns totals and line items. |
| `QuoteEngineContext` | Includes `dynamicPricingActive` (boolean). |
| `isFeatureEnabled` / `isLocationFeatureEnabled` | License + Location entitlement |
| `QuoteError` / `ConfigError` | Domain errors |

## Inputs → outputs

- **Inputs:** trip type, class, postcodes, schedule, add-ons, optional promo/corporate; context: pricing, locale, class, office, route/deadhead meters, `dynamicPricingActive`.
- **Outputs:** `subtotal`, `taxAmount`, `total` (currency units, not milli), `breakdown`, `snapshot`.
- Compare golden vectors on rounded `total` (and tax when asserted).

## Freeze (Phase 4) — same number that will be charged

Dashboard booking create/edit and card checkout must use this package for fare math.

1. **Dashboard write:** resolve a `QuoteResult` (local `buildQuoteForRequest` for retail, or callable `buildTripQuote` for corporate), then map money onto the trip **only** via `quoteFieldsFromResult` / `tripQuoteMoneyFromEngineResult` (`lib/pricing/quote-fields-from-result.ts`). Do not hand-build totals.
2. **Card payment:** `createTripCardPayment` always re-quotes on the server (`applyServerQuotes`) and overwrites the same money fields before Stripe. Client totals are untrusted.
3. **Same fixed inputs → same cents.** Route meters may change between create and pay (Mapbox); the formula must not. Golden vectors and `npm run test:parity` use fixed meters.

Trip money fields written on freeze:

`quotedSubtotal`, `quotedTaxAmount`, `quotedTotal`, `quotedCurrencyCode`, `quotedTaxRate`, `quotedPricesIncludeTax`, `quoteBreakdown`, `quoteSnapshot`, `quoteComputedAt`, `appliedPromoId`, `promoCode`.

## Soft-downgrade (`corporateAccounts` off)

- Keep `corporateAccounts/{id}` docs and member `corporateAccountId` links.
- Hide Accounts UI; refuse join-code claims and `on_account` settlement.
- **Callers strip `corporateAccount` before `buildTripQuote`** (web `buildQuoteForRequest`; Functions `buildTripQuote` forces null when the flag is off).
- New quotes are retail; existing on-account trips/invoices remain.
- Vector `10-corporate-feature-off-strips.json` documents the stripped request → retail total.

## Entitlements

- `corporateAccounts` off → callers strip corporate before `buildTripQuote`.
- `dynamicPricing` (company) + Location `dynamicPricingEnabled` → `dynamicPricingActive: true`; otherwise skip `peak_hours` / `holiday` / `date_range`.

## Callable

Cloud Function export name: `buildTripQuote` (hard cut; no `computeQuote` alias).

## TripQuoteSnapshot (cross-platform freeze contract)

Field names on `trip.quote.quoteSnapshot` are shared by web, Functions, and iOS:

| Field | Notes |
|---|---|
| `schemaVersion` | Integer |
| `tripType` | `transfer` \| `hourly` |
| `vehicleClassId` | Product slug |
| `officeLocationId` | Fleet office id |
| `distanceUnit` | `km` \| `mile` |
| `currencyCode` | ISO |
| `onboardUnits` / `deadheadUnits` | Distance in locale units |
| `bookedHours` | Hourly only; else null |
| `matchedZoneIds` / `appliedFixedZoneId` / `appliedZoneSurchargeIds` | Zone audit |
| `appliedRuleId` | Dynamic pricing rule or null |
| `addonIds` | Selected add-on ids |
| `appliedPromoId` / `promoCode` | Promo audit |
| `corporateAccountId` / `corporateRateMode` | Null when retail / feature off |
| `pickupPostcode` / `dropoffPostcode` | Strings |
| `scheduledPickupAt` | Instant |

**New flag-related or future fields must be optional** so older clients keep decoding. iOS does not import this package; it reimplements against the same vectors.

## Vectors

Golden fixtures live in `packages/pricing/vectors/`. Run `npm test` (rebuilds the Functions
bundle, asserts totals, then path parity). iOS copies the same JSON under
`ProChauffeurTests/Vectors` and runs fixtures tagged `"platforms": ["ios"]`
(promo/corporate layers are web-only until the Swift engine gains those layers).
