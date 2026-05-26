import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageStub, { type PageStubProps } from "@/components/prochauffeur/PageStub";
import { pageTitle, type StubConfig } from "@/lib/prochauffeur/site";
import type { Metadata } from "next";
import React from "react";

export function stubMetadata(config: StubConfig): Metadata {
  return {
    title: pageTitle(config.breadcrumb),
    description: config.description,
  };
}

type StubPageProps = PageStubProps & {
  breadcrumb: string;
};

export function StubPage({
  breadcrumb,
  ...stub
}: StubPageProps): React.ReactElement {
  return (
    <div>
      <PageBreadcrumb pageTitle={breadcrumb} />
      <PageStub {...stub} />
    </div>
  );
}

export const stubs = {
  overview: {
    breadcrumb: "Overview",
    title: "Operations overview",
    description:
      "Live KPIs, upcoming trip preview, trip volume chart, and recent activity — mirrors the iOS Admin dashboard tab.",
    phase: "Phase 1",
    priority: "P0",
    iosEquivalent: "AdminDashboardView",
    firestore: "trips, users",
    tailAdminBase: "Ecommerce dashboard (/) — stat cards + line chart",
  },
  activity: {
    breadcrumb: "Activity",
    title: "Recent activity",
    description:
      "Full trip lifecycle feed with Today / Last 7 / Last 30 filters.",
    phase: "Phase 4",
    priority: "P1",
    iosEquivalent: "AdminRecentActivityListView",
    firestore: "trips (derived)",
    tailAdminBase: "Basic tables + segmented tabs",
  },
  dispatch: {
    breadcrumb: "Dispatch",
    title: "Live dispatch map",
    description:
      "Web-only live map with active trips and driver markers. Primary dispatch surface for fleet operators.",
    phase: "Phase 1",
    priority: "P0",
    iosEquivalent: "— (web enhancement)",
    firestore: "trips, users (live locations)",
    tailAdminBase: "Blank page — add Mapbox GL JS",
  },
  bookings: {
    breadcrumb: "Bookings",
    title: "Booking queue",
    description:
      "Upcoming and active trips with confirm, decline, cancel, and complete actions.",
    phase: "Phase 1",
    priority: "P0",
    iosEquivalent: "AdminBookingsView → AdminUpcomingTripsListView",
    firestore: "trips",
    tailAdminBase: "Basic tables + badges + modals",
  },
  tripDetail: {
    breadcrumb: "Trip detail",
    title: "Trip detail",
    description:
      "Status timeline, pickup/drop-off, customer and driver contact, vehicle snapshot, and admin trip actions.",
    phase: "Phase 1",
    priority: "P0",
    iosEquivalent: "AdminBookingAppointmentRow (expanded)",
    firestore: "trips/{tripId}",
    tailAdminBase: "Blank page + badges + modals",
  },
  drivers: {
    breadcrumb: "Drivers",
    title: "Driver roster",
    description:
      "Fleet chauffeurs with seat cap display, search, and links into each driver hub.",
    phase: "Phase 2",
    priority: "P0",
    iosEquivalent: "AdminUserDirectoryView",
    firestore: "users (role: driver), app_settings/limits",
    tailAdminBase: "Basic tables + avatars",
  },
  addDriver: {
    breadcrumb: "Add driver",
    title: "Add driver",
    description:
      "Multi-step wizard: profile, license/accreditation, then vehicle assignment.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AddDriverFlowContainerView",
    firestore: "users, vehicles",
    tailAdminBase: "Form elements + modals",
  },
  driverHub: {
    breadcrumb: "Driver hub",
    title: "Driver hub",
    description: "Driver summary with links to profile, availability, credentials, and vehicle assignment.",
    phase: "Phase 2",
    priority: "P0",
    iosEquivalent: "AdminDriverHubView",
    firestore: "users/{userId}, vehicles",
    tailAdminBase: "User profile layout",
  },
  driverProfile: {
    breadcrumb: "Driver profile",
    title: "Edit driver profile",
    description: "Contact details, dispatch assignment toggle, and profile fields.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AdminDriverProfileEditView",
    firestore: "users/{userId}",
    tailAdminBase: "Form elements",
  },
  driverAvailability: {
    breadcrumb: "Driver availability",
    title: "Driver availability",
    description: "Weekly schedule and timezone for the selected chauffeur.",
    phase: "Phase 2",
    priority: "P2",
    iosEquivalent: "AdminDriverAvailabilityView",
    firestore: "users/{userId}.profile",
    tailAdminBase: "Calendar + form elements",
  },
  driverCredentials: {
    breadcrumb: "Driver credentials",
    title: "Driver credentials",
    description: "Credential and compliance fields for the chauffeur.",
    phase: "Phase 2",
    priority: "P2",
    iosEquivalent: "AdminDriverCredentialsSettingsView",
    firestore: "users/{userId}.profile",
    tailAdminBase: "Form elements",
  },
  driverLicense: {
    breadcrumb: "Driver license",
    title: "Driver license",
    description: "License class, conditions, and related compliance settings.",
    phase: "Phase 2",
    priority: "P2",
    iosEquivalent: "AdminDriverLicenseSettingsView",
    firestore: "users/{userId}.profile",
    tailAdminBase: "Form elements + multi-select",
  },
  driverAccreditation: {
    breadcrumb: "Driver accreditation",
    title: "Driver accreditation",
    description: "Accreditation and certification settings.",
    phase: "Phase 2",
    priority: "P2",
    iosEquivalent: "AdminDriverAccreditationSettingsView",
    firestore: "users/{userId}.profile",
    tailAdminBase: "Form elements",
  },
  driverServiceFocus: {
    breadcrumb: "Service focus",
    title: "Service focus",
    description: "Service-type preferences and operational focus for the driver.",
    phase: "Phase 2",
    priority: "P3",
    iosEquivalent: "AdminDriverServiceFocusSettingsView",
    firestore: "users/{userId}.profile",
    tailAdminBase: "Form elements",
  },
  driverVehicle: {
    breadcrumb: "Vehicle assignment",
    title: "Vehicle assignment",
    description: "Assign or unassign a fleet vehicle for this chauffeur.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AdminDriverVehicleAssignmentView",
    firestore: "vehicles.assignedChauffeurUserId",
    tailAdminBase: "Basic tables + modals",
  },
  fleet: {
    breadcrumb: "Fleet",
    title: "Fleet management",
    description: "Registered vehicles, pricing tiers, capacity, and chauffeur assignment.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AdminFleetManagementView",
    firestore: "vehicles",
    tailAdminBase: "Basic tables + form elements",
  },
  fleetNew: {
    breadcrumb: "Add vehicle",
    title: "Add fleet vehicle",
    description: "Create a new vehicle row in the fleet registry.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AdminFleetManagementView (create)",
    firestore: "vehicles",
    tailAdminBase: "Form elements",
  },
  fleetEdit: {
    breadcrumb: "Edit vehicle",
    title: "Edit fleet vehicle",
    description: "Update vehicle details, pricing tier, features, and assignment.",
    phase: "Phase 2",
    priority: "P1",
    iosEquivalent: "AdminFleetManagementView (edit)",
    firestore: "vehicles/{vehicleId}",
    tailAdminBase: "Form elements",
  },
  company: {
    breadcrumb: "Company",
    title: "Company hub",
    description:
      "Fleet identity and links to company settings, administration, and future integrations.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminCompanyView",
    firestore: "app_settings (future company profile doc)",
    tailAdminBase: "User profile header + preference list",
  },
  companyDetails: {
    breadcrumb: "Overview",
    title: "Company overview",
    description:
      "Fleet name, dispatch contact, logo URL, address, website, ABN, and ACN — edited via modals on the overview page.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminCompanyDetailsEditView",
    firestore: "app_settings/company (planned)",
    tailAdminBase: "Profile page + modals",
  },
  companyHours: {
    breadcrumb: "Operating hours",
    title: "Operating hours",
    description: "Fleet timezone and weekly availability windows.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminCompanyOperatingHoursView",
    firestore: "app_settings/operating_hours",
    tailAdminBase: "Calendar + form elements",
  },
  companyLocations: {
    breadcrumb: "Locations",
    title: "Fleet locations",
    description: "Garages, standby zones, and frequent pickup points.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminLocationsView",
    firestore: "locations, app_settings/limits",
    tailAdminBase: "Basic tables + form elements",
  },
  locationNew: {
    breadcrumb: "Add location",
    title: "Add location",
    description: "Create a saved fleet location.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminFleetLocationEditorView (create)",
    firestore: "locations",
    tailAdminBase: "Form elements",
  },
  locationEdit: {
    breadcrumb: "Edit location",
    title: "Edit location",
    description: "Update a saved fleet location.",
    phase: "Phase 3",
    priority: "P1",
    iosEquivalent: "AdminFleetLocationEditorView (edit)",
    firestore: "locations/{id}",
    tailAdminBase: "Form elements",
  },
  companyPricing: {
    breadcrumb: "Pricing",
    title: "Pricing configuration",
    description: "Rate rules per vehicle type — natural web-only admin surface.",
    phase: "Phase 3",
    priority: "P2",
    iosEquivalent: "— (Firestore only today)",
    firestore: "app_settings/pricing",
    tailAdminBase: "Form elements",
  },
  companyAdmins: {
    breadcrumb: "User management",
    title: "Administrator accounts",
    description: "Fleet admin roster and role management.",
    phase: "Phase 3",
    priority: "P2",
    iosEquivalent: "AdminUserDirectoryView (admin filter)",
    firestore: "users (role: admin)",
    tailAdminBase: "Basic tables",
  },
  companyLicense: {
    breadcrumb: "License",
    title: "License management",
    description: "Subscription tier and entitlement usage (admins, drivers, locations).",
    phase: "Phase 3",
    priority: "P2",
    iosEquivalent: "AdminLicenseManagementView",
    firestore: "app_settings/limits, users, locations",
    tailAdminBase: "Ecommerce stat cards",
  },
  companyIntegrations: {
    breadcrumb: "Integrations",
    title: "Integrations",
    description: "Future home for payments, SMS, calendar, and partner API connections.",
    phase: "Phase 4",
    priority: "P3",
    iosEquivalent: "AdminCompanyPlaceholderDetailView",
    firestore: "—",
    tailAdminBase: "Blank page",
  },
  companyGuides: {
    breadcrumb: "Dispatch guides",
    title: "Dispatch guides",
    description: "Future SOP and venue playbook library for dispatchers.",
    phase: "Phase 4",
    priority: "P3",
    iosEquivalent: "AdminCompanyPlaceholderDetailView",
    firestore: "—",
    tailAdminBase: "Blank page",
  },
  companyAbout: {
    breadcrumb: "About your fleet",
    title: "About your fleet",
    description: "Public-facing fleet information shown to travelers.",
    phase: "Phase 4",
    priority: "P3",
    iosEquivalent: "AdminCompanyView (about placeholder)",
    firestore: "app_settings/company (planned)",
    tailAdminBase: "Form elements",
  },
  reports: {
    breadcrumb: "Reports",
    title: "Reports",
    description: "Trip volume, utilization, and revenue estimates.",
    phase: "Phase 4",
    priority: "P2",
    iosEquivalent: "AdminDashboardView trip volume section",
    firestore: "trips (aggregated)",
    tailAdminBase: "Line chart + bar chart",
  },
} as const satisfies Record<string, StubConfig>;

export type StubKey = keyof typeof stubs;
