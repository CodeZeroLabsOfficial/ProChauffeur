import type { DocumentData, Timestamp } from "firebase/firestore";
import type {
  AppFleetLocaleSettings,
  AppFleetOperatingHours,
  AppGlobalLimits,
  AppUser,
  ChauffeurCategory,
  CompanyProfile,
  CoordinateField,
  DriverProfile,
  FleetLocation,
  FleetWeeklyOperatingSchedule,
  GeoPointLike,
  Trip,
  TripStatus,
  UserProfile,
  UserRole,
  Vehicle,
  VehicleCarFeatureRow,
  VehicleSnapshot,
  VehicleSpecificationChip,
  VehicleType,
} from "./types";
import {
  parseLocaleDateFormat,
  parseLocaleNumberFormat,
  parseLocaleTimeFormat,
} from "@/lib/prochauffeur/localeOptions";
import {
  UNLIMITED_CAP,
  defaultDriverProfile,
} from "./types";

export function parseTimestamp(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return new Date();
}

function parseCoordinate(value: unknown): CoordinateField {
  if (!value || typeof value !== "object") {
    return { latitude: 0, longitude: 0 };
  }
  const v = value as Record<string, unknown>;
  return {
    latitude: Number(v.latitude ?? 0),
    longitude: Number(v.longitude ?? 0),
  };
}

function parseGeoPoint(value: unknown): GeoPointLike | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if ("latitude" in v && "longitude" in v) {
    return {
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
    };
  }
  return null;
}

function parseUserProfile(value: unknown): UserProfile {
  if (!value || typeof value !== "object") {
    return { displayName: "" };
  }
  const v = value as Record<string, unknown>;
  const addressValue =
    v.address && typeof v.address === "object"
      ? (v.address as Record<string, unknown>)
      : null;
  return {
    displayName: String(v.displayName ?? ""),
    phoneNumber: v.phoneNumber != null ? String(v.phoneNumber) : null,
    photoURL: v.photoURL != null ? String(v.photoURL) : null,
    dateOfBirth: v.dateOfBirth ? parseTimestamp(v.dateOfBirth) : null,
    address: addressValue
      ? {
          street: String(addressValue.street ?? ""),
          city: String(addressValue.city ?? ""),
          state: String(addressValue.state ?? ""),
          postcode: String(addressValue.postcode ?? ""),
          country: String(addressValue.country ?? ""),
        }
      : null,
  };
}

function parseVehicleSnapshot(value: unknown): VehicleSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    displayName: v.displayName != null ? String(v.displayName) : undefined,
    pricingVehicleType:
      v.pricingVehicleType != null ? String(v.pricingVehicleType) : undefined,
    make: v.make != null ? String(v.make) : undefined,
    model: v.model != null ? String(v.model) : undefined,
  };
}

export function parseTrip(id: string, data: DocumentData): Trip {
  return {
    id: String(data.id ?? id),
    status: data.status as TripStatus,
    customerID: String(data.customerID ?? ""),
    customerDisplayName:
      data.customerDisplayName != null
        ? String(data.customerDisplayName)
        : null,
    customerPhoneNumber:
      data.customerPhoneNumber != null
        ? String(data.customerPhoneNumber)
        : null,
    customerEmail:
      data.customerEmail != null ? String(data.customerEmail) : null,
    driverID: data.driverID != null ? String(data.driverID) : null,
    pickup: parseCoordinate(data.pickup),
    dropoff: parseCoordinate(data.dropoff),
    pickupAddressLine:
      data.pickupAddressLine != null ? String(data.pickupAddressLine) : null,
    dropoffAddressLine:
      data.dropoffAddressLine != null ? String(data.dropoffAddressLine) : null,
    vehicleSnapshot: parseVehicleSnapshot(data.vehicleSnapshot),
    fleetVehicleDocumentId:
      data.fleetVehicleDocumentId != null
        ? String(data.fleetVehicleDocumentId)
        : null,
    notes: data.notes != null ? String(data.notes) : null,
    bookingPassengerCount:
      data.bookingPassengerCount != null
        ? Number(data.bookingPassengerCount)
        : null,
    scheduledPickupAt: data.scheduledPickupAt
      ? parseTimestamp(data.scheduledPickupAt)
      : null,
    liveLocation: parseGeoPoint(data.liveLocation),
    liveHeadingDegrees:
      data.liveHeadingDegrees != null
        ? Number(data.liveHeadingDegrees)
        : null,
    createdAt: parseTimestamp(data.createdAt),
    updatedAt: parseTimestamp(data.updatedAt),
  };
}

function parseWeeklySchedule(value: unknown): FleetWeeklyOperatingSchedule | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    id: String(v.id ?? crypto.randomUUID()),
    isEnabled: Boolean(v.isEnabled ?? true),
    weekdayNumbers: Array.isArray(v.weekdayNumbers)
      ? v.weekdayNumbers.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7)
      : [],
    startTime: v.startTime != null ? String(v.startTime) : null,
    endTime: v.endTime != null ? String(v.endTime) : null,
  };
}

