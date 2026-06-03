import type { CreateActivityNotificationInput, NotificationAction } from "@/lib/models/notification";

const HREF = {
  drivers: "/dashboard/drivers",
  fleet: "/dashboard/fleet",
  profile: "/dashboard/settings/profile",
  company: "/dashboard/company",
  locations: "/dashboard/company/locations",
  operatingHours: "/dashboard/company/operating-hours",
  locale: "/dashboard/settings/locale",
  pricing: "/dashboard/company/pricing",
  billing: "/dashboard/billing",
  admins: "/dashboard/settings/admins"
} as const;

function actionMessage(entity: string, action: NotificationAction): string {
  switch (action) {
    case "created":
      return `${entity} added`;
    case "updated":
      return `${entity} updated`;
    case "deleted":
      return `${entity} removed`;
  }
}

export function driverNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  return {
    category: "driver",
    action,
    title,
    message: action === "created" ? "Added to chauffeurs" : "Chauffeur profile updated",
    href: HREF.drivers,
    entityId
  };
}

export function vehicleNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  const entity = "Fleet vehicle";
  return {
    category: "vehicle",
    action,
    title,
    message: actionMessage(entity, action),
    href: HREF.fleet,
    entityId
  };
}

export function profileNotification(title: string, entityId?: string): CreateActivityNotificationInput {
  return {
    category: "profile",
    action: "updated",
    title,
    message: "Profile updated",
    href: HREF.profile,
    entityId
  };
}

export function profilePhotoNotification(title: string, entityId?: string): CreateActivityNotificationInput {
  return {
    category: "profile",
    action: "updated",
    title,
    message: "Profile photo updated",
    href: HREF.profile,
    entityId
  };
}

export function companyNotification(title = "Company"): CreateActivityNotificationInput {
  return {
    category: "company",
    action: "updated",
    title,
    message: "Company profile updated",
    href: HREF.company
  };
}

export function locationNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  const entity = "Location";
  return {
    category: "location",
    action,
    title,
    message: actionMessage(entity, action),
    href: HREF.locations,
    entityId
  };
}

export function operatingHoursNotification(): CreateActivityNotificationInput {
  return {
    category: "operating_hours",
    action: "updated",
    title: "Operating hours",
    message: "Operating hours updated",
    href: HREF.operatingHours
  };
}

export function localeNotification(): CreateActivityNotificationInput {
  return {
    category: "locale",
    action: "updated",
    title: "Locale settings",
    message: "Locale settings updated",
    href: HREF.locale
  };
}

export function pricingNotification(): CreateActivityNotificationInput {
  return {
    category: "pricing",
    action: "updated",
    title: "Pricing",
    message: "Pricing updated",
    href: HREF.pricing
  };
}

export function invoiceNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  const entity = "Invoice";
  return {
    category: "invoice",
    action,
    title,
    message: actionMessage(entity, action),
    href: HREF.billing,
    entityId
  };
}

export function adminNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  const entity = "Administrator";
  return {
    category: "admin",
    action,
    title,
    message: actionMessage(entity, action),
    href: HREF.admins,
    entityId
  };
}

export function vehicleDisplayTitle(vehicle: {
  manufactureYear?: number | null;
  make?: string;
  model?: string;
  licensePlate?: string;
}): string {
  const parts = [
    vehicle.manufactureYear ? String(vehicle.manufactureYear) : "",
    vehicle.make,
    vehicle.model
  ].filter(Boolean);
  const label = parts.join(" ").trim();
  if (label) return label;
  return vehicle.licensePlate?.trim() || "Fleet vehicle";
}
