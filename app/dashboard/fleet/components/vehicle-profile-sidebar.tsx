"use client";

import Link from "next/link";
import { Hash, PencilIcon, RectangleHorizontal, Users } from "lucide-react";

import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
  vehicleTypeTitle,
  type User,
  type Vehicle
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { assignmentBadgeIcon, vehicleTierBadgeIcon } from "@/lib/vehicle-badge-icons";
import { vehicleProfileCompleteness } from "@/app/dashboard/fleet/lib/vehicle-profile-metrics";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function DetailRow({
  icon: Icon,
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      {children}
    </div>
  );
}

export function VehicleProfileSidebar({
  vehicle,
  assignedChauffeur,
  statTrips,
  statCompleted,
  statRevenueLabel,
  onEditClick
}: {
  vehicle: Vehicle;
  assignedChauffeur: User | undefined;
  statTrips: number;
  statCompleted: number;
  statRevenueLabel: string;
  onEditClick?: () => void;
}) {
  const displayName = vehicleDisplayName(vehicle) || "Vehicle";
  const assigned = Boolean(effectiveChauffeurUserId(vehicle));
  const progressValue = vehicleProfileCompleteness(vehicle);
  const tier = vehicle.pricingVehicleType;

  return (
    <div className="space-y-4">
      <Card className="relative">
        {onEditClick ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={onEditClick}
            aria-label="Edit vehicle">
            <PencilIcon />
          </Button>
        ) : null}
        <CardContent>
          <div className="space-y-12">
            <div className="flex flex-col items-center space-y-4">
              <VehicleMakeAvatar make={vehicle.make} className="size-20" />
              <div className="text-center">
                <h5 className="text-xl font-semibold">{displayName}</h5>
                {vehicle.manufactureYear ? (
                  <div className="text-muted-foreground text-sm">{vehicle.manufactureYear}</div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {tier ? (
                    <DetailSheetIconBadge icon={vehicleTierBadgeIcon}>
                      {vehicleTypeTitle[tier]}
                    </DetailSheetIconBadge>
                  ) : null}
                  <DetailSheetIconBadge icon={assignmentBadgeIcon(assigned)}>
                    {assigned ? "Assigned" : "Unassigned"}
                  </DetailSheetIconBadge>
                </div>
              </div>
            </div>

            <div className="bg-muted grid grid-cols-3 divide-x rounded-md border text-center *:py-3">
              <div>
                <h5 className="text-lg font-semibold">{statTrips}</h5>
                <div className="text-muted-foreground text-sm">Trips</div>
              </div>
              <div>
                <h5 className="text-lg font-semibold">{statCompleted}</h5>
                <div className="text-muted-foreground text-sm">Completed</div>
              </div>
              <div>
                <h5 className="text-lg font-semibold tabular-nums">{statRevenueLabel}</h5>
                <div className="text-muted-foreground text-sm">Revenue</div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              {vehicle.licensePlate?.trim() ? (
                <DetailRow icon={RectangleHorizontal}>
                  <span>{vehicle.licensePlate}</span>
                </DetailRow>
              ) : null}
              {vehicle.vehicleIdentificationNumber?.trim() ? (
                <DetailRow icon={Hash}>
                  <span className="text-muted-foreground">{vehicle.vehicleIdentificationNumber}</span>
                </DetailRow>
              ) : null}
              {vehicle.passengerCapacity > 0 ? (
                <DetailRow icon={Users}>
                  <span>{vehicle.passengerCapacity} passengers</span>
                </DetailRow>
              ) : null}
              {assignedChauffeur ? (
                <DetailRow icon={Users}>
                  <Link
                    href={`/dashboard/drivers/${assignedChauffeur.id}`}
                    className="hover:text-primary hover:underline">
                    {assignedChauffeur.profile.displayName.trim() ||
                      assignedChauffeur.email ||
                      "Chauffeur"}
                  </Link>
                </DetailRow>
              ) : null}
              {vehicle.registrationExpiry ? (
                <DetailRow icon={RectangleHorizontal}>
                  <span className="text-muted-foreground">
                    Rego expires {formatDate(vehicle.registrationExpiry)}
                  </span>
                </DetailRow>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complete profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Progress value={progressValue} className="flex-1" />
          <div className="text-muted-foreground text-sm">%{progressValue}</div>
        </CardContent>
      </Card>
    </div>
  );
}
