"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { saveDriverProfile } from "@/lib/services/firebase-service";
import { defaultDriverProfile, type User } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export function DriverLicenceEditSheet({
  user,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  nested?: boolean;
}) {
  const profile = user.driverProfile ?? defaultDriverProfile();
  const [driversLicenseExpiry, setDriversLicenseExpiry] = useState<Date | undefined>(
    profile.driversLicenseExpiry ?? undefined
  );
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  if (user.id !== seededId) {
    setSeededId(user.id);
    setDriversLicenseExpiry(profile.driversLicenseExpiry ?? undefined);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const driverProfile = {
      ...defaultDriverProfile(),
      ...profile,
      driversLicenseNumber: get("driversLicenseNumber") || null,
      driversLicenseClassOrType: get("driversLicenseClassOrType") || null,
      driversLicenseJurisdictionCode: get("driversLicenseJurisdictionCode") || null,
      driversLicenseConditions: get("driversLicenseConditions") || null,
      driversLicenseSummary: get("driversLicenseSummary") || null,
      driversLicenseExpiry: driversLicenseExpiry ?? null
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
          <SheetTitle>Edit driver licence</SheetTitle>
          <SheetDescription>
            Licence and compliance details for {user.profile.displayName?.trim() || user.email}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4" key={user.id}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseNumber">Licence no.</Label>
              <Input
                id="licence-driversLicenseNumber"
                name="driversLicenseNumber"
                defaultValue={profile.driversLicenseNumber ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseClassOrType">Class / type</Label>
              <Input
                id="licence-driversLicenseClassOrType"
                name="driversLicenseClassOrType"
                defaultValue={profile.driversLicenseClassOrType ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licence-driversLicenseJurisdictionCode">State</Label>
              <Input
                id="licence-driversLicenseJurisdictionCode"
                name="driversLicenseJurisdictionCode"
                placeholder="NSW"
                defaultValue={profile.driversLicenseJurisdictionCode ?? ""}
              />
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
              defaultValue={profile.driversLicenseConditions ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licence-driversLicenseSummary">Summary</Label>
            <Textarea
              id="licence-driversLicenseSummary"
              name="driversLicenseSummary"
              rows={3}
              defaultValue={profile.driversLicenseSummary ?? ""}
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
