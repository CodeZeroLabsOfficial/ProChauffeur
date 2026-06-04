"use client";

import {
  DRIVER_OVERVIEW_PERIOD_OPTIONS,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function DriverProfileOverviewPeriodSelector({
  value,
  onChange,
  className
}: {
  value: DriverOverviewPeriod;
  onChange: (value: DriverOverviewPeriod) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => next && onChange(next as DriverOverviewPeriod)}
        variant="outline"
        className="hidden *:data-[slot=toggle-group-item]:!px-4 md:flex">
        {DRIVER_OVERVIEW_PERIOD_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select value={value} onValueChange={(v) => onChange(v as DriverOverviewPeriod)}>
        <SelectTrigger
          className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate md:hidden"
          size="sm"
          aria-label="Select period">
          <SelectValue placeholder="Last 30 days" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {DRIVER_OVERVIEW_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-lg">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
