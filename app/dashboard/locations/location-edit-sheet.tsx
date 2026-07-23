"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, Globe2, ImagePlusIcon, MapPin, Phone, Power } from "lucide-react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableSelectField } from "@/components/inline-editable-select-field";
import { InlineOfficeAddressField } from "@/components/inline-office-address-field";
import {
  ProfileV2TabTrigger,
  profileV2TabsListClassName
} from "@/components/layout/profile-tab-bar";
import { Button } from "@/components/ui/button";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
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
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { officeSuggestionFromBranch } from "@/lib/branch/office-address";
import {
  buildBranch,
  COMMON_TIMEZONES,
  optionsWithCurrent,
  type Branch
} from "@/lib/models";
import {
  allocateUniqueBranchId,
  createLocationWithScaffold,
  syncOfficeFleetLocation,
  uploadBranchImage,
  upsertBranch
} from "@/lib/services/firebase-service";
import { LocationOperatingHoursTab } from "@/app/dashboard/locations/location-operating-hours-tab";
import { LocationPricingPanel } from "@/app/dashboard/locations/components/location-pricing-panel";
import { LocationServiceAreaForm } from "@/app/dashboard/locations/components/location-service-area-form";
import { LocationVehicleClassesPanel } from "@/app/dashboard/locations/components/location-vehicle-classes-panel";

