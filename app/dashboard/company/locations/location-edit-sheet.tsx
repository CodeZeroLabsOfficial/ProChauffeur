"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  allocateUniqueBranchId,
  createLocationWithScaffold,
  syncOfficeFleetLocation,
  upsertBranch
} from "@/lib/services/firebase-service";
import {
  buildBranch,
  COMMON_TIMEZONES,
  optionsWithCurrent,
  type Branch
} from "@/lib/models";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

function parsePostcodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

function postcodesToText(branch: Branch | null): string {
  const list = branch?.serviceArea?.type === "postcodes" ? branch.serviceArea.postcodes : null;
  return (list ?? []).join("\n");
}

function officeSuggestionFromBranch(branch: Branch | null): AddressSuggestion | null {
  if (!branch?.officeAddressLine?.trim()) return null;
  if (
    typeof branch.officeLatitude !== "number" ||
    typeof branch.officeLongitude !== "number" ||
    (branch.officeLatitude === 0 && branch.officeLongitude === 0)
  ) {
    return null;
  }
  return {
    id: `${branch.id}-office`,
    addressLine: branch.officeAddressLine,
    coordinate: {
      latitude: branch.officeLatitude,
      longitude: branch.officeLongitude
    }
  };
}

export function LocationEditSheet({
  open,
  onOpenChange,
  branch,
  canCreate,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  canCreate: boolean;
  onSaved: (branch: Branch) => void;
}) {
  const router = useRouter();
  const { setBranchId } = useActiveBranch();
  const isNew = branch == null;

  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [office, setOffice] = useState<AddressSuggestion | null>(null);
  const [postcodesText, setPostcodesText] = useState("");
  const [savedBranch, setSavedBranch] = useState<Branch | null>(branch);

  useEffect(() => {
    if (!open) return;
    setTab("overview");
    setSavedBranch(branch);
    setName(branch?.name ?? "");
    setPhone(branch?.officePhone ?? "");
    setTimezone(branch?.timeZoneIdentifier?.trim() || "Australia/Brisbane");
    setIsActive(branch?.isActive !== false);
    setOffice(officeSuggestionFromBranch(branch));
    setPostcodesText(postcodesToText(branch));
  }, [open, branch]);

  const timezoneOptions = useMemo(
    () => optionsWithCurrent(COMMON_TIMEZONES, timezone),
    [timezone]
  );

  const working = savedBranch ?? branch;
  const locationExists = working != null;

  function openCompanyPage(href: string) {
    if (!working) return;
    setBranchId(working.id);
    onOpenChange(false);
    router.push(href);
  }

  async function saveOverview(e: React.FormEvent) {
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

    setSaving(true);
    try {
      if (isNew && !savedBranch) {
        if (!canCreate) {
          toast.error("Location limit reached.");
          return;
        }
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
        setSavedBranch(created);
        onSaved(created);
        toast.success("Location created.");
        setTab("service-area");
      } else {
        const current = working!;
        const updated: Branch = {
          ...current,
          name: trimmedName,
          isActive,
          timeZoneIdentifier: timezone.trim() || null,
          officeAddressLine: office.addressLine,
          officeLatitude: office.coordinate.latitude,
          officeLongitude: office.coordinate.longitude,
          officePhone: phone.trim() || null,
          updatedAt: new Date()
        };
        await upsertBranch(updated);
        await syncOfficeFleetLocation(updated.id, {
          name: updated.name,
          addressLine: office.addressLine,
          latitude: office.coordinate.latitude,
          longitude: office.coordinate.longitude,
          timeZoneIdentifier: updated.timeZoneIdentifier
        });
        setSavedBranch(updated);
        onSaved(updated);
        toast.success("Location updated.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
  }

  async function saveServiceArea(e: React.FormEvent) {
    e.preventDefault();
    if (!working) return;
    const postcodes = parsePostcodes(postcodesText);
    const serviceArea =
      postcodes.length > 0 ? { type: "postcodes" as const, postcodes } : null;

    setSaving(true);
    try {
      const updated: Branch = {
        ...working,
        serviceArea,
        updatedAt: new Date()
      };
      await upsertBranch(updated);
      setSavedBranch(updated);
      onSaved(updated);
      toast.success("Service area saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the service area.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{working?.name?.trim() || (isNew ? "New location" : "Location")}</SheetTitle>
          <SheetDescription>Location</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 overflow-x-auto border-none bg-transparent p-0"
              )}>
              <TabsTrigger value="overview" className={tabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="service-area"
                className={tabTriggerClassName}
                disabled={!locationExists}>
                Service area
              </TabsTrigger>
              <TabsTrigger
                value="hours"
                className={tabTriggerClassName}
                disabled={!locationExists}>
                Operating hours
              </TabsTrigger>
              <TabsTrigger
                value="classes"
                className={tabTriggerClassName}
                disabled={!locationExists}>
                Vehicle classes
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className={tabTriggerClassName}
                disabled={!locationExists}>
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <form onSubmit={saveOverview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Name</Label>
                  <Input
                    id="location-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Brisbane"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-office">Office address</Label>
                  <AddressAutocomplete
                    id="location-office"
                    value={office}
                    onChange={setOffice}
                    required
                    disabled={saving}
                    placeholder="Search for the office address…"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-phone">Phone</Label>
                  <Input
                    id="location-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location-tz">Time zone</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={saving}>
                    <SelectTrigger id="location-tz" className="w-full">
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
                    <Label htmlFor="location-active">Active</Label>
                    <p className="text-muted-foreground text-xs">
                      Inactive locations are hidden from the switcher and resolve.
                    </p>
                  </div>
                  <Switch
                    id="location-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={saving}
                  />
                </div>

                <SheetFooter className="px-0">
                  <Button type="submit" disabled={saving || (isNew && !savedBranch && !canCreate)}>
                    {saving ? "Saving…" : isNew && !savedBranch ? "Create" : "Save"}
                  </Button>
                </SheetFooter>
              </form>
            </TabsContent>

            <TabsContent value="service-area" className="mt-0">
              <form onSubmit={saveServiceArea} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location-postcodes">Service postcodes</Label>
                  <Textarea
                    id="location-postcodes"
                    rows={8}
                    value={postcodesText}
                    onChange={(e) => setPostcodesText(e.target.value)}
                    placeholder={"One per line or comma-separated\n4000\n4001"}
                    disabled={saving}
                  />
                  <p className="text-muted-foreground text-xs">
                    Used to route customer bookings when multi-location is enabled. Avoid overlapping
                    lists across locations.
                  </p>
                </div>
                <SheetFooter className="px-0">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </SheetFooter>
              </form>
            </TabsContent>

            <TabsContent value="hours" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Operating hours for this location are managed on the Company operating hours page.
              </p>
              <Button type="button" onClick={() => openCompanyPage("/dashboard/company/operating-hours")}>
                Open operating hours
              </Button>
            </TabsContent>

            <TabsContent value="classes" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Vehicle classes for this location are managed on the Company vehicle classes page.
              </p>
              <Button
                type="button"
                onClick={() => openCompanyPage("/dashboard/company/vehicle-classes")}>
                Open vehicle classes
              </Button>
            </TabsContent>

            <TabsContent value="pricing" className="mt-0 space-y-4">
              <p className="text-muted-foreground text-sm">
                Pricing for this location is managed on the Company pricing page.
              </p>
              <Button type="button" onClick={() => openCompanyPage("/dashboard/company/pricing")}>
                Open pricing
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
