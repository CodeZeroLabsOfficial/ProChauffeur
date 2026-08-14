import "server-only";

import bundledManifest from "@/lib/seed/location/manifest.json";
import auSeed from "@/lib/seed/location/regions/au.json";
import euSeed from "@/lib/seed/location/regions/eu.json";
import gbSeed from "@/lib/seed/location/regions/gb.json";
import usSeed from "@/lib/seed/location/regions/us.json";
import {
  locationRegionSeedSchema,
  locationSeedManifestSchema,
  toRegionSummary,
  type LocationRegionSeed,
  type LocationRegionSummary,
  type LocationSeedManifest
} from "@/lib/seed/location/schema";

const bundledRegions: Record<string, unknown> = {
  au: auSeed,
  us: usSeed,
  gb: gbSeed,
  eu: euSeed
};

function seedBaseUrl(): string | null {
  const raw = process.env.LOCATION_SEED_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not load location seed (${res.status}).`);
  }
  return res.json();
}

export async function loadLocationSeedManifest(): Promise<LocationSeedManifest> {
  const base = seedBaseUrl();
  const raw = base ? await fetchJson(`${base}/manifest.json`) : bundledManifest;
  const parsed = locationSeedManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Location seed manifest is invalid.");
  }
  return parsed.data;
}

export async function loadLocationRegionSeed(regionId: string): Promise<LocationRegionSeed> {
  const id = regionId.trim();
  if (!id) {
    throw new Error("Select a region.");
  }
  const base = seedBaseUrl();
  const raw = base
    ? await fetchJson(`${base}/regions/${encodeURIComponent(id)}.json`)
    : bundledRegions[id];
  if (raw == null) {
    throw new Error(`Unknown region "${id}".`);
  }
  const parsed = locationRegionSeedSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Location seed for "${id}" is invalid.`);
  }
  if (parsed.data.id !== id) {
    throw new Error(`Location seed id "${parsed.data.id}" does not match "${id}".`);
  }
  return parsed.data;
}

export async function listLocationRegionSummaries(): Promise<LocationRegionSummary[]> {
  const manifest = await loadLocationSeedManifest();
  const rows: LocationRegionSummary[] = [];
  for (const id of manifest.regions) {
    const seed = await loadLocationRegionSeed(id);
    rows.push(toRegionSummary(seed));
  }
  return rows;
}