function LocationImageUpload({
  branch,
  onSaved
}: {
  branch: Branch;
  onSaved: (branch: Branch) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(branch.imageUrl ?? null);

  const [{ files }, { openFileDialog, getInputProps, clearFiles }] = useFileUpload({
    accept: "image/*",
    onFilesAdded: (added) => {
      const file = added[0]?.file;
      if (!(file instanceof File)) return;

      void (async () => {
        setUploading(true);
        try {
          const imageUrl = await uploadBranchImage(branch.id, file);
          const updated: Branch = { ...branch, imageUrl, updatedAt: new Date() };
          await upsertBranch(updated);
          setLocalImageUrl(imageUrl);
          onSaved(updated);
          clearFiles();
          toast.success("Location image updated.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not upload image.");
        } finally {
          setUploading(false);
        }
      })();
    }
  });

  const previewUrl = files[0]?.preview ?? localImageUrl;

  useEffect(() => {
    setLocalImageUrl(branch.imageUrl ?? null);
  }, [branch.imageUrl]);

  return (
    <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob / Storage download URL preview
        <img alt="" className="size-full object-cover" height={80} src={previewUrl} width={80} />
      ) : (
        <Building2 className="text-muted-foreground size-8" aria-hidden />
      )}
      <button
        type="button"
        aria-label="Change location image"
        disabled={uploading}
        className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        onClick={openFileDialog}>
        <ImagePlusIcon aria-hidden size={16} />
      </button>
      <input {...getInputProps()} aria-label="Upload location image" className="sr-only" />
    </div>
  );
}
function LocationOverviewFields({
  branch,
  onSaved
}: {
  branch: Branch;
  onSaved: (branch: Branch) => void;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const office = officeSuggestionFromBranch(branch);
  const timezone = branch.timeZoneIdentifier?.trim() || "Australia/Brisbane";
  const timezoneOptions = useMemo(
    () => optionsWithCurrent(COMMON_TIMEZONES, timezone),
    [timezone]
  );

  async function saveBranch(
    patch: Partial<Branch>,
    officeSuggestion?: AddressSuggestion | null
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const updated: Branch = {
        ...branch,
        ...patch,
        updatedAt: new Date()
      };
      await upsertBranch(updated);

      const nextOffice = officeSuggestion ?? officeSuggestionFromBranch(updated);
      if (nextOffice) {
        await syncOfficeFleetLocation(updated.id, {
          name: updated.name,
          addressLine: nextOffice.addressLine,
          latitude: nextOffice.coordinate.latitude,
          longitude: nextOffice.coordinate.longitude,
          timeZoneIdentifier: updated.timeZoneIdentifier
        });
      }

      onSaved(updated);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Could not save."
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <DetailLabel icon={Building2}>Name</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="name"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={branch.name}
                editLabel="name"
                placeholder="e.g. Brisbane"
                onSave={async (next) => {
                  const trimmed = next.trim();
                  if (!trimmed) {
                    return { ok: false, message: "Name is required." };
                  }
                  return saveBranch({ name: trimmed });
                }}
              />
            </dd>
          </div>
          <div className="space-y-1">
            <DetailLabel icon={Phone}>Phone</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="phone"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={branch.officePhone?.trim() ?? ""}
                inputType="tel"
                editLabel="phone"
                placeholder="Optional"
                onSave={async (next) => saveBranch({ officePhone: next.trim() || null })}
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={MapPin}>Office address</DetailLabel>
            <dd>
              <InlineOfficeAddressField
                fieldId="office"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={office}
                editLabel="office address"
                onSave={async (suggestion) =>
                  saveBranch(
                    {
                      officeAddressLine: suggestion.addressLine,
                      officeLatitude: suggestion.coordinate.latitude,
                      officeLongitude: suggestion.coordinate.longitude
                    },
                    suggestion
                  )
                }
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={Globe2}>Time zone</DetailLabel>
            <dd>
              <InlineEditableSelectField
                fieldId="timezone"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={timezone}
                options={timezoneOptions}
                editLabel="time zone"
                onSave={async (next) => saveBranch({ timeZoneIdentifier: next.trim() || null })}
              />
            </dd>
          </div>
        </dl>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="location-overview-active">Active</Label>
            <p className="text-muted-foreground text-xs">
              Inactive locations are hidden from the switcher and resolve.
            </p>
          </div>
          <Switch
            id="location-overview-active"
            checked={branch.isActive !== false}
            onCheckedChange={(checked) => {
              void saveBranch({ isActive: checked }).then((res) => {
                if (!res.ok) toast.error(res.message ?? "Could not save.");
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LocationCreateOverviewForm({
  canCreate,
  saving,
  onCreated
}: {
  canCreate: boolean;
  saving: boolean;
  onCreated: (branch: Branch) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Australia/Brisbane");
  const [isActive, setIsActive] = useState(true);
  const [office, setOffice] = useState<AddressSuggestion | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the location.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = saving || submitting;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="location-name">Name</Label>
        <Input
          id="location-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Brisbane"
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-office">Office address</Label>
        <AddressAutocomplete
          id="location-office"
          value={office}
          onChange={setOffice}
          required
          disabled={busy}
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
          disabled={busy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-tz">Time zone</Label>
        <Select value={timezone} onValueChange={setTimezone} disabled={busy}>
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
          disabled={busy}
        />
      </div>

      <SheetFooter className="px-0">
        <Button type="submit" disabled={busy || !canCreate}>
          {busy ? "Saving…" : "Create"}
        </Button>
      </SheetFooter>
    </form>
  );
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
  const isNew = branch == null;

  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [savedBranch, setSavedBranch] = useState<Branch | null>(branch);

  useEffect(() => {
    if (!open) return;
    setTab("overview");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSavedBranch(branch);
  }, [open, branch]);

  const working = savedBranch ?? branch;
  const displayBranch = useSheetDisplayItem(working, open);
  const locationExists = working != null;

  function handleCreated(created: Branch) {
    setSavedBranch(created);
    onSaved(created);
    setTab("service-area");
  }

  function handleSaved(updated: Branch) {
    setSavedBranch(updated);
    onSaved(updated);
  }

  async function saveServiceArea(serviceArea: Branch["serviceArea"]) {
    if (!working) return;

    setSaving(true);
    try {
      const updated: Branch = {
        ...working,
        serviceArea,
        updatedAt: new Date()
      };
      await upsertBranch(updated);
      handleSaved(updated);
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
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <SheetTitle>{isNew && !working ? "New location" : "Location details"}</SheetTitle>
            {displayBranch ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/locations/${displayBranch.id}`}
                  onClick={() => onOpenChange(false)}>
                  <ExternalLink />
                  View details
                </Link>
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {working ? (
            <div className="inline-flex items-center gap-4 align-top">
              <LocationImageUpload key={working.id} branch={working} onSaved={handleSaved} />
              <div className="space-y-2">
                <p className="text-lg font-semibold">{working.name.trim() || "Location"}</p>
                <DetailSheetIconBadge icon={Power}>
                  {working.isActive !== false ? "Active" : "Inactive"}
                </DetailSheetIconBadge>
              </div>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList className={profileV2TabsListClassName}>
              <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="service-area" disabled={!locationExists}>
                Service area
              </ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="hours" disabled={!locationExists}>
                Operating hours
              </ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="classes" disabled={!locationExists}>
                Vehicle classes
              </ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="pricing" disabled={!locationExists}>
                Pricing
              </ProfileV2TabTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              {working ? (
                <LocationOverviewFields branch={working} onSaved={handleSaved} />
              ) : (
                <LocationCreateOverviewForm
                  canCreate={canCreate}
                  saving={saving}
                  onCreated={handleCreated}
                />
              )}
            </TabsContent>

            <TabsContent value="service-area" className="mt-0">
              {working ? (
                <LocationServiceAreaForm
                  branch={working}
                  officeSuggestion={officeSuggestionFromBranch(working)}
                  saving={saving}
                  onSave={saveServiceArea}
                  idPrefix="edit-location"
                  footer={
                    <SheetFooter className="px-0">
                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </Button>
                    </SheetFooter>
                  }
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Save the location overview first to configure the service area.
                </p>
              )}
            </TabsContent>

            <TabsContent value="hours" className="mt-0 space-y-4">
              {working ? (
                <LocationOperatingHoursTab branchId={working.id} nestedSheet />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Save the location overview first to configure operating hours.
                </p>
              )}
            </TabsContent>

            <TabsContent value="classes" className="mt-0 space-y-4">
              {working ? (
                <LocationVehicleClassesPanel nestedSheet />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Save the location overview first to configure vehicle classes.
                </p>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-0 space-y-4">
              {working ? (
                <LocationPricingPanel branchId={working.id} nestedSheet />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Save the location overview first to configure pricing.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
