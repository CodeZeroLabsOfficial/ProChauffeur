import type {
  LocaleDateFormat,
  LocaleNumberFormat,
  LocaleTimeFormat,
} from "@/lib/prochauffeur/localeOptions";

export type UserRole = "customer" | "driver" | "admin";

export type TripStatus =
  | "requested"
  | "accepted"
  | "en_route_pickup"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CoordinateField = {
  latitude: number;
  longitude: number;
};

export type GeoPointLike = {
  latitude: number;
  longitude: number;
};

export type UserAddress = {
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export type UserProfile = {
  displayName: string;
  phoneNumber?: string | null;
  photoURL?: string | null;
  dateOfBirth?: Date | null;
  address?: UserAddress | null;
};

export type ChauffeurCategory =
  | "leadChauffeur"
  | "chauffeur"
  | "fleetConcierge"
  | "dispatcher"
  | "other";

export type FleetWeeklyOperatingSchedule = {
  id: string;
  isEnabled: boolean;
  weekdayNumbers: number[];
  startTime: string | null;
  endTime: string | null;
};

export type DriverProfile = {
  chauffeurCategory: ChauffeurCategory;
  qualifications: string[];
  bioStatement: string;
  serviceSpecialties: string[];
  vehicleOrServiceFocus: string[];
  availabilitySchedules: FleetWeeklyOperatingSchedule[];
  timeZoneIdentifier: string | null;
  preferredGarageLocationId: string | null;
  driversLicenseSummary: string | null;
  driversLicenseNumber: string | null;
  driversLicenseClassOrType: string | null;
  driversLicenseConditions: string | null;
  driversLicenseConditionCodes: string | null;
  driversLicenseJurisdictionCode: string | null;
  driversLicenseExpiry: Date | null;
  operatorAccreditationNumber: string | null;
  operatorAccreditationIssuingAuthority: string | null;
  operatorAccreditationExpiry: Date | null;
  visibleOnCustomerApp: boolean;
  acceptsDispatchAssignments: boolean;
  homeAddressLine: string | null;
};

export type AppUser = {
  id: string;
  role: UserRole;
  email: string;
  profile: UserProfile;
  driverProfile?: DriverProfile | null;
  createdAt: Date;
};

export type VehicleType =
  | "sedan"
  | "suv"
  | "stretch_limo"
  | "sprinter_van";

export type VehicleSpecificationChip = {
  id: string;
  systemImageName: string;
  title: string;
  value: string;
};

export type VehicleCarFeatureRow = {
  id: string;
  label: string;
  value: string;
};

export type Vehicle = {
  driverID: string;
  assignedChauffeurUserId: string | null;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  passengerCapacity: number;
  manufactureYear: number | null;
  registrationJurisdictionCode: string | null;
  registrationExpiry: Date | null;
  pricingVehicleType: VehicleType;
  specificationChips: VehicleSpecificationChip[];
  carFeatureRows: VehicleCarFeatureRow[];
  luggageDescription: string;
  fleetSmallLuggageCount: number;
  fleetLargeLuggageCount: number;
  wifiServiceDescription: string;
  serviceClassDescription: string;
  interiorDescription: string;
  climateControlDescription: string;
  gearTypeDescription: string;
};

export type FleetLocation = {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
};

export type AppGlobalLimits = {
  maxAdmins: number;
  maxDrivers: number;
  maxLocations: number;
  subscriptionTier: string;
};

export type AppFleetOperatingHours = {
  timeZoneIdentifier: string | null;
  /** ISO weekday: 1 = Sunday … 7 = Saturday; default Monday (2). */
  weekStartsOn: number;
  schedules: FleetWeeklyOperatingSchedule[];
};

export type AppFleetLocaleSettings = {
  language: string | null;
  country: string | null;
  dateFormat: LocaleDateFormat | null;
  timeFormat: LocaleTimeFormat | null;
  timeZoneIdentifier: string | null;
  numberFormat: LocaleNumberFormat | null;
};

export type AppFleetBrandingSettings = {
  favicon: string;
  logo: string;
  logoDark: string;
  logoIcon: string;
  authLogo: string;
};

export type CompanyProfile = {
  displayName: string;
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  phone: string;
  email: string;
  website: string;
  abn: string;
  acn: string;
  logoURL: string;
};

export type PricingVehicleTier = {
  type: VehicleType;
  multiplier: number;
  minimumBookedHours: number;
  displayHourlyFrom: number | null;
};

export type PricingAddon = {
  id: string;
  title: string;
  price: number;
};

export type PricingConfig = {
  minimumFare: number;
  baseFare: number;
  distanceRatePerKm: number;
  timeRatePerHour: number;
  waitingFeeFlat: number;
  peakOrWeekendMultiplier: number;
  returnToBaseFee: number;
  vehicles: PricingVehicleTier[];
  addons: PricingAddon[];
};

export const CHAUFFEUR_CATEGORY_LABELS: Record<ChauffeurCategory, string> = {
  leadChauffeur: "Lead chauffeur",
  chauffeur: "Chauffeur",
  fleetConcierge: "Fleet concierge",
  dispatcher: "Dispatcher",
  other: "Other",
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  stretch_limo: "Stretch Limo",
  sprinter_van: "Sprinter Van",
};

export const ALL_VEHICLE_TYPES: VehicleType[] = [
  "sedan",
  "suv",
  "stretch_limo",
  "sprinter_van",
];

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  minimumFare: 89,
  baseFare: 48,
  distanceRatePerKm: 3.4,
  timeRatePerHour: 98,
  waitingFeeFlat: 0,
  peakOrWeekendMultiplier: 1.22,
  returnToBaseFee: 55,
  vehicles: [
    {
      type: "sedan",
      multiplier: 1.0,
      minimumBookedHours: 2,
      displayHourlyFrom: 98,
    },
    {
      type: "suv",
      multiplier: 1.12,
      minimumBookedHours: 2,
      displayHourlyFrom: 110,
    },
    {
      type: "stretch_limo",
      multiplier: 1.55,
      minimumBookedHours: 4,
      displayHourlyFrom: 165,
    },
    {
      type: "sprinter_van",
      multiplier: 1.28,
      minimumBookedHours: 3,
      displayHourlyFrom: 125,
    },
  ],
  addons: [
    { id: "child_seat", title: "Child seat", price: 18 },
    { id: "meet_greet", title: "Meet & greet (airport)", price: 45 },
  ],
};

