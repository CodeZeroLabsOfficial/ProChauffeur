"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { Vehicle } from "@/lib/models";
import { isStartAfterExpiry } from "@/components/expiry-badge";
import { saveVehicleFields } from "@/app/dashboard/fleet/lib/save-vehicle-fields";
import { FleetDateField } from "@/app/dashboard/fleet/components/fleet-date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function VehicleRegistrationEditSheet({
  vehicle,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  nested?: boolean;
}) {
  const [registrationStart, setRegistrationStart] = useState<Date | undefined>(
    vehicle.registration?.registrationStart ?? undefined
  );
  const [registrationExpiry, setRegistrationExpiry] = useState<Date | undefined>(
    vehicle.registration?.registrationExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);
  const [seededId, setSeededId] = useState<string | null>("__init__");

  if (vehicle.driverID !== seededId) {
    setSeededId(vehicle.driverID);
    setRegistrationStart(vehicle.registration?.registrationStart ?? undefined);
    setRegistrationExpiry(vehicle.registration?.registrationExpiry ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const registrationNumber = get("registrationNumber");
    const jurisdictionCode = get("jurisdictionCode");
    const issuingAuthority = get("issuingAuthority");

    if (isStartAfterExpiry(registrationStart, registrationExpiry)) {
      toast.error("Registration start cannot be after expiry.");
      return;
    }

    setSaving(true);
    const result = await saveVehicleFields(vehicle, {
      registration: {
        registrationNumber,
        jurisdictionCode,
        issuingAuthority,
        registrationStart: registrationStart ?? null,
        registrationExpiry: registrationExpiry ?? null
      }
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not save registration.");
      return;
    }
    toast.success("Registration saved.");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit registration</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="jurisdictionCode">Jurisdiction</Label>
              <Input
                id="jurisdictionCode"
                name="jurisdictionCode"
                placeholder="NSW"
                defaultValue={vehicle.registration?.jurisdictionCode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                placeholder="Registration number"
                defaultValue={vehicle.registration?.registrationNumber ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuingAuthority">Issuing Authority</Label>
            <Input
              id="issuingAuthority"
              name="issuingAuthority"
              placeholder="e.g. Transport for NSW"
              defaultValue={vehicle.registration?.issuingAuthority ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FleetDateField
              label="Registration start"
              value={registrationStart}
              onChange={setRegistrationStart}
              nested={nested}
            />
            <FleetDateField
              label="Registration expiry"
              value={registrationExpiry}
              onChange={setRegistrationExpiry}
              nested={nested}
            />
          </div>

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
