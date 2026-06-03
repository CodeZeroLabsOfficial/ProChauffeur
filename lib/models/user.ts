import type { ChauffeurCategory, UserRole } from "@/lib/models/enums";

/** One recurring weekly operating window (FleetWeeklyOperatingSchedule.swift). */
export interface FleetWeeklyOperatingSchedule {
  id: string;
  name?: string | null;
  locationId?: string | null;
  isEnabled: boolean;
  /** Calendar weekday integers, 1 = Sunday … 7 = Saturday. */
  weekdayNumbers: number[];
  /** Wall-clock "HH:mm" or null. */
  startTime?: string | null;
  endTime?: string | null;
}

/** UserProfile.swift — human-facing identity envelope embedded on the user. */
export interface UserProfile {
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  address?: string | null;
  /** Calendar date only (time ignored). */
  dateOfBirth?: Date | null;
}

/** DriverProfile.swift — operations-facing chauffeur profile. */
export interface DriverProfile {
  chauffeurCategory: ChauffeurCategory;
  qualifications: string[];
  bioStatement: string;
  serviceSpecialties: string[];
  vehicleOrServiceFocus: string[];
  availabilitySchedules: FleetWeeklyOperatingSchedule[];
  timeZoneIdentifier?: string | null;
  preferredGarageLocationId?: string | null;
  driversLicenseSummary?: string | null;
  driversLicenseNumber?: string | null;
  driversLicenseClassOrType?: string | null;
  driversLicenseConditions?: string | null;
  driversLicenseConditionCodes?: string | null;
  driversLicenseJurisdictionCode?: string | null;
  driversLicenseExpiry?: Date | null;
  operatorAccreditationNumber?: string | null;
  operatorAccreditationIssuingAuthority?: string | null;
  operatorAccreditationExpiry?: Date | null;
  visibleOnCustomerApp: boolean;
  acceptsDispatchAssignments: boolean;
  homeAddressLine?: string | null;
}

/** User.swift — `users/{uid}` document. */
export interface User {
  id: string;
  role: UserRole;
  email: string;
  profile: UserProfile;
  driverProfile?: DriverProfile | null;
  createdAt: Date;
  /** Live tracking fields written ad hoc by the driver app. */
  liveLocation?: { latitude: number; longitude: number } | null;
  liveLocationUpdatedAt?: Date | null;
}

export function defaultDriverProfile(): DriverProfile {
  return {
    chauffeurCategory: "chauffeur",
    qualifications: [],
    bioStatement: "",
    serviceSpecialties: [],
    vehicleOrServiceFocus: [],
    availabilitySchedules: [
      { id: "primary", isEnabled: true, weekdayNumbers: [2, 3, 4, 5, 6], startTime: null, endTime: null }
    ],
    visibleOnCustomerApp: true,
    acceptsDispatchAssignments: true
  };
}
