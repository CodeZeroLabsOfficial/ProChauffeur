import {
  fetchAddressSuggestions,
  type AddressSearchOptions,
  type AddressSuggestion
} from "@/lib/mapbox/geocoding";
import {
  fetchSearchBoxSuggestions,
  landmarkIntent,
  searchBoxAddressLine,
  searchBoxDisplayName,
  type SearchBoxSuggestion
} from "@/lib/mapbox/search-box";

const MAX_ROWS = 10;
const MAX_SEARCH_BOX = 4;

export type AddressSearchHit =
  | {
      kind: "geocoding";
      id: string;
      addressLine: string;
      title: string;
      suggestion: AddressSuggestion;
      showsAirportIcon: false;
    }
  | {
      kind: "searchBox";
      id: string;
      addressLine: string;
      title: string;
      mapboxId: string;
      showsAirportIcon: boolean;
    };

export async function searchAddresses(
  query: string,
  token: string,
  sessionToken: string,
  options?: AddressSearchOptions
): Promise<AddressSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const geocodeTask = fetchAddressSuggestions(trimmed, token, {
    ...options,
    limit: MAX_ROWS
  }).catch(() => [] as AddressSuggestion[]);

  const searchBoxTask = landmarkIntent(trimmed)
    ? fetchSearchBoxSuggestions(trimmed, token, sessionToken, {
        ...options,
        limit: MAX_SEARCH_BOX
      }).catch(() => [] as SearchBoxSuggestion[])
    : Promise.resolve([] as SearchBoxSuggestion[]);

  const [geocoded, searchBox] = await Promise.all([geocodeTask, searchBoxTask]);
  return mergeHits(geocoded, searchBox);
}

function mergeHits(
  geocoded: AddressSuggestion[],
  searchBox: SearchBoxSuggestion[]
): AddressSearchHit[] {
  const results: AddressSearchHit[] = [];
  const seenTitles = new Set<string>();
  const usedCoordinates: Array<{ latitude: number; longitude: number }> = [];

  function append(hit: AddressSearchHit, coordinate?: { latitude: number; longitude: number }) {
    if (results.length >= MAX_ROWS) return;
    const titleKey = hit.title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (seenTitles.has(titleKey)) return;
    if (coordinate && usedCoordinates.some((existing) => coordinatesNearlyEqual(existing, coordinate))) {
      return;
    }
    if (coordinate) usedCoordinates.push(coordinate);
    seenTitles.add(titleKey);
    results.push(hit);
  }

  for (const suggestion of searchBox) {
    append({
      kind: "searchBox",
      id: `searchbox:${suggestion.mapboxId}`,
      addressLine: searchBoxAddressLine(suggestion),
      title: searchBoxDisplayName(suggestion),
      mapboxId: suggestion.mapboxId,
      showsAirportIcon:
        suggestion.poiCategory?.some((category) => category.toLowerCase().includes("airport")) === true
    });
  }

  for (const suggestion of geocoded) {
    append(
      {
        kind: "geocoding",
        id: `geocode:${suggestion.id}`,
        addressLine: suggestion.addressLine,
        title: suggestion.addressLine.split(",")[0]?.trim() || suggestion.addressLine,
        suggestion,
        showsAirportIcon: false
      },
      suggestion.coordinate
    );
  }

  return results;
}

function coordinatesNearlyEqual(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): boolean {
  return Math.abs(a.latitude - b.latitude) < 0.0005 && Math.abs(a.longitude - b.longitude) < 0.0005;
}
