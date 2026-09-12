"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, ExternalLink, ImagePlusIcon, Mail, MapPin, Phone, Power } from "lucide-react";
import { toast } from "sonner";

import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineOfficeAddressField } from "@/components/inline-office-address-field";
import { Button } from "@/components/ui/button";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { officeSuggestionFromBranch } from "@/lib/branch/office-address";
import type { AddressSuggestion } from "@/lib/mapbox/geocoding";
import type { Branch } from "@/lib/models";
import {
  syncOfficeFleetLocation,
  uploadBranchImage,
  upsertBranch
} from "@/lib/services/firebase-service";

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
          longitude: nextOffice.coordinate.longitude
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
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={Building2}>Name</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="name"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={branch.name}
                editLabel="name"
                placeholder="e.g. city name"
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
          <div className="space-y-1">
            <DetailLabel icon={Mail}>Email</DetailLabel>
            <dd>
              <InlineEditableField
                fieldId="email"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={branch.officeEmail?.trim() ?? ""}
                inputType="email"
                editLabel="email"
                placeholder="Optional"
                onSave={async (next) => saveBranch({ officeEmail: next.trim() || null })}
              />
            </dd>
          </div>
          <div className="col-span-2 space-y-1">
            <DetailLabel icon={MapPin}>Address</DetailLabel>
            <dd>
              <InlineOfficeAddressField
                fieldId="office"
                activeFieldId={activeFieldId}
                onActiveFieldIdChange={setActiveFieldId}
                value={office}
                editLabel="address"
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
        </dl>
      </div>
    </div>
  );
}

export function LocationEditSheet({
  open,
  onOpenChange,
  branch,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSaved: (branch: Branch) => void;
}) {
  const [savedBranch, setSavedBranch] = useState<Branch | null>(branch);

  useEffect(() => {
    if (!open) return;
    setSavedBranch(branch);
  }, [open, branch]);

  const working = savedBranch ?? branch;
  const displayBranch = useSheetDisplayItem(working, open);

  function handleSaved(updated: Branch) {
    setSavedBranch(updated);
    onSaved(updated);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <SheetTitle>Location details</SheetTitle>
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
            <>
              <div className="inline-flex items-center gap-4 align-top">
                <LocationImageUpload key={working.id} branch={working} onSaved={handleSaved} />
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{working.name.trim() || "Location"}</p>
                  <DetailSheetIconBadge icon={Power}>
                    {working.isActive !== false ? "Active" : "Inactive"}
                  </DetailSheetIconBadge>
                </div>
              </div>
              <LocationOverviewFields branch={working} onSaved={handleSaved} />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
