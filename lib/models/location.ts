/** FleetLocation.swift — `locations/{id}` document. */
export interface FleetLocation {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  /** When true, dispatch maps center here when no drivers or trips are visible. */
  isDefault?: boolean;
  timeZoneIdentifier?: string | null;
  createdAt: Date;
}

export function hasValidFleetLocationCoordinate(
  location: Pick<FleetLocation, "latitude" | "longitude">
): boolean {
  return location.latitude !== 0 || location.longitude !== 0;
}

/** Preferred fleet location for map fallbacks — explicit default, then first geocoded location. */
export function resolveDefaultFleetLocation(locations: FleetLocation[]): FleetLocation | null {
  const marked = locations.find((l) => l.isDefault && hasValidFleetLocationCoordinate(l));
  if (marked) return marked;
  return locations.find((l) => hasValidFleetLocationCoordinate(l)) ?? null;
}

export function companyDefaultMapView(
  locations: FleetLocation[],
  zoom = 11
): { longitude: number; latitude: number; zoom: number } | null {
  const location = resolveDefaultFleetLocation(locations);
  if (!location) return null;
  return { longitude: location.longitude, latitude: location.latitude, zoom };
}
