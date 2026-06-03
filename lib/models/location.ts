/** FleetLocation.swift — `locations/{id}` document. */
export interface FleetLocation {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  timeZoneIdentifier?: string | null;
  createdAt: Date;
}
