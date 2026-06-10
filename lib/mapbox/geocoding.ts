import type { PostalAddress } from "@/lib/models/postal-address";
import type { CoordinateField } from "@/lib/models/trip";

export type AddressSuggestion = {
  id: string;
  addressLine: string;
  coordinate: CoordinateField;
  postalAddress?: PostalAddress;
};

type MapboxContext = {
  id: string;
  text: string;
  short_code?: string;
};

type MapboxGeocodingFeature = {
  id: string;
  place_name: string;
  place_type?: string[];
  text?: string;
  address?: string;
  center: [number, number];
  context?: MapboxContext[];
};

type MapboxGeocodingResponse = {
  features?: MapboxGeocodingFeature[];
};

/** Sydney CBD — default proximity bias for AU chauffeur searches. */
const DEFAULT_PROXIMITY = { longitude: 151.2093, latitude: -33.8688 };

function contextEntry(context: MapboxContext[] | undefined, prefix: string): MapboxContext | undefined {
  return context?.find((entry) => entry.id.startsWith(`${prefix}.`));
}

function parsePostalAddress(feature: MapboxGeocodingFeature): PostalAddress {
  const types = feature.place_type ?? [];
  const isAddress = types.includes("address");

  let street: string | null = null;
  if (isAddress) {
    const number = feature.address?.trim();
    const name = feature.text?.trim();
    street = number && name ? `${number} ${name}` : name || number || null;
  } else if (types.includes("poi")) {
    street = feature.text?.trim() || null;
  }

  const region = contextEntry(feature.context, "region");
  const stateFromCode = region?.short_code?.match(/^AU-(.+)$/)?.[1];
  const city =
    contextEntry(feature.context, "place")?.text ??
    contextEntry(feature.context, "locality")?.text ??
    (types.includes("place") ? feature.text?.trim() || null : null);

  return {
    street,
    city: city || null,
    state: stateFromCode || region?.text || null,
    postcode: contextEntry(feature.context, "postcode")?.text ?? null,
    country: contextEntry(feature.context, "country")?.text ?? null
  };
}

function mapFeature(feature: MapboxGeocodingFeature): AddressSuggestion {
  const [longitude, latitude] = feature.center;
  return {
    id: feature.id,
    addressLine: feature.place_name,
    coordinate: { latitude, longitude },
    postalAddress: parsePostalAddress(feature)
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
