"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  Car,
  CarFront,
  Cog,
  ExternalLink,
  Fuel,
  Hash,
  Luggage,
  Palette,
  Tags,
  Users
} from "lucide-react";

import {
  effectiveChauffeurUserId,
  luggageSpecificationLabel,
  vehicleDisplayName,
  type Vehicle
} from "@/lib/models";
import { useVehicleClasses } from "@/hooks/use-collections";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { assignmentBadgeIcon } from "@/lib/vehicle-badge-icons";
import { VehicleComplianceFields } from "@/app/dashboard/fleet/components/vehicle-compliance-fields";
import {
  nullableTrim,
  saveVehicleFields
} from "@/app/dashboard/fleet/lib/save-vehicle-fields";
import {
  LUXURY_VEHICLE_MAKES,
  vehicleMakeSelectValue
} from "@/lib/vehicle-makes";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableSelectField } from "@/components/inline-editable-select-field";
import { InlineEditableStepperField } from "@/components/inline-editable-stepper-field";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

const MIN_MANUFACTURE_YEAR = 1980;
const maxManufactureYear = new Date().getFullYear() + 1;
const MIN_PASSENGER_CAPACITY = 1;
const MAX_PASSENGER_CAPACITY = 20;
const MIN_LUGGAGE_COUNT = 0;
const MAX_LUGGAGE_COUNT = 12;

const MAKE_OPTIONS = LUXURY_VEHICLE_MAKES.map((entry) => ({
  value: entry.label,
  label: entry.label
}));

function VehicleOverviewFields({
  vehicle,
  classOptions
}: {
  vehicle: Vehicle;
  classOptions: { value: string; label: string }[];
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const classValue = vehicle.vehicleClassId ?? classOptions[0]?.value ?? "";
  const makeValue = vehicleMakeSelectValue(vehicle.make);

  async function saveVehicle(patch: Partial<Vehicle>) {
    return saveVehicleFields(vehicle, patch);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Vehicle details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={Tags}>Service class</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="vehicleClass"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={classValue}
                options={classOptions}
                editLabel="service class"
                onSave={async (next) => saveVehicle({ vehicleClassId: next })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Hash}>Vehicle ID / VIN</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="vin"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.vehicleIdentificationNumber?.trim() ?? ""}
                editLabel="vehicle ID / VIN"
                placeholder="VIN number"
                onSave={async (next) =>
                  saveVehicle({ vehicleIdentificationNumber: nullableTrim(next) })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Car}>Make</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="make"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={makeValue}
                options={MAKE_OPTIONS}
                editLabel="make"
                placeholder="Select make"
                onSave={async (next) => {
                  if (!next.trim()) {
                    return { ok: false, message: "Make is required." };
                  }
                  return saveVehicle({ make: next.trim() });
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={CarFront}>Model</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="model"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.model?.trim() ?? ""}
                editLabel="model"
                placeholder="Model"
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return { ok: false, message: "Model is required." };
                  }
                  return saveVehicle({ model: trimmed });
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Calendar}>Year</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="year"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={
                  vehicle.manufactureYear != null ? String(vehicle.manufactureYear) : ""
                }
                editLabel="year"
                placeholder={String(new Date().getFullYear())}
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return saveVehicle({ manufactureYear: null });
                  }
                  const year = Number.parseInt(trimmed, 10);
                  if (
                    !Number.isFinite(year) ||
                    year < MIN_MANUFACTURE_YEAR ||
                    year > maxManufactureYear
                  ) {
                    return {
                      ok: false,
                      message: `Enter a year between ${MIN_MANUFACTURE_YEAR} and ${maxManufactureYear}.`
                    };
                  }
                  return saveVehicle({ manufactureYear: year });
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Palette}>Colour</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="color"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.color?.trim() ?? ""}
                editLabel="colour"
                placeholder="Colour"
                onSave={async (next) => saveVehicle({ color: next.trim() })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Fuel}>Engine type</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="engineType"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.engineTypeDescription?.trim() ?? ""}
                editLabel="engine type"
                placeholder="Petrol, Diesel, Electric…"
                onSave={async (next) =>
                  saveVehicle({ engineTypeDescription: nullableTrim(next) })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Cog}>Transmission</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="transmission"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.gearTypeDescription?.trim() ?? ""}
                editLabel="transmission"
                placeholder="Automatic"
                onSave={async (next) =>
                  saveVehicle({ gearTypeDescription: nullableTrim(next) ?? "" })
                }
              />
            </dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <SectionHeading>Vehicle capacity</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={Users}>Capacity</DetailLabel>
            <dd>
              <InlineEditableStepperField
                fieldId="capacity"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.passengerCapacity}
                min={MIN_PASSENGER_CAPACITY}
                max={MAX_PASSENGER_CAPACITY}
                editLabel="capacity"
                onSave={async (next) => saveVehicle({ passengerCapacity: next })}
              />
            </dd>
          </div>
          <div aria-hidden="true" />
          <div className="space-y-1">
            <DetailLabel icon={Luggage}>Small bags</DetailLabel>
            <dd>
              <InlineEditableStepperField
                fieldId="smallBags"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.smallLuggageCount}
                min={MIN_LUGGAGE_COUNT}
                max={MAX_LUGGAGE_COUNT}
                editLabel="small bags"
                onSave={async (small) =>
                  saveVehicle({
                    smallLuggageCount: small,
                    luggageDescription: luggageSpecificationLabel(small, vehicle.largeLuggageCount)
                  })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Luggage}>Large bags</DetailLabel>
            <dd>
              <InlineEditableStepperField
                fieldId="largeBags"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.largeLuggageCount}
                min={MIN_LUGGAGE_COUNT}
                max={MAX_LUGGAGE_COUNT}
                editLabel="large bags"
                onSave={async (large) =>
                  saveVehicle({
                    largeLuggageCount: large,
                    luggageDescription: luggageSpecificationLabel(vehicle.smallLuggageCount, large)
                  })
                }
              />
            </dd>
          </div>
        </dl>
      </div>
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
  open,
  onOpenChange,
  modal = true
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modal?: boolean;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const displayVehicle = useSheetDisplayItem(vehicle, open);

  const classOptions = vehicleClasses.map((vehicleClass) => ({
    value: vehicleClass.id,
    label: vehicleClass.displayName
  }));

  if (!displayVehicle) return null;

  const name = vehicleDisplayName(displayVehicle) || "Vehicle";
  const assigned = Boolean(effectiveChauffeurUserId(displayVehicle));

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <SheetTitle>Vehicle details</SheetTitle>
            <Button variant="outline" asChild>
              <Link
                href={`/dashboard/fleet/${displayVehicle.driverID}`}
                onClick={() => onOpenChange(false)}>
                <ExternalLink />
                View profile
              </Link>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="inline-flex items-center gap-4 align-top">
            <VehicleMakeAvatar make={displayVehicle.make} />
            <div className="space-y-2">
              <p className="text-lg font-semibold">{name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <DetailSheetIconBadge icon={assignmentBadgeIcon(assigned)}>
                  {assigned ? "Assigned" : "Unassigned"}
                </DetailSheetIconBadge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 border-none bg-transparent p-0"
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
              <VehicleOverviewFields vehicle={displayVehicle} classOptions={classOptions} />
            </TabsContent>
            <TabsContent value="features" className="mt-0">
              <VehicleTabPlaceholder label="Features" />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <VehicleComplianceFields vehicle={displayVehicle} />
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
