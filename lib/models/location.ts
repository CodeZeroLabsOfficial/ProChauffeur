/** FleetLocation.swift — `locations/{id}` document. */
export interface FleetLocation {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}
