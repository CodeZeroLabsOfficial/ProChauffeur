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

type FieldErrors = Partial<
  Record<
    | "issuingAuthority"
    | "jurisdictionCode"
    | "certificateNumber"
    | "issueDate"
    | "expiryDate"
    | "startAfterExpiry",
    boolean
  >
>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [seededKey, setSeededKey] = useState<string | null>("__init__");
  const seedKey = `${vehicle.driverID}:${open ? "open" : "closed"}`;

  if (seedKey !== seededKey) {
    setSeededKey(seedKey);
    setIssueDate(vehicle.roadworthy?.issueDate ?? undefined);
    setExpiryDate(vehicle.roadworthy?.expiryDate ?? undefined);
    setFieldErrors({});
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const certificateNumber = get("certificateNumber");
    const issuingAuthority = get("issuingAuthority");
    const jurisdictionCode = get("jurisdictionCode");
    const startAfterExpiry = isStartAfterExpiry(issueDate, expiryDate);

    const errors: FieldErrors = {
      issuingAuthority: !issuingAuthority,
      jurisdictionCode: !jurisdictionCode,
      certificateNumber: !certificateNumber,
      issueDate: !issueDate,
      expiryDate: !expiryDate,
      startAfterExpiry
    };
    setFieldErrors(errors);
    if (
      errors.issuingAuthority ||
      errors.jurisdictionCode ||
      errors.certificateNumber ||
      errors.issueDate ||
      errors.expiryDate ||
      errors.startAfterExpiry
    ) {
      return;
    }

    setSaving(true);
    const result = await saveVehicleFields(vehicle, {
      roadworthy: {
        certificateNumber,
        issuingAuthority,
        jurisdictionCode,
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
        <form
          key={seedKey}
          onSubmit={onSubmit}
          noValidate
          className="flex flex-1 flex-col space-y-4 px-4">
          <div className="*:not-first:mt-2">
            <Label htmlFor="issuingAuthority">Issuing Authority</Label>
            <Input
              id="issuingAuthority"
              name="issuingAuthority"
              placeholder="Issuing authority"
              defaultValue={vehicle.roadworthy?.issuingAuthority ?? ""}
              className="peer"
              aria-invalid={fieldErrors.issuingAuthority || undefined}
              onChange={() => clearFieldError("issuingAuthority")}
            />
            {fieldErrors.issuingAuthority ? (
              <p
                aria-live="polite"
                className="peer-aria-invalid:text-destructive text-destructive text-xs"
                role="alert">
                Issuing Authority is required
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="*:not-first:mt-2">
              <Label htmlFor="jurisdictionCode">Jurisdiction</Label>
              <Input
                id="jurisdictionCode"
                name="jurisdictionCode"
                placeholder="VIC"
                defaultValue={vehicle.roadworthy?.jurisdictionCode ?? ""}
                className="peer"
                aria-invalid={fieldErrors.jurisdictionCode || undefined}
                onChange={() => clearFieldError("jurisdictionCode")}
              />
              {fieldErrors.jurisdictionCode ? (
                <p
                  aria-live="polite"
                  className="peer-aria-invalid:text-destructive text-destructive text-xs"
                  role="alert">
                  Jurisdiction is required
                </p>
              ) : null}
            </div>
            <div className="*:not-first:mt-2">
              <Label htmlFor="certificateNumber">Certificate no.</Label>
              <Input
                id="certificateNumber"
                name="certificateNumber"
                placeholder="Certificate number"
                defaultValue={vehicle.roadworthy?.certificateNumber ?? ""}
                className="peer"
                aria-invalid={fieldErrors.certificateNumber || undefined}
                onChange={() => clearFieldError("certificateNumber")}
              />
              {fieldErrors.certificateNumber ? (
                <p
                  aria-live="polite"
                  className="peer-aria-invalid:text-destructive text-destructive text-xs"
                  role="alert">
                  Certificate no. is required
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FleetDateField
              label="Issue date"
              value={issueDate}
              onChange={(value) => {
                setIssueDate(value);
                clearFieldError("issueDate");
                clearFieldError("startAfterExpiry");
              }}
              nested={nested}
              invalid={!!fieldErrors.issueDate || !!fieldErrors.startAfterExpiry}
              error={
                fieldErrors.issueDate
                  ? "Issue date is required"
                  : fieldErrors.startAfterExpiry
                    ? "Issue date cannot be after expiry"
                    : undefined
              }
            />
            <FleetDateField
              label="Expiry"
              value={expiryDate}
              onChange={(value) => {
                setExpiryDate(value);
                clearFieldError("expiryDate");
                clearFieldError("startAfterExpiry");
              }}
              nested={nested}
              invalid={!!fieldErrors.expiryDate}
              error={fieldErrors.expiryDate ? "Expiry is required" : undefined}
            />
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
