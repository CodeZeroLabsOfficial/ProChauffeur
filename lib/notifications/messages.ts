import type {
  CreateActivityNotificationInput,
  NotificationAction
} from "@/lib/models/notification";

const HREF = {
  customers: "/dashboard/customers",
  drivers: "/dashboard/drivers",
  fleet: "/dashboard/fleet",
  profile: "/dashboard/settings/profile",
  company: "/dashboard/settings/company",
  locations: "/dashboard/locations",
  billing: "/dashboard/billing",
  team: "/dashboard/settings/team"
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

export function customerNotification(
  action: NotificationAction,
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  return {
    category: "customer",
    action,
    title,
    message: action === "created" ? "Customer account added" : "Customer profile updated",
    href: HREF.customers,
    entityId
  };
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

export function profileNotification(
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
  return {
    category: "profile",
    action: "updated",
    title,
    message: "Profile updated",
    href: HREF.profile,
    entityId
  };
}

export function profilePhotoNotification(
  title: string,
  entityId?: string
): CreateActivityNotificationInput {
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
  const entity = "Office";
  return {
    category: "location",
    action,
    title,
    message: actionMessage(entity, action),
    href: HREF.locations,
    entityId
  };
}

function locationSettingNotification(
  category: CreateActivityNotificationInput["category"],
  branchId: string,
  locationName: string,
  message: string,
  tab: string
): CreateActivityNotificationInput {
  const name = locationName.trim() || branchId;
  return {
    category,
    action: "updated",
    title: name,
    message,
    href: `${HREF.locations}/${branchId}?tab=${tab}`,
    entityId: branchId
  };
}

export function operatingHoursNotification(
  branchId: string,
  locationName: string
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "operating_hours",
    branchId,
    locationName,
    "Hours updated",
    "hours"
  );
}

export function localeNotification(
  branchId: string,
  locationName: string
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "locale",
    branchId,
    locationName,
    "Locale updated",
    "locale"
  );
}

export function pricingNotification(
  branchId: string,
  locationName: string
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "pricing",
    branchId,
    locationName,
    "Pricing updated",
    "pricing"
  );
}

export function featuresNotification(
  branchId: string,
  locationName: string
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "location",
    branchId,
    locationName,
    "Features updated",
    "features"
  );
}

export function serviceAreaNotification(
  branchId: string,
  locationName: string
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "location",
    branchId,
    locationName,
    "Service area updated",
    "service-area"
  );
}

export function vehicleClassesNotification(
  branchId: string,
  locationName: string,
  message = "Vehicle classes updated"
): CreateActivityNotificationInput {
  return locationSettingNotification(
    "location",
    branchId,
    locationName,
    message,
    "classes"
  );
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
    href: HREF.team,
    entityId
  };
}

export function vehicleDisplayTitle(vehicle: {
  details?: {
    manufactureYear?: number | null;
    make?: string;
    model?: string;
  } | null;
  registration?: { registrationNumber?: string } | null;
}): string {
  const parts = [
    vehicle.details?.manufactureYear ? String(vehicle.details.manufactureYear) : "",
    vehicle.details?.make,
    vehicle.details?.model
  ].filter(Boolean);
  const label = parts.join(" ").trim();
  if (label) return label;
  return vehicle.registration?.registrationNumber?.trim() || "Fleet vehicle";
}
