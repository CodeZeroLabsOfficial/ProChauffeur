import type { BranchDriver } from "@/lib/models/branch";
import type { DriverProfile, User } from "@/lib/models/user";

/** Ops profile fields from a Location roster entry. */
export function branchDriverToProfile(driver: BranchDriver): DriverProfile {
  return {
    chauffeurCategory: driver.chauffeurCategory,
    qualifications: driver.qualifications,
    bioStatement: driver.bioStatement,
    serviceSpecialties: driver.serviceSpecialties,
    vehicleOrServiceFocus: driver.vehicleOrServiceFocus,
    availabilitySchedules: driver.availabilitySchedules,
    timeZoneIdentifier: driver.timeZoneIdentifier,
    preferredGarageLocationId: driver.preferredGarageLocationId,
    driversLicenseSummary: driver.driversLicenseSummary,
    driversLicenseNumber: driver.driversLicenseNumber,
    driversLicenseClassOrType: driver.driversLicenseClassOrType,
    driversLicenseConditions: driver.driversLicenseConditions,
    driversLicenseConditionCodes: driver.driversLicenseConditionCodes,
    driversLicenseJurisdictionCode: driver.driversLicenseJurisdictionCode,
    driversLicenseExpiry: driver.driversLicenseExpiry,
    operatorAccreditationNumber: driver.operatorAccreditationNumber,
    operatorAccreditationIssuingAuthority: driver.operatorAccreditationIssuingAuthority,
    operatorAccreditationExpiry: driver.operatorAccreditationExpiry,
    visibleOnCustomerApp: driver.visibleOnCustomerApp,
    acceptsDispatchAssignments: driver.acceptsDispatchAssignments
  };
}

/**
 * Chauffeurs on the active Location roster, joined to user identity.
 * Roster ops fields win over embedded `users.driverProfile`.
 */
export function mergeRosterChauffeurs(users: User[], roster: BranchDriver[]): User[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const merged: User[] = [];

  for (const entry of roster) {
    const user = byId.get(entry.userId) ?? byId.get(entry.id);
    if (!user) continue;
    merged.push({
      ...user,
      role: "driver",
      driverProfile: branchDriverToProfile(entry)
    });
  }

  return merged.sort((a, b) =>
    (a.profile.displayName || a.email).localeCompare(b.profile.displayName || b.email)
  );
}
