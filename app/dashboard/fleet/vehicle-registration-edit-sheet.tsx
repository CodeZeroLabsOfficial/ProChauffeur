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
    | "registrationNumber"
    | "registrationStart"
    | "registrationExpiry"
    | "startAfterExpiry",
    boolean
  >
>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [seededKey, setSeededKey] = useState<string | null>("__init__");
  const seedKey = `${vehicle.driverID}:${open ? "open" : "closed"}`;

  if (seedKey !== seededKey) {
    setSeededKey(seedKey);
    setRegistrationStart(vehicle.registration?.registrationStart ?? undefined);
    setRegistrationExpiry(vehicle.registration?.registrationExpiry ?? undefined);
    setFieldErrors({});
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const registrationNumber = get("registrationNumber");
    const jurisdictionCode = get("jurisdictionCode");
    const issuingAuthority = get("issuingAuthority");
    const startAfterExpiry = isStartAfterExpiry(registrationStart, registrationExpiry);

    const errors: FieldErrors = {
      issuingAuthority: !issuingAuthority,
      jurisdictionCode: !jurisdictionCode,
      registrationNumber: !registrationNumber,
      registrationStart: !registrationStart,
      registrationExpiry: !registrationExpiry,
      startAfterExpiry
    };
    setFieldErrors(errors);
    if (
      errors.issuingAuthority ||
      errors.jurisdictionCode ||
      errors.registrationNumber ||
      errors.registrationStart ||
      errors.registrationExpiry ||
      errors.startAfterExpiry
    ) {
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
              placeholder="e.g. Transport for NSW"
              defaultValue={vehicle.registration?.issuingAuthority ?? ""}
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
                placeholder="NSW"
                defaultValue={vehicle.registration?.jurisdictionCode ?? ""}
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
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                placeholder="Registration number"
                defaultValue={vehicle.registration?.registrationNumber ?? ""}
                className="peer"
                aria-invalid={fieldErrors.registrationNumber || undefined}
                onChange={() => clearFieldError("registrationNumber")}
              />
              {fieldErrors.registrationNumber ? (
                <p
                  aria-live="polite"
                  className="peer-aria-invalid:text-destructive text-destructive text-xs"
                  role="alert">
                  Registration Number is required
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FleetDateField
              label="Registration start"
              value={registrationStart}
              onChange={(value) => {
                setRegistrationStart(value);
                clearFieldError("registrationStart");
                clearFieldError("startAfterExpiry");
              }}
              nested={nested}
              invalid={!!fieldErrors.registrationStart || !!fieldErrors.startAfterExpiry}
              error={
                fieldErrors.registrationStart
                  ? "Registration start is required"
                  : fieldErrors.startAfterExpiry
                    ? "Registration start cannot be after expiry"
                    : undefined
              }
            />
            <FleetDateField
              label="Registration expiry"
              value={registrationExpiry}
              onChange={(value) => {
                setRegistrationExpiry(value);
                clearFieldError("registrationExpiry");
                clearFieldError("startAfterExpiry");
              }}
              nested={nested}
              invalid={!!fieldErrors.registrationExpiry}
              error={fieldErrors.registrationExpiry ? "Registration expiry is required" : undefined}
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
