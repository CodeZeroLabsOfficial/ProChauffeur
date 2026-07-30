"use client";

import { useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import {
  parseVehicleInsuranceCoverType,
  VEHICLE_INSURANCE_COVER_TYPE_OPTIONS
} from "@/lib/vehicle-insurance";
import { isStartAfterExpiry } from "@/components/expiry-badge";
import { saveVehicleFields } from "@/app/dashboard/fleet/lib/save-vehicle-fields";
import { FleetDateField } from "@/app/dashboard/fleet/components/fleet-date-field";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function VehicleInsuranceEditSheet({
  vehicle,
  policy,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  vehicle: Vehicle;
  policy: VehicleInsurancePolicy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  nested?: boolean;
}) {
  const isNew = !policy;
  const [coverType, setCoverType] = useState(policy?.coverType ?? "");
  const [policyStart, setPolicyStart] = useState<Date | undefined>(
    policy?.policyStart ?? undefined
  );
  const [policyExpiry, setPolicyExpiry] = useState<Date | undefined>(
    policy?.policyExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [seededKey, setSeededKey] = useState<string | null>("__init__");
  const seedKey = `${vehicle.driverID}:${policy?.id ?? "new"}:${open ? "open" : "closed"}`;

  if (seedKey !== seededKey) {
    setSeededKey(seedKey);
    setCoverType(policy?.coverType ?? "");
    setPolicyStart(policy?.policyStart ?? undefined);
    setPolicyExpiry(policy?.policyExpiry ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const parsedCoverType = parseVehicleInsuranceCoverType(coverType);
    if (!parsedCoverType) {
      toast.error("Select a cover type.");
      return;
    }
    if (isStartAfterExpiry(policyStart, policyExpiry)) {
      toast.error("Policy start cannot be after expiry.");
      return;
    }

    const nextPolicy: VehicleInsurancePolicy = {
      id: policy?.id ?? uuidv4(),
      coverType: parsedCoverType,
      insurerName: get("insurerName"),
      policyReferenceNumber: get("policyReferenceNumber"),
      policyStart: policyStart ?? null,
      policyExpiry: policyExpiry ?? null
    };

    const existing = vehicle.insurancePolicies ?? [];
    const insurancePolicies = isNew
      ? [...existing, nextPolicy]
      : existing.map((entry) => (entry.id === nextPolicy.id ? nextPolicy : entry));

    setSaving(true);
    const result = await saveVehicleFields(vehicle, { insurancePolicies });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not save insurance.");
      return;
    }
    toast.success(isNew ? "Insurance policy added." : "Insurance policy saved.");
    onOpenChange(false);
    onSaved?.();
  }

  async function onDelete() {
    if (!policy) return;
    setDeleting(true);
    const insurancePolicies = (vehicle.insurancePolicies ?? []).filter(
      (entry) => entry.id !== policy.id
    );
    const result = await saveVehicleFields(vehicle, { insurancePolicies });
    setDeleting(false);
    setConfirmDeleteOpen(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not remove insurance policy.");
      return;
    }
    toast.success("Insurance policy removed.");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{isNew ? "Add insurance policy" : "Edit insurance policy"}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={onSubmit}
            className="flex flex-1 flex-col space-y-4 px-4"
            key={policy?.id ?? "new"}>
            <div className="space-y-2">
              <Label>Cover type</Label>
              <Select value={coverType || undefined} onValueChange={setCoverType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select cover type" />
                </SelectTrigger>
                <SelectContent position="popper" className={cn(nested && "z-[110]")}>
                  {VEHICLE_INSURANCE_COVER_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurerName">Insurer</Label>
              <Input
                id="insurerName"
                name="insurerName"
                placeholder="Insurer name"
                defaultValue={policy?.insurerName ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policyReferenceNumber">Policy reference</Label>
              <Input
                id="policyReferenceNumber"
                name="policyReferenceNumber"
                placeholder="Policy number"
                defaultValue={policy?.policyReferenceNumber ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FleetDateField
                label="Policy start"
                value={policyStart}
                onChange={setPolicyStart}
                nested={nested}
              />
              <FleetDateField
                label="Policy expiry"
                value={policyExpiry}
                onChange={setPolicyExpiry}
                nested={nested}
              />
            </div>

            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
              {!isNew ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={saving || deleting}
                  onClick={() => setConfirmDeleteOpen(true)}>
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving || deleting}>
                {saving ? "Saving…" : isNew ? "Add policy" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove insurance policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the policy from the vehicle record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
