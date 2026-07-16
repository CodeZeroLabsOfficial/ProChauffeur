"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ServiceAreaRadiusMap } from "@/app/dashboard/locations/components/service-area-radius-map";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { officeSuggestionFromBranch } from "@/lib/branch/office-address";
import {
  RADIUS_KM_DEFAULT,
  RADIUS_KM_MAX,
  RADIUS_KM_MIN,
  buildServiceAreaFromEditor,
  centerSuggestionFromServiceArea,
  editorTypeFromBranch,
  postcodesToText,
  radiusKmFromServiceArea,
  type ServiceAreaEditorType
} from "@/lib/branch/service-area";
import type { Branch } from "@/lib/models";

export function LocationServiceAreaForm({
  branch,
  officeSuggestion,
  saving,
  onSave,
  idPrefix = "location",
  footer
}: {
  branch: Branch;
  /** Draft office from the edit sheet overview tab; falls back to saved branch office. */
  officeSuggestion?: AddressSuggestion | null;
  saving: boolean;
  onSave: (serviceArea: Branch["serviceArea"]) => Promise<void>;
  idPrefix?: string;
  footer?: React.ReactNode;
}) {
  const [areaType, setAreaType] = useState<ServiceAreaEditorType>(() => editorTypeFromBranch(branch));
  const [postcodesText, setPostcodesText] = useState(() => postcodesToText(branch.serviceArea));
  const [center, setCenter] = useState<AddressSuggestion | null>(() =>
    centerSuggestionFromServiceArea(branch)
  );
  const [radiusKm, setRadiusKm] = useState(() => radiusKmFromServiceArea(branch.serviceArea));

  useEffect(() => {
    setAreaType(editorTypeFromBranch(branch));
    setPostcodesText(postcodesToText(branch.serviceArea));
    setCenter(centerSuggestionFromServiceArea(branch));
    setRadiusKm(radiusKmFromServiceArea(branch.serviceArea));
  }, [branch]);

  const resolvedOffice =
    officeSuggestion ?? officeSuggestionFromBranch(branch);
  const canUseOffice = resolvedOffice != null;

  function handleTypeChange(next: string) {
    if (next !== "postcodes" && next !== "radius") return;
    setAreaType(next);
    if (next === "postcodes") {
      setPostcodesText(postcodesToText(branch.serviceArea));
    } else {
      setCenter(centerSuggestionFromServiceArea(branch));
      setRadiusKm(radiusKmFromServiceArea(branch.serviceArea));
    }
  }

  function useOfficeAddress() {
    if (!resolvedOffice) return;
    setCenter(resolvedOffice);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (areaType === "radius") {
      if (!center) {
        toast.error("Select a center address from the suggestions.");
        return;
      }
      if (radiusKm < RADIUS_KM_MIN) {
        toast.error(`Radius must be at least ${RADIUS_KM_MIN} km.`);
        return;
      }
    }

    const serviceArea = buildServiceAreaFromEditor({
      type: areaType,
      postcodesText,
      center,
      radiusKm
    });

    await onSave(serviceArea);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label>Area type</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={areaType}
          onValueChange={handleTypeChange}
          disabled={saving}>
          <ToggleGroupItem value="postcodes" className="min-w-24">
            Postcodes
          </ToggleGroupItem>
          <ToggleGroupItem value="radius" className="min-w-24">
            Radius
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {areaType === "postcodes" ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-postcodes`}>Service postcodes</Label>
          <Textarea
            id={`${idPrefix}-postcodes`}
            rows={8}
            value={postcodesText}
            onChange={(e) => setPostcodesText(e.target.value)}
            placeholder={"One per line or comma-separated\n4000\n4001"}
            disabled={saving}
          />
          <p className="text-muted-foreground text-xs">
            Used to route customer bookings when multi-location is enabled. Avoid overlapping lists
            across locations.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-center`}>Center</Label>
            <AddressAutocomplete
              id={`${idPrefix}-center`}
              value={center}
              onChange={setCenter}
              disabled={saving}
              placeholder="Search for an address…"
            />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || !canUseOffice}
                onClick={useOfficeAddress}>
                Use office address
              </Button>
              {!canUseOffice ? (
                <p className="text-muted-foreground text-xs">Set an office address on Overview first.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${idPrefix}-radius`}>Radius</Label>
              <span className="text-sm font-medium tabular-nums">{radiusKm} km</span>
            </div>
            <Slider
              id={`${idPrefix}-radius`}
              min={RADIUS_KM_MIN}
              max={RADIUS_KM_MAX}
              step={1}
              value={[radiusKm]}
              onValueChange={(values) => setRadiusKm(values[0] ?? RADIUS_KM_DEFAULT)}
              disabled={saving}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{RADIUS_KM_MIN} km</span>
              <span>{RADIUS_KM_MAX} km</span>
            </div>
          </div>

          <ServiceAreaRadiusMap
            center={center?.coordinate ?? null}
            radiusKm={radiusKm}
          />

          <p className="text-muted-foreground text-xs">
            Routes customer bookings when multi-location is enabled. Pickup must fall inside this
            circle. Postcode matches take priority when both apply.
          </p>
        </>
      )}

      {footer ?? (
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      )}
    </form>
  );
}
