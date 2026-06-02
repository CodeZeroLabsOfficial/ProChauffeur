import type { DocumentData } from "firebase/firestore";

import { toCoordinate, toDate, toInt } from "@/lib/firebase/converters";
import type {
  AppFleetOperatingHours,
  AppGlobalLimits,
  DriverProfile,
  FleetLocation,
  Invoice,
  PricingConfig,
  Trip,
  User,
  UserProfile,
  Vehicle
} from "@/lib/models";
import { UNLIMITED } from "@/lib/models/limits";

/**
 * Pure mappers from raw Firestore document data into typed app models.
 * Field names intentionally mirror the iOS Codable models.
 */

function mapUserProfile(d: DocumentData | undefined): UserProfile {
  const p = d ?? {};
  return {
    displayName: p.displayName ?? "",
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    phoneNumber: p.phoneNumber ?? null,
    photoURL: p.photoURL ?? null,
    address: p.address ?? null,
    dateOfBirth: toDate(p.dateOfBirth)
  };
}

function mapDriverProfile(d: DocumentData | undefined | null): DriverProfile | null {
  if (!d) return null;
  return {
    chauffeurCategory: d.chauffeurCategory ?? "chauffeur",
    qualifications: d.qualifications ?? [],
    bioStatement: d.bioStatement ?? "",
    serviceSpecialties: d.serviceSpecialties ?? [],
    vehicleOrServiceFocus: d.vehicleOrServiceFocus ?? [],
    availabilitySchedules: (d.availabilitySchedules ?? []).map((s: DocumentData) => ({
      id: s.id ?? crypto.randomUUID(),
      isEnabled: s.isEnabled ?? true,
      weekdayNumbers: s.weekdayNumbers ?? [],
      startTime: s.startTime ?? null,
      endTime: s.endTime ?? null
    })),
    timeZoneIdentifier: d.timeZoneIdentifier ?? null,
    preferredGarageLocationId: d.preferredGarageLocationId ?? null,
    driversLicenseSummary: d.driversLicenseSummary ?? null,
    driversLicenseNumber: d.driversLicenseNumber ?? null,
    driversLicenseClassOrType: d.driversLicenseClassOrType ?? null,
    driversLicenseConditions: d.driversLicenseConditions ?? null,
    driversLicenseConditionCodes: d.driversLicenseConditionCodes ?? null,
    driversLicenseJurisdictionCode: d.driversLicenseJurisdictionCode ?? null,
    driversLicenseExpiry: toDate(d.driversLicenseExpiry),
    operatorAccreditationNumber: d.operatorAccreditationNumber ?? null,
    operatorAccreditationIssuingAuthority: d.operatorAccreditationIssuingAuthority ?? null,
    operatorAccreditationExpiry: toDate(d.operatorAccreditationExpiry),
    visibleOnCustomerApp: d.visibleOnCustomerApp ?? true,
    acceptsDispatchAssignments: d.acceptsDispatchAssignments ?? true,
    homeAddressLine: d.homeAddressLine ?? null
  };
}

export function mapUser(id: string, d: DocumentData): User {
  return {
    id,
    role: d.role ?? "customer",
    email: d.email ?? "",
    profile: mapUserProfile(d.profile),
    // Accept the legacy `driverStaff` key for backward compatibility.
    driverProfile: mapDriverProfile(d.driverProfile ?? d.driverStaff),
    createdAt: toDate(d.createdAt) ?? new Date(),
    liveLocation: toCoordinate(d.liveLocation),
    liveLocationUpdatedAt: toDate(d.liveLocationUpdatedAt)
  };
}

export function mapVehicle(d: DocumentData): Vehicle {
  return {
    driverID: d.driverID,
    assignedChauffeurUserId: d.assignedChauffeurUserId ?? null,
    make: d.make ?? "",
    model: d.model ?? "",
    color: d.color ?? "",
    licensePlate: d.licensePlate ?? "",
    passengerCapacity: toInt(d.passengerCapacity, 0),
    manufactureYear: d.manufactureYear != null ? toInt(d.manufactureYear, 0) : null,
    registrationJurisdictionCode: d.registrationJurisdictionCode ?? null,
    registrationExpiry: toDate(d.registrationExpiry),
    pricingVehicleType: d.pricingVehicleType ?? null,
    specificationChips: d.specificationChips ?? [],
    carFeatureRows: d.carFeatureRows ?? [],
    luggageDescription: d.luggageDescription ?? "",
    fleetSmallLuggageCount: toInt(d.fleetSmallLuggageCount, 0),
    fleetLargeLuggageCount: toInt(d.fleetLargeLuggageCount, 0),
    wifiServiceDescription: d.wifiServiceDescription ?? "",
    serviceClassDescription: d.serviceClassDescription ?? "",
    interiorDescription: d.interiorDescription ?? "",
    climateControlDescription: d.climateControlDescription ?? "",
    gearTypeDescription: d.gearTypeDescription ?? ""
  };
}

