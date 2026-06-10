"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveVehicleClass } from "@/lib/services/firebase-service";
import { TRIP_TYPES, buildInitialVehicleClass, tripTypeTitle, type VehicleClass } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { NumberStepper } from "@/components/number-stepper";

type RateNumberField = {
  key: string;
  label: string;
  step?: string;
};

const transferFields: RateNumberField[] = [
  { key: "minimumBaseRate", label: "Minimum base rate" },
  { key: "baseFare", label: "Base fare" },
  { key: "deadheadRatePerUnit", label: "Deadhead rate", step: "0.01" },
  { key: "tripRatePerUnit", label: "Trip rate", step: "0.01" },
  { key: "returnToBaseFee", label: "Return-to-base fee" },
  { key: "waitingFeeFlat", label: "Waiting fee" }
];

const hourlyFields: RateNumberField[] = [
  { key: "weekdayHourlyRate", label: "Weekday hourly rate" },
  { key: "weekendHourlyRate", label: "Weekend hourly rate" },
  { key: "weekdayMinimumHours", label: "Weekday min. hours", step: "0.5" },
  { key: "weekendMinimumHours", label: "Weekend min. hours", step: "0.5" },
  { key: "freeDeadheadMinutes", label: "Free deadhead (min)" },
  { key: "deadheadRatePerMinute", label: "Deadhead / min", step: "0.01" },
  { key: "displayHourlyFrom", label: "Display from" }
];

export function VehicleClassEditSheet({
  vehicleClass,
  open,
  onOpenChange,
  onSaved
}: {
  vehicleClass: VehicleClass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isNew = !vehicleClass;
  const [draft, setDraft] = useState<VehicleClass>(() =>
    vehicleClass ??
      buildInitialVehicleClass({
        id: crypto.randomUUID(),
        slug: "",
        displayName: ""
      })
  );
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");

  const sheetKey = vehicleClass?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    setDraft(
      vehicleClass ??
        buildInitialVehicleClass({
          id: crypto.randomUUID(),
          slug: "",
          displayName: ""
        })
    );
  }

  function setTransferField(key: string, value: number) {
    setDraft((current) => ({
      ...current,
      transfer: { ...current.transfer, [key]: value }
    }));
  }

  function setHourlyField(key: string, value: number) {
    setDraft((current) => ({
      ...current,
      hourly: { ...current.hourly, [key]: value }
    }));
  }

  function toggleTripType(tripType: (typeof TRIP_TYPES)[number]) {
    setDraft((current) => {
      const selected = new Set(current.supportedTripTypes);
      if (selected.has(tripType)) selected.delete(tripType);
      else selected.add(tripType);
      return { ...current, supportedTripTypes: [...selected] };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVehicleClass({ ...draft, updatedAt: new Date() });
      toast.success(isNew ? "Vehicle class created." : "Vehicle class saved.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save vehicle class.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add vehicle class" : "Edit vehicle class"}</SheetTitle>
        </SheetHeader>
        <form className="mt-6 space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={draft.displayName}
                onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={draft.slug}
                onChange={(e) => setDraft((c) => ({ ...c, slug: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={draft.sortOrder}
                onChange={(e) => setDraft((c) => ({ ...c, sortOrder: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <NumberStepper
              id="passengerCapacity"
              label="Passengers"
              value={draft.passengerCapacity}
              onChange={(value) => setDraft((c) => ({ ...c, passengerCapacity: value }))}
              min={1}
              max={60}
            />
            <NumberStepper
              id="smallLuggageCount"
              label="Small luggage"
              value={draft.smallLuggageCount}
              onChange={(value) => setDraft((c) => ({ ...c, smallLuggageCount: value }))}
              min={0}
              max={20}
            />
            <NumberStepper
              id="largeLuggageCount"
              label="Large luggage"
              value={draft.largeLuggageCount}
              onChange={(value) => setDraft((c) => ({ ...c, largeLuggageCount: value }))}
              min={0}
              max={20}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isEnabled}
                onCheckedChange={(checked) => setDraft((c) => ({ ...c, isEnabled: checked }))}
              />
              <Label>Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.isVisible}
                onCheckedChange={(checked) => setDraft((c) => ({ ...c, isVisible: checked }))}
              />
              <Label>Visible in booking</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supported trip types</Label>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.filter((type) => type !== "round_trip").map((tripType) => {
                const selected = draft.supportedTripTypes.includes(tripType);
                return (
                  <Button
                    key={tripType}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => toggleTripType(tripType)}>
                    {tripTypeTitle[tripType]}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Transfer rates</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {transferFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type="number"
                    step={field.step ?? "1"}
                    value={draft.transfer[field.key as keyof typeof draft.transfer]}
                    onChange={(e) => setTransferField(field.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Hourly rates</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {hourlyFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type="number"
                    step={field.step ?? "1"}
                    value={draft.hourly[field.key as keyof typeof draft.hourly]}
                    onChange={(e) => setHourlyField(field.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
