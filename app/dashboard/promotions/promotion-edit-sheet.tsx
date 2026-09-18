"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { InfoIcon, UploadIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionHeading } from "@/components/detail-sheet-fields";
import {
  buildNewPromotion,
  normalizePromoCode,
  tripTypeTitle,
  type Branch,
  type Promotion,
  type TripType
} from "@/lib/models";
import { deletePromotion, savePromotion } from "@/lib/services/firebase-service";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { getCachedOperatorLocale } from "@/lib/services/operator-config-cache";
import { cn } from "@/lib/utils";

const TRIP_TYPE_OPTIONS = [
  { value: "transfer", label: tripTypeTitle.transfer },
  { value: "hourly", label: tripTypeTitle.hourly }
];

const LIMIT_STEPPER_MAX = 9999;
const FARE_STEPPER_MAX = 100_000;

type FieldErrors = {
  title?: boolean;
  code?: boolean;
  value?: boolean;
  branchIds?: boolean;
  tripTypes?: boolean;
  vehicleClassIds?: boolean;
};

const ALL_TRIP_TYPES = TRIP_TYPE_OPTIONS.map((option) => option.value as TripType);

function FieldInfoTooltip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent rounded-full p-1"
          aria-label={`About ${label}`}>
          <InfoIcon className="text-muted-foreground size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({
  htmlFor,
  children,
  tip,
  tipLabel
}: {
  htmlFor?: string;
  children: string;
  tip: string;
  tipLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      <FieldInfoTooltip label={tipLabel ?? children.toLowerCase()}>{tip}</FieldInfoTooltip>
    </div>
  );
}

/** Empty/null means unrestricted in storage; for editing expand to every option. New promos stay empty. */
function resolveConditionIds(
  stored: string[] | null | undefined,
  allIds: string[],
  isNewPromo: boolean
): string[] {
  if (isNewPromo) return [];
  const ids = stored?.filter(Boolean) ?? [];
  return ids.length === 0 ? allIds : ids;
}

function isAllSelected(selected: string[], allIds: string[]): boolean {
  return allIds.length > 0 && allIds.every((id) => selected.includes(id));
}

/** Persist null when every option is selected (unrestricted); otherwise the explicit list. */
function persistConditionIds(selected: string[], allIds: string[]): string[] | null {
  if (isAllSelected(selected, allIds)) return null;
  return selected;
}

function percentPointsFromPromo(promo: Promotion): number {
  if (promo.type !== "percent") return 10;
  return Math.max(0, Math.min(100, Math.round(promo.value * 100)));
}

