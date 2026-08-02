import type { BookingRequirements } from "@/lib/bookings/booking-eligibility";
import type { VehicleClass } from "@/lib/models/vehicle-class";

export type CapacityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: "passengers" | "smallLuggage" | "largeLuggage" | "vehicleClass";
};

export function validateTripAgainstVehicleClass(
  requirements: BookingRequirements,
  vehicleClass: VehicleClass
): CapacityIssue[] {
  const issues: CapacityIssue[] = [];
  const { passengerCount, luggage } = vehicleClass.capacity;

  if (requirements.passengers > passengerCount) {
    issues.push({
      code: "TRIP_PASSENGERS_EXCEED_CLASS",
      severity: "error",
      field: "passengers",
      message: `Passengers (${requirements.passengers}) exceeds service class capacity (${passengerCount}).`
    });
  }
  if (requirements.smallLuggage > luggage.smallCount) {
    issues.push({
      code: "TRIP_SMALL_LUGGAGE_EXCEED_CLASS",
      severity: "error",
      field: "smallLuggage",
      message: `Small luggage (${requirements.smallLuggage}) exceeds service class capacity (${luggage.smallCount}).`
    });
  }
  if (requirements.largeLuggage > luggage.largeCount) {
    issues.push({
      code: "TRIP_LARGE_LUGGAGE_EXCEED_CLASS",
      severity: "error",
      field: "largeLuggage",
      message: `Large luggage (${requirements.largeLuggage}) exceeds service class capacity (${luggage.largeCount}).`
    });
  }
  return issues;
}
