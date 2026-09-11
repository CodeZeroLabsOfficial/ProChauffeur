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

## Entitlements

- `corporateAccounts` off → callers strip corporate before `buildTripQuote`.
- `dynamicPricing` (company) + Location `dynamicPricingEnabled` → `dynamicPricingActive: true`; otherwise skip `peak_hours` / `holiday` / `date_range`.

## Callable

Cloud Function export name: `buildTripQuote` (hard cut; no `computeQuote` alias).

## Vectors

Golden fixtures live in `packages/pricing/vectors/`. Run `npm test` (rebuilds the Functions
bundle, then asserts totals). iOS copies the same JSON under `ProChauffeurTests/Vectors`
and runs fixtures tagged `"platforms": ["ios"]` (promo/corporate layers are web-only until
the Swift engine gains those layers).
