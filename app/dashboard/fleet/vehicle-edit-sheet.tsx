"use client";

import { useState } from "react";
import { toast } from "sonner";

import { upsertVehicle } from "@/lib/services/firebase-service";
import {
  VEHICLE_TYPES,
  luggageSpecificationLabel,
  vehicleTypeTitle,
  type User,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
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

export function VehicleEditSheet({
  vehicle,
  drivers,
  open,
  onOpenChange,
  nested = false
}: {
  vehicle: Vehicle | null;
  drivers: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !vehicle;
  const [driverID, setDriverID] = useState(vehicle?.driverID ?? "");
  const [tier, setTier] = useState<VehicleType>(vehicle?.pricingVehicleType ?? "sedan");
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = vehicle?.driverID ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setDriverID(vehicle?.driverID ?? "");
    setTier(vehicle?.pricingVehicleType ?? "sedan");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!driverID) {
      toast.error("Select the chauffeur this vehicle is keyed to.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const small = Number(get("fleetSmallLuggageCount") || 0);
    const large = Number(get("fleetLargeLuggageCount") || 0);

    const base = vehicle ?? EMPTY_VEHICLE(driverID);
    const next: Vehicle = {
      ...base,
      driverID,
      assignedChauffeurUserId: base.assignedChauffeurUserId ?? driverID,
      make: get("make"),
      model: get("model"),
      color: get("color"),
      licensePlate: get("licensePlate"),
      passengerCapacity: Number(get("passengerCapacity") || 0),
      manufactureYear: get("manufactureYear") ? Number(get("manufactureYear")) : null,
      registrationJurisdictionCode: get("registrationJurisdictionCode") || null,
      registrationExpiry: get("registrationExpiry") ? new Date(get("registrationExpiry")) : null,
      pricingVehicleType: tier,
      fleetSmallLuggageCount: small,
      fleetLargeLuggageCount: large,
      luggageDescription: luggageSpecificationLabel(small, large)
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
          <SheetDescription>
            Fleet rows are keyed to a chauffeur (matching the mobile app schema).
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label>Chauffeur</Label>
            <Select value={driverID} onValueChange={setDriverID} disabled={!isNew}>
              <SelectTrigger>
                <SelectValue placeholder="Select chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.profile.displayName || d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" name="make" required defaultValue={vehicle?.make} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" name="model" required defaultValue={vehicle?.model} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Colour</Label>
              <Input id="color" name="color" defaultValue={vehicle?.color} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plate</Label>
              <Input id="licensePlate" name="licensePlate" defaultValue={vehicle?.licensePlate} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pricing tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as VehicleType)}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="passengerCapacity">Capacity</Label>
              <Input
                id="passengerCapacity"
                name="passengerCapacity"
                type="number"
                min={1}
                defaultValue={vehicle?.passengerCapacity ?? 4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufactureYear">Year</Label>
              <Input
                id="manufactureYear"
                name="manufactureYear"
                type="number"
                defaultValue={vehicle?.manufactureYear ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationJurisdictionCode">Rego state</Label>
              <Input
                id="registrationJurisdictionCode"
                name="registrationJurisdictionCode"
                placeholder="NSW"
                defaultValue={vehicle?.registrationJurisdictionCode ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="registrationExpiry">Rego expiry</Label>
              <Input
                id="registrationExpiry"
                name="registrationExpiry"
                type="date"
                defaultValue={
                  vehicle?.registrationExpiry
                    ? vehicle.registrationExpiry.toISOString().slice(0, 10)
                    : ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fleetSmallLuggageCount">Small bags</Label>
              <Input
                id="fleetSmallLuggageCount"
                name="fleetSmallLuggageCount"
                type="number"
                min={0}
                defaultValue={vehicle?.fleetSmallLuggageCount ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fleetLargeLuggageCount">Large bags</Label>
              <Input
                id="fleetLargeLuggageCount"
                name="fleetLargeLuggageCount"
                type="number"
                min={0}
                defaultValue={vehicle?.fleetLargeLuggageCount ?? 2}
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