function parseDriverProfile(value: unknown): DriverProfile | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const schedules = Array.isArray(v.availabilitySchedules)
    ? v.availabilitySchedules
        .map(parseWeeklySchedule)
        .filter((s): s is FleetWeeklyOperatingSchedule => s != null)
    : defaultDriverProfile().availabilitySchedules;

  return {
    chauffeurCategory: (v.chauffeurCategory as ChauffeurCategory) ?? "chauffeur",
    qualifications: Array.isArray(v.qualifications)
      ? v.qualifications.map(String)
      : [],
    bioStatement: String(v.bioStatement ?? ""),
    serviceSpecialties: Array.isArray(v.serviceSpecialties)
      ? v.serviceSpecialties.map(String)
      : [],
    vehicleOrServiceFocus: Array.isArray(v.vehicleOrServiceFocus)
      ? v.vehicleOrServiceFocus.map(String)
      : [],
    availabilitySchedules: schedules,
    timeZoneIdentifier:
      v.timeZoneIdentifier != null ? String(v.timeZoneIdentifier) : null,
    preferredGarageLocationId:
      v.preferredGarageLocationId != null
        ? String(v.preferredGarageLocationId)
        : null,
    driversLicenseSummary:
      v.driversLicenseSummary != null
        ? String(v.driversLicenseSummary)
        : null,
    driversLicenseNumber:
      v.driversLicenseNumber != null ? String(v.driversLicenseNumber) : null,
    driversLicenseClassOrType:
      v.driversLicenseClassOrType != null
        ? String(v.driversLicenseClassOrType)
        : null,
    driversLicenseConditions:
      v.driversLicenseConditions != null
        ? String(v.driversLicenseConditions)
        : null,
    driversLicenseConditionCodes:
      v.driversLicenseConditionCodes != null
        ? String(v.driversLicenseConditionCodes)
        : null,
    driversLicenseJurisdictionCode:
      v.driversLicenseJurisdictionCode != null
        ? String(v.driversLicenseJurisdictionCode)
        : null,
    driversLicenseExpiry: v.driversLicenseExpiry
      ? parseTimestamp(v.driversLicenseExpiry)
      : null,
    operatorAccreditationNumber:
      v.operatorAccreditationNumber != null
        ? String(v.operatorAccreditationNumber)
        : null,
    operatorAccreditationIssuingAuthority:
      v.operatorAccreditationIssuingAuthority != null
        ? String(v.operatorAccreditationIssuingAuthority)
        : null,
    operatorAccreditationExpiry: v.operatorAccreditationExpiry
      ? parseTimestamp(v.operatorAccreditationExpiry)
      : null,
    visibleOnCustomerApp: v.visibleOnCustomerApp !== false,
    acceptsDispatchAssignments: v.acceptsDispatchAssignments !== false,
    homeAddressLine:
      v.homeAddressLine != null ? String(v.homeAddressLine) : null,
  };
}

function parseSpecificationChip(value: unknown): VehicleSpecificationChip | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    id: String(v.id ?? ""),
    systemImageName: String(v.systemImageName ?? ""),
    title: String(v.title ?? ""),
    value: String(v.value ?? ""),
  };
}

function parseCarFeatureRow(value: unknown): VehicleCarFeatureRow | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return {
    id: String(v.id ?? ""),
    label: String(v.label ?? ""),
    value: String(v.value ?? ""),
  };
}

function coerceFirestoreInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseVehicle(id: string, data: DocumentData): Vehicle {
  const chips = Array.isArray(data.specificationChips)
    ? data.specificationChips
        .map(parseSpecificationChip)
        .filter((c): c is VehicleSpecificationChip => c != null)
    : [];
  const rows = Array.isArray(data.carFeatureRows)
    ? data.carFeatureRows
        .map(parseCarFeatureRow)
        .filter((r): r is VehicleCarFeatureRow => r != null)
    : [];

  return {
    driverID: String(data.driverID ?? id),
    assignedChauffeurUserId:
      data.assignedChauffeurUserId != null
        ? String(data.assignedChauffeurUserId)
        : null,
    make: String(data.make ?? ""),
    model: String(data.model ?? ""),
    color: String(data.color ?? ""),
    licensePlate: String(data.licensePlate ?? ""),
    passengerCapacity: Number(data.passengerCapacity ?? 4),
    manufactureYear:
      data.manufactureYear != null ? Number(data.manufactureYear) : null,
    registrationJurisdictionCode:
      data.registrationJurisdictionCode != null
        ? String(data.registrationJurisdictionCode)
        : null,
    registrationExpiry: data.registrationExpiry
      ? parseTimestamp(data.registrationExpiry)
      : null,
    pricingVehicleType: (data.pricingVehicleType as VehicleType) ?? "sedan",
    specificationChips: chips,
    carFeatureRows: rows,
    luggageDescription: String(data.luggageDescription ?? ""),
    fleetSmallLuggageCount: Number(data.fleetSmallLuggageCount ?? 0),
    fleetLargeLuggageCount: Number(data.fleetLargeLuggageCount ?? 2),
    wifiServiceDescription: String(
      data.wifiServiceDescription ?? "Complimentary"
    ),
    serviceClassDescription: String(
      data.serviceClassDescription ?? "Business"
    ),
    interiorDescription: String(data.interiorDescription ?? ""),
    climateControlDescription: String(data.climateControlDescription ?? ""),
    gearTypeDescription: String(data.gearTypeDescription ?? ""),
  };
}

