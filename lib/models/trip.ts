import type { TripStatus } from "@/lib/models/enums";
import type { Vehicle } from "@/lib/models/vehicle";

/** CoordinateField.swift — plain lat/lng pair used for pickup/dropoff. */
export interface CoordinateField {
  latitude: number;
  longitude: number;
}

/** Trip.swift — `trips/{id}` document. */
export interface Trip {
  id: string;
  status: TripStatus;
  customerID: string;
  customerDisplayName?: string | null;
  customerPhoneNumber?: string | null;
  customerEmail?: string | null;
  driverID?: string | null;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine?: string | null;
  dropoffAddressLine?: string | null;
  vehicleSnapshot?: Vehicle | null;
  fleetVehicleDocumentId?: string | null;
  notes?: string | null;
  bookingPassengerCount?: number | null;
  bookingSmallLuggageCount?: number | null;
  bookingLargeLuggageCount?: number | null;
  scheduledPickupAt?: Date | null;
  linkedTripID?: string | null;
  /** Live chauffeur GPS (Firestore GeoPoint -> lat/lng). */
  liveLocation?: CoordinateField | null;
  liveHeadingDegrees?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Effective pickup instant for list/summary UI. */
export function tripPickupReferenceDate(trip: Trip): Date {
  return trip.scheduledPickupAt ?? trip.createdAt;
}
