"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { MultiSelectField } from "@/components/multi-select-field";
import { complianceSheetTitle, hasComplianceDetails } from "@/components/compliance";
import { saveDriverProfile } from "@/lib/services/firebase-service";
import { getCachedOperatorLocale } from "@/lib/services/operator-config-cache";
import {
  formatLicenceClasses,
  licenceClassesForCountry,
  licenceJurisdictionsForCountry,
  parseLicenceClasses,
  type BranchDriver,
  type User
} from "@/lib/models";
import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export function DriverLicenceEditSheet({
  user,
  roster,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  user: User;
  roster: BranchDriver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  nested?: boolean;
}) {
  const profile = branchDriverToProfile(roster);
  const isNew = !hasComplianceDetails(profile.driversLicense);
  const license = profile.driversLicense;
  const [driversLicenseIssueDate, setDriversLicenseIssueDate] = useState<Date | undefined>(
    license?.issueDate ?? undefined
  );
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState<Date | undefined>(
    license?.expiry ?? undefined
  );
  const [licenceClasses, setLicenceClasses] = useState<string[]>(() =>
    parseLicenceClasses(license?.classOrType)
  );
  const [jurisdictionCode, setJurisdictionCode] = useState(
    () => license?.jurisdictionCode?.trim() ?? ""
  );
  const [licenceCountry, setLicenceCountry] = useState("");
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  if (user.id !== seededId) {
    setSeededId(user.id);
    setDriversLicenseIssueDate(profile.driversLicense?.issueDate ?? undefined);
    setDriversLicenseExpiry(profile.driversLicense?.expiry ?? undefined);
    setLicenceClasses(parseLicenceClasses(profile.driversLicense?.classOrType));
    setJurisdictionCode(profile.driversLicense?.jurisdictionCode?.trim() ?? "");
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCachedOperatorLocale(getActiveBranchId())
      .then((locale) => {
        if (!cancelled) setLicenceCountry(locale.driverLicenceCountry);
      })
      .catch(() => {
        if (!cancelled) setLicenceCountry("");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const classOptions = useMemo(() => {
    if (!licenceCountry) {
      return licenceClasses.map((code) => ({ value: code, label: code }));
    }
    const preset = licenceClassesForCountry(licenceCountry);
    const known = new Set(preset.map((option) => option.value.toUpperCase()));
    const extras = licenceClasses
      .filter((code) => !known.has(code.toUpperCase()))
      .map((code) => ({ value: code, label: code }));
    return [...preset, ...extras];
  }, [licenceCountry, licenceClasses]);

  const jurisdictionOptions = useMemo(() => {
    if (!licenceCountry) {
      const current = jurisdictionCode.trim();
      return current ? [{ value: current, label: current }] : [];
    }
    const preset = licenceJurisdictionsForCountry(licenceCountry);
    const known = new Set(preset.map((option) => option.value.toUpperCase()));
    const current = jurisdictionCode.trim();
    if (current && !known.has(current.toUpperCase())) {
      return [{ value: current, label: current }, ...preset];
    }
    return preset;
  }, [licenceCountry, jurisdictionCode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const driverProfile = {
      ...profile,
      driversLicense: {
        number: get("driversLicenseNumber") || null,
        classOrType: formatLicenceClasses(licenceClasses),
        jurisdictionCode: jurisdictionCode.trim() || null,
        conditions: get("driversLicenseConditions") || null,
        summary: get("driversLicenseSummary") || null,
        conditionCodes: profile.driversLicense?.conditionCodes ?? null,
        issueDate: driversLicenseIssueDate ?? null,
        expiry: driversLicenseExpiry ?? null
      }
    };

    setSaving(true);
    try {
      const driverTitle = user.profile.displayName?.trim() || user.email || "Chauffeur";
      await saveDriverProfile(user.id, driverProfile, { driverTitle });
      toast.success("Driver licence saved.");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Could not save the driver licence.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {complianceSheetTitle(isNew, {
              add: "Add driver's licence",
              edit: "Edit driver licence"
            })}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4" key={user.id}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseNumber">Licence no.</Label>
              <Input
                id="licence-driversLicenseNumber"
                name="driversLicenseNumber"
                defaultValue={profile.driversLicense?.number ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseClassOrType">Class / type</Label>
              <MultiSelectField
                id="licence-driversLicenseClassOrType"
                options={classOptions}
                selected={licenceClasses}
                onSelectedChange={setLicenceClasses}
                placeholder="Select classes"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseJurisdictionCode">State</Label>
              <Select
                value={jurisdictionCode || undefined}
                onValueChange={setJurisdictionCode}
                disabled={saving}>
                <SelectTrigger id="licence-driversLicenseJurisdictionCode" className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent
                  className={cn(
                    "z-[100]",
                    nested && "z-[110]"
                  )}>
                  {jurisdictionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col space-y-2">
              <Label>Issue date</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !driversLicenseIssueDate && "text-muted-foreground"
                    )}>
                    {driversLicenseIssueDate ? (
                      format(driversLicenseIssueDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
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
                    fromYear={new Date().getFullYear() - 40}
                    toYear={new Date().getFullYear() + 1}
                    selected={driversLicenseIssueDate}
                    onSelect={setDriversLicenseIssueDate}
                    defaultMonth={driversLicenseIssueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col space-y-2">
              <Label>Expiry</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !driversLicenseExpiry && "text-muted-foreground"
                    )}>
                    {driversLicenseExpiry ? (
                      format(driversLicenseExpiry, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
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
                    selected={driversLicenseExpiry}
                    onSelect={setDriversLicenseExpiry}
                    defaultMonth={driversLicenseExpiry}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-driversLicenseConditions">Conditions</Label>
            <Textarea
              id="licence-driversLicenseConditions"
              name="driversLicenseConditions"
              rows={2}
              defaultValue={profile.driversLicense?.conditions ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-driversLicenseSummary">Summary</Label>
            <Textarea
              id="licence-driversLicenseSummary"
              name="driversLicenseSummary"
              rows={3}
              defaultValue={profile.driversLicense?.summary ?? ""}
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
