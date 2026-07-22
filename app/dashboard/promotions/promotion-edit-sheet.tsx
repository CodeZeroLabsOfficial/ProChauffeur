"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MultiSelectField } from "@/components/multi-select-field";
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
import {
  buildNewPromotion,
  normalizePromoCode,
  tripTypeTitle,
  type Branch,
  type Promotion,
  type TripType,
  type VehicleClass
} from "@/lib/models";
import { deletePromotion, savePromotion } from "@/lib/services/firebase-service";

const TRIP_TYPE_OPTIONS = [
  { value: "transfer", label: tripTypeTitle.transfer },
  { value: "hourly", label: tripTypeTitle.hourly }
];

function toDateInputValue(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateInputValue(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function percentDisplay(promo: Promotion): string {
  if (promo.type !== "percent") return String(promo.value);
  return String(Math.round(promo.value * 10000) / 100);
}

export function PromotionEditSheet({
  promotion,
  branches,
  vehicleClasses,
  open,
  onOpenChange
}: {
  promotion: Promotion | null;
  branches: Branch[];
  vehicleClasses: VehicleClass[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNew = !promotion;
  const [draft, setDraft] = useState<Promotion>(() => promotion ?? buildNewPromotion());
  const [percentPoints, setPercentPoints] = useState(() =>
    percentDisplay(promotion ?? buildNewPromotion())
  );
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");

  const sheetKey = promotion?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = promotion ?? buildNewPromotion();
    setDraft(next);
    setPercentPoints(percentDisplay(next));
  }

  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name
  }));
  const vehicleClassOptions = vehicleClasses.map((vehicleClass) => ({
    value: vehicleClass.id,
    label: vehicleClass.displayName
  }));

  function patchConditions(patch: Partial<Promotion["conditions"]>) {
    setDraft((current) => ({
      ...current,
      conditions: { ...current.conditions, ...patch }
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    const code = normalizePromoCode(draft.code);
    if (!title) {
      toast.error("Title is required.");
      return;
    }
    if (!code) {
      toast.error("Promo code is required.");
      return;
    }

    let value = draft.value;
    if (draft.type === "percent") {
      const points = Number(percentPoints);
      if (!Number.isFinite(points) || points < 0 || points > 100) {
        toast.error("Percent must be between 0 and 100.");
        return;
      }
      value = points / 100;
    } else if (!Number.isFinite(value) || value < 0) {
      toast.error("Fixed discount cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      await savePromotion({
        ...draft,
        title,
        code,
        value,
        updatedAt: new Date()
      });
      toast.success(isNew ? "Promotion created." : "Promotion saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!promotion) return;
    setSaving(true);
    try {
      await deletePromotion(promotion.id);
      toast.success("Promotion deleted.");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete promotion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "New promotion" : "Edit promotion"}</SheetTitle>
          <SheetDescription>
            Set a code, discount, and optional conditions. Empty conditions apply to all bookings.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="promo-enabled">Enabled</Label>
            <Switch
              id="promo-enabled"
              checked={draft.isEnabled}
              onCheckedChange={(checked) => setDraft((c) => ({ ...c, isEnabled: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-title">Title</Label>
            <Input
              id="promo-title"
              value={draft.title}
              onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
              placeholder="First booking 25% off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              value={draft.code}
              onChange={(e) => setDraft((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME25"
              className="font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="promo-type">Discount type</Label>
              <Select
                value={draft.type}
                onValueChange={(value) =>
                  setDraft((c) => ({
                    ...c,
                    type: value === "fixed" ? "fixed" : "percent"
                  }))
                }>
                <SelectTrigger id="promo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-value">
                {draft.type === "percent" ? "Percent" : "Amount"}
              </Label>
              {draft.type === "percent" ? (
                <Input
                  id="promo-value"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={percentPoints}
                  onChange={(e) => setPercentPoints(e.target.value)}
                />
              ) : (
                <Input
                  id="promo-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number.isFinite(draft.value) ? draft.value : ""}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, value: Number(e.target.value) || 0 }))
                  }
                />
              )}
            </div>
          </div>

          <Separator />
          <p className="text-sm font-medium">Conditions</p>

          <div className="space-y-2">
            <Label>Locations</Label>
            <MultiSelectField
              id="promo-branches"
              options={branchOptions}
              selected={draft.conditions.branchIds ?? []}
              onSelectedChange={(ids) => patchConditions({ branchIds: ids.length ? ids : null })}
              placeholder="All Locations"
              emptyMessage="No Locations."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="promo-starts">Starts</Label>
              <Input
                id="promo-starts"
                type="date"
                value={toDateInputValue(draft.conditions.startsAt)}
                onChange={(e) =>
                  patchConditions({ startsAt: fromDateInputValue(e.target.value, false) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-ends">Ends</Label>
              <Input
                id="promo-ends"
                type="date"
                value={toDateInputValue(draft.conditions.endsAt)}
                onChange={(e) =>
                  patchConditions({ endsAt: fromDateInputValue(e.target.value, true) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trip types</Label>
            <MultiSelectField
              id="promo-trip-types"
              options={TRIP_TYPE_OPTIONS}
              selected={(draft.conditions.tripTypes as string[]) ?? []}
              onSelectedChange={(ids) =>
                patchConditions({
                  tripTypes: ids.length ? (ids as TripType[]) : null
                })
              }
              placeholder="All trip types"
              emptyMessage="No trip types."
            />
          </div>

          <div className="space-y-2">
            <Label>Vehicle classes</Label>
            <MultiSelectField
              id="promo-classes"
              options={vehicleClassOptions}
              selected={draft.conditions.vehicleClassIds ?? []}
              onSelectedChange={(ids) =>
                patchConditions({ vehicleClassIds: ids.length ? ids : null })
              }
              placeholder="All classes"
              emptyMessage="No vehicle classes."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="promo-max">Max redemptions</Label>
              <Input
                id="promo-max"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={draft.conditions.maxRedemptions ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  patchConditions({
                    maxRedemptions: raw === "" ? null : Math.max(1, Math.floor(Number(raw)) || 1)
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-per-customer">Per customer</Label>
              <Input
                id="promo-per-customer"
                type="number"
                min={1}
                placeholder="Unlimited"
                value={draft.conditions.perCustomerLimit ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  patchConditions({
                    perCustomerLimit:
                      raw === "" ? null : Math.max(1, Math.floor(Number(raw)) || 1)
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-min-fare">Minimum fare</Label>
            <Input
              id="promo-min-fare"
              type="number"
              min={0}
              step="0.01"
              placeholder="No minimum"
              value={draft.conditions.minimumSubtotal ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                patchConditions({
                  minimumSubtotal: raw === "" ? null : Math.max(0, Number(raw) || 0)
                });
              }}
            />
          </div>

          <SheetFooter className="mt-auto gap-2 sm:flex-col">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : isNew ? "Create promotion" : "Save changes"}
            </Button>
            {!isNew ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                className="w-full"
                onClick={handleDelete}>
                Delete
              </Button>
            ) : null}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
