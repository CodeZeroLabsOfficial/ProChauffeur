import type { CoordinateField } from "@/lib/models/trip";

export type AddressSuggestion = {
  id: string;
  addressLine: string;
  coordinate: CoordinateField;
};

type MapboxGeocodingFeature = {
  id: string;
  place_name: string;
  center: [number, number];
};

type MapboxGeocodingResponse = {
  features?: MapboxGeocodingFeature[];
};

/** Sydney CBD — default proximity bias for AU chauffeur searches. */
const DEFAULT_PROXIMITY = { longitude: 151.2093, latitude: -33.8688 };

function mapFeature(feature: MapboxGeocodingFeature): AddressSuggestion {
  const [longitude, latitude] = feature.center;
  return {
    id: feature.id,
    addressLine: feature.place_name,
    coordinate: { latitude, longitude }
  };
}

export async function fetchAddressSuggestions(
  query: string,
  token: string
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "au");
  url.searchParams.set("types", "address,place,poi");
  url.searchParams.set("limit", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set(
    "proximity",
    `${DEFAULT_PROXIMITY.longitude},${DEFAULT_PROXIMITY.latitude}`
  );

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as MapboxGeocodingResponse;
  return (data.features ?? []).map(mapFeature);
}
