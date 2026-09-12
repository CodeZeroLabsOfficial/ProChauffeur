import "server-only";

import bundledManifest from "@/lib/seed/location/manifest.json";
import auSeed from "@/lib/seed/location/regions/au.json";
import euPack from "@/lib/seed/location/regions/eu.json";
import gbSeed from "@/lib/seed/location/regions/gb.json";
import nzSeed from "@/lib/seed/location/regions/nz.json";
import usSeed from "@/lib/seed/location/regions/us.json";
import {
  locationCountryPackSchema,
  locationCountrySeedSchema,
  locationSeedManifestSchema,
  toCountrySummary,
  type LocationCountrySeed,
  type LocationCountrySummary,
  type LocationGeoRegionSummary,
  type LocationSeedManifest
} from "@/lib/seed/location/schema";

const bundledStandalone: Record<string, unknown> = {
  au: auSeed,
  nz: nzSeed,
  us: usSeed,
  gb: gbSeed
};

const bundledPacks: Record<string, unknown> = {
  eu: euPack
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

async function loadRawCountryOrPack(fileId: string): Promise<unknown> {
  const base = seedBaseUrl();
  if (base) {
    return fetchJson(`${base}/regions/${encodeURIComponent(fileId)}.json`);
  }
  if (fileId in bundledStandalone) return bundledStandalone[fileId];
  if (fileId in bundledPacks) return bundledPacks[fileId];
  return null;
}

function parseCountrySeed(raw: unknown, countryId: string): LocationCountrySeed {
  const parsed = locationCountrySeedSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Location seed for "${countryId}" is invalid.`);
  }
  if (parsed.data.id !== countryId) {
    throw new Error(`Location seed id "${parsed.data.id}" does not match "${countryId}".`);
  }
  return parsed.data;
}

function parsePackCountry(raw: unknown, countryId: string): LocationCountrySeed | null {
  const pack = locationCountryPackSchema.safeParse(raw);
  if (!pack.success) return null;
  const entry = pack.data.countries[countryId];
  if (!entry) return null;
  return parseCountrySeed(entry, countryId);
}

/** Load a country seed by id (standalone file or entry inside a multi-country pack). */
export async function loadLocationCountrySeed(countryId: string): Promise<LocationCountrySeed> {
  const id = countryId.trim();
  if (!id) {
    throw new Error("Select a country.");
  }

  const standaloneRaw = await loadRawCountryOrPack(id);
  if (standaloneRaw != null) {
    const asCountry = locationCountrySeedSchema.safeParse(standaloneRaw);
    if (asCountry.success) {
      return parseCountrySeed(standaloneRaw, id);
    }
  }

  for (const packId of Object.keys(bundledPacks)) {
    const packRaw = await loadRawCountryOrPack(packId);
    if (packRaw == null) continue;
    const fromPack = parsePackCountry(packRaw, id);
    if (fromPack) return fromPack;
  }

  if (seedBaseUrl()) {
    for (const packId of ["eu"]) {
      try {
        const packRaw = await loadRawCountryOrPack(packId);
        const fromPack = parsePackCountry(packRaw, id);
        if (fromPack) return fromPack;
      } catch {
        // Pack missing remotely; continue.
      }
    }
  }

  throw new Error(`Unknown country "${id}".`);
}

/** @deprecated Use loadLocationCountrySeed */
export async function loadLocationRegionSeed(regionId: string): Promise<LocationCountrySeed> {
  return loadLocationCountrySeed(regionId);
}

export async function listLocationGeoRegionSummaries(): Promise<LocationGeoRegionSummary[]> {
  const manifest = await loadLocationSeedManifest();
  const regions: LocationGeoRegionSummary[] = [];
  for (const geo of manifest.regions) {
    const countries: LocationCountrySummary[] = [];
    for (const countryId of geo.countries) {
      const seed = await loadLocationCountrySeed(countryId);
      countries.push(toCountrySummary(seed));
    }
    regions.push({
      id: geo.id,
      label: geo.label,
      countries
    });
  }
  return regions;
}

/** Flat country list across all geo regions (locale panel / legacy callers). */
export async function listLocationCountrySummaries(): Promise<LocationCountrySummary[]> {
  const regions = await listLocationGeoRegionSummaries();
  return regions.flatMap((region) => region.countries);
}

/** @deprecated Use listLocationGeoRegionSummaries or listLocationCountrySummaries */
export async function listLocationRegionSummaries(): Promise<LocationCountrySummary[]> {
  return listLocationCountrySummaries();
}
