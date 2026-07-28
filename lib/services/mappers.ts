import type { DocumentData } from "firebase/firestore";

import { toCoordinate, toDate, toInt } from "@/lib/firebase/converters";
import type {
  ActivityNotification,
  AppFleetOperatingHours,
  AppLicense,
  AppPlansCatalog,
  Branch,
  BranchDriver,
  CompanyProfile,
  OperatorLocale,
  DriverProfile,
  FeatureFlagValue,
  FeatureId,
  FleetLocation,
  Invoice,
  NotificationAction,
  NotificationCategory,
  PlanDefinition,
  PricingAddon,
  PricingConfig,
  Promotion,
  PromotionConditions,
  QuoteLineItem,
  SavedPaymentMethod,
  Trip,
  TripApprovalStatus,
  TripQuoteSnapshot,
  User,
  UserPreferences,
  UserProfile,
  Vehicle,
  CorporateAccount,
  CorporateFixedRateOverride,
  CorporateAccountStatus,
  CorporateRateMode,
  CorporateBillingDay,
  CorporatePreferredPayment
} from "@/lib/models";
import {
  CORPORATE_ACCOUNT_STATUSES,
  CORPORATE_PREFERRED_PAYMENTS,
  CORPORATE_RATE_MODES,
  clampPreferredPayment,
  normalizeAllowedPaymentMethods,
  normalizeAllowedVehicleClassIds
} from "@/lib/models/corporate-account";
import { TRIP_APPROVAL_STATUSES } from "@/lib/models/trip";
import {
  UNLIMITED,
  defaultPlansCatalog,
  isFeatureFlagValue,
  isFeatureId
} from "@/lib/models/license";
import { parseOperatorLocale, parsePricingConfig, parseVehicleClass } from "@/lib/pricing/validate";
import type { VehicleClass } from "@/lib/models/vehicle-class";

/** Pure mappers from raw Firestore document data into typed app models. */

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
    preferredOfficeLocationId:
      (typeof d.preferredOfficeLocationId === "string" ? d.preferredOfficeLocationId : null) ??
      (typeof d.preferredGarageLocationId === "string" ? d.preferredGarageLocationId : null),
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

function mapUserPreferences(d: DocumentData | undefined | null): UserPreferences | null {
  if (!d || typeof d !== "object") return null;
  return {
    bookingsDefaultDateRange:
      typeof d.bookingsDefaultDateRange === "string" ? d.bookingsDefaultDateRange : null
  };
}

