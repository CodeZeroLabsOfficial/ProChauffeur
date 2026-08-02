"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { LUXURY_VEHICLE_MAKES, vehicleMakeSelectValue } from "@/lib/vehicle-makes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function VehicleMakeSelect({
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "Select make",
  nested = false
}: {
  value: string | null | undefined;
  onChange: (makeLabel: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  nested?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = vehicleMakeSelectValue(value) || null;

  const selected = useMemo(
    () => LUXURY_VEHICLE_MAKES.find((entry) => entry.label === selectedLabel) ?? null,
    [selectedLabel]
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive"
          )}>
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", nested && "z-[110]")}
        align="start">
        <Command>
          <CommandInput placeholder="Search makes…" />
          <CommandList>
            <CommandEmpty>No make found.</CommandEmpty>
            <CommandGroup>
              {LUXURY_VEHICLE_MAKES.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.label}
                  onSelect={() => {
                    onChange(entry.label);
                    setOpen(false);
                  }}>
                  <CheckIcon
                    className={cn(
                      "mr-2 size-4",
                      selectedLabel === entry.label ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{entry.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
