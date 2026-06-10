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
  if (requirements.passengers > vehicle.passengerCapacity) {
    issues.push({
      code: "TRIP_PASSENGERS_EXCEED_VEHICLE",
      severity: "error",
      field: "passengers",
      message: `Passengers (${requirements.passengers}) exceeds vehicle capacity (${vehicle.passengerCapacity}).`
    });
  }
  if (requirements.smallLuggage > vehicle.smallLuggageCount) {
    issues.push({
      code: "TRIP_SMALL_LUGGAGE_EXCEED_VEHICLE",
      severity: "error",
      field: "smallLuggage",
      message: `Small luggage (${requirements.smallLuggage}) exceeds vehicle capacity (${vehicle.smallLuggageCount}).`
    });
  }
  if (requirements.largeLuggage > vehicle.largeLuggageCount) {
    issues.push({
      code: "TRIP_LARGE_LUGGAGE_EXCEED_VEHICLE",
      severity: "error",
      field: "largeLuggage",
      message: `Large luggage (${requirements.largeLuggage}) exceeds vehicle capacity (${vehicle.largeLuggageCount}).`
    });
  }
  return issues;
}
