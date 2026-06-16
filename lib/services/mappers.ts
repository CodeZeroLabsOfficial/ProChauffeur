import type { DocumentData } from "firebase/firestore";

import { toCoordinate, toDate, toInt } from "@/lib/firebase/converters";
import type {
  ActivityNotification,
  AppFleetOperatingHours,
  AppGlobalLimits,
  CompanyProfile,
  OperatorLocale,
  DriverProfile,
  FleetLocation,
  Invoice,
  NotificationAction,
  NotificationCategory,
  PricingAddon,
  PricingConfig,
  QuoteLineItem,
  Trip,
  TripQuoteSnapshot,
  User,
  UserProfile,
  Vehicle
} from "@/lib/models";
import { UNLIMITED } from "@/lib/models/limits";
import { parseOperatorLocale, parsePricingConfig, parseVehicleClass } from "@/lib/pricing/validate";
import type { VehicleClass } from "@/lib/models/vehicle-class";

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
    street: p.street ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    postcode: p.postcode ?? null,
    country: p.country ?? null,
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
      name: s.name ?? null,
      locationId: s.locationId ?? null,
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
    acceptsDispatchAssignments: d.acceptsDispatchAssignments ?? true
  };
}

export function mapUser(id: string, d: DocumentData): User {
  return {
    id,
    role: d.role ?? "customer",
    email: d.email ?? "",
    profile: mapUserProfile(d.profile),
    driverProfile: mapDriverProfile(d.driverProfile ?? d.driverStaff),
    createdAt: toDate(d.createdAt) ?? new Date(),
    stripeCustomerId: d.stripeCustomerId ?? null,
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
    vehicleClassId: d.vehicleClassId ?? null,
    vehicleIdentificationNumber: d.vehicleIdentificationNumber ?? null,
    engineTypeDescription: d.engineTypeDescription ?? null,
    luggageDescription: d.luggageDescription ?? "",
    smallLuggageCount: toInt(d.smallLuggageCount, 0),
    largeLuggageCount: toInt(d.largeLuggageCount, 0),
    gearTypeDescription: d.gearTypeDescription ?? ""
  };
}

function mapPricingAddon(d: DocumentData): PricingAddon {
  return {
    id: d.id ?? "",
    title: d.title ?? "",
    price: d.price ?? 0,
    isEnabled: d.isEnabled ?? true,
    tripTypes: d.tripTypes ?? [],
    vehicleClassIds: d.vehicleClassIds ?? []
  };
}

function mapQuoteLineItem(d: DocumentData): QuoteLineItem {
  return {
    id: d.id ?? "",
    label: d.label ?? "",
    amount: d.amount ?? 0,
    category: d.category ?? "base",
    isInternal: d.isInternal === true
  };
}

