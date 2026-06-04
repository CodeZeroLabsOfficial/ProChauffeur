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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

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

function VehicleOverviewFields({
  vehicle,
  tierLabel
}: {
  vehicle: Vehicle;
  tierLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Vehicle tier" value={tierLabel} />
        <DetailField label="Vehicle ID / VIN" value={vehicle.vehicleIdentificationNumber} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Make" value={vehicleMakeLabel(vehicle.make)} />
        <DetailField label="Model" value={vehicle.model} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Year" value={vehicle.manufactureYear} />
        <DetailField label="Colour" value={vehicle.color} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Engine type" value={vehicle.engineTypeDescription} />
        <DetailField label="Transmission" value={vehicle.gearTypeDescription} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Rego state" value={vehicle.registrationJurisdictionCode} />
        <DetailField label="License plate" value={vehicle.licensePlate} />
      </div>
      <DetailField label="Rego expiry" value={formatDate(vehicle.registrationExpiry)} />
    </div>
  );
}

function VehicleTabPlaceholder({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-sm">
      No {label.toLowerCase()} information yet.
    </p>
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

        <div className="space-y-4 px-4">
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

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 overflow-x-auto border-none bg-transparent p-0"
              )}>
              <TabsTrigger value="overview" className={tabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="features" className={tabTriggerClassName}>
                Features
              </TabsTrigger>
              <TabsTrigger value="compliance" className={tabTriggerClassName}>
                Compliance
              </TabsTrigger>
              <TabsTrigger value="maintenance" className={tabTriggerClassName}>
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="operations" className={tabTriggerClassName}>
                Operations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <VehicleOverviewFields vehicle={vehicle} tierLabel={tierLabel} />
            </TabsContent>
            <TabsContent value="features" className="mt-0">
              <VehicleTabPlaceholder label="Features" />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <VehicleTabPlaceholder label="Compliance" />
            </TabsContent>
            <TabsContent value="maintenance" className="mt-0">
              <VehicleTabPlaceholder label="Maintenance" />
            </TabsContent>
            <TabsContent value="operations" className="mt-0">
              <VehicleTabPlaceholder label="Operations" />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
