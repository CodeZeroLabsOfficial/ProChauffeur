"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { toast } from "sonner";

import { LocationOperatingHoursTab } from "@/app/dashboard/locations/location-operating-hours-tab";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchBranch,
  syncOfficeFleetLocation,
  upsertBranch
} from "@/lib/services/firebase-service";
import { COMMON_TIMEZONES, optionsWithCurrent, type Branch } from "@/lib/models";
import { cn } from "@/lib/utils";

const LOCATION_TABS = ["overview", "service-area", "hours", "classes", "pricing"] as const;
type LocationTab = (typeof LOCATION_TABS)[number];

function isLocationTab(value: string | null): value is LocationTab {
  return LOCATION_TABS.includes(value as LocationTab);
}

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

function parsePostcodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

function postcodesToText(branch: Branch): string {
  const list = branch.serviceArea?.type === "postcodes" ? branch.serviceArea.postcodes : null;
  return (list ?? []).join("\n");
}

function officeSuggestionFromBranch(branch: Branch): AddressSuggestion | null {
  if (!branch.officeAddressLine?.trim()) return null;
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

export function LocationProfilePage({ locationId }: { locationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBranchId } = useActiveBranch();
  const tabParam = searchParams.get("tab");
  const activeTab: LocationTab = isLocationTab(tabParam) ? tabParam : "overview";

  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [office, setOffice] = useState<AddressSuggestion | null>(null);
  const [postcodesText, setPostcodesText] = useState("");

  const loadBranch = useCallback(() => {
    return fetchBranch(locationId).then((loaded) => {
      setBranch(loaded);
      if (loaded) {
        setName(loaded.name ?? "");
        setPhone(loaded.officePhone ?? "");
        setTimezone(loaded.timeZoneIdentifier?.trim() || "Australia/Brisbane");
        setIsActive(loaded.isActive !== false);
        setOffice(officeSuggestionFromBranch(loaded));
        setPostcodesText(postcodesToText(loaded));
      }
      return loaded;
    });
  }, [locationId]);

  useEffect(() => {
    setLoading(true);
    loadBranch()
      .catch(() => setBranch(null))
      .finally(() => setLoading(false));
  }, [loadBranch]);

  useEffect(() => {
    setBranchId(locationId);
  }, [locationId, setBranchId]);

  const timezoneOptions = useMemo(
    () => optionsWithCurrent(COMMON_TIMEZONES, timezone),
    [timezone]
  );

  function setTab(tab: LocationTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/locations/${locationId}${q ? `?${q}` : ""}`, { scroll: false });
  }

  function openScopedCompanyPage(href: string) {
    setBranchId(locationId);
    router.push(href);
  }

  async function saveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!branch) return;
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
      const updated: Branch = {
        ...branch,
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
      setBranch(updated);
      toast.success("Location updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSaving(false);
    }
  }

  async function saveServiceArea(e: React.FormEvent) {
    e.preventDefault();
    if (!branch) return;
    const postcodes = parsePostcodes(postcodesText);
    const serviceArea =
      postcodes.length > 0 ? { type: "postcodes" as const, postcodes } : null;

    setSaving(true);
    try {
      const updated: Branch = {
        ...branch,
        serviceArea,
        updatedAt: new Date()
      };
      await upsertBranch(updated);
      setBranch(updated);
      toast.success("Service area saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the service area.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading location…</p>;
  }

  if (!branch) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Location not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/locations">
            <ChevronLeftIcon />
            Back to locations
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/locations">
            <ChevronLeftIcon />
            Locations
          </Link>
        </Button>
      </div>

      <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{branch.name}</h1>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as LocationTab)} className="gap-4">
        <TabsList
          className={cn(
            "h-auto w-full justify-start gap-4 overflow-x-auto border-none bg-transparent p-0"
          )}>
          <TabsTrigger value="overview" className={tabTriggerClassName}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="service-area" className={tabTriggerClassName}>
            Service area
          </TabsTrigger>
          <TabsTrigger value="hours" className={tabTriggerClassName}>
            Operating hours
          </TabsTrigger>
          <TabsTrigger value="classes" className={tabTriggerClassName}>
            Vehicle classes
          </TabsTrigger>
          <TabsTrigger value="pricing" className={tabTriggerClassName}>
            Pricing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 max-w-lg">
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

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="service-area" className="mt-0 max-w-lg">
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="hours" className="mt-0">
          <LocationOperatingHoursTab
            branchId={branch.id}
            timeZoneIdentifier={branch.timeZoneIdentifier}
          />
        </TabsContent>

        <TabsContent value="classes" className="mt-0 max-w-lg space-y-4">
          <p className="text-muted-foreground text-sm">
            Vehicle classes for this location are managed on the vehicle classes page.
          </p>
          <Button
            type="button"
            onClick={() => openScopedCompanyPage("/dashboard/company/vehicle-classes")}>
            Open vehicle classes
          </Button>
        </TabsContent>

        <TabsContent value="pricing" className="mt-0 max-w-lg space-y-4">
          <p className="text-muted-foreground text-sm">
            Pricing for this location is managed on the pricing page.
          </p>
          <Button type="button" onClick={() => openScopedCompanyPage("/dashboard/company/pricing")}>
            Open pricing
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
