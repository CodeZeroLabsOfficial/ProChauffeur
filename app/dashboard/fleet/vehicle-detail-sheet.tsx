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
  Palette,
  Tags
} from "lucide-react";

import {
  effectiveChauffeurUserId,
  emptyVehicleDetails,
  emptyVehicleSpecifications,
  vehicleDisplayName,
  type Vehicle
} from "@/lib/models";
import { useVehicleClasses } from "@/hooks/use-collections";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { assignmentBadgeIcon, vehicleStatusBadgeIcon } from "@/lib/vehicle-badge-icons";
import { VehicleProfileComplianceTab } from "@/app/dashboard/fleet/components/vehicle-profile-compliance-tab";
import { nullableTrim, saveVehicleFields } from "@/app/dashboard/fleet/lib/save-vehicle-fields";
import { LUXURY_VEHICLE_MAKES, vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import {
  VEHICLE_ENGINE_TYPE_OPTIONS,
  VEHICLE_TRANSMISSION_OPTIONS
} from "@/lib/vehicle-specifications";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableSelectField } from "@/components/inline-editable-select-field";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
  ProfileV2TabTrigger,
  profileV2TabsListClassName
} from "@/components/layout/profile-tab-bar";

const MIN_MANUFACTURE_YEAR = 1980;
const maxManufactureYear = new Date().getFullYear() + 1;

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

  const details = vehicle.details ?? emptyVehicleDetails();
  const specifications = vehicle.specifications ?? emptyVehicleSpecifications();
  const classValue = details.vehicleClassId ?? "";
  const makeValue = vehicleMakeSelectValue(details.make);

  async function saveVehicle(patch: Partial<Vehicle>) {
    return saveVehicleFields(vehicle, patch);
  }

  function patchDetails(partial: Partial<typeof details>) {
    return saveVehicle({ details: { ...details, ...partial } });
  }

  function patchSpecifications(partial: Partial<typeof specifications>) {
    return saveVehicle({ specifications: { ...specifications, ...partial } });
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
                placeholder="Select class"
                onSave={async (next) => patchDetails({ vehicleClassId: next || null })}
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
                value={details.vehicleIdentificationNumber?.trim() ?? ""}
                editLabel="vehicle ID / VIN"
                placeholder="VIN number"
                onSave={async (next) =>
                  patchDetails({ vehicleIdentificationNumber: nullableTrim(next) })
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
                  return patchDetails({ make: next.trim() });
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
                value={details.model?.trim() ?? ""}
                editLabel="model"
                placeholder="Model"
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return { ok: false, message: "Model is required." };
                  }
                  return patchDetails({ model: trimmed });
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
                value={details.manufactureYear != null ? String(details.manufactureYear) : ""}
                editLabel="year"
                placeholder={String(new Date().getFullYear())}
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return patchDetails({ manufactureYear: null });
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
                  return patchDetails({ manufactureYear: year });
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
                value={details.color?.trim() ?? ""}
                editLabel="colour"
                placeholder="Colour"
                onSave={async (next) => patchDetails({ color: next.trim() })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Fuel}>Engine type</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="engineType"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={specifications.engineType?.trim() ?? ""}
                options={VEHICLE_ENGINE_TYPE_OPTIONS}
                editLabel="engine type"
                placeholder="Select engine type"
                onSave={async (next) => patchSpecifications({ engineType: nullableTrim(next) })}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Cog}>Transmission</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="transmission"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={specifications.transmission?.trim() ?? ""}
                options={VEHICLE_TRANSMISSION_OPTIONS}
                editLabel="transmission"
                placeholder="Select transmission"
                onSave={async (next) =>
                  patchSpecifications({ transmission: nullableTrim(next) ?? "" })
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
                View details
              </Link>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="inline-flex items-center gap-4 align-top">
            <VehicleMakeAvatar make={displayVehicle.details?.make} />
            <div className="space-y-2">
              <p className="text-lg font-semibold">{name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <DetailSheetIconBadge icon={assignmentBadgeIcon(assigned)}>
                  {assigned ? "Assigned" : "Unassigned"}
                </DetailSheetIconBadge>
                <DetailSheetIconBadge
                  icon={vehicleStatusBadgeIcon(displayVehicle.isEnabled !== false)}>
                  {displayVehicle.isEnabled === false ? "Disabled" : "Enabled"}
                </DetailSheetIconBadge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList className={`${profileV2TabsListClassName} w-full justify-start`}>
              <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="features">Features</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="compliance">Compliance</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="maintenance">Maintenance</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="operations">Operations</ProfileV2TabTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <VehicleOverviewFields vehicle={displayVehicle} classOptions={classOptions} />
            </TabsContent>
            <TabsContent value="features" className="mt-0">
              <VehicleTabPlaceholder label="Features" />
            </TabsContent>
            <TabsContent value="compliance" className="mt-0">
              <VehicleProfileComplianceTab vehicle={displayVehicle} nested />
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
