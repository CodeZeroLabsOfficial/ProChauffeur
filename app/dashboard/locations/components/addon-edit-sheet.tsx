"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  tripTypeTitle,
  type PricingAddon,
  type TripType,
  type VehicleClass
} from "@/lib/models";
import { MultiSelectField } from "@/components/multi-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

const TRIP_TYPE_OPTIONS = [
  { value: "transfer", label: tripTypeTitle.transfer },
  { value: "hourly", label: tripTypeTitle.hourly }
];

function buildNewAddon(): PricingAddon {
  return {
    id: crypto.randomUUID(),
    title: "",
    price: 0,
    isEnabled: true,
    tripTypes: ["transfer", "hourly"],
    vehicleClassIds: []
  };
}

export function AddonEditSheet({
  addon,
  vehicleClasses,
  open,
  onOpenChange,
  onSave,
  onDelete,
  nested = false
}: {
  addon: PricingAddon | null;
  vehicleClasses: VehicleClass[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (addon: PricingAddon) => void;
  onDelete?: (id: string) => void;
  nested?: boolean;
}) {
  const isNew = !addon;
  const [draft, setDraft] = useState<PricingAddon>(() => addon ?? buildNewAddon());
  const [seedKey, setSeedKey] = useState("");

  const sheetKey = addon?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    setDraft(addon ?? buildNewAddon());
  }

  const vehicleClassOptions = vehicleClasses.map((vehicleClass) => ({
    value: vehicleClass.id,
    label: vehicleClass.displayName
  }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (draft.tripTypes.length === 0) {
      toast.error("Select at least one trip type.");
      return;
    }
    if (draft.price < 0) {
      toast.error("Price cannot be negative.");
      return;
    }
    onSave({ ...draft, title });
    toast.success(isNew ? "Add-on added." : "Add-on saved.");
    onOpenChange(false);
  }

  function handleDelete() {
    if (!addon || !onDelete) return;
    onDelete(addon.id);
    toast.success("Add-on removed.");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add add-on" : "Edit add-on"}</SheetTitle>
          <SheetDescription>
            Optional extras offered during booking. Save pricing on the page to persist changes.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <form className="space-y-4 px-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="addon-title">Title</Label>
            <Input
              id="addon-title"
              value={draft.title}
              onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addon-price">Price</Label>
            <Input
              id="addon-price"
              type="number"
              min={0}
              step="0.01"
              value={draft.price}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  price: parseFloat(e.target.value) || 0
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addon-trip-types">Trip types</Label>
            <MultiSelectField
              id="addon-trip-types"
              options={TRIP_TYPE_OPTIONS}
              selected={draft.tripTypes}
              onSelectedChange={(selected) =>
                setDraft((current) => ({ ...current, tripTypes: selected as TripType[] }))
              }
              placeholder="Select trip types"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addon-vehicle-classes">Vehicle classes</Label>
            <MultiSelectField
              id="addon-vehicle-classes"
              options={vehicleClassOptions}
              selected={draft.vehicleClassIds}
              onSelectedChange={(selected) =>
                setDraft((current) => ({ ...current, vehicleClassIds: selected }))
              }
              placeholder="All classes"
              emptyMessage="No vehicle classes configured."
            />
            <p className="text-muted-foreground text-xs">
              Leave empty to offer this add-on for all vehicle classes.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="addon-enabled">Enabled</Label>
              <p className="text-muted-foreground text-xs">
                Disabled add-ons are hidden from booking and quotes.
              </p>
            </div>
            <Switch
              id="addon-enabled"
              checked={draft.isEnabled}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, isEnabled: checked }))
              }
            />
          </div>

          <SheetFooter className="flex-col gap-2 px-0 sm:flex-col sm:items-stretch">
            {!isNew && onDelete ? (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Delete add-on
              </Button>
            ) : null}
            <Button type="submit">{isNew ? "Add add-on" : "Save add-on"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function formatAddonTripTypes(addon: PricingAddon): string {
  if (addon.tripTypes.length === 0) return "Not set";
  return addon.tripTypes.map((t) => tripTypeTitle[t]).join(", ");
}

export function formatAddonVehicleClasses(
  addon: PricingAddon,
  vehicleClasses: VehicleClass[]
): string {
  if (addon.vehicleClassIds.length === 0) return "All classes";
  const names = addon.vehicleClassIds
    .map((id) => vehicleClasses.find((vehicleClass) => vehicleClass.id === id)?.displayName)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Not set";
}
