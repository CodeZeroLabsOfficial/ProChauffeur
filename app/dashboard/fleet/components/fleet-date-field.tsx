"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function FleetDateField({
  label,
  value,
  onChange,
  nested = false,
  invalid = false,
  error
}: {
  label: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  nested?: boolean;
  invalid?: boolean;
  error?: string;
}) {
  return (
    <div className="*:not-first:mt-2">
      <Label>{label}</Label>
      <Popover modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className={cn("w-full pl-3 text-left font-normal", !value && "text-muted-foreground")}>
            {value ? format(value, "PPP") : <span>Pick a date</span>}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
            nested && "z-[110]"
          )}
          align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={new Date().getFullYear() - 10}
            toYear={new Date().getFullYear() + 20}
            selected={value}
            onSelect={onChange}
            defaultMonth={value}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error ? (
        <p aria-live="polite" className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
