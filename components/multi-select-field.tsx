"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelectField({
  id,
  options,
  selected,
  onSelectedChange,
  placeholder = "Select…",
  emptyMessage = "No options available.",
  disabled,
  invalid,
  className
}: {
  id?: string;
  options: MultiSelectOption[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (!selected.length) return null;
    if (selected.length === 1) {
      return options.find((option) => option.value === selected[0])?.label ?? "1 selected";
    }
    return `${selected.length} selected`;
  }, [options, selected]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onSelectedChange(selected.filter((item) => item !== value));
      return;
    }
    onSelectedChange([...selected, value]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            "peer border-input bg-background hover:bg-background flex h-9 w-full justify-between px-3 font-normal shadow-xs",
            !summary && "text-muted-foreground",
            className
          )}>
          <span className="truncate">{summary ?? placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList>
            {options.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggle(option.value)}>
                    <div className="flex items-center space-x-3 py-1">
                      <Checkbox
                        id={`${id ?? "multi-select"}-${option.value}`}
                        checked={selected.includes(option.value)}
                        onCheckedChange={() => toggle(option.value)}
                      />
                      <label
                        htmlFor={`${id ?? "multi-select"}-${option.value}`}
                        className="leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {option.label}
                      </label>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
