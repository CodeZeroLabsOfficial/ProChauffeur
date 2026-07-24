import type { BranchDriver } from "@/lib/models/branch";
import type { DriverProfile, User } from "@/lib/models/user";

/** Identity + Location roster ops for a chauffeur on the active Location. */
export type RosterChauffeur = {
  user: User;
  roster: BranchDriver;
};

/** Ops profile fields from a Location roster entry (for save payloads). */
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

/** Join active Location roster to user identity. */
export function joinRosterChauffeurs(users: User[], roster: BranchDriver[]): RosterChauffeur[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const joined: RosterChauffeur[] = [];

  for (const entry of roster) {
    const user = byId.get(entry.userId) ?? byId.get(entry.id);
    if (!user) continue;
    joined.push({ user, roster: entry });
  }

  return joined.sort((a, b) =>
    (a.user.profile.displayName || a.user.email).localeCompare(
      b.user.profile.displayName || b.user.email
    )
  );
}
