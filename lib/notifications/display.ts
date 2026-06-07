import type { LucideIcon } from "lucide-react";
import {
  Building2Icon,
  CarIcon,
  ClockIcon,
  ContactIcon,
  DollarSignIcon,
  FileTextIcon,
  GlobeIcon,
  MapPinIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon
} from "lucide-react";

import type { NotificationCategory } from "@/lib/models/notification";

export function notificationCategoryIcon(category: NotificationCategory): LucideIcon {
  switch (category) {
    case "customer":
      return ContactIcon;
    case "driver":
      return UsersIcon;
    case "vehicle":
      return CarIcon;
    case "profile":
      return UserIcon;
    case "company":
      return Building2Icon;
    case "location":
      return MapPinIcon;
    case "operating_hours":
      return ClockIcon;
    case "locale":
      return GlobeIcon;
    case "pricing":
      return DollarSignIcon;
    case "invoice":
      return FileTextIcon;
    case "admin":
      return ShieldIcon;
  }
}

export function notificationCategoryLabel(category: NotificationCategory): string {
  switch (category) {
    case "customer":
      return "Customer";
    case "driver":
      return "Driver";
    case "vehicle":
      return "Fleet";
    case "profile":
      return "Profile";
    case "company":
      return "Company";
    case "location":
      return "Location";
    case "operating_hours":
      return "Operating hours";
    case "locale":
      return "Locale";
    case "pricing":
      return "Pricing";
    case "invoice":
      return "Invoice";
    case "admin":
      return "Administrator";
  }
}
