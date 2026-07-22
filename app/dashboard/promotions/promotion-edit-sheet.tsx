"use client";

import { useState } from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { toast } from "sonner";

import { MultiSelectField } from "@/components/multi-select-field";
import { NumberStepper } from "@/components/number-stepper";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";

const TRIP_TYPE_OPTIONS = [
  { value: "transfer", label: tripTypeTitle.transfer },
  { value: "hourly", label: tripTypeTitle.hourly }
];

const LIMIT_STEPPER_MAX = 9999;

function percentPointsFromPromo(promo: Promotion): number {
  if (promo.type !== "percent") return 10;
  return Math.max(0, Math.min(100, Math.round(promo.value * 100)));
}

function limitStepperValue(limit: number | null | undefined): number {
  if (limit == null || limit < 1) return 0;
  return Math.min(LIMIT_STEPPER_MAX, Math.floor(limit));
}

function limitFromStepper(value: number): number | null {
  if (value < 1) return null;
  return Math.floor(value);
}

function formatLimitStepper(value: number): string {
  return value < 1 ? "Unlimited" : String(value);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function DatePickerField({
  label,
  value,
  onChange,
  endOfDaySelect = false
}: {
  label: string;
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  endOfDaySelect?: boolean;
}) {
  const selected = value ?? undefined;

  return (
    <div className="flex flex-col space-y-2">
      <Label>{label}</Label>
      <Popover modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full pl-3 text-left font-normal",
              !selected && "text-muted-foreground"
            )}>
            {selected ? format(selected, "PPP") : <span>Pick a date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0"
          align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={new Date().getFullYear() - 2}
            toYear={new Date().getFullYear() + 10}
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                onChange(null);
                return;
              }
              onChange(endOfDaySelect ? endOfDay(date) : startOfDay(date));
            }}
            defaultMonth={selected}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
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
    percentPointsFromPromo(promotion ?? buildNewPromotion())
  );
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");

  const sheetKey = promotion?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = promotion ?? buildNewPromotion();
    setDraft(next);
    setPercentPoints(percentPointsFromPromo(next));
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
      if (!Number.isFinite(percentPoints) || percentPoints < 0 || percentPoints > 100) {
        toast.error("Percent must be between 0 and 100.");
        return;
      }
      value = percentPoints / 100;
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
            {draft.type === "percent" ? (
              <NumberStepper
                id="promo-value"
                label="Percent"
                value={percentPoints}
                onChange={setPercentPoints}
                min={0}
                max={100}
              />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="promo-value">Amount</Label>
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
              </div>
            )}
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
            <DatePickerField
              label="Starts"
              value={draft.conditions.startsAt}
              onChange={(date) => patchConditions({ startsAt: date })}
            />
            <DatePickerField
              label="Ends"
              value={draft.conditions.endsAt}
              onChange={(date) => patchConditions({ endsAt: date })}
              endOfDaySelect
            />
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
            <NumberStepper
              id="promo-max"
              label="Max redemptions"
              value={limitStepperValue(draft.conditions.maxRedemptions)}
              onChange={(value) => patchConditions({ maxRedemptions: limitFromStepper(value) })}
              min={0}
              max={LIMIT_STEPPER_MAX}
              formatValue={formatLimitStepper}
            />
            <NumberStepper
              id="promo-per-customer"
              label="Per customer"
              value={limitStepperValue(draft.conditions.perCustomerLimit)}
              onChange={(value) => patchConditions({ perCustomerLimit: limitFromStepper(value) })}
              min={0}
              max={LIMIT_STEPPER_MAX}
              formatValue={formatLimitStepper}
            />
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

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="promo-active">Active</Label>
              <p className="text-muted-foreground text-xs">
                Inactive promos cannot be applied to bookings.
              </p>
            </div>
            <Switch
              id="promo-active"
              checked={draft.isEnabled}
              onCheckedChange={(checked) => setDraft((c) => ({ ...c, isEnabled: checked }))}
              disabled={saving}
            />
          </div>

          <SheetFooter className="mt-auto px-0">
            {isNew ? (
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving…" : "Create promotion"}
              </Button>
            ) : (
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={handleDelete}>
                  Delete
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
