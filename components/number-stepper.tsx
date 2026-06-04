"use client";

import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function NumberStepper({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  disabled
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "border-input bg-background flex h-9 items-center justify-between rounded-md border shadow-xs",
          disabled && "pointer-events-none opacity-50"
        )}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-l-md rounded-r-none"
          aria-label={`Decrease ${label}`}
          disabled={disabled || atMin}
          onClick={() => onChange(Math.max(min, value - 1))}>
          <MinusIcon />
        </Button>
        <span
          id={id}
          className="min-w-8 text-center text-sm font-medium tabular-nums"
          aria-live="polite"
          aria-atomic="true">
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-l-none rounded-r-md"
          aria-label={`Increase ${label}`}
          disabled={disabled || atMax}
          onClick={() => onChange(Math.min(max, value + 1))}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}
