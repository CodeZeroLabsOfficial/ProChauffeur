import { CarIcon, UserCheckIcon, UserRoundXIcon, type LucideIcon } from "lucide-react";

export function assignmentBadgeIcon(assigned: boolean): LucideIcon {
  return assigned ? UserCheckIcon : UserRoundXIcon;
}

export const vehicleTierBadgeIcon: LucideIcon = CarIcon;
