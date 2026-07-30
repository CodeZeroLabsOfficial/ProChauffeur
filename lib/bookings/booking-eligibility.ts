import type { TripType } from "@/lib/models/enums";
import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
  type Vehicle
} from "@/lib/models/vehicle";
import type { VehicleClass } from "@/lib/models/vehicle-class";

export type BookingRequirements = {
  tripType: TripType;
  passengers: number;
  smallLuggage: number;
  largeLuggage: number;
};

export type BookingAudience = "customer" | "admin";

function vehicleMeetsCapacity(vehicle: Vehicle, req: BookingRequirements): boolean {
  const capacity = vehicle.capacity;
  if (!capacity) return false;
  return (
    req.passengers <= capacity.passengerCount &&
    req.smallLuggage <= capacity.luggage.smallCount &&
    req.largeLuggage <= capacity.luggage.largeCount
  );
}

function vehicleIsBookable(
  vehicle: Vehicle,
  vehicleClass: VehicleClass | undefined,
  req: BookingRequirements,
  audience: BookingAudience,
  requireChauffeur: boolean
): boolean {
  const classId = vehicle.details?.vehicleClassId;
  if (!classId || !vehicleClass) return false;
  if (!vehicleClass.isEnabled) return false;
  if (audience === "customer" && !vehicleClass.isVisible) return false;
  if (!vehicleClass.supportedTripTypes.includes(req.tripType)) return false;
  if (!vehicleMeetsCapacity(vehicle, req)) return false;
  if (requireChauffeur && !effectiveChauffeurUserId(vehicle)) return false;
  return true;
}

export function filterEligibleFleetVehicles(
  vehicles: Vehicle[],
  classesById: Map<string, VehicleClass>,
  requirements: BookingRequirements,
  audience: BookingAudience,
  options?: { requireChauffeur?: boolean }
): Vehicle[] {
  const requireChauffeur = options?.requireChauffeur ?? audience === "customer";
  return vehicles
    .filter((vehicle) => {
      const vehicleClass = classesById.get(vehicle.details?.vehicleClassId ?? "");
      return vehicleIsBookable(vehicle, vehicleClass, requirements, audience, requireChauffeur);
    })
    .sort((a, b) => {
      const classA = classesById.get(a.details?.vehicleClassId ?? "");
      const classB = classesById.get(b.details?.vehicleClassId ?? "");
      const orderA = classA?.sortOrder ?? 0;
      const orderB = classB?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return vehicleDisplayName(a).localeCompare(vehicleDisplayName(b));
    });
}

export function vehicleClassesById(classes: VehicleClass[]): Map<string, VehicleClass> {
  return new Map(classes.map((vehicleClass) => [vehicleClass.id, vehicleClass]));
}
