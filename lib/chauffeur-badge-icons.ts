import {
  CircleDotIcon,
  EyeIcon,
  EyeOffIcon,
  HeadsetIcon,
  PauseIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  ZapIcon,
  type LucideIcon
} from "lucide-react";

import type { ChauffeurCategory } from "@/lib/models";

export const chauffeurCategoryBadgeIcon: Record<ChauffeurCategory, LucideIcon> = {
  leadChauffeur: StarIcon,
  chauffeur: UserIcon,
  fleetConcierge: SparklesIcon,
  dispatcher: HeadsetIcon,
  other: CircleDotIcon
};

export function dispatchBadgeIcon(accepting: boolean): LucideIcon {
  return accepting ? ZapIcon : PauseIcon;
}

export function visibilityBadgeIcon(active: boolean): LucideIcon {
  return active ? EyeIcon : EyeOffIcon;
}

export function visibilityStatusLabel(active: boolean): "Active" | "Inactive" {
  return active ? "Active" : "Inactive";
}
