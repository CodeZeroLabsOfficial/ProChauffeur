import type { TripType } from "@/lib/models/enums";
import type { VehicleClass } from "@/lib/models/vehicle-class";

export type BookingRequirements = {
  tripType: TripType;
  passengers: number;
  smallLuggage: number;
  largeLuggage: number;
};

export type BookingAudience = "customer" | "admin";

export function vehicleClassMeetsCapacity(
  vehicleClass: VehicleClass,
  req: BookingRequirements
): boolean {
  const { passengerCount, luggage } = vehicleClass.capacity;
  return (
    req.passengers <= passengerCount &&
    req.smallLuggage <= luggage.smallCount &&
    req.largeLuggage <= luggage.largeCount
  );
}

function vehicleClassIsBookable(
  vehicleClass: VehicleClass,
  req: BookingRequirements,
  audience: BookingAudience
): boolean {
  if (!vehicleClass.isEnabled) return false;
  if (audience === "customer" && !vehicleClass.isVisible) return false;
  if (!vehicleClass.supportedTripTypes.includes(req.tripType)) return false;
  if (!vehicleClassMeetsCapacity(vehicleClass, req)) return false;
  return true;
}

export function filterEligibleVehicleClasses(
  classes: VehicleClass[],
  requirements: BookingRequirements,
  audience: BookingAudience
): VehicleClass[] {
  return classes
    .filter((vehicleClass) => vehicleClassIsBookable(vehicleClass, requirements, audience))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.displayName.localeCompare(b.displayName);
    });
}

export function vehicleClassesById(classes: VehicleClass[]): Map<string, VehicleClass> {
  return new Map(classes.map((vehicleClass) => [vehicleClass.id, vehicleClass]));
}
