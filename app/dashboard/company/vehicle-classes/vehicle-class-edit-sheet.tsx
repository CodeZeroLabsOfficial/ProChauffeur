"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveVehicleClass } from "@/lib/services/firebase-service";
import {
  TRIP_TYPES,
  buildInitialVehicleClass,
  slugFromDisplayName,
  tripTypeTitle,
  type VehicleClass
} from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberStepper } from "@/components/number-stepper";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-3 shadow-none!";

function SectionHeading({ children }: { children: string }) {
  return <h4 className="text-sm font-medium">{children}</h4>;
}

type RateNumberField = {
  key: string;
  label: string;
  step?: number;
  decimals?: number;
  min?: number;
  max?: number;
};

const transferFields: RateNumberField[] = [
  { key: "minimumBaseRate", label: "Min. base rate" },
  { key: "baseFare", label: "Base fare" },
  { key: "deadheadRatePerUnit", label: "Deadhead rate", step: 0.01, decimals: 2 },
  { key: "tripRatePerUnit", label: "Trip rate", step: 0.01, decimals: 2 },
  { key: "returnToBaseFee", label: "Return-to-base" },
  { key: "waitingFeeFlat", label: "Waiting fee" }
];

const hourlyFields: RateNumberField[] = [
  { key: "weekdayHourlyRate", label: "Weekday hourly" },
  { key: "weekendHourlyRate", label: "Weekend hourly" },
  { key: "weekdayMinimumHours", label: "Weekday min. hrs", step: 0.5, decimals: 1 },
  { key: "weekendMinimumHours", label: "Weekend min. hrs", step: 0.5, decimals: 1 },
  { key: "freeDeadheadMinutes", label: "Free deadhead" },
  { key: "deadheadRatePerMinute", label: "Deadhead / min", step: 0.01, decimals: 2 },
  { key: "displayHourlyFrom", label: "Display from" }
];

const RATE_MIN = 0;
const RATE_MAX = 9999;

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
      const slug = slugFromDisplayName(draft.displayName);
      if (!slug) {
        toast.error("Display name must contain at least one letter or number.");
        return;
      }
      await saveVehicleClass({ ...draft, slug, updatedAt: new Date() });
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add vehicle class" : "Edit vehicle class"}</SheetTitle>
        </SheetHeader>
        <Separator />
        <form className="space-y-4 px-4" onSubmit={onSubmit}>
          <Tabs key={sheetKey} defaultValue="overview" className="gap-4">
            <TabsList
              className={cn(
                "-mb-0.5 h-auto w-full justify-start gap-4 border-none bg-transparent p-0"
              )}>
              <TabsTrigger value="overview" className={tabTriggerClassName}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="pricing" className={tabTriggerClassName}>
                Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="space-y-4">
                <SectionHeading>Class details</SectionHeading>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={draft.displayName}
                    onChange={(e) => setDraft((c) => ({ ...c, displayName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Capacity</SectionHeading>
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
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Booking</SectionHeading>
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
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-0 space-y-4">
              <div className="space-y-4">
                <SectionHeading>Point-to-point rates</SectionHeading>
                <div className="grid gap-3 sm:grid-cols-3">
                  {transferFields.map((field) => (
                    <NumberStepper
                      key={field.key}
                      id={`transfer-${field.key}`}
                      label={field.label}
                      value={draft.transfer[field.key as keyof typeof draft.transfer]}
                      onChange={(value) => setTransferField(field.key, value)}
                      min={field.min ?? RATE_MIN}
                      max={field.max ?? RATE_MAX}
                      step={field.step ?? 1}
                      decimals={field.decimals}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <SectionHeading>Hourly rates</SectionHeading>
                <div className="grid gap-3 sm:grid-cols-3">
                  {hourlyFields.map((field) => (
                    <NumberStepper
                      key={field.key}
                      id={`hourly-${field.key}`}
                      label={field.label}
                      value={draft.hourly[field.key as keyof typeof draft.hourly]}
                      onChange={(value) => setHourlyField(field.key, value)}
                      min={field.min ?? RATE_MIN}
                      max={field.max ?? RATE_MAX}
                      step={field.step ?? 1}
                      decimals={field.decimals}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
