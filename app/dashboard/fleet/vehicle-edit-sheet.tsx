"use client";

import { Minus, Plus } from "lucide-react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { upsertVehicle } from "@/lib/services/firebase-service";
import {
  VEHICLE_TYPES,
  luggageSpecificationLabel,
  vehicleTypeTitle,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import { cn } from "@/lib/utils";
import { LUXURY_VEHICLE_MAKES, vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

const EMPTY_VEHICLE = (driverID: string): Vehicle => ({
  driverID,
  assignedChauffeurUserId: driverID,
  make: "",
  model: "",
  color: "",
  licensePlate: "",
  passengerCapacity: 4,
  manufactureYear: null,
  registrationJurisdictionCode: null,
  registrationExpiry: null,
  pricingVehicleType: "sedan",
  specificationChips: [],
  carFeatureRows: [],
  luggageDescription: luggageSpecificationLabel(0, 2),
  fleetSmallLuggageCount: 0,
  fleetLargeLuggageCount: 2,
  wifiServiceDescription: "Complimentary",
  serviceClassDescription: "Business",
  interiorDescription: "",
  climateControlDescription: "",
  gearTypeDescription: ""
});

const MIN_MANUFACTURE_YEAR = 1980;
const maxManufactureYear = new Date().getFullYear() + 1;

function NumberStepper({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label.toLowerCase()}`}>
          <Minus className="size-4" />
        </Button>
        <span className="min-w-8 flex-1 text-center text-sm font-medium tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label.toLowerCase()}`}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

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
  const [tier, setTier] = useState<VehicleType>(vehicle?.pricingVehicleType ?? "sedan");
  const [make, setMake] = useState(() => vehicleMakeSelectValue(vehicle?.make));
  const [manufactureYear, setManufactureYear] = useState(
    vehicle?.manufactureYear ?? new Date().getFullYear()
  );
  const [passengerCapacity, setPassengerCapacity] = useState(vehicle?.passengerCapacity ?? 4);
  const [smallBags, setSmallBags] = useState(vehicle?.fleetSmallLuggageCount ?? 0);
  const [largeBags, setLargeBags] = useState(vehicle?.fleetLargeLuggageCount ?? 2);
  const [registrationExpiry, setRegistrationExpiry] = useState<Date | undefined>(
    vehicle?.registrationExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = vehicle?.driverID ?? defaultCreateDriverId ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setTier(vehicle?.pricingVehicleType ?? "sedan");
    setMake(vehicleMakeSelectValue(vehicle?.make));
    setManufactureYear(vehicle?.manufactureYear ?? new Date().getFullYear());
    setPassengerCapacity(vehicle?.passengerCapacity ?? 4);
    setSmallBags(vehicle?.fleetSmallLuggageCount ?? 0);
    setLargeBags(vehicle?.fleetLargeLuggageCount ?? 2);
    setRegistrationExpiry(vehicle?.registrationExpiry ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const driverID = vehicle?.driverID ?? defaultCreateDriverId ?? "";
    if (!driverID) {
      toast.error("No chauffeur is available to link this vehicle to.");
      return;
    }
    if (!make) {
      toast.error("Select a vehicle make.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const base = vehicle ?? EMPTY_VEHICLE(driverID);
    const next: Vehicle = {
      ...base,
      driverID,
      assignedChauffeurUserId: base.assignedChauffeurUserId ?? driverID,
      make,
      model: get("model"),
      color: get("color"),
      licensePlate: get("licensePlate"),
      passengerCapacity,
      manufactureYear,
      registrationJurisdictionCode: get("registrationJurisdictionCode") || null,
      registrationExpiry: registrationExpiry ?? null,
      pricingVehicleType: tier,
      gearTypeDescription: get("gearTypeDescription"),
      fleetSmallLuggageCount: smallBags,
      fleetLargeLuggageCount: largeBags,
      luggageDescription: luggageSpecificationLabel(smallBags, largeBags)
    };

    setSaving(true);
    try {
      await upsertVehicle(next);
      toast.success(isNew ? "Vehicle added." : "Vehicle updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the vehicle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add vehicle" : "Edit vehicle"}</SheetTitle>
        </SheetHeader>
        <Separator />
        <form onSubmit={onSubmit} className="space-y-4 px-4" key={currentKey}>
          <div className="space-y-4">
            <SectionHeading>Vehicle details</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Vehicle category</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as VehicleType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {vehicleTypeTitle[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <NumberStepper
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
                <Select value={make} onValueChange={setMake} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {LUXURY_VEHICLE_MAKES.map((entry) => (
                      <SelectItem key={entry.id} value={entry.label}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" name="model" required defaultValue={vehicle?.model} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="color">Colour</Label>
                <Input id="color" name="color" defaultValue={vehicle?.color} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gearTypeDescription">Transmission</Label>
                <Input
                  id="gearTypeDescription"
                  name="gearTypeDescription"
                  placeholder="Automatic"
                  defaultValue={vehicle?.gearTypeDescription ?? ""}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Registration details</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="registrationJurisdictionCode">Rego state</Label>
                <Input
                  id="registrationJurisdictionCode"
                  name="registrationJurisdictionCode"
                  placeholder="NSW"
                  defaultValue={vehicle?.registrationJurisdictionCode ?? ""}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label>Rego expiry</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !registrationExpiry && "text-muted-foreground"
                      )}>
                      {registrationExpiry ? format(registrationExpiry, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
                    align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear() - 10}
                      toYear={new Date().getFullYear() + 20}
                      selected={registrationExpiry}
                      onSelect={setRegistrationExpiry}
                      defaultMonth={registrationExpiry}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plate</Label>
              <Input id="licensePlate" name="licensePlate" defaultValue={vehicle?.licensePlate} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Vehicle capacity</SectionHeading>
            <div className="grid grid-cols-3 gap-3">
              <NumberStepper
                label="Capacity"
                value={passengerCapacity}
                onChange={setPassengerCapacity}
                min={1}
                max={20}
              />
              <NumberStepper
                label="Small bags"
                value={smallBags}
                onChange={setSmallBags}
                min={0}
                max={12}
              />
              <NumberStepper
                label="Large bags"
                value={largeBags}
                onChange={setLargeBags}
                min={0}
                max={12}
              />
            </div>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Add vehicle" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
