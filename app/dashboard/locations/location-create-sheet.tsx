"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
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
import { Switch } from "@/components/ui/switch";
import {
  allocateUniqueBranchId,
  createLocationWithScaffold
} from "@/lib/services/firebase-service";
import { buildBranch, COMMON_TIMEZONES, optionsWithCurrent, type Branch } from "@/lib/models";

export function LocationCreateSheet({
  open,
  onOpenChange,
  canCreate,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  onCreated: (branch: Branch) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Australia/Brisbane");
  const [isActive, setIsActive] = useState(true);
  const [office, setOffice] = useState<AddressSuggestion | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setTimezone("Australia/Brisbane");
    setIsActive(true);
    setOffice(null);
  }, [open]);

  const timezoneOptions = useMemo(
    () => optionsWithCurrent(COMMON_TIMEZONES, timezone),
    [timezone]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Enter a location name.");
      return;
    }
    if (!office) {
      toast.error("Select an office address from the suggestions.");
      return;
    }
    if (!canCreate) {
      toast.error("Location limit reached.");
      return;
    }

    setSaving(true);
    try {
      const id = await allocateUniqueBranchId(trimmedName);
      const created = buildBranch({
        id,
        name: trimmedName,
        isActive,
        timeZoneIdentifier: timezone.trim() || null,
        officeAddressLine: office.addressLine,
        officeLatitude: office.coordinate.latitude,
        officeLongitude: office.coordinate.longitude,
        officePhone: phone.trim() || null,
        serviceArea: null
      });
      await createLocationWithScaffold(created);
      onCreated(created);
      toast.success("Location created.");
      onOpenChange(false);
      router.push(`/dashboard/locations/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New location</SheetTitle>
          <SheetDescription>Add a city market for dispatch and bookings.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="create-location-name">Name</Label>
            <Input
              id="create-location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Brisbane"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-location-office">Office address</Label>
            <AddressAutocomplete
              id="create-location-office"
              value={office}
              onChange={setOffice}
              required
              disabled={saving}
              placeholder="Search for the office address…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-location-phone">Phone</Label>
            <Input
              id="create-location-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-location-tz">Time zone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
              <SelectTrigger id="create-location-tz" className="w-full">
                <SelectValue placeholder="Select time zone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="create-location-active">Active</Label>
              <p className="text-muted-foreground text-xs">
                Inactive locations are hidden from the switcher and resolve.
              </p>
            </div>
            <Switch
              id="create-location-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving}
            />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving || !canCreate}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