export function mapSavedPaymentMethod(id: string, d: DocumentData): SavedPaymentMethod {
  return {
    id,
    stripePaymentMethodId: d.stripePaymentMethodId ?? "",
    type: "card",
    brand: d.brand ?? "",
    last4: d.last4 ?? "",
    expMonth: typeof d.expMonth === "number" ? d.expMonth : 0,
    expYear: typeof d.expYear === "number" ? d.expYear : 0,
    isDefault: d.isDefault === true,
    displayLabel: d.displayLabel ?? "",
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

export function mapUser(id: string, d: DocumentData): User {
  return {
    id,
    role: d.role ?? "customer",
    email: d.email ?? "",
    profile: mapUserProfile(d.profile),
    preferences: mapUserPreferences(d.preferences),
    homeBranchId: d.homeBranchId ?? null,
    branchIds: Array.isArray(d.branchIds) ? d.branchIds : null,
    defaultBranchId: d.defaultBranchId ?? null,
    canAccessAllBranches: d.canAccessAllBranches ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    stripeCustomerId: d.stripeCustomerId ?? null,
    corporateAccountId: typeof d.corporateAccountId === "string" ? d.corporateAccountId : null,
    preferredPaymentMethod:
      d.preferredPaymentMethod === "card" || d.preferredPaymentMethod === "corporate"
        ? d.preferredPaymentMethod
        : null,
    liveLocation: toCoordinate(d.liveLocation),
    liveLocationUpdatedAt: toDate(d.liveLocationUpdatedAt)
  };
}

export function mapBranch(id: string, d: DocumentData): Branch {
  return {
    id,
    name: d.name ?? id,
    isActive: d.isActive !== false,
    timeZoneIdentifier: d.timeZoneIdentifier ?? null,
    imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : null,
    officeAddressLine: typeof d.officeAddressLine === "string" ? d.officeAddressLine : null,
    officeLatitude: typeof d.officeLatitude === "number" ? d.officeLatitude : null,
    officeLongitude: typeof d.officeLongitude === "number" ? d.officeLongitude : null,
    officePhone: typeof d.officePhone === "string" ? d.officePhone : null,
    serviceArea: d.serviceArea ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

export function mapBranchDriver(id: string, d: DocumentData): BranchDriver {
  const profile = mapDriverProfile(d) ?? mapDriverProfile({})!;
  return {
    id,
    userId: d.userId ?? id,
    ...profile,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
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
    officeLocationId: typeof d.officeLocationId === "string" ? d.officeLocationId : "",
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
    appliedPromoId: d.appliedPromoId ?? null,
    promoCode: d.promoCode ?? null,
    corporateAccountId: typeof d.corporateAccountId === "string" ? d.corporateAccountId : null,
    corporateRateMode:
      d.corporateRateMode === "percentOff" || d.corporateRateMode === "fixedRates"
        ? d.corporateRateMode
        : null,
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
    branchId: typeof d.branchId === "string" ? d.branchId : null,
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
    appliedPromoId: d.appliedPromoId ?? null,
    promoCode: d.promoCode ?? null,
    paymentStatus: d.paymentStatus ?? null,
    paymentSource: d.paymentSource ?? null,
    stripePaymentIntentId: d.stripePaymentIntentId ?? null,
    invoiceId: d.invoiceId ?? null,
    corporateAccountId: typeof d.corporateAccountId === "string" ? d.corporateAccountId : null,
    approvalStatus: TRIP_APPROVAL_STATUSES.includes(d.approvalStatus as TripApprovalStatus)
      ? (d.approvalStatus as TripApprovalStatus)
      : null,
    approvedAt: toDate(d.approvedAt),
    approvedByUserId: typeof d.approvedByUserId === "string" ? d.approvedByUserId : null,
    approvalNote: typeof d.approvalNote === "string" ? d.approvalNote : null,
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

export function mapLicense(d: DocumentData): AppLicense {
  const intOrUnlimited = (key: string) => (d[key] != null ? toInt(d[key], UNLIMITED) : UNLIMITED);
  // Missing maxLocations → 1 so multi-Location stays gated off until raised.
  const maxLocations = d.maxLocations != null ? toInt(d.maxLocations, 1) : 1;
  const featureFlags: Partial<Record<FeatureId, FeatureFlagValue>> = {};
  const rawFlags = d.featureFlags;
  if (rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)) {
    for (const [key, value] of Object.entries(rawFlags as Record<string, unknown>)) {
      if (isFeatureId(key) && isFeatureFlagValue(value)) {
        featureFlags[key] = value;
      }
    }
  }
  return {
    planId: typeof d.planId === "string" ? d.planId.trim() : "",
    maxAdmins: intOrUnlimited("maxAdmins"),
    maxDrivers: intOrUnlimited("maxDrivers"),
    maxLocations,
    featureFlags
  };
}

function mapPlanFeatures(raw: unknown): FeatureId[] {
  if (!Array.isArray(raw)) return [];
  const out: FeatureId[] = [];
  for (const item of raw) {
    if (typeof item === "string" && isFeatureId(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}

export function mapPlansCatalog(d: DocumentData): AppPlansCatalog {
  const plans: Record<string, PlanDefinition> = {};
  const rawPlans = d.plans;
  if (rawPlans && typeof rawPlans === "object" && !Array.isArray(rawPlans)) {
    for (const [planId, value] of Object.entries(rawPlans as Record<string, unknown>)) {
      if (!planId.trim() || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      const label =
        typeof entry.label === "string" && entry.label.trim()
          ? entry.label.trim()
          : planId;
      plans[planId] = {
        label,
        features: mapPlanFeatures(entry.features)
      };
    }
  }
  const defaultPlanId =
    typeof d.defaultPlanId === "string" && d.defaultPlanId.trim()
      ? d.defaultPlanId.trim()
      : defaultPlansCatalog.defaultPlanId;
  if (Object.keys(plans).length === 0) {
    return defaultPlansCatalog;
  }
  return { defaultPlanId, plans };
}

function companyString(d: DocumentData, camel: string, pascal: string): string | null {
  const value = d[camel] ?? d[pascal];
  return typeof value === "string" ? value : null;
}

/** Maps `app_settings/company` — address fields are top-level on the document. */
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
    corporateAccountId: typeof d.corporateAccountId === "string" ? d.corporateAccountId : null,
    billingPeriodStart: toDate(d.billingPeriodStart),
    billingPeriodEnd: toDate(d.billingPeriodEnd),
    stripeInvoiceId: d.stripeInvoiceId ?? null,
    stripeHostedInvoiceUrl: d.stripeHostedInvoiceUrl ?? null,
    stripePaymentIntentId: d.stripePaymentIntentId ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

function mapPromotionConditions(d: DocumentData): PromotionConditions {
  return {
    branchIds: Array.isArray(d.branchIds) ? (d.branchIds as string[]) : null,
    startsAt: toDate(d.startsAt),
    endsAt: toDate(d.endsAt),
    tripTypes: Array.isArray(d.tripTypes) ? (d.tripTypes as PromotionConditions["tripTypes"]) : null,
    vehicleClassIds: Array.isArray(d.vehicleClassIds) ? (d.vehicleClassIds as string[]) : null,
    maxRedemptions: typeof d.maxRedemptions === "number" ? d.maxRedemptions : null,
    perCustomerLimit: typeof d.perCustomerLimit === "number" ? d.perCustomerLimit : null,
    minimumSubtotal: typeof d.minimumSubtotal === "number" ? d.minimumSubtotal : null
  };
}

export function mapPromotion(id: string, d: DocumentData): Promotion {
  const conditionsRaw =
    d.conditions && typeof d.conditions === "object"
      ? (d.conditions as DocumentData)
      : d;
  return {
    id,
    title: typeof d.title === "string" ? d.title : "",
    code: typeof d.code === "string" ? d.code : "",
    isEnabled: d.isEnabled !== false,
    type: d.type === "fixed" ? "fixed" : "percent",
    value: typeof d.value === "number" ? d.value : 0,
    conditions: mapPromotionConditions(conditionsRaw),
    redemptionCount: typeof d.redemptionCount === "number" ? d.redemptionCount : 0,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}

function mapCorporateFixedRate(raw: DocumentData): CorporateFixedRateOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const vehicleClassId = typeof raw.vehicleClassId === "string" ? raw.vehicleClassId : "";
  if (!vehicleClassId) return null;
  const tripType = raw.tripType === "hourly" ? "hourly" : "transfer";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    vehicleClassId,
    tripType,
    transfer:
      raw.transfer && typeof raw.transfer === "object"
        ? (raw.transfer as CorporateFixedRateOverride["transfer"])
        : null,
    hourly:
      raw.hourly && typeof raw.hourly === "object"
        ? (raw.hourly as CorporateFixedRateOverride["hourly"])
        : null,
    fixedTransferRate: typeof raw.fixedTransferRate === "number" ? raw.fixedTransferRate : null
  };
}

function mapCorporateBillingDay(raw: unknown): CorporateBillingDay {
  if (raw === "last") return "last";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const day = Math.trunc(raw);
    if (day >= 1 && day <= 28) return day;
  }
  return "last";
}

export function mapCorporateAccount(id: string, d: DocumentData): CorporateAccount {
  const status = CORPORATE_ACCOUNT_STATUSES.includes(d.status as CorporateAccountStatus)
    ? (d.status as CorporateAccountStatus)
    : "active";
  const rateMode = CORPORATE_RATE_MODES.includes(d.rateMode as CorporateRateMode)
    ? (d.rateMode as CorporateRateMode)
    : "percentOff";
  const fixedRates = Array.isArray(d.fixedRates)
    ? d.fixedRates
        .map((row) => mapCorporateFixedRate(row as DocumentData))
        .filter((row): row is CorporateFixedRateOverride => Boolean(row))
    : [];
  const preferredPayment = CORPORATE_PREFERRED_PAYMENTS.includes(
    d.preferredPayment as CorporatePreferredPayment
  )
    ? (d.preferredPayment as CorporatePreferredPayment)
    : null;
  const allowedPaymentMethods = normalizeAllowedPaymentMethods(
    d.allowedPaymentMethods,
    preferredPayment
  );
  const allowedVehicleClassIds = normalizeAllowedVehicleClassIds(d.allowedVehicleClassIds);

  return {
    id,
    name: typeof d.name === "string" ? d.name : "",
    logoUrl: typeof d.logoUrl === "string" ? d.logoUrl : null,
    email: typeof d.email === "string" ? d.email : null,
    phone: typeof d.phone === "string" ? d.phone : null,
    abn: typeof d.abn === "string" ? d.abn : null,
    acn: typeof d.acn === "string" ? d.acn : null,
    industry: typeof d.industry === "string" ? d.industry : null,
    addressLine1: typeof d.addressLine1 === "string" ? d.addressLine1 : null,
    addressLine2: typeof d.addressLine2 === "string" ? d.addressLine2 : null,
    city: typeof d.city === "string" ? d.city : null,
    state: typeof d.state === "string" ? d.state : null,
    postcode: typeof d.postcode === "string" ? d.postcode : null,
    country: typeof d.country === "string" ? d.country : null,
    primaryContactUserId:
      typeof d.primaryContactUserId === "string" ? d.primaryContactUserId : null,
    billingContactUserId:
      typeof d.billingContactUserId === "string" ? d.billingContactUserId : null,
    accountManagerUserId:
      typeof d.accountManagerUserId === "string" ? d.accountManagerUserId : null,
    allowedVehicleClassIds,
    maxRideAmount: typeof d.maxRideAmount === "number" ? d.maxRideAmount : null,
    monthlyBudget: typeof d.monthlyBudget === "number" ? d.monthlyBudget : null,
    allowedPaymentMethods,
    preferredPayment: clampPreferredPayment(preferredPayment, allowedPaymentMethods),
    gstInclusive: d.gstInclusive !== false,
    status,
    billingDay: mapCorporateBillingDay(d.billingDay),
    paymentTermsDays: typeof d.paymentTermsDays === "number" ? d.paymentTermsDays : 0,
    rateMode,
    percentOff: typeof d.percentOff === "number" ? d.percentOff : null,
    fixedRates,
    joinCode: typeof d.joinCode === "string" ? d.joinCode : null,
    creditLimit: typeof d.creditLimit === "number" ? d.creditLimit : null,
    notes: typeof d.notes === "string" ? d.notes : null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date()
  };
}
