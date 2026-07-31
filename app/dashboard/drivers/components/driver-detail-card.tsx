"use client";

import type { BranchDriver, User } from "@/lib/models";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import {
  dispatchBadgeIcon,
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { generateAvatarFallback } from "@/lib/utils";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";

export function DriverDetailCard({
  user,
  roster,
  onEditClick
}: {
  user: User;
  roster: BranchDriver;
  onEditClick: () => void;
}) {
  const profile = branchDriverToProfile(roster);
  const displayName = user.profile.displayName.trim() || user.email || "Driver";

  return (
    <ProfileHeroCard
      backHref="/dashboard/drivers"
      backAriaLabel="Back to drivers"
      onEditClick={onEditClick}
      editAriaLabel="Edit driver"
      avatar={
        <Avatar className="size-full rounded-none">
          <AvatarImage src={user.profile.photoURL ?? undefined} alt={displayName} />
          <AvatarFallback className="rounded-none">{generateAvatarFallback(displayName)}</AvatarFallback>
        </Avatar>
      }
      title={displayName}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <DetailSheetIconBadge icon={visibilityBadgeIcon(profile.visibility.visibleOnCustomerApp)}>
            {visibilityStatusLabel(profile.visibility.visibleOnCustomerApp)}
          </DetailSheetIconBadge>
          <DetailSheetIconBadge icon={dispatchBadgeIcon(profile.visibility.acceptsDispatchAssignments)}>
            {profile.visibility.acceptsDispatchAssignments ? "Accepting dispatch" : "Dispatch paused"}
          </DetailSheetIconBadge>
        </div>
      }
      tabs={
        <>
          <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="trips">Trips</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="financials">Financials</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="compliance">Compliance</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="operations">Operations</ProfileV2TabTrigger>
        </>
      }
    />
  );
}