export const UNLIMITED_CAP = Number.MAX_SAFE_INTEGER;

export const DEFAULT_GLOBAL_LIMITS: AppGlobalLimits = {
  maxAdmins: UNLIMITED_CAP,
  maxDrivers: UNLIMITED_CAP,
  maxLocations: UNLIMITED_CAP,
  subscriptionTier: "",
};

export const EMPTY_OPERATING_HOURS: AppFleetOperatingHours = {
  timeZoneIdentifier: null,
  weekStartsOn: 2,
  schedules: [],
};

export const EMPTY_FLEET_LOCALE: AppFleetLocaleSettings = {
  language: null,
  country: null,
  dateFormat: null,
  timeFormat: null,
  timeZoneIdentifier: null,
  numberFormat: null,
};

export const EMPTY_FLEET_BRANDING: AppFleetBrandingSettings = {
  favicon: "",
  logo: "",
  logoDark: "",
  logoIcon: "",
  authLogo: "",
};

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  displayName: "",
  address: {
    street: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  },
  phone: "",
  email: "",
  website: "",
  abn: "",
  acn: "",
  logoURL: "",
};

export function defaultDriverProfile(): DriverProfile {
  return {
    chauffeurCategory: "chauffeur",
    qualifications: [],
    bioStatement: "",
    serviceSpecialties: [],
    vehicleOrServiceFocus: [],
    availabilitySchedules: [
      {
        id: "primary",
        isEnabled: true,
        weekdayNumbers: [2, 3, 4, 5, 6],
        startTime: null,
        endTime: null,
      },
    ],
    timeZoneIdentifier: null,
    preferredGarageLocationId: null,
    driversLicenseSummary: null,
    driversLicenseNumber: null,
    driversLicenseClassOrType: null,
    driversLicenseConditions: null,
    driversLicenseConditionCodes: null,
    driversLicenseJurisdictionCode: null,
    driversLicenseExpiry: null,
    operatorAccreditationNumber: null,
    operatorAccreditationIssuingAuthority: null,
    operatorAccreditationExpiry: null,
    visibleOnCustomerApp: true,
    acceptsDispatchAssignments: true,
    homeAddressLine: null,
  };
}

export type VehicleSnapshot = {
  displayName?: string;
  pricingVehicleType?: string;
  make?: string;
  model?: string;
};

export type Trip = {
  id: string;
  status: TripStatus;
  customerID: string;
  customerDisplayName?: string | null;
  customerPhoneNumber?: string | null;
  customerEmail?: string | null;
  driverID?: string | null;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine?: string | null;
  dropoffAddressLine?: string | null;
  vehicleSnapshot?: VehicleSnapshot | null;
  fleetVehicleDocumentId?: string | null;
  notes?: string | null;
  bookingPassengerCount?: number | null;
  scheduledPickupAt?: Date | null;
  liveLocation?: GeoPointLike | null;
  liveHeadingDegrees?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TripVolumeChartPeriod =
  | "This Week"
  | "This Month"
  | "Last 3 Months"
  | "This Year";

export type TripVolumeBarPoint = {
  id: string;
  label: string;
  count: number;
};

export type AdminActivityItem = {
  id: string;
  headline: string;
  subline: string;
  occurredAt: Date;
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route_pickup: "Enroute",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const UPCOMING_TRIP_STATUSES: TripStatus[] = [
  "requested",
  "accepted",
  "en_route_pickup",
  "in_progress",
];

export function isUpcomingTripStatus(status: TripStatus): boolean {
  return UPCOMING_TRIP_STATUSES.includes(status);
}

export function tripStatusBadgeColor(
  status: TripStatus
): "primary" | "success" | "warning" | "error" | "info" | "light" | "dark" {
  switch (status) {
    case "requested":
      return "warning";
    case "accepted":
      return "primary";
    case "en_route_pickup":
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    case "cancelled":
      return "error";
  }
}
