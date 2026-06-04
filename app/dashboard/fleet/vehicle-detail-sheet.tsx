"use client";

import { Edit } from "lucide-react";

import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
  vehicleTypeTitle,
  type Vehicle
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { vehicleMakeLabel } from "@/lib/vehicle-makes";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

function DetailField({
  label,
  value
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const text =
    value === null || value === undefined || (typeof value === "string" && !value.trim())
      ? "—"
      : String(value);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

export function VehicleDetailSheet({
  vehicle,
  chauffeurName,
  open,
  onOpenChange,
  onEditClick
}: {
  vehicle: Vehicle | null;
  chauffeurName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
}) {
  if (!vehicle) return null;

  const name = vehicleDisplayName(vehicle) || "Vehicle";
  const assigned = Boolean(effectiveChauffeurUserId(vehicle));
  const tierLabel = vehicle.pricingVehicleType
    ? vehicleTypeTitle[vehicle.pricingVehicleType]
    : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between pe-6">
            <SheetTitle>Vehicle details</SheetTitle>
            {onEditClick && (
              <Button variant="outline" onClick={onEditClick}>
                <Edit />
                Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="inline-flex items-center gap-4 align-top">
            <VehicleMakeAvatar make={vehicle.make} />
            <div className="space-y-2">
              <p className="text-lg font-semibold">{name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={assigned ? "default" : "secondary"}>
                  {assigned ? "Assigned" : "Unassigned"}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Vehicle class / tier" value={tierLabel} />
              <DetailField
                label="Vehicle ID / VIN"
                value={vehicle.vehicleIdentificationNumber}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Make" value={vehicleMakeLabel(vehicle.make)} />
              <DetailField label="Model" value={vehicle.model} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Year" value={vehicle.manufactureYear} />
              <DetailField label="Colour" value={vehicle.color} />
            </div>
            <DetailField label="Engine type" value={vehicle.engineTypeDescription} />
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Rego state" value={vehicle.registrationJurisdictionCode} />
              <DetailField label="License plate" value={vehicle.licensePlate} />
            </div>
            <DetailField label="Rego expiry" value={formatDate(vehicle.registrationExpiry)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
