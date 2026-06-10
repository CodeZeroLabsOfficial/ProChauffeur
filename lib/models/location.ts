/** FleetLocation.swift — `locations/{id}` document. */
export interface FleetLocation {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  /** Default garage / depot — used for map centering and pricing deadhead. */
  isDefault: boolean;
  timeZoneIdentifier?: string | null;
  createdAt: Date;
}

export function hasValidFleetLocationCoordinate(
  location: Pick<FleetLocation, "latitude" | "longitude">
): boolean {
  return location.latitude !== 0 || location.longitude !== 0;
}

/** Requires exactly one default location with valid coordinates. */
export function requireDefaultGarageLocation(locations: FleetLocation[]): FleetLocation {
  const defaults = locations.filter(
    (l) => l.isDefault && hasValidFleetLocationCoordinate(l)
  );
  if (defaults.length === 0) {
    throw new Error("No default garage location configured. Set one in Company → Locations.");
  }
  if (defaults.length > 1) {
    throw new Error("Multiple default garage locations configured. Only one is allowed.");
  }
  return defaults[0]!;
}

/** Preferred fleet location for map fallbacks — explicit default only. */
export function resolveDefaultFleetLocation(locations: FleetLocation[]): FleetLocation | null {
  try {
    return requireDefaultGarageLocation(locations);
  } catch {
    return null;
  }
}

export function companyDefaultMapView(
  locations: FleetLocation[],
  zoom = 11
): { longitude: number; latitude: number; zoom: number } | null {
  const location = resolveDefaultFleetLocation(locations);
  if (!location) return null;
  return { longitude: location.longitude, latitude: location.latitude, zoom };
}
