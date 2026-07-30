"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { useVehicleClasses } from "@/hooks/use-collections";
import { upsertVehicle } from "@/lib/services/firebase-service";
import {
  luggageSpecificationLabel,
  type Vehicle
} from "@/lib/models";
import { cn } from "@/lib/utils";
import {
  parseVehicleInsurancePolicyType,
  VEHICLE_INSURANCE_POLICY_TYPE_OPTIONS,
  type VehicleInsurancePolicyType
} from "@/lib/vehicle-insurance";
import { LUXURY_VEHICLE_MAKES, vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import { NumberStepper } from "@/components/number-stepper";
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
  ctpProviderName: null,
  ctpPolicyNumber: null,
  ctpClassOrType: null,
  ctpExpiry: null,
  ctpIncludedWithRegistration: null,
  insurancePolicyType: null,
  insuranceProviderName: null,
  insurancePolicyNumber: null,
  insuranceExpiry: null,
  roadworthyCertificateNumber: null,
  roadworthyIssuingAuthority: null,
  roadworthyExpiry: null,
  vehicleClassId: null,
  vehicleIdentificationNumber: null,
  engineTypeDescription: null,
  luggageDescription: luggageSpecificationLabel(0, 2),
  smallLuggageCount: 0,
  largeLuggageCount: 2,
  gearTypeDescription: ""
});