export function parseFleetLocation(id: string, data: DocumentData): FleetLocation {
  return {
    id: String(data.id ?? id),
    name: String(data.name ?? ""),
    addressLine: String(data.addressLine ?? ""),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    createdAt: parseTimestamp(data.createdAt),
  };
}

export function parseGlobalLimits(data: DocumentData): AppGlobalLimits {
  function intOrUnlimited(key: string): number {
    const value = data[key];
    if (value == null) return UNLIMITED_CAP;
    const parsed = coerceFirestoreInteger(value);
    return parsed ?? UNLIMITED_CAP;
  }

  const subscriptionTier =
    typeof data.subscriptionTier === "string"
      ? data.subscriptionTier.trim()
      : "";

  return {
    maxAdmins: intOrUnlimited("maxAdmins"),
    maxDrivers: intOrUnlimited("maxDrivers"),
    maxLocations: intOrUnlimited("maxLocations"),
    subscriptionTier,
  };
}

export function parseFleetLocaleSettings(
  data: DocumentData
): AppFleetLocaleSettings {
  const language =
    typeof data.language === "string" ? data.language.trim() || null : null;
  const country =
    typeof data.country === "string" ? data.country.trim() || null : null;
  const timeZoneIdentifier =
    data.timeZoneIdentifier != null
      ? String(data.timeZoneIdentifier).trim() || null
      : null;

  return {
    language,
    country,
    dateFormat: parseLocaleDateFormat(data.dateFormat),
    timeFormat: parseLocaleTimeFormat(data.timeFormat),
    timeZoneIdentifier,
    numberFormat: parseLocaleNumberFormat(data.numberFormat),
  };
}

export function parseFleetOperatingHours(
  data: DocumentData
): AppFleetOperatingHours {
  const schedules = Array.isArray(data.schedules)
    ? data.schedules
        .map(parseWeeklySchedule)
        .filter((s): s is FleetWeeklyOperatingSchedule => s != null)
    : [];

  const rawWeekStart = data.weekStartsOn;
  const weekStartsOn =
    typeof rawWeekStart === "number" &&
    Number.isInteger(rawWeekStart) &&
    rawWeekStart >= 1 &&
    rawWeekStart <= 7
      ? rawWeekStart
      : 2;

  return {
    timeZoneIdentifier:
      data.timeZoneIdentifier != null
        ? String(data.timeZoneIdentifier)
        : null,
    weekStartsOn,
    schedules,
  };
}

export function parseCompanyProfile(data: DocumentData): CompanyProfile {
  const address =
    data.address && typeof data.address === "object" ? data.address : null;
  const legacyAddress =
    typeof data.address === "string" ? String(data.address) : "";
  const legacyParts = legacyAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    displayName: String(data.displayName ?? ""),
    address: {
      street:
        address && "street" in address
          ? String(address.street ?? "")
          : (legacyParts[0] ?? ""),
      city:
        address && "city" in address
          ? String(address.city ?? "")
          : (legacyParts[1] ?? ""),
      state:
        address && "state" in address
          ? String(address.state ?? "")
          : (legacyParts[2] ?? ""),
      postcode:
        address && "postcode" in address
          ? String(address.postcode ?? "")
          : (legacyParts[3] ?? ""),
      country:
        address && "country" in address
          ? String(address.country ?? "")
          : (legacyParts[4] ?? ""),
    },
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    website: String(data.website ?? ""),
    abn: String(data.abn ?? ""),
    acn: String(data.acn ?? ""),
    logoURL: String(data.logoURL ?? ""),
  };
}

export function parseUser(id: string, data: DocumentData): AppUser {
  return {
    id: String(data.id ?? id),
    role: data.role as UserRole,
    email: String(data.email ?? ""),
    profile: parseUserProfile(data.profile),
    driverProfile: parseDriverProfile(data.driverProfile),
    createdAt: parseTimestamp(data.createdAt),
  };
}
