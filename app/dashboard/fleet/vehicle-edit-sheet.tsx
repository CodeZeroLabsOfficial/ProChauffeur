"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useRosterChauffeurs, useVehicleClasses, useVehicles } from "@/hooks/use-collections";
import {
  effectiveChauffeurUserId,
  emptyVehicleDetails,
  emptyVehicleSpecifications,
  type Vehicle
} from "@/lib/models";
import {
  assignFleetVehicle,
  unassignFleetVehicle,
  upsertVehicle
} from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";
import { vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import {
  VEHICLE_ENGINE_TYPES,
  VEHICLE_TRANSMISSIONS
} from "@/lib/vehicle-specifications";
import { NumberStepper } from "@/components/number-stepper";
import { VehicleMakeSelect } from "@/components/vehicle-make-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const UNASSIGNED = "__unassigned__";
const NONE = "__none__";
const MIN_MANUFACTURE_YEAR = 2020;
const maxManufactureYear = new Date().getFullYear() + 1;

const EMPTY_VEHICLE = (driverID: string): Vehicle => ({
  driverID,
  assignedChauffeurUserId: driverID,
  isEnabled: true,
  details: emptyVehicleDetails(),
  specifications: emptyVehicleSpecifications(),
  registration: null,
  insurancePolicies: [],
  roadworthy: null
});

function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-medium">{children}</h4>;
}

export function VehicleEditSheet({
  vehicle,
  defaultCreateDriverId,
  open,
  onOpenChange,
  nested = false
}: {
  vehicle: Vehicle | null;
  defaultCreateDriverId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !vehicle;
  const { vehicleClasses } = useVehicleClasses();
  const { chauffeurs } = useRosterChauffeurs();
  const { vehicles } = useVehicles();
  const initialChauffeurId = vehicle
    ? (effectiveChauffeurUserId(vehicle) ?? UNASSIGNED)
    : (defaultCreateDriverId ?? UNASSIGNED);
  const [vehicleClassId, setVehicleClassId] = useState(vehicle?.details?.vehicleClassId ?? "");
  const [make, setMake] = useState(() => vehicleMakeSelectValue(vehicle?.details?.make));
  const [manufactureYear, setManufactureYear] = useState(
    vehicle?.details?.manufactureYear ?? new Date().getFullYear()
  );
  const [transmission, setTransmission] = useState(
    () => vehicle?.specifications?.transmission?.trim() || NONE
  );
  const [engineType, setEngineType] = useState(
    () => vehicle?.specifications?.engineType?.trim() || NONE
  );
  const [assignedChauffeurId, setAssignedChauffeurId] = useState(initialChauffeurId);
  const [status, setStatus] = useState(vehicle?.isEnabled === false ? "disabled" : "enabled");
  const [saving, setSaving] = useState(false);
  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = vehicle?.driverID ?? defaultCreateDriverId ?? "__new__";

  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setVehicleClassId(vehicle?.details?.vehicleClassId ?? "");
    setMake(vehicleMakeSelectValue(vehicle?.details?.make));
    setManufactureYear(vehicle?.details?.manufactureYear ?? new Date().getFullYear());
    setTransmission(vehicle?.specifications?.transmission?.trim() || NONE);
    setEngineType(vehicle?.specifications?.engineType?.trim() || NONE);
    setAssignedChauffeurId(
      vehicle
        ? (effectiveChauffeurUserId(vehicle) ?? UNASSIGNED)
        : (defaultCreateDriverId ?? UNASSIGNED)
    );
    setStatus(vehicle?.isEnabled === false ? "disabled" : "enabled");
  }

  const chauffeurOptions = isNew
    ? chauffeurs.filter(
        (chauffeur) =>
          chauffeur.user.id === defaultCreateDriverId ||
          !vehicles.some((item) => effectiveChauffeurUserId(item) === chauffeur.user.id)
      )
    : chauffeurs;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const driverID = vehicle?.driverID ?? defaultCreateDriverId ?? "";
    if (!driverID) {
      toast.error("No chauffeur is available to create this vehicle record.");
      return;
    }
    if (!make) {
      toast.error("Select a vehicle make.");
      return;
    }
    if (!vehicleClassId) {
      toast.error("Select a service class.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const base = vehicle ?? EMPTY_VEHICLE(driverID);
    const next: Vehicle = {
      ...base,
      driverID,
      assignedChauffeurUserId:
        isNew && assignedChauffeurId !== UNASSIGNED
          ? assignedChauffeurId
          : base.assignedChauffeurUserId,
      isEnabled: status === "enabled",
      details: {
        ...(base.details ?? emptyVehicleDetails()),
        vehicleClassId,
        manufactureYear,
        make,
        model: get("model"),
        color: get("color")
      },
      specifications: {
        ...(base.specifications ?? emptyVehicleSpecifications()),
        transmission: transmission === NONE ? "" : transmission,
        engineType: engineType === NONE ? null : engineType
      }
    };

    setSaving(true);
    try {
      await upsertVehicle(next);
      if (!isNew && assignedChauffeurId !== initialChauffeurId) {
        if (assignedChauffeurId === UNASSIGNED) {
          await unassignFleetVehicle(driverID);
        } else {
          await assignFleetVehicle(vehicles, driverID, assignedChauffeurId);
        }
      } else if (isNew && assignedChauffeurId === UNASSIGNED) {
        await unassignFleetVehicle(driverID);
      }
      toast.success(isNew ? "Vehicle added." : "Vehicle updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the vehicle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={isNew}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add vehicle" : "Edit vehicle"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-6 px-4" key={currentKey}>
          <div className="space-y-4">
            <SectionHeading>Vehicle details</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Service class</Label>
                <Select value={vehicleClassId || undefined} onValueChange={setVehicleClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                    {vehicleClasses.map((vehicleClass) => (
                      <SelectItem key={vehicleClass.id} value={vehicleClass.id}>
                        {vehicleClass.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumberStepper
                id="manufactureYear"
                label="Year"
                value={manufactureYear}
                onChange={setManufactureYear}
                min={MIN_MANUFACTURE_YEAR}
                max={maxManufactureYear}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Make</Label>
                <VehicleMakeSelect
                  value={make || null}
                  onChange={setMake}
                  disabled={saving}
                  nested={nested}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" required defaultValue={vehicle?.details?.model} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="color">Colour</Label>
                <Input id="color" name="color" defaultValue={vehicle?.details?.color} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select value={transmission} onValueChange={setTransmission}>
                  <SelectTrigger id="transmission" className="w-full">
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {VEHICLE_TRANSMISSIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineType">Engine type</Label>
              <Select value={engineType} onValueChange={setEngineType}>
                <SelectTrigger id="engineType" className="w-full">
                  <SelectValue placeholder="Select engine type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {VEHICLE_ENGINE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Assignment and status</SectionHeading>
            <div className="space-y-2">
              <Label>Assigned driver</Label>
              <Select value={assignedChauffeurId} onValueChange={setAssignedChauffeurId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {chauffeurOptions.map((chauffeur) => (
                    <SelectItem key={chauffeur.user.id} value={chauffeur.user.id}>
                      {chauffeur.user.profile.displayName || chauffeur.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Add vehicle" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