const MIN_MANUFACTURE_YEAR = 1980;
const maxManufactureYear = new Date().getFullYear() + 1;

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
  const [vehicleClassId, setVehicleClassId] = useState(vehicle?.vehicleClassId ?? "");
  const [make, setMake] = useState(() => vehicleMakeSelectValue(vehicle?.make));
  const [manufactureYear, setManufactureYear] = useState(
    vehicle?.manufactureYear ?? new Date().getFullYear()
  );
  const [passengerCapacity, setPassengerCapacity] = useState(vehicle?.passengerCapacity ?? 4);
  const [smallBags, setSmallBags] = useState(vehicle?.smallLuggageCount ?? 0);
  const [largeBags, setLargeBags] = useState(vehicle?.largeLuggageCount ?? 2);
  const [registrationExpiry, setRegistrationExpiry] = useState<Date | undefined>(
    vehicle?.registrationExpiry ?? undefined
  );
  const [ctpExpiry, setCtpExpiry] = useState<Date | undefined>(vehicle?.ctpExpiry ?? undefined);
  const [ctpIncludedWithRegistration, setCtpIncludedWithRegistration] = useState(
    vehicle?.ctpIncludedWithRegistration === true
      ? "yes"
      : vehicle?.ctpIncludedWithRegistration === false
        ? "no"
        : ""
  );
  const [insurancePolicyType, setInsurancePolicyType] = useState(
    vehicle?.insurancePolicyType ?? ""
  );
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | undefined>(
    vehicle?.insuranceExpiry ?? undefined
  );
  const [roadworthyExpiry, setRoadworthyExpiry] = useState<Date | undefined>(
    vehicle?.roadworthyExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = vehicle?.driverID ?? defaultCreateDriverId ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setVehicleClassId(vehicle?.vehicleClassId ?? "");
    setMake(vehicleMakeSelectValue(vehicle?.make));
    setManufactureYear(vehicle?.manufactureYear ?? new Date().getFullYear());
    setPassengerCapacity(vehicle?.passengerCapacity ?? 4);
    setSmallBags(vehicle?.smallLuggageCount ?? 0);
    setLargeBags(vehicle?.largeLuggageCount ?? 2);
    setRegistrationExpiry(vehicle?.registrationExpiry ?? undefined);
    setCtpExpiry(vehicle?.ctpExpiry ?? undefined);
    setCtpIncludedWithRegistration(
      vehicle?.ctpIncludedWithRegistration === true
        ? "yes"
        : vehicle?.ctpIncludedWithRegistration === false
          ? "no"
          : ""
    );
    setInsurancePolicyType(vehicle?.insurancePolicyType ?? "");
    setInsuranceExpiry(vehicle?.insuranceExpiry ?? undefined);
    setRoadworthyExpiry(vehicle?.roadworthyExpiry ?? undefined);
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
    if (!vehicleClassId) {
      toast.error("Select a service class.");
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
      ctpProviderName: get("ctpProviderName") || null,
      ctpPolicyNumber: get("ctpPolicyNumber") || null,
      ctpClassOrType: get("ctpClassOrType") || null,
      ctpExpiry: ctpExpiry ?? null,
      ctpIncludedWithRegistration:
        ctpIncludedWithRegistration === "yes"
          ? true
          : ctpIncludedWithRegistration === "no"
            ? false
            : null,
      insurancePolicyType: parseVehicleInsurancePolicyType(insurancePolicyType),
      insuranceProviderName: get("insuranceProviderName") || null,
      insurancePolicyNumber: get("insurancePolicyNumber") || null,
      insuranceExpiry: insuranceExpiry ?? null,
      roadworthyCertificateNumber: get("roadworthyCertificateNumber") || null,
      roadworthyIssuingAuthority: get("roadworthyIssuingAuthority") || null,
      roadworthyExpiry: roadworthyExpiry ?? null,
      vehicleClassId,
      gearTypeDescription: get("gearTypeDescription"),
      smallLuggageCount: smallBags,
      largeLuggageCount: largeBags,
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
    <Sheet open={open} onOpenChange={onOpenChange} modal={isNew}>
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
                <Select value={make || undefined} onValueChange={setMake}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent position="popper" className={cn(nested && "z-[110]")}>
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
                <Popover modal>
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
                    className={cn(
                      "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                      nested && "z-[110]"
                    )}
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
            <SectionHeading>Compulsory Third Party</SectionHeading>
            <div className="space-y-2">
              <Label htmlFor="ctpProviderName">CTP insurer / scheme</Label>
              <Input
                id="ctpProviderName"
                name="ctpProviderName"
                placeholder="Insurer or scheme"
                defaultValue={vehicle?.ctpProviderName ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ctpPolicyNumber">Policy / ref.</Label>
                <Input
                  id="ctpPolicyNumber"
                  name="ctpPolicyNumber"
                  placeholder="Policy or Green Slip ref."
                  defaultValue={vehicle?.ctpPolicyNumber ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctpClassOrType">CTP class</Label>
                <Input
                  id="ctpClassOrType"
                  name="ctpClassOrType"
                  placeholder="e.g. Class 26"
                  defaultValue={vehicle?.ctpClassOrType ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Included with rego</Label>
                <Select
                  value={ctpIncludedWithRegistration || undefined}
                  onValueChange={setCtpIncludedWithRegistration}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-2">
                <Label>CTP expiry</Label>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !ctpExpiry && "text-muted-foreground"
                      )}>
                      {ctpExpiry ? format(ctpExpiry, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={cn(
                      "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                      nested && "z-[110]"
                    )}
                    align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={new Date().getFullYear() - 10}
                      toYear={new Date().getFullYear() + 20}
                      selected={ctpExpiry}
                      onSelect={setCtpExpiry}
                      defaultMonth={ctpExpiry}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Vehicle insurance</SectionHeading>
            <p className="text-muted-foreground text-sm">
              Optional cover for the vehicle. CTP is tracked separately.
            </p>
            <div className="space-y-2">
              <Label>Policy type</Label>
              <Select
                value={insurancePolicyType || undefined}
                onValueChange={(value) =>
                  setInsurancePolicyType(value as VehicleInsurancePolicyType)
                }>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                  {VEHICLE_INSURANCE_POLICY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="insuranceProviderName">Insurer</Label>
                <Input
                  id="insuranceProviderName"
                  name="insuranceProviderName"
                  placeholder="Insurer name"
                  defaultValue={vehicle?.insuranceProviderName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurancePolicyNumber">Policy no.</Label>
                <Input
                  id="insurancePolicyNumber"
                  name="insurancePolicyNumber"
                  placeholder="Policy number"
                  defaultValue={vehicle?.insurancePolicyNumber ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>Insurance expiry</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !insuranceExpiry && "text-muted-foreground"
                    )}>
                    {insuranceExpiry ? format(insuranceExpiry, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                    nested && "z-[110]"
                  )}
                  align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear() + 20}
                    selected={insuranceExpiry}
                    onSelect={setInsuranceExpiry}
                    defaultMonth={insuranceExpiry}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Roadworthy</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="roadworthyCertificateNumber">Certificate no.</Label>
                <Input
                  id="roadworthyCertificateNumber"
                  name="roadworthyCertificateNumber"
                  placeholder="Certificate number"
                  defaultValue={vehicle?.roadworthyCertificateNumber ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roadworthyIssuingAuthority">Issued by</Label>
                <Input
                  id="roadworthyIssuingAuthority"
                  name="roadworthyIssuingAuthority"
                  placeholder="Issuing authority"
                  defaultValue={vehicle?.roadworthyIssuingAuthority ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>Roadworthy expiry</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !roadworthyExpiry && "text-muted-foreground"
                    )}>
                    {roadworthyExpiry ? format(roadworthyExpiry, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                    nested && "z-[110]"
                  )}
                  align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 10}
                    toYear={new Date().getFullYear() + 20}
                    selected={roadworthyExpiry}
                    onSelect={setRoadworthyExpiry}
                    defaultMonth={roadworthyExpiry}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <SectionHeading>Vehicle capacity</SectionHeading>
            <div className="grid grid-cols-3 gap-3">
              <NumberStepper
                id="passengerCapacity"
                label="Capacity"
                value={passengerCapacity}
                onChange={setPassengerCapacity}
                min={1}
                max={20}
              />
              <NumberStepper
                id="smallBags"
                label="Small bags"
                value={smallBags}
                onChange={setSmallBags}
                min={0}
                max={12}
              />
              <NumberStepper
                id="largeBags"
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
