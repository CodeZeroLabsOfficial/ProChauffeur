import { effectiveChauffeurUserId, type Vehicle } from "@/lib/models/vehicle";

export function vehiclesByChauffeurId(vehicles: Vehicle[]): Map<string, Vehicle> {
  const map = new Map<string, Vehicle>();
  for (const vehicle of vehicles) {
    const chauffeurId = effectiveChauffeurUserId(vehicle);
    if (chauffeurId) {
      map.set(chauffeurId, vehicle);
    }
  }
  return map;
}

export function assignedVehicle(
  vehicles: Vehicle[],
  chauffeurUserId: string
): Vehicle | undefined {
  return vehiclesByChauffeurId(vehicles).get(chauffeurUserId);
}
