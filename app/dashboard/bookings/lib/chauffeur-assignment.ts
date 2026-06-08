import { effectiveChauffeurUserId, type Vehicle } from "@/lib/models";

export function vehicleForChauffeur(
  vehicles: Vehicle[],
  chauffeurUserId: string
): Vehicle | undefined {
  return vehicles.find((vehicle) => effectiveChauffeurUserId(vehicle) === chauffeurUserId);
}
