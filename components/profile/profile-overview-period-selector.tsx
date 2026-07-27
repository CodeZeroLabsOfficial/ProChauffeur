"use client";

import {
  PROFILE_OVERVIEW_PERIOD_OPTIONS,
  type ProfileOverviewPeriod
} from "@/lib/profile/overview-period";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ProfileOverviewPeriodSelector({
  value,
  onChange,
  className
}: {
  value: ProfileOverviewPeriod;
  onChange: (value: ProfileOverviewPeriod) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => next && onChange(next as ProfileOverviewPeriod)}
        variant="outline"
        className="hidden *:data-[slot=toggle-group-item]:!px-4 md:flex">
        {PROFILE_OVERVIEW_PERIOD_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select value={value} onValueChange={(v) => onChange(v as ProfileOverviewPeriod)}>
        <SelectTrigger
          className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate md:hidden"
          size="sm"
          aria-label="Select period">
          <SelectValue placeholder="Last 30 days" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {PROFILE_OVERVIEW_PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-lg">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