function fixedAmountFromPromo(promo: Promotion): number {
  if (promo.type === "fixed") return Math.max(0, promo.value);
  return Math.max(0, Math.round(promo.value * 100));
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

function minFareStepperValue(amount: number | null | undefined): number {
  if (amount == null || amount < 0) return 0;
  return Math.min(FARE_STEPPER_MAX, amount);
}

function minFareFromStepper(value: number): number | null {
  if (value <= 0) return null;
  return value;
}

function formatMinFareStepper(value: number): string {
  return value <= 0 ? "None" : value.toFixed(value % 1 === 0 ? 0 : 2);
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
  tip,
  value,
  onChange,
  endOfDaySelect = false
}: {
  label: string;
  tip: string;
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  endOfDaySelect?: boolean;
}) {
  const selected = value ?? undefined;

  return (
    <div className="flex flex-col space-y-2">
      <FieldLabel tip={tip}>{label}</FieldLabel>
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
  vehicleClasses: { id: string; displayName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNew = !promotion;
  const { branchId } = useActiveBranch();
  const [draft, setDraft] = useState<Promotion>(() => promotion ?? buildNewPromotion());
  const [percentPoints, setPercentPoints] = useState(() =>
    percentPointsFromPromo(promotion ?? buildNewPromotion())
  );
  const [fixedAmount, setFixedAmount] = useState(() =>
    fixedAmountFromPromo(promotion ?? buildNewPromotion())
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState("");
  const [seedKey, setSeedKey] = useState("");

  const sheetKey = promotion?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = promotion ?? buildNewPromotion();
    const nextIsNew = !promotion;
    const branchIds = resolveConditionIds(
      next.conditions.branchIds,
      branches.map((branch) => branch.id),
      nextIsNew
    );
    const tripTypes = resolveConditionIds(
      next.conditions.tripTypes,
      ALL_TRIP_TYPES,
      nextIsNew
    ) as TripType[];
    const vehicleClassIds = resolveConditionIds(
      next.conditions.vehicleClassIds,
      vehicleClasses.map((vehicleClass) => vehicleClass.id),
      nextIsNew
    );
    setDraft({
      ...next,
      conditions: {
        ...next.conditions,
        branchIds,
        tripTypes,
        vehicleClassIds
      }
    });
    setPercentPoints(percentPointsFromPromo(next));
    setFixedAmount(fixedAmountFromPromo(next));
    setFieldErrors({});
  }

  useEffect(() => {
    if (!open) return;
    getCachedOperatorLocale(branchId)
      .then((locale) => setCurrency(locale.currency))
      .catch(() => setCurrency(""));
  }, [open, branchId]);

  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name
  }));
  const vehicleClassOptions = vehicleClasses.map((vehicleClass) => ({
    value: vehicleClass.id,
    label: vehicleClass.displayName
  }));
  const branchIdsAll = branchOptions.map((option) => option.value);
  const vehicleClassIdsAll = vehicleClassOptions.map((option) => option.value);

  function patchConditions(patch: Partial<Promotion["conditions"]>) {
    setDraft((current) => ({
      ...current,
      conditions: { ...current.conditions, ...patch }
    }));
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    const code = normalizePromoCode(draft.code);
    const description = draft.description?.trim() || null;
    const discountValue = draft.type === "percent" ? percentPoints : fixedAmount;
    const branchIds = draft.conditions.branchIds?.filter(Boolean) ?? [];
    const tripTypes = draft.conditions.tripTypes?.filter(Boolean) ?? [];
    const vehicleClassIds = draft.conditions.vehicleClassIds?.filter(Boolean) ?? [];
    const errors: FieldErrors = {
      title: !title,
      code: !code,
      value: !Number.isFinite(discountValue) || discountValue <= 0,
      branchIds: branchIds.length === 0,
      tripTypes: tripTypes.length === 0,
      vehicleClassIds: vehicleClassIds.length === 0
    };
    setFieldErrors(errors);
    if (
      errors.title ||
      errors.code ||
      errors.value ||
      errors.branchIds ||
      errors.tripTypes ||
      errors.vehicleClassIds
    ) {
      return;
    }

    const value = draft.type === "percent" ? percentPoints / 100 : fixedAmount;

    setSaving(true);
    try {
      await savePromotion({
        ...draft,
        title,
        description,
        code,
        value,
        conditions: {
          ...draft.conditions,
          branchIds: persistConditionIds(branchIds, branchIdsAll),
          tripTypes: persistConditionIds(tripTypes, ALL_TRIP_TYPES) as TripType[] | null,
          vehicleClassIds: persistConditionIds(vehicleClassIds, vehicleClassIdsAll)
        },
        updatedAt: new Date()
      });
      toast.success(isNew ? "Coupon created." : "Coupon saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save coupon.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!promotion) return;
    setSaving(true);
    try {
      await deletePromotion(promotion.id);
      toast.success("Coupon deleted.");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete coupon.");
    } finally {
      setSaving(false);
    }
  }

  const editCodeLabel = draft.code.trim() || promotion?.code || "this coupon";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add coupon" : "Edit coupon"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Create a new discount coupon."
              : `Update the details of “${editCodeLabel}”.`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <TooltipProvider>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
            <div className="space-y-4">
              <SectionHeading>Coupon details</SectionHeading>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <FieldLabel htmlFor="promo-code" tip="Unique code customers enter at checkout.">
                    Coupon code
                  </FieldLabel>
                  <Input
                    id="promo-code"
                    value={draft.code}
                    onChange={(e) => {
                      setDraft((c) => ({ ...c, code: e.target.value.toUpperCase() }));
                      clearFieldError("code");
                    }}
                    placeholder="WELCOME25"
                    className="peer font-mono uppercase"
                    aria-invalid={fieldErrors.code || undefined}
                  />
                  {fieldErrors.code ? (
                    <p
                      aria-live="polite"
                      className="peer-aria-invalid:text-destructive text-destructive text-xs"
                      role="alert">
                      Code is required
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="promo-title"
                    tip="Internal name shown in the promotions list.">
                    Title
                  </FieldLabel>
                  <Input
                    id="promo-title"
                    value={draft.title}
                    onChange={(e) => {
                      setDraft((c) => ({ ...c, title: e.target.value }));
                      clearFieldError("title");
                    }}
                    placeholder="First booking 25% off"
                    aria-invalid={fieldErrors.title || undefined}
                    className="peer"
                  />
                  {fieldErrors.title ? (
                    <p
                      aria-live="polite"
                      className="peer-aria-invalid:text-destructive text-destructive text-xs"
                      role="alert">
                      Title is required
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel
                  htmlFor="promo-description"
                  tip="Optional — shown to admins only.">
                  Description
                </FieldLabel>
                <Textarea
                  id="promo-description"
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Seasonal discount for returning guests."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel tip="Used for the iPhone app. Falls back to a stock photo when left empty.">
                  Banner image
                </FieldLabel>
                <div
                  className="border-muted-foreground/25 bg-muted/30 text-muted-foreground flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center"
                  aria-hidden>
                  <UploadIcon className="size-5 opacity-70" />
                  <span className="text-sm">Click or drag to upload</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <SectionHeading>Discount</SectionHeading>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="promo-type"
                    tip="Percent off the fare, or a fixed amount.">
                    Discount type
                  </FieldLabel>
                  <Select
                    value={draft.type}
                    onValueChange={(value) => {
                      const nextType = value === "fixed" ? "fixed" : "percent";
                      setDraft((c) => ({ ...c, type: nextType }));
                      clearFieldError("value");
                    }}>
                    <SelectTrigger id="promo-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {draft.type === "percent" ? (
                    <NumberStepper
                      id="promo-value"
                      label="Discount value"
                      labelExtra={
                        <FieldInfoTooltip label="discount value">
                          Amount or percent depending on discount type.
                        </FieldInfoTooltip>
                      }
                      value={percentPoints}
                      onChange={(value) => {
                        setPercentPoints(value);
                        clearFieldError("value");
                      }}
                      min={0}
                      max={100}
                    />
                  ) : (
                    <NumberStepper
                      id="promo-value"
                      label={currency ? `Discount value (${currency})` : "Discount value"}
                      labelExtra={
                        <FieldInfoTooltip label="discount value">
                          Amount or percent depending on discount type.
                        </FieldInfoTooltip>
                      }
                      value={fixedAmount}
                      onChange={(value) => {
                        setFixedAmount(value);
                        clearFieldError("value");
                      }}
                      min={0}
                      max={FARE_STEPPER_MAX}
                      step={0.01}
                      decimals={2}
                    />
                  )}
                  {fieldErrors.value ? (
                    <p aria-live="polite" className="text-destructive text-xs" role="alert">
                      {draft.type === "percent"
                        ? "Percent must be greater than 0"
                        : "Amount must be greater than 0"}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <SectionHeading>Applies to</SectionHeading>

              <div className="space-y-2">
                <FieldLabel tip="Restrict to selected Locations. Select all for every Location.">
                  Locations
                </FieldLabel>
                <MultiSelectField
                  id="promo-branches"
                  options={branchOptions}
                  selected={draft.conditions.branchIds ?? []}
                  onSelectedChange={(ids) => {
                    patchConditions({ branchIds: ids });
                    clearFieldError("branchIds");
                  }}
                  placeholder="Select locations"
                  emptyMessage="No Locations."
                  invalid={fieldErrors.branchIds}
                />
                {fieldErrors.branchIds ? (
                  <p
                    aria-live="polite"
                    className="peer-aria-invalid:text-destructive text-destructive text-xs"
                    role="alert">
                    Locations are required
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <FieldLabel tip="Restrict to transfer and/or hourly trips.">Trip types</FieldLabel>
                  <MultiSelectField
                    id="promo-trip-types"
                    options={TRIP_TYPE_OPTIONS}
                    selected={(draft.conditions.tripTypes as string[]) ?? []}
                    onSelectedChange={(ids) => {
                      patchConditions({ tripTypes: ids as TripType[] });
                      clearFieldError("tripTypes");
                    }}
                    placeholder="Select trip types"
                    emptyMessage="No trip types."
                    invalid={fieldErrors.tripTypes}
                  />
                  {fieldErrors.tripTypes ? (
                    <p
                      aria-live="polite"
                      className="peer-aria-invalid:text-destructive text-destructive text-xs"
                      role="alert">
                      Trip types are required
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <FieldLabel tip="Restrict to selected service classes.">Vehicle classes</FieldLabel>
                  <MultiSelectField
                    id="promo-classes"
                    options={vehicleClassOptions}
                    selected={draft.conditions.vehicleClassIds ?? []}
                    onSelectedChange={(ids) => {
                      patchConditions({ vehicleClassIds: ids });
                      clearFieldError("vehicleClassIds");
                    }}
                    placeholder="Select vehicle classes"
                    emptyMessage="No vehicle classes."
                    invalid={fieldErrors.vehicleClassIds}
                  />
                  {fieldErrors.vehicleClassIds ? (
                    <p
                      aria-live="polite"
                      className="peer-aria-invalid:text-destructive text-destructive text-xs"
                      role="alert">
                      Vehicle classes are required
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <SectionHeading>Validity</SectionHeading>

              <div className="grid grid-cols-2 gap-3">
                <DatePickerField
                  label="Valid from"
                  tip="Optional start date. Leave empty for no start."
                  value={draft.conditions.startsAt}
                  onChange={(date) => patchConditions({ startsAt: date })}
                />
                <DatePickerField
                  label="Valid to"
                  tip="Optional end date. Leave empty for no end."
                  value={draft.conditions.endsAt}
                  onChange={(date) => patchConditions({ endsAt: date })}
                  endOfDaySelect
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberStepper
                  id="promo-max"
                  label="Max redemptions"
                  labelExtra={
                    <FieldInfoTooltip label="max redemptions">
                      Global cap on redemptions. Unlimited when set to Unlimited.
                    </FieldInfoTooltip>
                  }
                  value={limitStepperValue(draft.conditions.maxRedemptions)}
                  onChange={(value) => patchConditions({ maxRedemptions: limitFromStepper(value) })}
                  min={0}
                  max={LIMIT_STEPPER_MAX}
                  formatValue={formatLimitStepper}
                />
                <NumberStepper
                  id="promo-min-fare"
                  label="Minimum fare"
                  labelExtra={
                    <FieldInfoTooltip label="minimum fare">
                      Require a minimum subtotal before the discount applies.
                    </FieldInfoTooltip>
                  }
                  value={minFareStepperValue(draft.conditions.minimumSubtotal)}
                  onChange={(value) =>
                    patchConditions({ minimumSubtotal: minFareFromStepper(value) })
                  }
                  min={0}
                  max={FARE_STEPPER_MAX}
                  step={1}
                  formatValue={formatMinFareStepper}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberStepper
                  id="promo-per-customer"
                  label="Per customer"
                  labelExtra={
                    <FieldInfoTooltip label="per customer">
                      Cap uses per customer. Unlimited when set to Unlimited.
                    </FieldInfoTooltip>
                  }
                  value={limitStepperValue(draft.conditions.perCustomerLimit)}
                  onChange={(value) =>
                    patchConditions({ perCustomerLimit: limitFromStepper(value) })
                  }
                  min={0}
                  max={LIMIT_STEPPER_MAX}
                  formatValue={formatLimitStepper}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <SectionHeading>Status</SectionHeading>

              <div className="flex items-center justify-between gap-4">
                <FieldLabel
                  htmlFor="promo-active"
                  tip="Inactive coupons cannot be applied to bookings.">
                  Active
                </FieldLabel>
                <Switch
                  id="promo-active"
                  checked={draft.isEnabled}
                  onCheckedChange={(checked) => setDraft((c) => ({ ...c, isEnabled: checked }))}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
          </TooltipProvider>

          <div className="shrink-0 border-t px-4 pt-4 pb-4">
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 p-0 sm:justify-between">
              {!isNew ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={saving}
                  onClick={handleDelete}>
                  Delete
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              )}
              <div className="flex items-center gap-2">
                {!isNew ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : isNew ? "Create coupon" : "Save"}
                </Button>
              </div>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
