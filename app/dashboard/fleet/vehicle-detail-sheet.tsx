"use client";

import { useState } from "react";
import {
  Calendar,
  Car,
  CarFront,
  Cog,
  Edit,
  Fuel,
  Hash,
  Landmark,
  Palette,
  RectangleHorizontal,
  Tags
} from "lucide-react";

import {
  effectiveChauffeurUserId,
  VEHICLE_TYPES,
  vehicleDisplayName,
  vehicleTypeTitle,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import { upsertVehicle } from "@/lib/services/firebase-service";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { assignmentBadgeIcon } from "@/lib/vehicle-badge-icons";
import {
  LUXURY_VEHICLE_MAKES,
  vehicleMakeSelectValue
} from "@/lib/vehicle-makes";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableSelectField } from "@/components/inline-editable-select-field";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { Button } from "@/components/ui/button";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
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

const TIER_OPTIONS = VEHICLE_TYPES.map((type) => ({
  value: type,
  label: vehicleTypeTitle[type]
}));

const MAKE_OPTIONS = LUXURY_VEHICLE_MAKES.map((entry) => ({
  value: entry.label,
  label: entry.label
}));

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function VehicleOverviewFields({ vehicle }: { vehicle: Vehicle }) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const tierValue = vehicle.pricingVehicleType ?? "sedan";
  const makeValue = vehicleMakeSelectValue(vehicle.make);
  const regoExpiryWarn = expiryWarning(vehicle.registrationExpiry);

  async function saveVehicle(
    patch: Partial<Vehicle>
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await upsertVehicle({ ...vehicle, ...patch });
      return { ok: true };
    } catch {
      return { ok: false, message: "Could not save." };
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Vehicle details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={Tags}>Vehicle tier</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="tier"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={tierValue}
                options={TIER_OPTIONS}
                editLabel="vehicle tier"
                onSave={async (next) => saveVehicle({ pricingVehicleType: next as VehicleType })}
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
                placeholder="VIN or fleet ID"
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
        <SectionHeading>Registration details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={Landmark}>Rego state</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="regoState"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.registrationJurisdictionCode?.trim() ?? ""}
                editLabel="rego state"
                placeholder="NSW"
                onSave={async (next) =>
                  saveVehicle({ registrationJurisdictionCode: nullableTrim(next) })
                }
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={RectangleHorizontal}>Plate</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="plate"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.licensePlate?.trim() ?? ""}
                editLabel="plate"
                placeholder="Plate number"
                onSave={async (next) => saveVehicle({ licensePlate: next.trim() })}
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={Calendar}>Rego expiry</DetailLabel>
            <dd>
              <InlineEditableDateField
                fieldId="regoExpiry"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={vehicle.registrationExpiry}
                editLabel="rego expiry"
                dateRange="expiry"
                trailingContent={
                  regoExpiryWarn ? <ExpiryBadge level={regoExpiryWarn} /> : null
                }
                onSave={async (next) => saveVehicle({ registrationExpiry: next })}
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
  onEditClick
}: {
  vehicle: Vehicle | null;
  chauffeurName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick?: () => void;
}) {
  const displayVehicle = useSheetDisplayItem(vehicle, open);
  if (!displayVehicle) return null;

  const name = vehicleDisplayName(displayVehicle) || "Vehicle";
  const assigned = Boolean(effectiveChauffeurUserId(displayVehicle));

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
              <VehicleOverviewFields vehicle={displayVehicle} />
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
