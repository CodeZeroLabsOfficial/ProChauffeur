"use client";

import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
  type Vehicle
} from "@/lib/models";
import { assignmentBadgeIcon, vehicleTierBadgeIcon } from "@/lib/vehicle-badge-icons";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";

export function VehicleDetailCard({
  vehicle,
  vehicleClassLabel,
  onEditClick
}: {
  vehicle: Vehicle;
  vehicleClassLabel?: string | null;
  onEditClick: () => void;
}) {
  const displayName = vehicleDisplayName(vehicle) || "Vehicle";
  const assigned = Boolean(effectiveChauffeurUserId(vehicle));
  const classLabel = vehicleClassLabel ?? vehicle.vehicleClassId;

  return (
    <ProfileHeroCard
      bannerImageUrl="/images/vehicle-header-car.png"
      backHref="/dashboard/fleet"
      backAriaLabel="Back to fleet"
      onEditClick={onEditClick}
      editAriaLabel="Edit vehicle"
      avatar={
        <VehicleMakeAvatar make={vehicle.make} className="size-full rounded-none [&_[data-slot=avatar-fallback]]:rounded-none" />
      }
      title={displayName}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          {classLabel ? (
            <DetailSheetIconBadge icon={vehicleTierBadgeIcon}>{classLabel}</DetailSheetIconBadge>
          ) : null}
          <DetailSheetIconBadge icon={assignmentBadgeIcon(assigned)}>
            {assigned ? "Assigned" : "Unassigned"}
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
