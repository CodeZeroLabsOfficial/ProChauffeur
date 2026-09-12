"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { officeSuggestionFromBranch } from "@/lib/branch/office-address";
import type { Branch } from "@/lib/models";
import { syncOfficeFleetLocation, upsertBranch } from "@/lib/services/firebase-service";

export function LocationEditSheet({
  branch,
  open,
  onOpenChange,
  onSaved,
  nested = false
}: {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (branch: Branch) => void;
  nested?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [office, setOffice] = useState<AddressSuggestion | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = branch?.id ?? "__none__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setName(branch?.name ?? "");
    setPhone(branch?.officePhone?.trim() ?? "");
    setEmail(branch?.officeEmail?.trim() ?? "");
    setOffice(officeSuggestionFromBranch(branch));
    setIsActive(branch?.isActive !== false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!branch) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }
    if (trimmedEmail && !z.string().email().safeParse(trimmedEmail).success) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!office) {
      toast.error("Address is required.");
      return;
    }

    setSaving(true);
    try {
      const updated: Branch = {
        ...branch,
        name: trimmedName,
        officePhone: trimmedPhone || null,
        officeEmail: trimmedEmail || null,
        officeAddressLine: office.addressLine,
        officeLatitude: office.coordinate.latitude,
        officeLongitude: office.coordinate.longitude,
        isActive,
        updatedAt: new Date()
      };
      await upsertBranch(updated);
      await syncOfficeFleetLocation(updated.id, {
        name: updated.name,
        addressLine: office.addressLine,
        latitude: office.coordinate.latitude,
        longitude: office.coordinate.longitude
      });
      toast.success("Location saved.");
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit location</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col space-y-4 px-4"
          key={currentKey}>
          <div className="space-y-2">
            <Label htmlFor="location-edit-name">Name</Label>
            <Input
              id="location-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. city name"
              disabled={saving || !branch}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location-edit-phone">Phone</Label>
              <Input
                id="location-edit-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                disabled={saving || !branch}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-edit-email">Email</Label>
              <Input
                id="location-edit-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
                disabled={saving || !branch}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-edit-address">Address</Label>
            <AddressAutocomplete
              id="location-edit-address"
              value={office}
              onChange={setOffice}
              required
              disabled={saving || !branch}
              proximity={office?.coordinate ?? null}
              placeholder="Search for the office address…"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="location-edit-active">Active</Label>
              <p className="text-muted-foreground text-xs">
                Inactive locations are hidden from the switcher and resolve.
              </p>
            </div>
            <Switch
              id="location-edit-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={saving || !branch}
            />
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving || !branch}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
