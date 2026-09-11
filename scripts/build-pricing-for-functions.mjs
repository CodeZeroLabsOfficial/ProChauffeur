/**
 * Bundle @prochauffeur/pricing for Cloud Functions (CommonJS).
 * Run before `firebase deploy --only functions` and from npm scripts.
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "functions/lib/pricing/index.js");

mkdirSync(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(root, "packages/pricing/src/index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  logLevel: "info",
  // Keep Node builtins external; bundle app pricing sources.
  packages: "bundle"
});

console.log(`Wrote ${outfile}`);
