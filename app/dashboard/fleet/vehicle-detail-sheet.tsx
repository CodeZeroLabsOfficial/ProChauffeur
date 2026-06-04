"use client";

import { Edit, Car, Luggage, Users } from "lucide-react";

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

function VehicleFeatureBlock({
  value,
  label,
  icon: Icon
}: {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1 rounded-md border p-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground inline-flex items-center justify-center gap-1">
        <Icon className="size-4" />
        {label}
      </p>
    </div>
  );
}

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
  const totalBags = vehicle.fleetSmallLuggageCount + vehicle.fleetLargeLuggageCount;

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

          <div className="grid grid-cols-3 gap-3 text-sm">
            <VehicleFeatureBlock value={tierLabel} label="tier" icon={Car} />
            <VehicleFeatureBlock
              value={vehicle.passengerCapacity}
              label="capacity"
              icon={Users}
            />
            <VehicleFeatureBlock value={totalBags} label="bags" icon={Luggage} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Make" value={vehicleMakeLabel(vehicle.make)} />
            <DetailField label="Model" value={vehicle.model} />
            <DetailField label="Colour" value={vehicle.color} />
            <DetailField label="Plate" value={vehicle.licensePlate} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Year" value={vehicle.manufactureYear} />
            <DetailField label="Rego state" value={vehicle.registrationJurisdictionCode} />
            <DetailField label="Rego expiry" value={formatDate(vehicle.registrationExpiry)} />
            <DetailField label="Luggage" value={vehicle.luggageDescription.trim() || "—"} />
          </div>

          <DetailField label="Assigned chauffeur" value={chauffeurName} />
        </div>

        {(vehicle.wifiServiceDescription ||
          vehicle.serviceClassDescription ||
          vehicle.interiorDescription ||
          vehicle.climateControlDescription ||
          vehicle.gearTypeDescription) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4 p-4">
              <DetailField label="Wi-Fi" value={vehicle.wifiServiceDescription} />
              <DetailField label="Service class" value={vehicle.serviceClassDescription} />
              <DetailField label="Interior" value={vehicle.interiorDescription} />
              <DetailField label="Climate control" value={vehicle.climateControlDescription} />
              <DetailField label="Transmission" value={vehicle.gearTypeDescription} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
