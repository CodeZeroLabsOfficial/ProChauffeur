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

export function VehicleRoadworthyEditSheet({
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
  const [issueDate, setIssueDate] = useState<Date | undefined>(
    vehicle.roadworthy?.issueDate ?? undefined
  );
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    vehicle.roadworthy?.expiryDate ?? undefined
  );
  const [saving, setSaving] = useState(false);
  const [seededId, setSeededId] = useState<string | null>("__init__");

  if (vehicle.driverID !== seededId) {
    setSeededId(vehicle.driverID);
    setIssueDate(vehicle.roadworthy?.issueDate ?? undefined);
    setExpiryDate(vehicle.roadworthy?.expiryDate ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();

    if (isStartAfterExpiry(issueDate, expiryDate)) {
      toast.error("Issue date cannot be after expiry.");
      return;
    }

    setSaving(true);
    const result = await saveVehicleFields(vehicle, {
      roadworthy: {
        certificateNumber: get("certificateNumber"),
        issuingAuthority: get("issuingAuthority"),
        jurisdictionCode: get("jurisdictionCode"),
        issueDate: issueDate ?? null,
        expiryDate: expiryDate ?? null
      }
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not save roadworthy details.");
      return;
    }
    toast.success("Roadworthy details saved.");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit roadworthy</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="issuingAuthority">Issuing Authority</Label>
            <Input
              id="issuingAuthority"
              name="issuingAuthority"
              placeholder="Issuing authority"
              defaultValue={vehicle.roadworthy?.issuingAuthority ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="jurisdictionCode">Jurisdiction</Label>
              <Input
                id="jurisdictionCode"
                name="jurisdictionCode"
                placeholder="VIC"
                defaultValue={vehicle.roadworthy?.jurisdictionCode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificateNumber">Certificate no.</Label>
              <Input
                id="certificateNumber"
                name="certificateNumber"
                placeholder="Certificate number"
                defaultValue={vehicle.roadworthy?.certificateNumber ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FleetDateField
              label="Issue date"
              value={issueDate}
              onChange={setIssueDate}
              nested={nested}
            />
            <FleetDateField
              label="Expiry"
              value={expiryDate}
              onChange={setExpiryDate}
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