export function mapTrip(id: string, d: DocumentData): Trip {
  return {
    id,
    status: d.status ?? "requested",
    customerID: d.customerID ?? "",
    customerDisplayName: d.customerDisplayName ?? null,
    customerPhoneNumber: d.customerPhoneNumber ?? null,
    customerEmail: d.customerEmail ?? null,
    driverID: d.driverID ?? null,
    pickup: toCoordinate(d.pickup) ?? { latitude: 0, longitude: 0 },
    dropoff: toCoordinate(d.dropoff) ?? { latitude: 0, longitude: 0 },
    pickupAddressLine: d.pickupAddressLine ?? null,
    dropoffAddressLine: d.dropoffAddressLine ?? null,
    vehicleSnapshot: d.vehicleSnapshot ? mapVehicle(d.vehicleSnapshot) : null,
    fleetVehicleDocumentId: d.fleetVehicleDocumentId ?? null,
    notes: d.notes ?? null,
    bookingPassengerCount: d.bookingPassengerCount ?? null,
    bookingSmallLuggageCount: d.bookingSmallLuggageCount ?? null,
    bookingLargeLuggageCount: d.bookingLargeLuggageCount ?? null,
    scheduledPickupAt: toDate(d.scheduledPickupAt),
    linkedTripID: d.linkedTripID ?? null,
    liveLocation: toCoordinate(d.liveLocation),
    liveHeadingDegrees: d.liveHeadingDegrees ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

export function mapFleetLocation(id: string, d: DocumentData): FleetLocation {
  return {
    id,
    name: d.name ?? "",
    addressLine: d.addressLine ?? "",
    latitude: d.latitude ?? 0,
    longitude: d.longitude ?? 0,
    createdAt: toDate(d.createdAt) ?? new Date()
  };
}

export function mapPricingConfig(d: DocumentData): PricingConfig {
  return {
    minimumFare: d.minimumFare ?? 0,
    baseFare: d.baseFare ?? 0,
    distanceRatePerKm: d.distanceRatePerKm ?? 0,
    timeRatePerHour: d.timeRatePerHour ?? 0,
    waitingFeeFlat: d.waitingFeeFlat ?? 0,
    peakOrWeekendMultiplier: d.peakOrWeekendMultiplier ?? 1,
    returnToBaseFee: d.returnToBaseFee ?? 0,
    vehicles: d.vehicles ?? [],
    addons: d.addons ?? []
  };
}

export function mapOperatingHours(d: DocumentData): AppFleetOperatingHours {
  return {
    timeZoneIdentifier: d.timeZoneIdentifier ?? null,
    schedules: d.schedules ?? []
  };
}

export function mapLimits(d: DocumentData): AppGlobalLimits {
  const intOrUnlimited = (key: string) => (d[key] != null ? toInt(d[key], UNLIMITED) : UNLIMITED);
  return {
    maxAdmins: intOrUnlimited("maxAdmins"),
    maxDrivers: intOrUnlimited("maxDrivers"),
    maxLocations: intOrUnlimited("maxLocations"),
    subscriptionTier: typeof d.subscriptionTier === "string" ? d.subscriptionTier.trim() : ""
  };
}

export function mapInvoice(id: string, d: DocumentData): Invoice {
  return {
    id,
    invoiceNumber: d.invoiceNumber ?? "",
    customerID: d.customerID ?? "",
    customerName: d.customerName ?? "",
    customerEmail: d.customerEmail ?? null,
    customerPhone: d.customerPhone ?? null,
    tripIDs: d.tripIDs ?? [],
    status: d.status ?? "draft",
    currencyCode: d.currencyCode ?? "AUD",
    lineItems: d.lineItems ?? [],
    subtotal: d.subtotal ?? 0,
    taxRate: d.taxRate ?? 0,
    taxAmount: d.taxAmount ?? 0,
    total: d.total ?? 0,
    issuedAt: toDate(d.issuedAt) ?? new Date(),
    dueAt: toDate(d.dueAt),
    paidAt: toDate(d.paidAt),
    notes: d.notes ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}
