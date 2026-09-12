/**
 * Phase 4 path parity: fixed-meter vectors → engine total equals
 * dashboard freeze mapper quotedTotal and card re-quote overwrite total.
 *
 * Run after `npm run build:pricing`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { buildTripQuote } = require(join(root, "functions/lib/pricing/index.js"));

const vectorsDir = join(root, "packages/pricing/vectors");

/** Mirrors lib/pricing/quote-fields-from-result.ts money mapping (dashboard freeze). */
function quoteFieldsFromResult(quote, tripType, vehicleClassId, vehicleClassDisplayName, bookedHours) {
  return {
    journeyFields: { tripType, bookedHours },
    quoteFields: {
      vehicleClassId,
      vehicleClassDisplayName,
      quotedSubtotal: quote.subtotal,
      quotedTaxAmount: quote.taxAmount,
      quotedTotal: quote.total,
      quotedCurrencyCode: quote.currencyCode,
      quotedTaxRate: quote.quotedTaxRate,
      quotedPricesIncludeTax: quote.quotedPricesIncludeTax,
      quoteBreakdown: quote.breakdown,
      quoteComputedAt: new Date(),
      quoteSnapshot: quote.snapshot,
      appliedPromoId: quote.snapshot.appliedPromoId,
      promoCode: quote.snapshot.promoCode
    }
  };
}

/** Mirrors functions/billing/createTripCardPayment.js applyServerQuotes money overwrite. */
function applyServerQuoteOverwrite(existingQuote, quoteResult) {
  const snap =
    quoteResult.snapshot && typeof quoteResult.snapshot === "object" ? quoteResult.snapshot : {};
  return {
    ...existingQuote,
    quotedSubtotal: quoteResult.subtotal,
    quotedTaxAmount: quoteResult.taxAmount,
    quotedTotal: quoteResult.total,
    quotedCurrencyCode: quoteResult.currencyCode,
    quotedTaxRate: quoteResult.quotedTaxRate,
    quotedPricesIncludeTax: quoteResult.quotedPricesIncludeTax,
    quoteBreakdown: quoteResult.breakdown,
    quoteSnapshot: quoteResult.snapshot,
    quoteComputedAt: new Date().toISOString(),
    appliedPromoId: snap.appliedPromoId ?? null,
    promoCode: snap.promoCode ?? null
  };
}

function revive(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(revive);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (
      (k === "scheduledPickupAt" || k === "createdAt" || k === "updatedAt") &&
      typeof v === "string"
    ) {
      out[k] = new Date(v);
    } else {
      out[k] = revive(v);
    }
  }
  return out;
}

function nearlyEqual(a, b, eps = 0.001) {
  return Math.abs(Number(a) - Number(b)) <= eps;
}

/** Vectors that exercise freeze paths (retail, promo, corporate on, feature-off strip). */
const PARITY_FILES = new Set([
  "01-retail-transfer.json",
  "05-promo-percent.json",
  "06-corporate-percent-off.json",
  "10-corporate-feature-off-strips.json"
]);

const files = readdirSync(vectorsDir)
  .filter((f) => PARITY_FILES.has(f))
  .sort();

if (files.length !== PARITY_FILES.size) {
  console.error(
    `Missing parity vectors. Expected ${[...PARITY_FILES].join(", ")}, found ${files.join(", ")}`
  );
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(vectorsDir, file), "utf8"));
  if (raw.expect?.throws) {
    console.log(`SKIP ${file} (throws)`);
    continue;
  }

  const request = revive(raw.request);
  const context = revive(raw.context);

  let result;
  try {
    result = buildTripQuote(request, context);
  } catch (err) {
    console.error(`FAIL ${file}: unexpected throw`, err);
    failed += 1;
    continue;
  }

  if (raw.expect?.total != null && !nearlyEqual(raw.expect.total, result.total)) {
    console.error(`FAIL ${file}: engine total ${result.total} != expect ${raw.expect.total}`);
    failed += 1;
    continue;
  }

  const displayName = context.vehicleClass?.displayName ?? request.vehicleClassId;
  const { quoteFields } = quoteFieldsFromResult(
    result,
    request.tripType,
    request.vehicleClassId,
    displayName,
    request.bookedHours ?? null
  );

  if (!nearlyEqual(quoteFields.quotedTotal, result.total)) {
    console.error(
      `FAIL ${file}: dashboard mapper quotedTotal ${quoteFields.quotedTotal} != engine ${result.total}`
    );
    failed += 1;
    continue;
  }

  // Tampered client total must be overwritten by server re-quote.
  const tampered = { ...quoteFields, quotedTotal: Number(quoteFields.quotedTotal) + 99 };
  const afterPay = applyServerQuoteOverwrite(tampered, result);
  if (!nearlyEqual(afterPay.quotedTotal, result.total)) {
    console.error(
      `FAIL ${file}: card overwrite quotedTotal ${afterPay.quotedTotal} != engine ${result.total}`
    );
    failed += 1;
    continue;
  }
  if (afterPay.appliedPromoId !== (result.snapshot.appliedPromoId ?? null)) {
    console.error(`FAIL ${file}: card overwrite appliedPromoId mismatch`);
    failed += 1;
    continue;
  }
  if (afterPay.promoCode !== (result.snapshot.promoCode ?? null)) {
    console.error(`FAIL ${file}: card overwrite promoCode mismatch`);
    failed += 1;
    continue;
  }

  if (file === "10-corporate-feature-off-strips.json") {
    if (result.snapshot.corporateAccountId != null) {
      console.error(`FAIL ${file}: expected retail snapshot corporateAccountId null`);
      failed += 1;
      continue;
    }
  }
  if (file === "06-corporate-percent-off.json") {
    if (result.snapshot.corporateAccountId !== "c1") {
      console.error(`FAIL ${file}: expected corporateAccountId c1`);
      failed += 1;
      continue;
    }
  }

  console.log(`OK  ${file} (engine === dashboard === card overwrite)`);
}

if (failed > 0) {
  console.error(`${failed} path-parity check(s) failed`);
  process.exit(1);
}
console.log(`All ${files.length} path-parity checks passed`);
