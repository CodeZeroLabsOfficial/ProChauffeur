import type { TripType } from "@/lib/models/enums";
import { effectiveChauffeurUserId, type Vehicle } from "@/lib/models/vehicle";
import type { VehicleClass } from "@/lib/models/vehicle-class";

export type BookingRequirements = {
  tripType: TripType;
  passengers: number;
  smallLuggage: number;
  largeLuggage: number;
};

export type BookingAudience = "customer" | "admin";

function vehicleMeetsCapacity(vehicle: Vehicle, req: BookingRequirements): boolean {
  return (
    req.passengers <= vehicle.passengerCapacity &&
    req.smallLuggage <= vehicle.smallLuggageCount &&
    req.largeLuggage <= vehicle.largeLuggageCount
  );
}

function vehicleIsBookable(
  vehicle: Vehicle,
  vehicleClass: VehicleClass | undefined,
  req: BookingRequirements,
  audience: BookingAudience,
  requireChauffeur: boolean
): boolean {
  if (!vehicle.vehicleClassId || !vehicleClass) return false;
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
      const vehicleClass = classesById.get(vehicle.vehicleClassId ?? "");
      return vehicleIsBookable(vehicle, vehicleClass, requirements, audience, requireChauffeur);
    })
    .sort((a, b) => {
      const classA = classesById.get(a.vehicleClassId ?? "");
      const classB = classesById.get(b.vehicleClassId ?? "");
      const orderA = classA?.sortOrder ?? 0;
      const orderB = classB?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return `${a.color} ${a.make} ${a.model}`.localeCompare(`${b.color} ${b.make} ${b.model}`);
    });
}

export function vehicleClassesById(classes: VehicleClass[]): Map<string, VehicleClass> {
  return new Map(classes.map((vehicleClass) => [vehicleClass.id, vehicleClass]));
}
