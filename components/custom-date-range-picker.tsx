"use client";

import * as React from "react";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const dateFilterPresets = [
  { name: "Today", value: "today" },
  { name: "Yesterday", value: "yesterday" },
  { name: "This Week", value: "thisWeek" },
  { name: "Last 7 Days", value: "last7Days" },
  { name: "Last 28 Days", value: "last28Days" },
  { name: "This Month", value: "thisMonth" },
  { name: "Last Month", value: "lastMonth" },
  { name: "This Year", value: "thisYear" }
] as const;

export type DateRangePreset = (typeof dateFilterPresets)[number]["value"];

export function isDateRangePreset(value: unknown): value is DateRangePreset {
  return typeof value === "string" && dateFilterPresets.some((item) => item.value === value);
}

export function last7DaysRange(reference = new Date()): DateRange {
  return {
    from: startOfDay(subDays(reference, 6)),
    to: endOfDay(reference)
  };
}

export function thisWeekRange(reference = new Date()): DateRange {
  return {
    from: startOfDay(startOfWeek(reference)),
    to: endOfDay(reference)
  };
}

export function rangeForPreset(type: DateRangePreset, reference = new Date()): DateRange {
  switch (type) {
    case "today":
      return { from: startOfDay(reference), to: endOfDay(reference) };
    case "yesterday": {
      const yesterday = subDays(reference, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "thisWeek":
      return thisWeekRange(reference);
    case "last7Days":
      return last7DaysRange(reference);
    case "last28Days":
      return { from: startOfDay(subDays(reference, 27)), to: endOfDay(reference) };
    case "thisMonth":
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
    case "lastMonth": {
      const lastMonth = subMonths(reference, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case "thisYear":
      return { from: startOfYear(reference), to: endOfYear(reference) };
  }
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return "Select date range";
  if (range.to) {
    return `${format(range.from, "dd MMM yyyy")} - ${format(range.to, "dd MMM yyyy")}`;
  }
  return format(range.from, "dd MMM yyyy");
}

export function DateRangePicker({
  value,
  onChange,
  defaultPreset = "last7Days",
  savedDefaultPreset,
  onDefaultChange,
  className
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  defaultPreset?: DateRangePreset;
  /** Currently saved default; with `onDefaultChange`, shows the default checkbox. */
  savedDefaultPreset?: DateRangePreset | null;
  onDefaultChange?: (preset: DateRangePreset | null) => void | Promise<void>;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(value?.from ?? new Date());
  const [activePreset, setActivePreset] = React.useState<DateRangePreset | "custom">(defaultPreset);
  const [savingDefault, setSavingDefault] = React.useState(false);

  React.useEffect(() => {
    if (value?.from) setCurrentMonth(value.from);
  }, [value?.from]);

  const applyPreset = (type: DateRangePreset) => {
    const next = rangeForPreset(type);
    setActivePreset(type);
    onChange(next);
    if (next.from) setCurrentMonth(next.from);
  };

  const handleDefaultCheckedChange = async (checked: boolean | "indeterminate") => {
    if (activePreset === "custom" || !onDefaultChange) return;
    setSavingDefault(true);
    try {
      await onDefaultChange(checked === true ? activePreset : null);
    } finally {
      setSavingDefault(false);
    }
  };

  const triggerButton = (
    <Button
      id="date"
      variant="outline"
      className={cn("justify-start text-left font-normal", !value && "text-muted-foreground", className)}>
      <CalendarIcon />
      {isMobile ? null : <span>{formatRangeLabel(value)}</span>}
    </Button>
  );

  const showDefaultControl = Boolean(onDefaultChange) && activePreset !== "custom";
  const isSavedDefault = Boolean(savedDefaultPreset) && activePreset === savedDefaultPreset;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {isMobile ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
                <TooltipContent>{formatRangeLabel(value)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            triggerButton
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="end">
          <div className="flex flex-col">
            <div className="flex flex-col lg:flex-row">
              <div className="me-0 lg:me-4">
                <ToggleGroup
                  type="single"
                  value={activePreset === "custom" ? undefined : activePreset}
                  onValueChange={(next) => {
                    if (next) applyPreset(next as DateRangePreset);
                  }}
                  className="hidden w-28 flex-col lg:block">
                  {dateFilterPresets.map((item) => (
                    <ToggleGroupItem
                      key={item.value}
                      className="text-muted-foreground w-full"
                      value={item.value}
                      asChild>
                      <Button className="justify-start rounded-md">{item.name}</Button>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Select
                  value={activePreset === "custom" ? undefined : activePreset}
                  onValueChange={(next) => applyPreset(next as DateRangePreset)}>
                  <SelectTrigger
                    className="mb-4 flex w-full lg:hidden"
                    size="sm"
                    aria-label="Select a value">
                    <SelectValue placeholder="Last 7 Days" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateFilterPresets.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Calendar
                className="border-s-0 py-0! ps-0! pe-0! lg:border-s lg:ps-4!"
                mode="range"
                month={currentMonth}
                selected={value}
                onSelect={(next) => {
                  onChange(next);
                  setActivePreset("custom");
                  if (next?.from) setCurrentMonth(next.from);
                }}
                onMonthChange={setCurrentMonth}
              />
            </div>
            {showDefaultControl ? (
              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                <Checkbox
                  id="date-range-use-as-default"
                  checked={isSavedDefault}
                  disabled={savingDefault}
                  onCheckedChange={(checked) => void handleDefaultCheckedChange(checked)}
                />
                <Label
                  htmlFor="date-range-use-as-default"
                  className="text-sm font-normal">
                  Use as my default
                </Label>
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
