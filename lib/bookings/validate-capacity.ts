import type { Vehicle } from "@/lib/models/vehicle";

import type { BookingRequirements } from "@/lib/bookings/booking-eligibility";

export type CapacityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: "passengers" | "smallLuggage" | "largeLuggage" | "vehicleClass";
};

export function validateTripAgainstVehicle(
  requirements: BookingRequirements,
  vehicle: Vehicle
): CapacityIssue[] {
  const issues: CapacityIssue[] = [];
  const capacity = vehicle.capacity;
  const passengerCount = capacity?.passengerCount ?? 0;
  const smallCount = capacity?.luggage.smallCount ?? 0;
  const largeCount = capacity?.luggage.largeCount ?? 0;

  if (requirements.passengers > passengerCount) {
    issues.push({
      code: "TRIP_PASSENGERS_EXCEED_VEHICLE",
      severity: "error",
      field: "passengers",
      message: `Passengers (${requirements.passengers}) exceeds vehicle capacity (${passengerCount}).`
    });
  }
  if (requirements.smallLuggage > smallCount) {
    issues.push({
      code: "TRIP_SMALL_LUGGAGE_EXCEED_VEHICLE",
      severity: "error",
      field: "smallLuggage",
      message: `Small luggage (${requirements.smallLuggage}) exceeds vehicle capacity (${smallCount}).`
    });
  }
  if (requirements.largeLuggage > largeCount) {
    issues.push({
      code: "TRIP_LARGE_LUGGAGE_EXCEED_VEHICLE",
      severity: "error",
      field: "largeLuggage",
      message: `Large luggage (${requirements.largeLuggage}) exceeds vehicle capacity (${largeCount}).`
    });
  }
  return issues;
}
