import type { CoordinateField } from "@/lib/models/trip";

type LngLat = [number, number];

/** Approximate circle as a closed GeoJSON polygon ring. */
export function circlePolygonCoordinates(
  center: CoordinateField,
  radiusMeters: number,
  points = 64
): LngLat[] {
  const ring: LngLat[] = [];
  const latRad = (center.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(latRad);

  for (let i = 0; i <= points; i++) {
    const angle = (2 * Math.PI * i) / points;
    const dLat = (radiusMeters * Math.sin(angle)) / metersPerDegreeLat;
    const dLng = (radiusMeters * Math.cos(angle)) / metersPerDegreeLng;
    ring.push([center.longitude + dLng, center.latitude + dLat]);
  }

  return ring;
}

export function circlePolygonGeoJson(center: CoordinateField, radiusMeters: number) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [circlePolygonCoordinates(center, radiusMeters)]
    }
  };
}

/** Rough Mapbox zoom for a service-area radius preview. */
export function zoomForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 10) return 11;
  if (radiusKm <= 25) return 10;
  if (radiusKm <= 50) return 9;
  if (radiusKm <= 75) return 8;
  if (radiusKm <= 150) return 7;
  if (radiusKm <= 250) return 6;
  return 5;
}