function mapTripQuoteSnapshot(d: DocumentData): TripQuoteSnapshot {
  return {
    schemaVersion: d.schemaVersion ?? 1,
    tripType: d.tripType ?? "transfer",
    vehicleClassId: d.vehicleClassId ?? "",
    garageLocationId: d.garageLocationId ?? "",
    distanceUnit: d.distanceUnit ?? "km",
    currencyCode: d.currencyCode ?? "",
    onboardUnits: d.onboardUnits ?? 0,
    deadheadUnits: d.deadheadUnits ?? 0,
    bookedHours: d.bookedHours ?? null,
    matchedZoneIds: d.matchedZoneIds ?? [],
    appliedFixedZoneId: d.appliedFixedZoneId ?? null,
    appliedZoneSurchargeIds: d.appliedZoneSurchargeIds ?? [],
    appliedRuleId: d.appliedRuleId ?? null,
    addonIds: d.addonIds ?? [],
    pickupPostcode: d.pickupPostcode ?? "",
    dropoffPostcode: d.dropoffPostcode ?? "",
    scheduledPickupAt: toDate(d.scheduledPickupAt) ?? new Date()
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
    customerStreet: d.customerStreet ?? null,
    customerCity: d.customerCity ?? null,
    customerState: d.customerState ?? null,
    customerPostcode: d.customerPostcode ?? null,
    customerCountry: d.customerCountry ?? null,
    customerCompany: d.customerCompany ?? null,
    driverID: d.driverID ?? null,
    pickup: toCoordinate(d.pickup) ?? { latitude: 0, longitude: 0 },
    dropoff: toCoordinate(d.dropoff) ?? { latitude: 0, longitude: 0 },
    pickupAddressLine: d.pickupAddressLine ?? null,
    dropoffAddressLine: d.dropoffAddressLine ?? null,
    vehicleSnapshot: d.vehicleSnapshot ? mapVehicle(d.vehicleSnapshot) : null,
    vehicleDocumentId: d.vehicleDocumentId ?? null,
    notes: d.notes ?? null,
    bookingPassengerCount: d.bookingPassengerCount ?? null,
    bookingSmallLuggageCount: d.bookingSmallLuggageCount ?? null,
    bookingLargeLuggageCount: d.bookingLargeLuggageCount ?? null,
    bookingAddons: Array.isArray(d.bookingAddons)
      ? d.bookingAddons.map((addon) => mapPricingAddon(addon as DocumentData))
      : null,
    scheduledPickupAt: toDate(d.scheduledPickupAt),
    linkedTripID: d.linkedTripID ?? null,
    journeyStartedAt: toDate(d.journeyStartedAt),
    journeyCompletedAt: toDate(d.journeyCompletedAt),
    journeyDurationSeconds:
      typeof d.journeyDurationSeconds === "number" ? d.journeyDurationSeconds : null,
    liveLocation: toCoordinate(d.liveLocation),
    liveHeadingDegrees: d.liveHeadingDegrees ?? null,
    tripType: d.tripType ?? null,
    vehicleClassId: d.vehicleClassId ?? null,
    vehicleClassDisplayName: d.vehicleClassDisplayName ?? null,
    bookedHours: d.bookedHours ?? null,
    quotedSubtotal: d.quotedSubtotal ?? null,
    quotedTaxAmount: d.quotedTaxAmount ?? null,
    quotedTotal: d.quotedTotal ?? null,
    quotedCurrencyCode: d.quotedCurrencyCode ?? null,
    quotedTaxRate: d.quotedTaxRate ?? null,
    quotedPricesIncludeTax: d.quotedPricesIncludeTax ?? null,
    quoteBreakdown: Array.isArray(d.quoteBreakdown)
      ? d.quoteBreakdown.map((line) => mapQuoteLineItem(line as DocumentData))
      : null,
    quoteComputedAt: toDate(d.quoteComputedAt),
    quoteSnapshot: d.quoteSnapshot ? mapTripQuoteSnapshot(d.quoteSnapshot as DocumentData) : null,
    paymentStatus: d.paymentStatus ?? null,
    paymentSource: d.paymentSource ?? null,
    stripePaymentIntentId: d.stripePaymentIntentId ?? null,
    invoiceId: d.invoiceId ?? null,
    paidAt: toDate(d.paidAt),
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

export function mapVehicleClass(id: string, d: DocumentData): VehicleClass {
  return parseVehicleClass(id, d);
}

export function mapFleetLocation(id: string, d: DocumentData): FleetLocation {
  return {
    id,
    name: d.name ?? "",
    addressLine: d.addressLine ?? "",
    latitude: d.latitude ?? 0,
    longitude: d.longitude ?? 0,
    isDefault: d.isDefault === true,
    timeZoneIdentifier: d.timeZoneIdentifier ?? null,
    createdAt: toDate(d.createdAt) ?? new Date()
  };
}

export function mapPricingConfig(d: DocumentData): PricingConfig {
  return parsePricingConfig(d);
}

export function mapOperatingHours(d: DocumentData): AppFleetOperatingHours {
  return {
    timeZoneIdentifier: d.timeZoneIdentifier ?? null,
    schedules: (d.schedules ?? []).map((s: DocumentData) => ({
      id: s.id ?? crypto.randomUUID(),
      name: s.name ?? null,
      locationId: s.locationId ?? null,
      isEnabled: s.isEnabled ?? true,
      weekdayNumbers: s.weekdayNumbers ?? [],
      startTime: s.startTime ?? null,
      endTime: s.endTime ?? null
    }))
  };
}

export function mapOperatorLocale(d: DocumentData): OperatorLocale {
  return parseOperatorLocale(d);
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

function companyString(d: DocumentData, camel: string, pascal: string): string | null {
  const value = d[camel] ?? d[pascal];
  return typeof value === "string" ? value : null;
}

/** Maps `operator/company` — address fields are top-level on the document. */
export function mapCompanyProfile(d: DocumentData): CompanyProfile {
  return {
    name: companyString(d, "name", "Name"),
    phone: companyString(d, "phone", "Phone"),
    email: companyString(d, "email", "Email"),
    website: companyString(d, "website", "Website"),
    abn: companyString(d, "abn", "ABN"),
    acn: companyString(d, "acn", "ACN"),
    street: companyString(d, "street", "Street"),
    city: companyString(d, "city", "City"),
    state: companyString(d, "state", "State"),
    postcode: companyString(d, "postcode", "Postcode"),
    country: companyString(d, "country", "Country")
  };
}

export function mapActivityNotification(id: string, d: DocumentData): ActivityNotification {
  return {
    id,
    category: (d.category as NotificationCategory) ?? "profile",
    action: (d.action as NotificationAction) ?? "updated",
    title: d.title ?? "",
    message: d.message ?? "",
    href: d.href ?? undefined,
    entityId: d.entityId ?? undefined,
    actorId: d.actorId ?? undefined,
    actorName: d.actorName ?? undefined,
    readAt: toDate(d.readAt),
    createdAt: toDate(d.createdAt) ?? new Date()
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
    source: d.source ?? null,
    stripeInvoiceId: d.stripeInvoiceId ?? null,
    stripeHostedInvoiceUrl: d.stripeHostedInvoiceUrl ?? null,
    stripePaymentIntentId: d.stripePaymentIntentId ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}
