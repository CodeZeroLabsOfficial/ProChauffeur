import {
  CarIcon,
  CircleCheckIcon,
  CircleOffIcon,
  UserCheckIcon,
  UserRoundXIcon,
  type LucideIcon
} from "lucide-react";

export function assignmentBadgeIcon(assigned: boolean): LucideIcon {
  return assigned ? UserCheckIcon : UserRoundXIcon;
}

export const vehicleTierBadgeIcon: LucideIcon = CarIcon;

export function vehicleStatusBadgeIcon(enabled: boolean): LucideIcon {
  return enabled ? CircleCheckIcon : CircleOffIcon;
}
