/**
 * Run golden QuoteEngine vectors against the Functions CJS bundle.
 * Rebuild first: `npm run build:pricing`
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { buildTripQuote } = require(join(root, "functions/lib/pricing/index.js"));

const vectorsDir = join(root, "packages/pricing/vectors");

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

const files = readdirSync(vectorsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.error("No vector JSON files in packages/pricing/vectors");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(join(vectorsDir, file), "utf8"));
  const request = revive(raw.request);
  const context = revive(raw.context);
  const expect = raw.expect;

  let result;
  try {
    result = buildTripQuote(request, context);
  } catch (err) {
    if (expect?.throws) {
      const msg = err instanceof Error ? err.message : String(err);
      if (expect.throws === true || msg.includes(String(expect.throws))) {
        console.log(`OK  ${file} (threw as expected)`);
        continue;
      }
      console.error(`FAIL ${file}: threw "${msg}", expected "${expect.throws}"`);
      failed += 1;
      continue;
    }
    console.error(`FAIL ${file}: unexpected throw`, err);
    failed += 1;
    continue;
  }

  if (expect?.throws) {
    console.error(`FAIL ${file}: expected throw, got total=${result.total}`);
    failed += 1;
    continue;
  }

  const checks = [
    ["subtotal", expect.subtotal, result.subtotal],
    ["taxAmount", expect.taxAmount, result.taxAmount],
    ["total", expect.total, result.total]
  ];
  let ok = true;
  for (const [label, exp, got] of checks) {
    if (exp != null && !nearlyEqual(exp, got)) {
      console.error(`FAIL ${file}: ${label} expected ${exp}, got ${got}`);
      ok = false;
    }
  }
  if (expect.appliedRuleId !== undefined) {
    const got = result.snapshot?.appliedRuleId ?? null;
    if (got !== expect.appliedRuleId) {
      console.error(
        `FAIL ${file}: appliedRuleId expected ${JSON.stringify(expect.appliedRuleId)}, got ${JSON.stringify(got)}`
      );
      ok = false;
    }
  }
  if (expect.corporateAccountId !== undefined) {
    const got = result.snapshot?.corporateAccountId ?? null;
    if (got !== expect.corporateAccountId) {
      console.error(
        `FAIL ${file}: corporateAccountId expected ${JSON.stringify(expect.corporateAccountId)}, got ${JSON.stringify(got)}`
      );
      ok = false;
    }
  }
  if (ok) {
    console.log(`OK  ${file}`);
  } else {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`${failed} vector(s) failed`);
  process.exit(1);
}
console.log(`All ${files.length} vectors passed`);
